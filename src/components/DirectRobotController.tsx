import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Power, Wifi, Gauge, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// 机器人指令格式
// interface为类型约束规则，必须包含字符串、数字类型
interface RobotCommand {
  type: "move" | "stop" | "rotate";
  data: {
    x?: number; // 归一化 -1..1（右为正）
    y?: number; // 归一化 -1..1（前为正）
    angle?: number; // 0..360°
    speed?: number; // m/s
  };
}

// 十六进制数据包结构
// 定义一个接口，用于描述机器人通信的数据包格式
interface RobotPacket {
  // 源端口号：标识发送数据包的端口，用于区分不同的发送源
  srcPort: number;
  // 目的端口号：标识接收数据包的端口，用于将数据正确送达目标
  destPort: number;
  // 序列号：用于标识数据包的顺序，确保数据传输的有序性，便于接收方重组数据
  sequence: number;
  // 确认号：表示已成功接收的数据包的下一个序列号，用于确认数据接收状态
  ack: number;
  // 头部长度：表示数据包头部的长度，用于区分头部和数据部分
  headerLen: number;
  // 标志位：包含多种控制信息，如是否为确认包、是否需要紧急处理等
  flags: number;
  // 窗口大小：用于流量控制，告知发送方接收方当前可接收的最大数据量
  window: number;
  // 校验和：用于检测数据包在传输过程中是否发生错误，确保数据完整性
  checksum: number;
  // 紧急指针：当标志位指示有紧急数据时，该字段指向紧急数据的位置
  urgentPtr: number;
  // 数据部分：以十六进制数字数组形式存储的实际传输数据
  data: number[];
}

const MAX_SPEED = 1; // m/s
const DIAL_R = 90;
const STICK_R = 90;
const DEADZONE_PX = 6;

// 计算校验和
const calculateChecksum = (buffer: number[]): number => {
  let sum = 0;
  for (const byte of buffer) sum += byte;
  // 将校验和结果限制在 16 位整数范围内（0-65535）
  return sum % 65536;
};

// 数据包转字节数组
const packetToBytes = (packet: RobotPacket): number[] => {
  const bytes: number[] = [];

  // 添加各字段到字节数组
  bytes.push((packet.srcPort >> 8) & 0xFF, packet.srcPort & 0xFF);
  bytes.push((packet.destPort >> 8) & 0xFF, packet.destPort & 0xFF);
  bytes.push(
    (packet.sequence >> 24) & 0xFF,
    (packet.sequence >> 16) & 0xFF,
    (packet.sequence >> 8) & 0xFF,
    packet.sequence & 0xFF
  );
  bytes.push(
    (packet.ack >> 24) & 0xFF,
    (packet.ack >> 16) & 0xFF,
    (packet.ack >> 8) & 0xFF,
    packet.ack & 0xFF
  );
  bytes.push(((packet.headerLen & 0x0F) << 4) | 0x00);
  bytes.push(packet.flags & 0xFF);
  bytes.push((packet.window >> 8) & 0xFF, packet.window & 0xFF);
  bytes.push(0x00, 0x00); // 校验和占位
  bytes.push((packet.urgentPtr >> 8) & 0xFF, packet.urgentPtr & 0xFF);
  bytes.push(...packet.data);

  // 计算并填充校验和
  const checksum = calculateChecksum(bytes);
  bytes[14] = (checksum >> 8) & 0xFF;
  bytes[15] = checksum & 0xFF;

  return bytes;
};

// 验证IP和端口格式
const isValidIp = (ip: string) =>
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(ip);
const isValidPort = (p: string) => {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
};

