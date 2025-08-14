import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Power, Wifi, Gauge } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 机器人接收端 JSON 指令格式
interface RobotCommand {
  type: "move" | "stop" | "rotate";
  data: {
    x?: number; // 归一化 -1..1（右为正）
    y?: number; // 归一化 -1..1（前为正）
    angle?: number; // 0..360°
    speed?: number; // m/s
  };
}

const MAX_SPEED = 1; // m/s
const DIAL_R = 90;
const STICK_R = 90;
const DEADZONE_PX = 6; // 触屏防误触死区

// 验证IP和端口格式
const isValidIp = (ip: string) =>
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(
    ip
  );
const isValidPort = (p: string) => {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
};

// 十六进制数据包结构（根据需求调整字段长度和含义）
interface RobotPacket {
  srcPort: number;       // 源端口（2字节）
  destPort: number;      // 目的端口（2字节）
  sequence: number;      // 序号（4字节）
  ack: number;           // 确认号（4字节）
  headerLen: number;     // 首部长度（4位）+ 保留位（4位）→ 共1字节
  flags: number;         // 标志位（1字节，可按位表示不同状态）
  window: number;        // 窗口大小（2字节）
  checksum: number;      // 校验和（2字节）
  urgentPtr: number;     // 紧急指针（2字节）
  options?: number[];    // 选项（可选，变长）
  data: number[];        // 数据部分（指令内容，变长）
}

// 计算校验和（简单累加和实现）
const calculateChecksum = (buffer: number[]): number => {
  let sum = 0;
  for (const byte of buffer) sum += byte;
  return sum % 65536; // 16位校验和
};

// 将数据包转为十六进制字节数组（大端序）
const packetToBytes = (packet: RobotPacket): number[] => {
  const bytes: number[] = [];

  // 1. 源端口（2字节）
  bytes.push((packet.srcPort >> 8) & 0xFF);
  bytes.push(packet.srcPort & 0xFF);

  // 2. 目的端口（2字节）
  bytes.push((packet.destPort >> 8) & 0xFF);
  bytes.push(packet.destPort & 0xFF);

  // 3. 序号（4字节）
  bytes.push((packet.sequence >> 24) & 0xFF);
  bytes.push((packet.sequence >> 16) & 0xFF);
  bytes.push((packet.sequence >> 8) & 0xFF);
  bytes.push(packet.sequence & 0xFF);

  // 4. 确认号（4字节）
  bytes.push((packet.ack >> 24) & 0xFF);
  bytes.push((packet.ack >> 16) & 0xFF);
  bytes.push((packet.ack >> 8) & 0xFF);
  bytes.push(packet.ack & 0xFF);

  // 5. 首部长度（4位）+ 保留位（4位）
  bytes.push(((packet.headerLen & 0x0F) << 4) | 0x00);

  // 6. 标志位（1字节）
  bytes.push(packet.flags & 0xFF);

  // 7. 窗口大小（2字节）
  bytes.push((packet.window >> 8) & 0xFF);
  bytes.push(packet.window & 0xFF);

  // 8. 校验和（先占位，最后计算）
  bytes.push(0x00);
  bytes.push(0x00);

  // 9. 紧急指针（2字节）
  bytes.push((packet.urgentPtr >> 8) & 0xFF);
  bytes.push(packet.urgentPtr & 0xFF);

  // 10. 数据部分
  bytes.push(...packet.data);

  // 计算并填充校验和
  const checksum = calculateChecksum(bytes);
  bytes[14] = (checksum >> 8) & 0xFF; // 高8位
  bytes[15] = checksum & 0xFF;        // 低8位

  return bytes;
};

