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
import { 
  Power, Wifi, Gauge, Activity, Play, RotateCcw, RotateCw, 
  Home, ChevronUp, ChevronDown, Zap, ChevronDown as ChevronDownIcon,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 机器人指令格式 - 增加模式控制
interface RobotCommand {
  type: "move" | "z_speed" | "record" | "repeat" | "yaw" | "roll" | 
        "arm_reset" | "pump" | "reset" | "up_down" | "pump_speed" | "mode" | "test";
  data: {
    x_speed?: number; // 移动X轴速度（m/s）
    y_speed?: number; // 移动Y轴速度（m/s）
    z_speed?: number; // 旋转速度（m/s）
    yaw?: number;     // YAW轴角度（-80° ~ 80°）
    roll?: number;    // ROLL轴角度（0° ~ 360°）
    pump?: number;   // 料泵开关状态0或1
    up_down?: number; // 上下移动速度（-2 ~ 2）
    pump_speed?: number; // 泵转速（0 ~ 600 r/min）
    mode?: number;    // 模式选择（0=遥控,1=自动,2=急停）
    repeat?: number;  // 重复动作编号
	reset?: number;   // 复位开关状态0或1
    test_value?: number; // 测试用数值
  };
}

// 十六进制数据包结构
interface RobotPacket {
  frame_header: number;      // 固定帧头（0xA5）
  length: number;            // 数据长度
  sequence: number;          // 命令序列号
  flags: number;             // 命令码
  data: number[];            // 数据体
  frame_end: number;         // 固定帧尾（0xFF）
}

// 常量配置
const MAX_SPEED = 1;         // 最大移动/旋转速度（m/s）
const DIAL_R = 90;           // 旋钮控件半径（px）
const STICK_R = 90;          // 摇杆控件半径（px）
const DEADZONE_PX = 6;       // 摇杆死区
const CMD_TEST = 0x10E;      // 测试命令码
const COMMAND_CODES = {
  RECORD: 0x104, // 对应原代码中 record 命令码
  REPEAT: 0x105  // 对应原代码中 repeat 命令码
};

// 模式类型定义
type RobotMode = "remote" | "auto" | "emergency";
const MODE_MAP: Record<RobotMode, { name: string; code: number }> = {
  remote: { name: "遥控模式", code: 0 },
  auto: { name: "自动模式", code: 1 },
  emergency: { name: "急停模式", code: 2 }
};

/**
 * 数据包转字节数组
 */
const packetToBytes = (packet: RobotPacket): number[] => {
  const bytes: number[] = [];
  bytes.push(packet.frame_header);
  bytes.push(packet.length & 0xFF);
  bytes.push((packet.length >> 8) & 0xFF);
  bytes.push(packet.sequence & 0xFF);
  bytes.push(packet.flags & 0xFF);
  bytes.push(...packet.data);
  bytes.push(packet.frame_end);
  return bytes;
};

/**
 * Float转4字节数组
 */
const floatToBytes = (value: number): number[] => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, value, ); // 小端序
  return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
};

/**
 * uint32转4字节数组（用于pump_speed）
 * @param value - 需在0~4294967295范围内（uint32最大值）
 * @returns 4字节数组（大端序，与原协议保持一致）
 */
const uint32ToBytes = (value: number): number[] => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  // 1. 确保数值在uint32范围内（0~4294967295），并转为整数（泵转速无小数）
  const clampedValue = Math.max(0, Math.min(4294967295, Math.round(value)));
  // 2. 写入无符号32位整数（大端序，与float转换的端序一致）
  view.setUint32(0, clampedValue, true); 
  // 3. 按字节读取并返回（大端序：高位在前）
  return [view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)];
};

/**
 * IP地址格式验证
 */
const isValidIp = (ip: string) =>
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(ip);

/**
 * 端口号格式验证
 */
const isValidPort = (p: string) => {
  const n = Number(p);
  return Number.isInteger(n) && n >= 1 && n <= 65535;
};