const DirectRobotController: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const angleRef = useRef<SVGSVGElement>(null);
  const rightRef = useRef<SVGSVGElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sequenceCounter = useRef<number>(1);

  const [robotIp, setRobotIp] = useState("192.168.0.10");
  const [robotPort, setRobotPort] = useState("8080");
  const [logServerUrl, setLogServerUrl] = useState("http://192.168.0.5:8082");
  const [connected, setConnected] = useState(false);
  const [angle, setAngle] = useState<number>(0);
  const [stick, setStick] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 节流器
  const rotateThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const moveThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });

  // 记录日志到Supabase
  const logCommand = useCallback(async (
    command: RobotCommand,
    hexData: string,
    status: 'sent' | 'error' = 'sent',
    errorMessage?: string
  ) => {
    if (!user) return;

    try {
      await supabase.from('robot_logs').insert({
        user_id: user.id,
        command_type: command.type,
        command_data: command.data,
        target_ip: robotIp,
        target_port: parseInt(robotPort),
        hex_data: hexData,
        status,
        error_message: errorMessage
      });

      // 也发送到Go日志服务器
      fetch(`${logServerUrl}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          command_type: command.type,
          command_data: command.data,
          target_ip: robotIp,
          target_port: parseInt(robotPort),
          hex_data: hexData,
          status,
          error_message: errorMessage
        })
      }).catch(console.error);
    } catch (error) {
      console.error('日志记录失败:', error);
    }
  }, [user, robotIp, robotPort, logServerUrl]);

  // WebSocket连接管理
  const handleConnect = useCallback(() => {
    if (connected && socketRef.current) {
      socketRef.current.close();
      setConnected(false);
      toast({ title: '已断开', description: '与机器人的连接已关闭' });
      return;
    }

    if (!robotIp || !robotPort) {
      toast({ title: '请先输入机器人IP和端口' });
      return;
    }

    if (!isValidIp(robotIp) || !isValidPort(robotPort)) {
      toast({
        title: '无效的连接参数',
        description: '请输入有效的IPv4地址与端口(1-65535)'
      });
      return;
    }

    try {
      // 直接连接到机器人的WebSocket服务
      const wsUrl = `ws://${robotIp}:${robotPort}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        socketRef.current = ws;
        toast({ 
          title: '已连接', 
          description: `已直连到机器人 ${robotIp}:${robotPort}` 
        });
      };

      ws.onmessage = (event) => {
        console.log('机器人回复:', event.data);
        // 可以处理机器人的响应数据
      };

      ws.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        toast({ title: '连接断开', description: '与机器人的连接已关闭' });
      };

      ws.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
        setConnected(false);
        toast({ 
          title: '连接失败', 
          description: '无法连接到机器人，请检查IP和端口' 
        });
      };

    } catch (error) {
      console.error('连接错误:', error);
      toast({ title: '连接错误', description: '创建连接失败' });
    }
  }, [connected, robotIp, robotPort, toast]);

  // 发送16进制数据
  const sendHexData = useCallback((cmd: RobotCommand, showToast = false) => {
    if (!connected || !socketRef.current) {
      if (showToast) toast({ title: '未连接', description: '请先连接机器人' });
      return false;
    }

    const sequence = sequenceCounter.current++;
    const packet: RobotPacket = {
      srcPort: 8080,
      destPort: Number(robotPort),
      sequence,
      ack: 0,
      headerLen: 5,
      flags: 0,
      window: 65535,
      checksum: 0,
      urgentPtr: 0,
      data: [],
    };

    // 根据命令类型编码
    switch (cmd.type) {
      case 'move': {
        packet.flags = 0x01;
        const x = Math.round((((cmd.data.x ?? 0) + 1) * 127.5));
        const y = Math.round((((cmd.data.y ?? 0) + 1) * 127.5));
        const speed = Math.round(((cmd.data.speed ?? 0) / MAX_SPEED) * 255);
        packet.data = [x, y, speed];
        break;
      }
      case 'rotate': {
        packet.flags = 0x02;
        const angle = Math.min(360, Math.max(0, cmd.data.angle ?? 0));
        packet.data = [(angle >> 8) & 0xff, angle & 0xff];
        break;
      }
      case 'stop': {
        packet.flags = 0x04;
        packet.data = [0x00];
        break;
      }
    }

    const bytes = packetToBytes(packet);
    const hexStr = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');

    try {
      // 发送二进制数据
      const buffer = new Uint8Array(bytes);
      socketRef.current.send(buffer);

      // 记录日志
      logCommand(cmd, hexStr, 'sent');

      if (showToast) {
        toast({ title: '指令已发送', description: `Hex: ${hexStr}` });
      }
      return true;
    } catch (error) {
      console.error('发送失败:', error);
      logCommand(cmd, hexStr, 'error', String(error));
      if (showToast) {
        toast({ title: '发送失败', description: String(error) });
      }
      return false;
    }
  }, [connected, robotPort, toast, logCommand]);

  // 节流发送
  const throttledSend = useCallback((
    cmd: RobotCommand,
    bucket: React.MutableRefObject<{ last: number; timer: number | null; pending: RobotCommand | null }>,
    interval = 50
  ) => {
    const now = Date.now();
    const b = bucket.current;
    const elapsed = now - b.last;
    
    if (elapsed >= interval) {
      b.last = now;
      sendHexData(cmd, false);
    } else {
      b.pending = cmd;
      if (!b.timer) {
        b.timer = window.setTimeout(() => {
          b.last = Date.now();
          if (b.pending) {
            sendHexData(b.pending, false);
            b.pending = null;
          }
          if (b.timer) {
            clearTimeout(b.timer);
            b.timer = null;
          }
        }, Math.max(0, interval - elapsed));
      }
    }
  }, [sendHexData]);

  // 角度控制
  const getAngleFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = angleRef.current;
    if (!el) return angle;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ("clientX" in e ? e.clientX : 0) - cx;
    const dy = ("clientY" in e ? e.clientY : 0) - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  };

  const handleRotate = useCallback((deg: number) => {
    setAngle(deg);
    const cmd: RobotCommand = { type: "rotate", data: { angle: deg } };
    throttledSend(cmd, rotateThrottleRef, 50);
  }, [throttledSend]);

  const onDialPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    e.preventDefault();
    handleRotate(getAngleFromEvent(e));

    const move = (ev: PointerEvent) => handleRotate(getAngleFromEvent(ev));
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // 摇杆控制
  const getStickFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = rightRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = ("clientX" in e ? e.clientX : 0) - cx;
    let dy = ("clientY" in e ? e.clientY : 0) - cy;

    const clamp = (v: number) => Math.max(-STICK_R, Math.min(STICK_R, v));
    dx = clamp(dx);
    dy = clamp(dy);

    // 十字形限制
    if (Math.abs(dx) > Math.abs(dy)) dy = 0;
    else dx = 0;

    return { x: Math.round(dx), y: Math.round(dy) };
  };

  const handleStickMove = useCallback((pos: { x: number; y: number }) => {
    setStick(pos);

    const len = Math.hypot(pos.x, pos.y);
    const withinDeadzone = len < DEADZONE_PX;
    const x = withinDeadzone ? 0 : pos.x;
    const y = withinDeadzone ? 0 : pos.y;

    if (x === 0 && y === 0) {
      throttledSend({ type: "stop", data: {} }, moveThrottleRef, 50);
      return;
    }

    const dominant = Math.abs(x) >= Math.abs(y) ? "x" : "y";
    const mag = dominant === "x" ? Math.abs(x) : Math.abs(y);
    const speed = (mag / STICK_R) * MAX_SPEED;

    const nx = x / STICK_R;
    const ny = -y / STICK_R;

    const cmd: RobotCommand = {
      type: "move",
      data: {
        x: Number(nx.toFixed(3)),
        y: Number(ny.toFixed(3)),
        speed: Number(speed.toFixed(3)),
      },
    };
    throttledSend(cmd, moveThrottleRef, 50);
  }, [throttledSend]);

  const onRightPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    e.preventDefault();

    handleStickMove(getStickFromEvent(e));

    const move = (ev: PointerEvent) => handleStickMove(getStickFromEvent(ev));
    const up = () => {
      handleStickMove({ x: 0, y: 0 });
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // 清理
  useEffect(() => {
    return () => {
      [rotateThrottleRef, moveThrottleRef].forEach(ref => {
        if (ref.current.timer) {
          clearTimeout(ref.current.timer);
          ref.current.timer = null;
        }
      });
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // 渲染几何计算
  const dialCx = 110, dialCy = 110, dialR = DIAL_R;
  const rad = (((angle % 360) - 90) * Math.PI) / 180;
  const knobX = dialCx + (dialR - 10) * Math.cos(rad);
  const knobY = dialCy + (dialR - 10) * Math.sin(rad);

  const stickCx = 110, stickCy = 110, stickR = STICK_R;
  const thumbX = stickCx + stick.x;
  const thumbY = stickCy + stick.y;

  let dirText = "待命";
  let speedMs = 0;
  if (stick.x !== 0 || stick.y !== 0) {
    if (Math.abs(stick.x) > Math.abs(stick.y)) {
      dirText = stick.x > 0 ? "向右" : "向左";
      speedMs = (Math.abs(stick.x) / stickR) * MAX_SPEED;
    } else {
      dirText = stick.y < 0 ? "前进" : "后退";
      speedMs = (Math.abs(stick.y) / stickR) * MAX_SPEED;
    }
  }

  return (
    <section className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">地坪漆涂敷机器人</h1>
        <p className="text-muted-foreground mt-2">输入机器人的IP地址和端口就可以开始控制啦!</p>
      </header>

      <div className="space-y-6">
        {/* 连接配置 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" /> 直连配置
            </CardTitle>
            <CardDescription>
              配置机器人IP地址、端口和日志服务器，建立WebSocket直连。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="robot-ip">机器人 IP</Label>
                <Input
                  id="robot-ip"
                  placeholder="192.168.0.10"
                  value={robotIp}
                  onChange={(e) => setRobotIp(e.target.value)}
                  disabled={connected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="robot-port">机器人端口</Label>
                <Input
                  id="robot-port"
                  placeholder="8080"
                  value={robotPort}
                  onChange={(e) => setRobotPort(e.target.value)}
                  disabled={connected}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-server">日志服务器</Label>
                <Input
                  id="log-server"
                  placeholder="http://192.168.0.5:8082"
                  value={logServerUrl}
                  onChange={(e) => setLogServerUrl(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={connected ? "default" : "secondary"}>
                  <Wifi className="h-3 w-3 mr-1" />
                  {connected ? "已连接" : "未连接"}
                </Badge>
                {connected && (
                  <Badge variant="outline">
                    <Activity className="h-3 w-3 mr-1" />
                    {robotIp}:{robotPort}
                  </Badge>
                )}
              </div>
              <Button onClick={handleConnect} variant={connected ? "destructive" : "default"}>
                {connected ? "断开连接" : "连接机器人"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 控制面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 旋转控制 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>旋转控制</CardTitle>
              <CardDescription>拖拽调整机器人朝向角度</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <svg
                  ref={angleRef}
                  width="220"
                  height="220"
                  onPointerDown={onDialPointerDown}
                  className="select-none cursor-pointer"
                >
                  <circle
                    cx={dialCx}
                    cy={dialCy}
                    r={dialR}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="2"
                  />
                  <circle
                    cx={knobX}
                    cy={knobY}
                    r="8"
                    fill="hsl(var(--primary))"
                    className="drop-shadow-sm"
                  />
                  {/* 方向标记 */}
                  <text x={dialCx} y={25} textAnchor="middle" className="text-xs fill-muted-foreground">
                    前
                  </text>
                  <text x={dialCx} y={205} textAnchor="middle" className="text-xs fill-muted-foreground">
                    后
                  </text>
                  <text x={25} y={dialCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    左
                  </text>
                  <text x={195} y={dialCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    右
                  </text>
                </svg>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                <Gauge className="h-3 w-3 mr-1" />
                {angle}°
              </Badge>
            </CardContent>
          </Card>

          {/* 移动控制 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>移动控制</CardTitle>
              <CardDescription>十字控制器，单轴移动</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <svg
                  ref={rightRef}
                  width="220"
                  height="220"
                  onPointerDown={onRightPointerDown}
                  className="select-none cursor-pointer"
                >
                  {/* 十字导轨 */}
                  <line
                    x1={stickCx - stickR}
                    y1={stickCy}
                    x2={stickCx + stickR}
                    y2={stickCy}
                    stroke="hsl(var(--border))"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1={stickCx}
                    y1={stickCy - stickR}
                    x2={stickCx}
                    y2={stickCy + stickR}
                    stroke="hsl(var(--border))"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  {/* 拇指 */}
                  <circle
                    cx={thumbX}
                    cy={thumbY}
                    r="12"
                    fill="hsl(var(--primary))"
                    className="drop-shadow-sm"
                  />
                  {/* 方向标记 */}
                  <text x={stickCx} y={15} textAnchor="middle" className="text-xs fill-muted-foreground">
                    前
                  </text>
                  <text x={stickCx} y={210} textAnchor="middle" className="text-xs fill-muted-foreground">
                    后
                  </text>
                  <text x={15} y={stickCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    左
                  </text>
                  <text x={205} y={stickCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    右
                  </text>
                </svg>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="px-3 py-1">
                  {dirText}
                </Badge>
                <Badge variant="outline" className="px-3 py-1">
                  {speedMs.toFixed(2)} m/s
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用命令快捷按钮</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => sendHexData({ type: "stop", data: {} }, true)}
                variant="destructive"
                disabled={!connected}
              >
                紧急停止
              </Button>
              <Button 
                onClick={() => sendHexData({ type: "rotate", data: { angle: 0 } }, true)}
                variant="outline"
                disabled={!connected}
              >
                归零角度
              </Button>
              <Button 
                onClick={() => sendHexData({ type: "move", data: { x: 0, y: 1, speed: 0.5 } }, true)}
                variant="outline"
                disabled={!connected}
              >
                慢速前进
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default DirectRobotController;