const RobotController: React.FC = () => {
  const { toast } = useToast();

  const angleRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const [ip, setIp] = useState("192.168.0.10");
  const [port, setPort] = useState("8080");
  const [connected, setConnected] = useState(false);
  const [angle, setAngle] = useState<number>(0);
  const [stick, setStick] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 桥接服务地址（例如：http://192.168.0.5:8081）
  const [bridgeURL, setBridgeURL] = useState<string>("");

  // 序列计数器（递增）
  const sequenceCounter = useRef<number>(1);

  // 实时指令节流桶 & 状态缓存
  const rotateThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ last: 0, timer: null, pending: null });
  const moveThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ last: 0, timer: null, pending: null });
  const prevAngleRef = useRef<number>(0);
  const prevActiveMoveRef = useRef<boolean>(false);
  // 建立/断开 WebSocket 连接
  const handleConnect = useCallback(() => {
    // 校验桥接服务地址
    if (!bridgeURL || !/^https?:\/\//.test(bridgeURL)) {
      toast({ title: '无效的桥接服务器地址', description: '请填写形如 http://<服务器IP>:8081 的地址' });
      return;
    }

    if (connected) {
      // 断开与机器人的 TCP 桥接
      fetch(`${bridgeURL}/api/robot/disconnect`, { method: 'POST' })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          setConnected(false);
          toast({ title: '已断开', description: '连接已关闭' });
        })
        .catch((err) => {
          console.error(err);
          toast({ title: '断开失败', description: String(err) });
        });
      return;
    }

    if (!ip || !port) {
      toast({ title: '请先输入设备IP、端口进行连接' });
      return;
    }
    if (!isValidIp(ip) || !isValidPort(port)) {
      toast({
        title: '无效的连接参数',
        description: '请输入有效的 IPv4 地址与端口(1-65535)',
      });
      return;
    }

    // 请求 Go 服务主动连接到机器人 TCP
    fetch(`${bridgeURL}/api/robot/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addr: `${ip}:${port}` }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        setConnected(true);
        toast({ title: '已连接', description: `已连接到 ${ip}:${port}` });
      })
      .catch((error) => {
        console.error('connect error:', error);
        toast({ title: '连接错误', description: '无法连接到机器人' });
      });
  }, [connected, ip, port, toast, bridgeURL]);

  useEffect(() => {
    return () => {
      const r = rotateThrottleRef.current;
      if (r.timer) {
        clearTimeout(r.timer);
        r.timer = null;
      }
      const m = moveThrottleRef.current;
      if (m.timer) {
        clearTimeout(m.timer);
        m.timer = null;
      }
    };
  }, []);

  // 将命令转换为二进制并通过桥接服务发送
  const sendJSON = useCallback(
    (cmd: RobotCommand, showToast = false) => {
      if (!connected) {
        if (showToast) {
          toast({ title: '未连接', description: '请先连接设备' });
        }
        return false;
      }

      const sequence = sequenceCounter.current++;
      const packet: RobotPacket = {
        srcPort: 8080,
        destPort: Number(port),
        sequence,
        ack: 0,
        headerLen: 5,
        flags: 0,
        window: 65535,
        checksum: 0,
        urgentPtr: 0,
        data: [],
      };

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
      fetch(`${bridgeURL}/api/robot/send-raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bytes }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
        })
        .catch((err) => console.error('send-raw error:', err));

      if (showToast) {
        const hexStr = bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ');
        toast({ title: '指令已发送', description: `Hex: ${hexStr}` });
      }
      return true;
    },
    [connected, port, toast, bridgeURL]
  );

  // 非实时/按钮触发等：带提示
  const sendCommand = useCallback(
    (cmd: RobotCommand) => {
      sendJSON(cmd, true);
    },
    [sendJSON]
  );

  // 实时控制（高频）：不弹 toast
  const sendRealtime = useCallback(
    (cmd: RobotCommand) => {
      sendJSON(cmd, false);
    },
    [sendJSON]
  );

  // 通用节流发送，独立通道
  const throttledSend = useCallback(
    (
      cmd: RobotCommand,
      bucket: React.MutableRefObject<{ last: number; timer: number | null; pending: RobotCommand | null }>,
      interval = 50
    ) => {
      const now = Date.now();
      const b = bucket.current;
      const elapsed = now - b.last;
      if (elapsed >= interval) {
        b.last = now;
        sendJSON(cmd, false);
      } else {
        b.pending = cmd;
        if (!b.timer) {
          b.timer = window.setTimeout(() => {
            b.last = Date.now();
            if (b.pending) {
              sendJSON(b.pending, false);
              b.pending = null;
            }
            if (b.timer) {
              clearTimeout(b.timer);
              b.timer = null;
            }
          }, Math.max(0, interval - elapsed));
        }
      }
    },
    [sendJSON]
  );

  // 角度盘 - 根据事件计算角度（顶部为0°，顺时针增加）
  const getAngleFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = angleRef.current;
    if (!el) return angle;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ("clientX" in e ? e.clientX : 0) - cx;
    const dy = ("clientY" in e ? e.clientY : 0) - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // 顶部为 0°
    if (deg < 0) deg += 360;
    return Math.round(deg);
  };

  // 封装：旋转处理
  const handleRotate = useCallback(
    (deg: number) => {
      setAngle(deg);
      const prev = prevAngleRef.current;
      const diff = Math.abs((((deg - prev) + 540) % 360) - 180);
      if (diff < 2) return; // 2°以内视为死区，防误触
      prevAngleRef.current = deg;
      const cmd: RobotCommand = { type: "rotate", data: { angle: deg } };
      throttledSend(cmd, rotateThrottleRef, 50);
    },
    [throttledSend]
  );

  const onDialPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先输入设备IP、端口进行连接" });
      return;
    }
    e.preventDefault();
    handleRotate(getAngleFromEvent(e));

    const move = (ev: PointerEvent) => {
      handleRotate(getAngleFromEvent(ev));
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // 十字控制器 - 根据事件计算位置（限制为十字导轨）
  const getStickFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = rightRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = ("clientX" in e ? e.clientX : 0) - cx;
    let dy = ("clientY" in e ? e.clientY : 0) - cy;

    // 限制在半径内
    const clamp = (v: number) => Math.max(-STICK_R, Math.min(STICK_R, v));
    dx = clamp(dx);
    dy = clamp(dy);

    // 只允许单轴（十字形）
    if (Math.abs(dx) > Math.abs(dy)) dy = 0;
    else dx = 0;

    return { x: Math.round(dx), y: Math.round(dy) };
  };

  // 封装：摇杆移动处理（构造 JSON 指令）
  const handleStickMove = useCallback(
    (pos: { x: number; y: number }) => {
      setStick(pos);

      // 触屏防误触：小位移死区
      const len = Math.hypot(pos.x, pos.y);
      const withinDeadzone = len < DEADZONE_PX;
      const x = withinDeadzone ? 0 : pos.x;
      const y = withinDeadzone ? 0 : pos.y;

      if (x === 0 && y === 0) {
        prevActiveMoveRef.current = false;
        throttledSend({ type: "stop", data: {} }, moveThrottleRef, 50);
        return;
      }
      prevActiveMoveRef.current = true;

      const dominant = Math.abs(x) >= Math.abs(y) ? "x" : "y";
      const mag = dominant === "x" ? Math.abs(x) : Math.abs(y);
      const speed = (mag / STICK_R) * MAX_SPEED; // m/s

      // 归一化到 -1..1；Y轴向上为正（前进为正）
      const nx = x / STICK_R; // 右正
      const ny = -y / STICK_R; // 上正（与屏幕坐标相反）

      const cmd: RobotCommand = {
        type: "move",
        data: {
          x: Number(nx.toFixed(3)),
          y: Number(ny.toFixed(3)),
          speed: Number(speed.toFixed(3)),
        },
      };
      throttledSend(cmd, moveThrottleRef, 50);
    },
    [throttledSend]
  );

  const onRightPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先输入设备IP、端口进行连接" });
      return;
    }
    e.preventDefault();

    handleStickMove(getStickFromEvent(e));

    const move = (ev: PointerEvent) => {
      handleStickMove(getStickFromEvent(ev));
    };
    const up = () => {
      handleStickMove({ x: 0, y: 0 });
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // 左盘几何
  const dialCx = 110,
    dialCy = 110,
    dialR = DIAL_R;
  const rad = (((angle % 360) - 90) * Math.PI) / 180;
  const knobX = dialCx + (dialR - 10) * Math.cos(rad);
  const knobY = dialCy + (dialR - 10) * Math.sin(rad);

  // 右侧十字控制器几何 & 文案
  const stickCx = 110,
    stickCy = 110,
    stickR = STICK_R;
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
        <p className="text-muted-foreground mt-2">连接这台机器人就可以开始控制啦!</p>
      </header>

      <div className="space-y-6">
        {/* 顶部：连接工具栏 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5" /> 连接
            </CardTitle>
            <CardDescription>配置桥接服务器地址、目标设备的 IP 与端口并建立连接。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bridge">桥接服务器</Label>
                <Input
                  id="bridge"
                  value={bridgeURL}
                  onChange={(e) => setBridgeURL(e.target.value)}
                  placeholder="http://<服务器IP>:8081"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip">设备 IP</Label>
                <Input
                  id="ip"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.0.10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="8080"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={connected ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                <Wifi className="h-3.5 w-3.5" /> {connected ? "已连接" : "未连接"}
              </Badge>
              <Button onClick={handleConnect} variant={connected ? "secondary" : "default"}>
                {connected ? "断开" : "连接"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIp("");
                  setPort("");
                  setBridgeURL("");
                }}
              >
                重置
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 控制卡片：左右手控制器分离且拉开间距 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" /> 控制台
            </CardTitle>
            <CardDescription>
              左：左侧圆盘用于实时控制转弯,待右侧控制激活才可启动; 右：十字方向+速度一体控制。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-10 md:grid-cols-2 md:gap-16 xl:gap-24 items-center justify-items-center">
              {/* 左：圆形角度控制器（实时） */}
              <section aria-label="转弯角度控制" className="flex flex-col items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  转弯角度：<span className="font-medium text-foreground">{angle}°</span>
                </div>
                <div
                  ref={angleRef}
                  onPointerDown={onDialPointerDown}
                  onContextMenu={(e) => e.preventDefault()}
                  className="relative select-none touch-none"
                  role="slider"
                  aria-label="角度旋钮"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={angle}
                >
                  <svg width="220" height="220" viewBox="0 0 220 220" className="hover-scale">
                    {/* 外圈 */}
                    <circle
                      cx="110"
                      cy="110"
                      r={DIAL_R}
                      className="stroke-muted-foreground/30"
                      strokeWidth="10"
                      fill="none"
                    />
                    {/* 进度弧线 */}
                    <circle
                      cx="110"
                      cy="110"
                      r={DIAL_R}
                      className="stroke-primary"
                      strokeWidth="10"
                      strokeDasharray={`${(angle / 360) * 2 * Math.PI * DIAL_R} ${2 * Math.PI * DIAL_R}`}
                      strokeLinecap="round"
                      fill="none"
                      transform="rotate(-90 110 110)"
                    />
                    {/* 连线与小圆旋钮（实时旋转） */}
                    <line
                      x1="110"
                      y1="110"
                      x2={knobX}
                      y2={knobY}
                      className="stroke-primary"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <circle cx={knobX} cy={knobY} r="8" className="fill-primary" />
                  </svg>
                </div>
              </section>

              {/* 右：十字方向 + 速度一体控制器 */}
              <section aria-label="方向与速度控制" className="flex flex-col items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  速度：<span className="font-medium text-foreground">{speedMs.toFixed(2)} m/s</span> · {dirText}
                </div>
                <div
                  ref={rightRef}
                  onPointerDown={onRightPointerDown}
                  onContextMenu={(e) => e.preventDefault()}
                  className="relative select-none touch-none"
                  role="application"
                  aria-label="方向与速度十字控制器"
                >
                  <svg width="220" height="220" viewBox="0 0 220 220" className="hover-scale">
                    <circle
                      cx="110"
                      cy="110"
                      r={STICK_R}
                      className="stroke-muted-foreground/30"
                      strokeWidth="10"
                      fill="none"
                    />
                    {/* 十字形导轨 */}
                    <rect x="30" y="100" width="160" height="20" rx="10" className="fill-secondary" />
                    <rect x="100" y="30" width="20" height="160" rx="10" className="fill-secondary" />
                    {/* 中心点与拇指 */}
                    <circle cx="110" cy="110" r="6" className="fill-muted-foreground" />
                    <circle cx={thumbX} cy={thumbY} r="12" className="fill-primary" />
                  </svg>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RobotController;