// 主控制组件
const DirectRobotController: React.FC = () => {
  const { toast } = useToast();

  // DOM元素引用
  const angleRef = useRef<SVGSVGElement>(null);
  const rightRef = useRef<SVGSVGElement>(null);
  const yawRef = useRef<SVGSVGElement>(null);
  const rollRef = useRef<SVGSVGElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sequenceCounter = useRef<number>(1);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const repeatMenuRef = useRef<HTMLDivElement>(null);
  const recordMenuRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [robotIp, setRobotIp] = useState("192.168.50.14");
  const [robotPort, setRobotPort] = useState("8080");
  const [logServerUrl, setLogServerUrl] = useState("http://192.168.0.5:8082");
  const [connected, setConnected] = useState(false);
  const [currentMode, setCurrentMode] = useState<RobotMode>("remote");
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [repeatMenuOpen, setRepeatMenuOpen] = useState(false);
  const [selectedRepeatAction, setSelectedRepeatAction] = useState<number | null>(null);
  const [selectedRecordAction, setSelectedRecordAction] = useState<number | null>(null);
  const [recordMenuOpen, setRecordMenuOpen] = useState(false); 
  const [zSpeed, setZSpeed] = useState<number>(0);
  const [stick, setStick] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [yawAngle, setYawAngle] = useState<number>(0);
  const [rollAngle, setRollAngle] = useState<number>(0);
  const [pumpOn, setPumpOn] = useState<boolean>(false);
  const [upDownSpeed, setUpDownSpeed] = useState<number>(0);
  const [pumpSpeed, setPumpSpeed] = useState<number>(200);
  const [testResults, setTestResults] = useState<{
    sent: number,
    bytes: number[],
    hex: string
  } | null>(null); // 新增：存储测试结果

  // 节流器引用
  const zSpeedThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const moveThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const yawThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const rollThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const pumpThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const upDownThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const pumpSpeedThrottleRef = useRef<{ last: number; timer: number | null; pending: RobotCommand | null }>({ 
    last: 0, timer: null, pending: null 
  });
  const upDownIntervalRef = useRef<number | null>(null);

  // 检查是否处于急停模式
  const isEmergencyMode = currentMode === "emergency";

  /**
   * 检查操作权限，如果在急停模式则提示
   * @returns 是否允许操作
   */
  const checkOperationPermission = useCallback(() => {
    if (isEmergencyMode) {
      toast({
        title: "操作受限",
        description: "请退出急停模式后再进行操作",
        variant: "destructive"
      });
      return false;
    }
    return true;
  }, [isEmergencyMode, toast]);

  /**
   * 日志记录函数
   */
  const logCommand = useCallback(async (
    command: RobotCommand,
    hexData: string,
    status: 'sent' | 'error' = 'sent',
    errorMessage?: string
  ) => {
    try {
      fetch(`${logServerUrl}/api/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_type: command.type,
          command_data: command.data,
          target_ip: robotIp,
          target_port: parseInt(robotPort),
          hex_data: hexData,
          status,
          error_message: errorMessage,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('日志发送失败:', err));
    } catch (error) {
      console.error('日志记录逻辑异常:', error);
    }
  }, [robotIp, robotPort, logServerUrl]);

  /**
   * WebSocket连接管理
   */
  const handleConnect = useCallback(() => {
    if (connected && socketRef.current) {
      socketRef.current.close();
      setConnected(false);
      toast({ title: '已断开', description: '与机器人的连接已关闭' });
      return;
    }

    if (!robotIp || !robotPort) {
      toast({ title: '参数缺失', description: '请先输入机器人IP和端口' });
      return;
    }

    if (!isValidIp(robotIp) || !isValidPort(robotPort)) {
      toast({
        title: '无效参数',
        description: '请输入有效的IPv4地址和端口（1-65535）'
      });
      return;
    }

    try {
      const wsUrl = `ws://${robotIp}:${robotPort}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        socketRef.current = ws;
        toast({ 
          title: '已连接', 
          description: `成功连接机器人：${robotIp}:${robotPort}` 
        });
      };

      ws.onmessage = (event) => {
        console.log('机器人回复:', event.data);
      };

      ws.onclose = () => {
        setConnected(false);
        socketRef.current = null;
        toast({ title: '连接断开', description: '与机器人的连接已关闭' });
      };

      ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        setConnected(false);
        toast({ 
          title: '连接失败', 
          description: '无法连接机器人，请检查IP/端口或设备状态' 
        });
      };

    } catch (error) {
      console.error('连接初始化异常:', error);
      toast({ title: '连接错误', description: '创建WebSocket连接时发生异常' });
    }
  }, [connected, robotIp, robotPort, toast]);

  /**
   * 发送命令到机器人
   */
  const sendHexData = useCallback((cmd: RobotCommand, showToast = false) => {
    // 模式命令不受急停模式限制
    if (cmd.type !== "mode" && !checkOperationPermission()) {
      return false;
    }

    if (!connected || !socketRef.current) {
      if (showToast) toast({ title: '未连接', description: '请先连接机器人' });
      return false;
    }

    const sequence = sequenceCounter.current++;
    if (sequence > 255) sequenceCounter.current = 1;

    let flags = 0;
    let data: number[] = [];
    
    switch (cmd.type) {
      case 'move':
        flags = 0x101; // CMD_MOVE 命令码
        const xBytes = floatToBytes(cmd.data.x_speed ?? 0); 
        const yBytes = floatToBytes(cmd.data.y_speed ?? 0);
        data = [...xBytes, ...yBytes]; // 正确合并 8 字节数据（x4 + y4）
        break;
      case 'z_speed':
        flags = 0x102; // CMD_Z_SPEED 命令码
        const z_speed = cmd.data.z_speed ?? 0;
        data = floatToBytes(z_speed); // 4 字节
        break;
      case 'mode':
        flags = 0x103; // 模式命令码
        const mode = cmd.data.mode ?? 0;
        data = [mode & 0xFF]; // 1 字节（uint8）
        break;
      case 'record':
        flags = 0x104; // CMD_RECORD 命令码
        data = [0, 1, 2, 3, 4, 5]; // 6 字节（按原有逻辑）
        break;
      case 'repeat':
        flags = 0x105; // CMD_REPEAT 命令码
        data = [cmd.data.repeat ?? 0]; // 1 字节
        break;
      case 'yaw':
        flags = 0x107; // CMD_YAW 命令码
        const yaw = cmd.data.yaw ?? 0;
        data = floatToBytes(yaw); // 4 字节
        break;
      case 'roll':
        flags = 0x106; // CMD_ROLL 命令码
        const roll = cmd.data.roll ?? 0;
        data = floatToBytes(roll); // 4 字节
        break;
      case 'arm_reset':
        flags = 0x10A; // CMD_ARM_RESET 命令码
        const resetState = cmd.data.reset ?? 0;
        data = [resetState & 0xFF]; // 1 字节（uint8）
        break;
      case 'pump':
        flags = 0x109; // CMD_PUMP 命令码
        const pumpState = cmd.data.pump ? 0x01 : 0x00; 
        data = [pumpState]; // 1 字节
        break;
      case 'up_down':
        flags = 0x108; // CMD_UP_DOWN 命令码
        const upDownValue = cmd.data.up_down ?? 0.0;
        data = floatToBytes(upDownValue); // 4 字节
        break;
      case 'pump_speed':
        flags = 0x10B; // CMD_PUMP_SPEED 命令码
        const pumpSpeedValue = cmd.data.pump_speed ?? 0;
        data = floatToBytes(pumpSpeedValue); // 4 字节
        break;
      case 'test':
        flags = CMD_TEST; // 测试命令码，使用一个未占用的码值
        const testValue = cmd.data.test_value ?? 0;
        data = floatToBytes(testValue); // 4 字节，发送测试值
        break;
      default:
        if (showToast) toast({ title: '未知命令', description: `不支持的命令类型: ${cmd.type}` });
        return false;
    }
    
    // 构建数据包
    const buildPacket = (flags: number, data: number[], sequence: number) => {
      const frameHeader = 0xA5; // 固定帧头
      const frameEnd = 0xFF;    // 固定帧尾
      // 长度计算：序列号(1字节) + 命令码(2字节) + 数据长度 → 对应 ESP32 解析逻辑
      const length = 1 + 2 + data.length; 
        
      // 按协议顺序拼接字节（确保无错位）
      return new Uint8Array([
        frameHeader,
        length & 0xFF,        // 长度低8位
        (length >> 8) & 0xFF, // 长度高8位
        sequence & 0xFF,      // 序列号（1字节，防止溢出）
        flags & 0xFF,         // 命令码低8位
        (flags >> 8) & 0xFF,  // 命令码高8位（2字节命令码，适配 0x101 等）
        ...data,              // 数据部分（动态长度，如 move 的 8 字节）
        frameEnd
      ]);
    };
    
    // 调用 buildPacket 生成最终数据包
    const packetBytes = buildPacket(flags, data, sequence);
    // 转为十六进制字符串用于日志
    const hexStr = Array.from(packetBytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
    
    try {
      // 发送二进制数据包
      socketRef.current.send(packetBytes);
    
      logCommand(cmd, hexStr, 'sent');
    
      if (showToast) {
        toast({ title: '指令已发送', description: `Hex: ${hexStr}` });
      }
      
      // 如果是测试命令，保存测试结果
      if (cmd.type === 'test' && cmd.data.test_value !== undefined) {
        setTestResults({
          sent: cmd.data.test_value,
          bytes: Array.from(data),
          hex: data.map(b => b.toString(16).padStart(2, '0')).join(' ')
        });
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
  }, [connected, toast, logCommand, checkOperationPermission]);

  /**
   * 节流发送函数
   */
  const throttledSend = useCallback((
    cmd: RobotCommand,
    bucket: React.MutableRefObject<{ last: number; timer: number | null; pending: RobotCommand | null }>,
    interval = 50
  ) => {
    // 检查操作权限
    if (cmd.type !== "mode" && !checkOperationPermission()) {
      return;
    }

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
  }, [sendHexData, checkOperationPermission]);

  /**
   * 发送重复动作双包（选中动作包 + 序列号+1且data=0的追加包）
   */
  // 修改sendActionDoublePacket函数，确保数据正确传递
  const sendActionDoublePacket = useCallback((actionType: 'record' | 'repeat', actionNum: number) => {
    if (!checkOperationPermission()) return;
    if (!connected || !socketRef.current) {
      toast({ title: '未连接', description: '请先连接机器人' });
      return;
    }
  
    // 校验动作编号（1-5）
    if (actionNum < 1 || actionNum > 5) {
      toast({ 
        title: '参数错误', 
        description: `动作编号必须为1-5，当前为${actionNum}`,
        variant: 'destructive' 
      });
      return;
    }
  
    const commandCode = actionType === 'record' ? COMMAND_CODES.RECORD : COMMAND_CODES.REPEAT;
  
    // 1. 动作包：数据为动作编号（0x01-0x05）
    const firstSequence = sequenceCounter.current++;
    if (firstSequence > 255) sequenceCounter.current = 1;
    const actionData = [actionNum]; // 关键：明确数据为1字节（0x01-0x05）
    const firstPacket: RobotPacket = {
      frame_header: 0xA5,
      // 长度计算：1（序列号） + 2（命令码） + 数据长度 → 必须正确
      length: 1 + 2 + actionData.length, 
      sequence: firstSequence,
      flags: commandCode,
      data: actionData, // 传递动作编号
      frame_end: 0xFF
    };
    const firstBytes = packetToBytes(firstPacket);
    const firstHexStr = firstBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
  
    // 2. 追加包：数据固定为0x00
    const secondSequence = sequenceCounter.current++;
    if (secondSequence > 255) sequenceCounter.current = 1;
    const appendData = [0x00]; // 关键：明确追加包数据为1字节0x00
    const secondPacket: RobotPacket = {
      frame_header: 0xA5,
      length: 1 + 2 + appendData.length, // 同样修正长度计算
      sequence: secondSequence,
      flags: commandCode,
      data: appendData, // 传递0x00
      frame_end: 0xFF
    };
    const secondBytes = packetToBytes(secondPacket);
    const secondHexStr = secondBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
  
    // 发送逻辑（保留）
    try {
      socketRef.current.send(new Uint8Array(firstBytes));
      logCommand({ type: actionType, data: { actionNum } }, firstHexStr, 'sent');
      
      setTimeout(() => {
        if (socketRef.current && connected) {
          socketRef.current.send(new Uint8Array(secondBytes));
          logCommand({ type: actionType, data: { actionNum: 0 } }, secondHexStr, 'sent');
        }
      }, 20); // 稍微延长延迟，确保STM32正确接收顺序
      
      toast({
        title: `${actionType === 'record' ? '记录' : '重复'}动作指令已发送`,
        description: `动作${actionNum}包: ${firstHexStr} | 追加包: ${secondHexStr}`,
      });
    } catch (error) {
      // 错误处理（保留）
      logCommand({ type: actionType, data: { actionNum } }, firstHexStr, 'error', String(error));
      logCommand({ type: actionType, data: { actionNum: 0 } }, secondHexStr, 'error', String(error));
      toast({ title: '发送失败', description: String(error), variant: 'destructive' });
    }
  
    // 更新UI状态（保留）
    if (actionType === 'record') {
      setRecordMenuOpen(false);
      setSelectedRecordAction(actionNum);
    } else {
      setRepeatMenuOpen(false);
      setSelectedRepeatAction(actionNum);
    }
  }, [connected, toast, logCommand, checkOperationPermission]);

  /**
   * 处理模式切换
   */
  const handleModeChange = useCallback((mode: RobotMode) => {
    setCurrentMode(mode);
    setModeMenuOpen(false);
    
    // 发送模式切换命令
    const cmd: RobotCommand = {
      type: "mode",
      data: { mode: MODE_MAP[mode].code }
    };
    sendHexData(cmd, true);
    
    // 如果切换到急停模式，重置所有控制状态
    if (mode === "emergency") {
      setZSpeed(0);
      setStick({ x: 0, y: 0 });
      setYawAngle(0);
      setRollAngle(0);
      setPumpOn(false);
      setUpDownSpeed(0);
      setPumpSpeed(0);
    }
  }, [sendHexData]);

  /**
   * 点击外部关闭模式菜单
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(event.target as Node)) {
        setModeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * 点击外部关闭repeat下拉菜单
   */
  useEffect(() => {
    const handleClickOutsideRepeat = (event: MouseEvent) => {
      if (repeatMenuRef.current && !repeatMenuRef.current.contains(event.target as Node)) {
        setRepeatMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideRepeat);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideRepeat);
    };
  }, []);
  
  /**
   * 点击外部关闭record下拉菜单
   */
  useEffect(() => {
    const handleClickOutsideRecord = (event: MouseEvent) => {
      if (recordMenuRef.current && !recordMenuRef.current.contains(event.target as Node)) {
        setRecordMenuOpen(false);
      }
    };
  
    document.addEventListener("mousedown", handleClickOutsideRecord);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideRecord);
    };
  }, []);

  /**
   * 旋转控制相关函数
   */
  const getZSpeedFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = angleRef.current;
    if (!el) return zSpeed;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ("clientX" in e ? e.clientX : 0) - cx;
    const dy = ("clientY" in e ? e.clientY : 0) - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    
    const speed = (deg <= 180 ? deg / 180 : (deg - 360) / 180) * MAX_SPEED;
    return Number(speed.toFixed(3));
  };

  const handleZSpeed = useCallback((speed: number) => {
    setZSpeed(speed);
    const cmd: RobotCommand = { type: "z_speed", data: { z_speed: speed } };
    throttledSend(cmd, zSpeedThrottleRef, 50);
  }, [throttledSend]);

  const onDialPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    
    if (!checkOperationPermission()) return;
    
    e.preventDefault();
    handleZSpeed(getZSpeedFromEvent(e));

    const move = (ev: PointerEvent) => handleZSpeed(getZSpeedFromEvent(ev));
    const up = () => {
      handleZSpeed(0);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  /**
   * 移动控制相关函数
   */
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

    return { x: Math.round(dx), y: Math.round(dy) };
  };

  const handleStickMove = useCallback((pos: { x: number; y: number }) => {
    setStick(pos);

    const len = Math.hypot(pos.x, pos.y);
    const withinDeadzone = len < DEADZONE_PX;
    const x = withinDeadzone ? 0 : pos.x;
    const y = withinDeadzone ? 0 : pos.y;

    if (x === 0 && y === 0) {
      throttledSend({ type: "move", data: { x_speed: 0, y_speed: 0 } }, moveThrottleRef, 50);
      return;
    }

    const x_speed = (x / STICK_R) * MAX_SPEED;
    const y_speed = (-y / STICK_R) * MAX_SPEED;

    const cmd: RobotCommand = {
      type: "move",
      data: {
        x_speed: Number(x_speed.toFixed(3)),
        y_speed: Number(y_speed.toFixed(3)),
      },
    };
    throttledSend(cmd, moveThrottleRef, 50);
  }, [throttledSend]);

  const onRightPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    
    if (!checkOperationPermission()) return;
    
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

  /**
   * YAW轴控制相关函数
   */
  const getYawAngleFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = yawRef.current;
    if (!el) return yawAngle;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ("clientX" in e ? e.clientX : 0) - cx;
    const dy = ("clientY" in e ? e.clientY : 0) - cy;
    
    let deg = Math.atan2(dx, -dy) * (180 / Math.PI);
    deg = Math.max(-80, Math.min(80, deg));
    
    return Number(deg.toFixed(1))
  };

  const handleYawRotate = useCallback((deg: number) => {
    setYawAngle(deg);
    const cmd: RobotCommand = { type: "yaw", data: { yaw: deg } };
    throttledSend(cmd, yawThrottleRef, 50);
  }, [throttledSend]);

  const onYawPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    
    if (!checkOperationPermission()) return;
    
    e.preventDefault();
    handleYawRotate(getYawAngleFromEvent(e));

    const move = (ev: PointerEvent) => handleYawRotate(getYawAngleFromEvent(ev));
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  /**
   * ROLL轴控制相关函数
   */
  const getRollAngleFromEvent = (e: React.PointerEvent | PointerEvent | MouseEvent) => {
    const el = rollRef.current;
    if (!el) return rollAngle;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = ("clientX" in e ? e.clientX : 0) - cx;
    const dy = ("clientY" in e ? e.clientY : 0) - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return Number(deg.toFixed(1))
  };

  const handleRollRotate = useCallback((deg: number) => {
    setRollAngle(deg);
    const cmd: RobotCommand = { type: "roll", data: { roll: deg } };
    throttledSend(cmd, rollThrottleRef, 50);
  }, [throttledSend]);

  const onRollPointerDown = (e: React.PointerEvent) => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    
    if (!checkOperationPermission()) return;
    
    e.preventDefault();
    handleRollRotate(getRollAngleFromEvent(e));

    const move = (ev: PointerEvent) => handleRollRotate(getRollAngleFromEvent(ev));
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  /**
   * 料泵控制相关函数
   */
  const handlePumpToggle = useCallback(() => {
    if (!checkOperationPermission()) return;
    
    // 切换状态（0<->1）
    const newState = pumpOn === 0 ? 1 : 0;
    setPumpOn(newState);
      
    const cmd: RobotCommand = {
      type: "pump",
      data: { pump: newState } // 传递数值
    };
    throttledSend(cmd, pumpThrottleRef, 50);
  }, [pumpOn, throttledSend, checkOperationPermission]);

  const handlePumpSpeedChange = useCallback((speed: number) => {
    if (!checkOperationPermission()) return;
    
    const clampedSpeed = Math.max(0, Math.min(600, Math.round(speed)));
    setPumpSpeed(clampedSpeed);
    const cmd: RobotCommand = { type: "pump_speed", data: { pump_speed: clampedSpeed } };
    throttledSend(cmd, pumpSpeedThrottleRef, 100);
  }, [throttledSend, checkOperationPermission]);

  /**
   * 上下移动控制相关函数
   */
  const handleUpDownStart = useCallback((direction: 'up' | 'down') => {
    if (!connected) {
      toast({ title: "请先连接机器人" });
      return;
    }
    
    if (!checkOperationPermission()) return;

    const increment = direction === 'up' ? 0.1 : -0.1;
    
    const updateSpeed = () => {
      setUpDownSpeed(current => {
        const newSpeed = Math.max(-2, Math.min(2, current + increment));
        const cmd: RobotCommand = { type: "up_down", data: { up_down: newSpeed } };
        throttledSend(cmd, upDownThrottleRef, 50);
        return newSpeed;
      });
    };

    updateSpeed();
    upDownIntervalRef.current = window.setInterval(updateSpeed, 100);
  }, [connected, throttledSend, toast, checkOperationPermission]);

  const handleUpDownStop = useCallback(() => {
    if (upDownIntervalRef.current) {
      clearInterval(upDownIntervalRef.current);
      upDownIntervalRef.current = null;
    }
    
    setUpDownSpeed(0);
    const cmd: RobotCommand = { type: "up_down", data: { up_down: 0 } };
    throttledSend(cmd, upDownThrottleRef, 50);
  }, [throttledSend]);

  /**
   * 新增：发送3.14测试值
   */
  const sendTestValue = useCallback(() => {
    if (!checkOperationPermission()) return;
    
    const testValue = 3.14;
    const cmd: RobotCommand = {
      type: "test",
      data: { test_value: testValue }
    };
    
    sendHexData(cmd, true);
  }, [sendHexData, checkOperationPermission]);

  /**
   * 组件清理函数
   */
  useEffect(() => {
    return () => {
      [zSpeedThrottleRef, moveThrottleRef, yawThrottleRef, rollThrottleRef, pumpThrottleRef, upDownThrottleRef, pumpSpeedThrottleRef].forEach(ref => {
        if (ref.current.timer) {
          clearTimeout(ref.current.timer);
          ref.current.timer = null;
        }
      });
      
      if (upDownIntervalRef.current) {
        clearInterval(upDownIntervalRef.current);
        upDownIntervalRef.current = null;
      }
      
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // 渲染计算
  const dialCx = 110, dialCy = 110, dialR = DIAL_R;
  const speedPercentage = zSpeed / MAX_SPEED;
  const deg = speedPercentage >= 0 ? speedPercentage * 180 : (speedPercentage + 1) * 180 + 180;
  const rad = ((deg - 90) * Math.PI) / 180;
  const knobX = dialCx + (dialR - 10) * Math.cos(rad);
  const knobY = dialCy + (dialR - 10) * Math.sin(rad);

  const stickCx = 110, stickCy = 110, stickR = STICK_R;
  const thumbX = stickCx + stick.x;
  const thumbY = stickCy + stick.y;

  let dirText = "待命";
  let xSpeedDisplay = 0, ySpeedDisplay = 0;
  if (stick.x !== 0 || stick.y !== 0) {
    xSpeedDisplay = (stick.x / stickR) * MAX_SPEED;
    ySpeedDisplay = (-stick.y / stickR) * MAX_SPEED;
    
    if (Math.abs(xSpeedDisplay) > Math.abs(ySpeedDisplay)) {
      dirText = xSpeedDisplay > 0 ? "向右" : "向左";
    } else {
      dirText = ySpeedDisplay > 0 ? "前进" : "后退";
    }
  }

  const yawCx = 110, yawCy = 110, yawR = DIAL_R;
  const yawRad = (yawAngle * Math.PI) / 180;
  const yawKnobX = yawCx + (yawR - 10) * Math.sin(yawRad);
  const yawKnobY = yawCy - (yawR - 10) * Math.cos(yawRad);

  const rollCx = 110, rollCy = 110, rollR = DIAL_R;
  const rollRad = (((rollAngle % 360) - 90) * Math.PI) / 180;
  const rollKnobX = rollCx + (rollR - 10) * Math.cos(rollRad);
  const rollKnobY = rollCy + (rollR - 10) * Math.sin(rollRad);

  return (
    <section className="container py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          地坪漆涂敷机器人
        </h1>
        <p className="text-muted-foreground mt-2">输入机器人的IP地址和端口就可以开始控制啦!</p>
      </header>

      <div className="space-y-6">
        {/* 连接配置 */}
        <Card className="card-glow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-primary" /> 直连配置
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
                  disabled={connected || isEmergencyMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="robot-port">机器人端口</Label>
                <Input
                  id="robot-port"
                  placeholder="8080"
                  value={robotPort}
                  onChange={(e) => setRobotPort(e.target.value)}
                  disabled={connected || isEmergencyMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-server">日志服务器</Label>
                <Input
                  id="log-server"
                  placeholder="http://192.168.0.5:8082"
                  value={logServerUrl}
                  onChange={(e) => setLogServerUrl(e.target.value)}
                  disabled={isEmergencyMode}
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
              <Button 
                onClick={handleConnect} 
                variant={connected ? "destructive" : "default"}
                disabled={isEmergencyMode}
              >
                {connected ? "断开连接" : "连接机器人"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 控制面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 旋转控制（z_speed） */}
          <Card className="card-glow" style={{ opacity: isEmergencyMode ? 0.7 : 1 }}>
            <CardHeader className="pb-3">
              <CardTitle>旋转控制 (z_speed)</CardTitle>
              <CardDescription>拖拽调整机器人旋转速度</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6">
              <div className="relative">
                <svg
                  ref={angleRef}
                  width="220"
                  height="220"
                  onPointerDown={onDialPointerDown}
                  className={`select-none cursor-pointer control-dial ${isEmergencyMode ? 'cursor-not-allowed' : ''}`}
                >
                  <circle
                    cx={dialCx}
                    cy={dialCy}
                    r={dialR}
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="3"
                  />
                  <circle
                    cx={knobX}
                    cy={knobY}
                    r="8"
                    fill="url(#gradient-primary)"
                    className="drop-shadow-sm"
                  />
                  <defs>
                    <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                    </linearGradient>
                  </defs>
                  <text x={dialCx} y={25} textAnchor="middle" className="text-xs fill-muted-foreground">
                    顺时针
                  </text>
                  <text x={dialCx} y={205} textAnchor="middle" className="text-xs fill-muted-foreground">
                    逆时针
                  </text>
                  <text x={25} y={dialCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    停止
                  </text>
                  <text x={195} y={dialCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    停止
                  </text>
                </svg>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                <Gauge className="h-3 w-3 mr-1" />
                {zSpeed.toFixed(2)} m/s
              </Badge>
            </CardContent>
          </Card>

          {/* 移动控制（x_speed, y_speed） */}
          <Card className="card-glow" style={{ opacity: isEmergencyMode ? 0.7 : 1 }}>
            <CardHeader className="pb-3">
              <CardTitle>移动控制</CardTitle>
              <CardDescription>十字控制器，x_speed/y_speed直接控制</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative">
                <svg
                  ref={rightRef}
                  width="220"
                  height="220"
                  onPointerDown={onRightPointerDown}
                  className={`select-none cursor-pointer control-dial ${isEmergencyMode ? 'cursor-not-allowed' : ''}`}
                >
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
                  <circle
                    cx={thumbX}
                    cy={thumbY}
                    r="12"
                    fill="url(#gradient-secondary)"
                    className="drop-shadow-sm"
                  />
                  <defs>
                    <linearGradient id="gradient-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--secondary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                  <text x={stickCx} y={15} textAnchor="middle" className="text-xs fill-muted-foreground">
                    前 (y+)
                  </text>
                  <text x={stickCx} y={210} textAnchor="middle" className="text-xs fill-muted-foreground">
                    后 (y-)
                  </text>
                  <text x={15} y={stickCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    左 (x-)
                  </text>
                  <text x={205} y={stickCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                    右 (x+)
                  </text>
                </svg>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <Badge variant="outline" className="px-3 py-1">
                  {dirText}
                </Badge>
                <div className="flex gap-2">
                  <Badge variant="outline" className="px-3 py-1">
                    x: {xSpeedDisplay.toFixed(2)} m/s
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1">
                    y: {ySpeedDisplay.toFixed(2)} m/s
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card className="card-glow" style={{ overflow: 'visible', marginBottom: '10rem' }}>
          <CardHeader className="pb-3">
            <CardTitle>快速操作</CardTitle>
            <CardDescription>常用命令快捷按钮</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {/* 模式选择下拉按钮 */}
                <div className="relative" ref={modeMenuRef}>
                  <Button 
                    onClick={() => setModeMenuOpen(!modeMenuOpen)}
                    variant={currentMode === "emergency" ? "destructive" : "default"}
                    className={`${currentMode === "emergency" ? "animate-pulse" : ""}`}
                  >
                    {MODE_MAP[currentMode].name}
                    <ChevronDownIcon className={`ml-2 h-4 w-4 transition-transform ${modeMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {/* 下拉菜单 */}
                  {modeMenuOpen && (
                    <div className="absolute z-10 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1">
                      {Object.entries(MODE_MAP).map(([key, { name }]) => (
                        <button
                          key={key}
                          onClick={() => handleModeChange(key as RobotMode)}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            currentMode === key 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => sendHexData({ type: "z_speed", data: { z_speed: 0 } }, true)}
                  variant="outline"
                  disabled={!connected || isEmergencyMode}
                >
                  停止旋转
                </Button>
                <Button 
                  onClick={() => sendHexData({ type: "move", data: { x_speed: 0, y_speed: 0.5 } }, true)}
                  variant="outline"
                  disabled={!connected || isEmergencyMode}
                >
                  慢速前进
                </Button>
                
                {/* 新增：3.14测试按钮 */}
                <Button 
                  onClick={sendTestValue}
                  variant="secondary"
                  disabled={!connected || isEmergencyMode}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  测试3.14
                </Button>
              </div>
              
              {/* 测试结果显示 */}
              {testResults && (
                <div className="bg-muted/50 p-2 rounded-md text-sm flex items-center gap-2">
                  <span className="font-medium">测试结果:</span>
                  <span>发送值: {testResults.sent}</span>
                  <span>字节: [{testResults.bytes.join(', ')}]</span>
                  <span>十六进制: 0x{testResults.hex}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <div className="relative" ref={recordMenuRef}>
                  <Button 
                    onClick={() => setRecordMenuOpen(!recordMenuOpen)}
                    variant="secondary"
                    disabled={!connected || isEmergencyMode}
                    className="flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    记录动作
                    <ChevronDownIcon className={`ml-1 h-4 w-4 transition-transform ${recordMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                        
                  {/* 记录动作下拉选项（横向排列动作1-5） */}
                  {recordMenuOpen && (
                    <div className="absolute z-50 mt-2 w-fit rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-2 px-1">
                      {[1, 2, 3, 4, 5].map((action) => (
                        <button
                          key={action}
                          onClick={() => sendActionDoublePacket('record', action)}
                          className={`inline-block px-4 py-2 text-sm mx-1 rounded ${
                            selectedRecordAction === action 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          动作{action}
                        </button>
					  ))}
					</div>
                  )}
                </div>
                {/* repeat按钮下拉菜单 */}
                <div className="relative" ref={repeatMenuRef}>
                  <Button 
                    onClick={() => setRepeatMenuOpen(!repeatMenuOpen)}
                    variant="secondary"
                    disabled={!connected || isEmergencyMode}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    重复动作
                    <ChevronDownIcon className={`ml-1 h-4 w-4 transition-transform ${repeatMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {/* 下拉动作选择栏（横向排列动作1-5） */}
                  {repeatMenuOpen && (
                    <div className="absolute z-50 mt-2 w-fit rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-2 px-1">
                      {[1, 2, 3, 4, 5].map((action) => (
                        <button
                          key={action}
                          onClick={() => sendRepeatDoublePacket('repeat', action)}
                          className={`inline-block px-4 py-2 text-sm mx-1 rounded ${
                            selectedRepeatAction === action 
                              ? 'bg-primary text-primary-foreground' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          动作{action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 机械臂控制 */}
        <Card className="card-glow" style={{ opacity: isEmergencyMode ? 0.7 : 1 }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <RotateCw className="h-5 w-5 text-primary" />
              机械臂控制
            </CardTitle>
            <CardDescription>左摇杆控制YAW轴（±80°），右摇杆控制ROLL轴（360°）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* YAW轴控制 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-medium">YAW轴控制</h4>
                <div className="relative">
                  <svg
                    ref={yawRef}
                    width="220"
                    height="220"
                    onPointerDown={onYawPointerDown}
                    className={`select-none cursor-pointer control-dial ${isEmergencyMode ? 'cursor-not-allowed' : ''}`}
                  >
                    <path
                      d={`M ${yawCx - yawR * 0.985} ${yawCy - yawR * 0.174} A ${yawR} ${yawR} 0 0 0 ${yawCx + yawR * 0.985} ${yawCy - yawR * 0.174}`}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={yawKnobX}
                      cy={yawKnobY}
                      r="8"
                      fill="url(#gradient-yaw)"
                      className="drop-shadow-sm"
                    />
                    <defs>
                      <linearGradient id="gradient-yaw" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" />
                        <stop offset="100%" stopColor="hsl(var(--destructive)/0.7)" />
                      </linearGradient>
                    </defs>
                    <text x={yawCx - 60} y={yawCy + 80} textAnchor="middle" className="text-xs fill-muted-foreground">
                      -80°
                    </text>
                    <text x={yawCx} y={yawCy - 80} textAnchor="middle" className="text-xs fill-muted-foreground">
                      0°
                    </text>
                    <text x={yawCx + 60} y={yawCy + 80} textAnchor="middle" className="text-xs fill-muted-foreground">
                      +80°
                    </text>
                  </svg>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  <Gauge className="h-3 w-3 mr-1" />
                  {yawAngle.toFixed(1)}°
                </Badge>
              </div>

              {/* ROLL轴控制 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-medium">ROLL轴控制</h4>
                <div className="relative">
                  <svg
                    ref={rollRef}
                    width="220"
                    height="220"
                    onPointerDown={onRollPointerDown}
                    className={`select-none cursor-pointer control-dial ${isEmergencyMode ? 'cursor-not-allowed' : ''}`}
                  >
                    <circle
                      cx={rollCx}
                      cy={rollCy}
                      r={rollR}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="3"
                    />
                    <circle
                      cx={rollKnobX}
                      cy={rollKnobY}
                      r="8"
                      fill="url(#gradient-roll)"
                      className="drop-shadow-sm"
                    />
                    <defs>
                      <linearGradient id="gradient-roll" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="hsl(var(--accent)/0.7)" />
                      </linearGradient>
                    </defs>
                    <text x={rollCx} y={25} textAnchor="middle" className="text-xs fill-muted-foreground">
                      0°
                    </text>
                    <text x={rollCx} y={205} textAnchor="middle" className="text-xs fill-muted-foreground">
                      180°
                    </text>
                    <text x={25} y={rollCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                      270°
                    </text>
                    <text x={195} y={rollCy + 5} textAnchor="middle" className="text-xs fill-muted-foreground">
                      90°
                    </text>
                  </svg>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  <Gauge className="h-3 w-3 mr-1" />
                  {rollAngle.toFixed(1)}°
                </Badge>
              </div>
            </div>

            {/* 料泵和上下移动控制 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 pt-6 border-t border-border">
              {/* 上下移动控制 */}
              <div className="flex flex-col items-center space-y-4">
                <h4 className="text-sm font-medium">UP_DOWN轴控制</h4>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <svg width="40" height="200" className="select-none">
                      <line
                        x1="20"
                        y1="20"
                        x2="20"
                        y2="180"
                        stroke="hsl(var(--border))"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      
                      <text x="35" y="25" textAnchor="start" className="text-xs fill-muted-foreground">
                        +2
                      </text>
                      <line x1="15" y1="20" x2="25" y2="20" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <text x="35" y="65" textAnchor="start" className="text-xs fill-muted-foreground">
                        +1
                      </text>
                      <line x1="15" y1="60" x2="25" y2="60" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <text x="35" y="105" textAnchor="start" className="text-xs fill-muted-foreground">
                        0
                      </text>
                      <line x1="15" y1="100" x2="25" y2="100" stroke="hsl(var(--border))" strokeWidth="2" />
                      
                      <text x="35" y="145" textAnchor="start" className="text-xs fill-muted-foreground">
                        -1
                      </text>
                      <line x1="15" y1="140" x2="25" y2="140" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <text x="35" y="185" textAnchor="start" className="text-xs fill-muted-foreground">
                        -2
                      </text>
                      <line x1="15" y1="180" x2="25" y2="180" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <circle
                        cx="20"
                        cy={100 - (upDownSpeed / 2) * 80}
                        r="6"
                        fill="url(#gradient-up-down)"
                        className="drop-shadow-sm"
                      />
                      
                      <defs>
                        <linearGradient id="gradient-up-down" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--primary))" />
                          <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!connected || isEmergencyMode}
                      onMouseDown={() => handleUpDownStart('up')}
                      onMouseUp={handleUpDownStop}
                      onMouseLeave={handleUpDownStop}
                      onTouchStart={() => handleUpDownStart('up')}
                      onTouchEnd={handleUpDownStop}
                      className="flex items-center gap-1 select-none"
                    >
                      <ChevronUp className="h-4 w-4" />
                      UP
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!connected || isEmergencyMode}
                      onMouseDown={() => handleUpDownStart('down')}
                      onMouseUp={handleUpDownStop}
                      onMouseLeave={handleUpDownStop}
                      onTouchStart={() => handleUpDownStart('down')}
                      onTouchEnd={handleUpDownStop}
                      className="flex items-center gap-1 select-none"
                    >
                      <ChevronDown className="h-4 w-4" />
                      DOWN
                    </Button>
                  </div>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  <Gauge className="h-3 w-3 mr-1" />
                  {upDownSpeed.toFixed(1)}
                </Badge>
              </div>
              
              {/* 料泵控制 */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <h4 className="text-sm font-medium">料泵控制</h4>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <svg width="40" height="160" className="select-none">
                      <line
                        x1="20"
                        y1="20"
                        x2="20"
                        y2="140"
                        stroke="hsl(var(--border))"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      
                      <text x="35" y="25" textAnchor="start" className="text-xs fill-muted-foreground">
                        600
                      </text>
                      <line x1="15" y1="20" x2="25" y2="20" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <text x="35" y="45" textAnchor="start" className={`text-xs ${pumpSpeed >= 400 ? 'fill-destructive font-medium' : 'fill-muted-foreground'}`}>
                        400
                      </text>
                      <line x1="15" y1="40" x2="25" y2="40" stroke={pumpSpeed >= 400 ? "hsl(var(--destructive))" : "hsl(var(--border))"} strokeWidth="2" />
                      
                      <text x="35" y="85" textAnchor="start" className="text-xs fill-muted-foreground">
                        200
                      </text>
                      <line x1="15" y1="80" x2="25" y2="80" stroke="hsl(var(--border))" strokeWidth="1" />
                      
                      <text x="35" y="145" textAnchor="start" className="text-xs fill-muted-foreground">
                        0
                      </text>
                      <line x1="15" y1="140" x2="25" y2="140" stroke="hsl(var(--border))" strokeWidth="2" />
                      
                      <rect
                        x="12"
                        y="20"
                        width="16"
                        height="20"
                        fill="hsl(var(--destructive)/0.1)"
                        stroke="hsl(var(--destructive)/0.3)"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                      
                      <circle
                        cx="20"
                        cy={140 - (pumpSpeed / 600) * 120}
                        r="6"
                        fill={pumpSpeed >= 400 ? "url(#gradient-pump-warning)" : "url(#gradient-pump-normal)"}
                        className="drop-shadow-sm"
                      />
                      
                      <defs>
                        <linearGradient id="gradient-pump-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--secondary))" />
                          <stop offset="100%" stopColor="hsl(var(--accent))" />
                        </linearGradient>
                        <linearGradient id="gradient-pump-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="hsl(var(--destructive))" />
                          <stop offset="100%" stopColor="hsl(var(--destructive)/0.7)" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!connected || isEmergencyMode}
                      onMouseDown={() => {
                        const interval = setInterval(() => {
                          setPumpSpeed(current => {
                            const newSpeed = Math.min(600, current + 10);
                            handlePumpSpeedChange(newSpeed);
                            return newSpeed;
                          });
                        }, 100);
                        const stopInterval = () => {
                          clearInterval(interval);
                          document.removeEventListener('mouseup', stopInterval);
                          document.removeEventListener('mouseleave', stopInterval);
                        };
                        document.addEventListener('mouseup', stopInterval);
                        document.addEventListener('mouseleave', stopInterval);
                      }}
                      className="flex items-center gap-1 select-none"
                    >
                      <ChevronUp className="h-4 w-4" />
                      +
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!connected || isEmergencyMode}
                      onMouseDown={() => {
                        const interval = setInterval(() => {
                          setPumpSpeed(current => {
                            const newSpeed = Math.max(0, current - 10);
                            handlePumpSpeedChange(newSpeed);
                            return newSpeed;
                          });
                        }, 100);
                        const stopInterval = () => {
                          clearInterval(interval);
                          document.removeEventListener('mouseup', stopInterval);
                          document.removeEventListener('mouseleave', stopInterval);
                        };
                        document.addEventListener('mouseup', stopInterval);
                        document.addEventListener('mouseleave', stopInterval);
                      }}
                      className="flex items-center gap-1 select-none"
                    >
                      <ChevronDown className="h-4 w-4" />
                      -
                    </Button>
                  </div>
                </div>
                
                <Badge variant={pumpSpeed >= 400 ? "destructive" : "outline"} className="px-3 py-1">
                  {pumpSpeed} r/min {pumpSpeed >= 400 && '⚠️'}
                </Badge>
                
                <Button
                  onClick={handlePumpToggle}
                  disabled={!connected || isEmergencyMode}
                  variant={pumpOn ? "default" : "outline"}
                  size="lg"
                  className="flex items-center gap-2 min-w-[120px]"
                >
                  <Zap className={`h-5 w-5 ${pumpOn ? 'animate-pulse' : ''}`} />
                  料泵 {pumpOn ? '开' : '关'}
                </Button>
                
                <Badge variant={pumpOn ? "default" : "secondary"} className="px-3 py-1">
                  {pumpOn ? '运行中' : '已停止'}
                </Badge>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button 
                onClick={() => {
                  if (!checkOperationPermission()) return;
                  
                  // 保留有逻辑：重置前端状态变量
                  setYawAngle(0);
                  setRollAngle(0);
                  setPumpOn(false);
                  setUpDownSpeed(0);
                  setPumpSpeed(200);
                  setZSpeed(0);
                  
                  // 新增：添加reset: 1参数（执行复位）
                  sendHexData({ 
                    type: "arm_reset", 
                    data: { reset: 1 }  // 传递1表示执行复位操作
                  }, true);
                }}
                variant="outline"
                disabled={!connected || isEmergencyMode}
                className="flex items-center gap-2"
              >
                {/* 按钮图标和文字保持不变 */}
                <RotateCcw size={16} />
                机械臂复位
              </Button>
              
              {/* （可选）添加取消复位按钮，用于发送reset: 0 */}
              <Button 
                onClick={() => {
                  if (!checkOperationPermission()) return;
                  sendHexData({ 
                    type: "arm_reset", 
                    data: { reset: 0 }  // 传递0表示取消复位
                  }, true);
                }}
                variant="secondary"
                disabled={!connected || isEmergencyMode}
                className="flex items-center gap-2 ml-2"
              >
                <RotateCw size={16} />
                取消复位
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default DirectRobotController;




