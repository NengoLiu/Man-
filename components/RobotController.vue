<template>
  <div class="controller-container">
    <!-- 状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <div class="connection-indicator" :class="connectionStatus">
          <div class="indicator-dot"></div>
          <span class="status-text">{{ connectionText }}</span>
        </div>
      </div>
      
      <div class="status-right">
        <div class="battery-info">
          <span class="battery-text">{{ batteryLevel }}%</span>
          <div class="battery-icon">
            <div class="battery-level" :style="{ width: batteryLevel + '%' }"></div>
          </div>
        </div>
        
        <button class="power-button" @click="toggleConnection">
          <span class="power-icon">⚡</span>
        </button>
      </div>
    </div>
    
    <!-- 主控制区域 -->
    <div class="main-controls">
      <!-- 左侧虚拟摇杆 -->
      <div class="joystick-container left-joystick">
        <h3 class="joystick-label">移动控制</h3>
        <div 
          class="joystick-area"
          @touchstart="handleJoystickStart"
          @touchmove="handleJoystickMove"
          @touchend="handleJoystickEnd"
          @mousedown="handleJoystickStart"
          @mousemove="handleJoystickMove"
          @mouseup="handleJoystickEnd"
        >
          <div class="joystick-background"></div>
          <div 
            class="joystick-thumb"
            :style="joystickStyle"
          ></div>
        </div>
        <div class="joystick-info">
          <p>X: {{ joystickPosition.x.toFixed(2) }}</p>
          <p>Y: {{ joystickPosition.y.toFixed(2) }}</p>
        </div>
      </div>
      
      <!-- 右侧方向键 -->
      <div class="dpad-container">
        <h3 class="dpad-label">方向控制</h3>
        <div 
          class="dpad-area"
          @touchstart="startDPad"
          @touchmove="moveDPad"
          @touchend="endDPad"
          @mousedown="startDPad"
          @mousemove="moveDPad"
          @mouseup="endDPad"
        >
          <div class="dpad-background"></div>
          <div 
            class="dpad-thumb"
            :style="dpadStyle"
          ></div>
          
          <!-- 方向指示器 -->
          <div class="direction-indicators">
            <div class="direction-indicator up" :class="{ active: dpadDirection.includes('up') }">↑</div>
            <div class="direction-indicator down" :class="{ active: dpadDirection.includes('down') }">↓</div>
            <div class="direction-indicator left" :class="{ active: dpadDirection.includes('left') }">←</div>
            <div class="direction-indicator right" :class="{ active: dpadDirection.includes('right') }">→</div>
          </div>
        </div>
        <div class="dpad-info">
          <p>方向: {{ dpadDirection || '无' }}</p>
        </div>
      </div>
    </div>
    
    <!-- 紧急停止按钮 -->
    <div class="emergency-controls">
      <button class="emergency-stop" @click="handleEmergencyStop">
        <span class="emergency-icon">🛑</span>
        <span class="emergency-text">紧急停止</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

// 手动声明缺失的类型
declare interface HTMLElement {
  getBoundingClientRect(): DOMRect;
}
declare type TouchEvent = {
  touches: Array<{ clientX: number; clientY: number }>;
  preventDefault: () => void;
};
declare type MouseEvent = {
  clientX: number;
  clientY: number;
  currentTarget: any;
  preventDefault: () => void;
};

// 响应式数据
const connectionStatus = ref('connected')
const batteryLevel = ref(85)
const joystickPosition = reactive({ x: 0, y: 0 })
const dpadPosition = reactive({ x: 0, y: 0 })
const dpadDirection = ref('')

// 控制范围和参数
const joystickRadius = 80
const dpadRange = 60

// 计算属性
const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中'
    case 'disconnected': return '未连接'
    default: return '未知状态'
  }
})

const joystickStyle = computed(() => {
  return {
    transform: `translate(${joystickPosition.x}px, ${joystickPosition.y}px)`
  }
})

const dpadStyle = computed<{ transform: string }>(() => {
  return {
    transform: `translate(${dpadPosition.x}px, ${dpadPosition.y}px)`
  }
})

// 摇杆相关方法
let joystickCenter = { x: 0, y: 0 }
let isDraggingJoystick = false

const handleJoystickStart = (e: any) => {
  e.preventDefault()
  isDraggingJoystick = true
  // 断言为包含 currentTarget 的元素事件
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  joystickCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
  updateJoystickPosition(e)
}

const updateJoystickPosition = (e: TouchEvent | MouseEvent) => {
  if (!isDraggingJoystick) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  const deltaX = clientX - joystickCenter.x
  const deltaY = clientY - joystickCenter.y
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  
  if (distance <= joystickRadius) {
    joystickPosition.x = deltaX
    joystickPosition.y = deltaY
  } else {
    const angle = Math.atan2(deltaY, deltaX)
    joystickPosition.x = Math.cos(angle) * joystickRadius
    joystickPosition.y = Math.sin(angle) * joystickRadius
  }
}

const handleJoystickMove = (e: TouchEvent | MouseEvent) => {
  e.preventDefault()
  updateJoystickPosition(e)
}

const handleJoystickEnd = () => {
  isDraggingJoystick = false
  joystickPosition.x = 0
  joystickPosition.y = 0
}

// D-Pad相关方法
let dpadCenter = { x: 0, y: 0 }
let isDraggingDpad = false

const calcDPadCenter = (e: Event) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  dpadCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

const startDPad = (e: any) => {
  e.preventDefault()
  isDraggingDpad = true
  calcDPadCenter(e)
  moveDPadLogic(e)
}

const moveDPadLogic = (e: TouchEvent | MouseEvent) => {
  if (!isDraggingDpad) return
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  
  const deltaX = clientX - dpadCenter.x
  const deltaY = clientY - dpadCenter.y
  
  // 限制在范围内
  const clampedX = Math.max(-dpadRange, Math.min(dpadRange, deltaX))
  const clampedY = Math.max(-dpadRange, Math.min(dpadRange, deltaY))
  
  dpadPosition.x = clampedX
  dpadPosition.y = clampedY
  
  // 更新方向
  dpadDirection.value = getDPadDirection()
}

const moveDPad = (e: TouchEvent | MouseEvent) => {
  e.preventDefault()
  moveDPadLogic(e)
}

const endDPad = () => {
  isDraggingDpad = false
  dpadPosition.x = 0
  dpadPosition.y = 0
  dpadDirection.value = ''
}

const getDPadDirection = () => {
  const threshold = 20
  let directions: string[] = []
  
  if (Math.abs(dpadPosition.x) > threshold || Math.abs(dpadPosition.y) > threshold) {
    if (dpadPosition.y < -threshold) directions.push('up')
    if (dpadPosition.y > threshold) directions.push('down')
    if (dpadPosition.x < -threshold) directions.push('left')
    if (dpadPosition.x > threshold) directions.push('right')
  }
  
  return directions.join(' ')
}

// 其他控制方法
const handleEmergencyStop = () => {
  joystickPosition.x = 0
  joystickPosition.y = 0
  dpadPosition.x = 0
  dpadPosition.y = 0
  dpadDirection.value = ''
  
  uni.showToast({
	  title: '紧急停止 - 机器人已停止所有动作',
	  icon: 'none',
	  duration: 2000
  })
}

const toggleConnection = () => {
  if (connectionStatus.value === 'connected') {
    connectionStatus.value = 'disconnected'
  } else {
    connectionStatus.value = 'connecting'
    setTimeout(() => {
      connectionStatus.value = 'connected'
    }, 2000)
  }
}
</script>

<style scoped>
.controller-container {
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 状态栏样式 */
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.status-left {
  display: flex;
  align-items: center;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #28a745;
}

.connection-indicator.connecting .indicator-dot {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.connection-indicator.disconnected .indicator-dot {
  background: #dc3545;
}

.status-text {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.battery-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.battery-text {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
}

.battery-icon {
  width: 30px;
  height: 15px;
  border: 1px solid white;
  border-radius: 2px;
  position: relative;
  background: rgba(255, 255, 255, 0.1);
}

.battery-icon::after {
  content: '';
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 6px;
  background: white;
  border-radius: 0 1px 1px 0;
}

.battery-level {
  height: 100%;
  background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
  border-radius: 1px;
  transition: width 0.3s ease;
}

.power-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.power-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.power-icon {
  color: white;
  font-size: 1rem;
}

/* 主控制区域 */
.main-controls {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 1rem;
  gap: 2rem;
}

.joystick-container, .dpad-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.joystick-label, .dpad-label {
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  text-align: center;
  margin: 0;
}

.joystick-area, .dpad-area {
  width: 150px;
  height: 150px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.joystick-background, .dpad-background {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: absolute;
}

.dpad-background {
  border-radius: 10px;
}

.joystick-thumb, .dpad-thumb {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: 2px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  position: absolute;
  transition: transform 0.1s ease;
}

.dpad-thumb {
  border-radius: 8px;
}

.direction-indicators {
  position: absolute;
  width: 100%;
  height: 100%;
}

.direction-indicator {
  position: absolute;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  font-weight: bold;
  transition: all 0.2s ease;
  user-select: none;
}

.direction-indicator.up {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-indicator.down {
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-indicator.left {
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.direction-indicator.right {
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
}

.direction-indicator.active {
  color: #667eea;
  text-shadow: 0 0 5px rgba(102, 126, 234, 0.5);
  transform: scale(1.2);
}

.direction-indicator.up.active {
  transform: translateX(-50%) scale(1.2);
}

.direction-indicator.down.active {
  transform: translateX(-50%) scale(1.2);
}

.direction-indicator.left.active {
  transform: translateY(-50%) scale(1.2);
}

.direction-indicator.right.active {
  transform: translateY(-50%) scale(1.2);
}

.joystick-info, .dpad-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.joystick-info p, .dpad-info p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  font-family: monospace;
  margin: 0;
}

/* 紧急控制区域 */
.emergency-controls {
  padding: 1.5rem;
  display: flex;
  justify-content: center;
}

.emergency-stop {
  width: 150px;
  height: 50px;
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  border: none;
  border-radius: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  cursor: pointer;
}

.emergency-stop:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
}

.emergency-icon {
  font-size: 1.2rem;
}

.emergency-text {
  color: white;
  font-size: 0.9rem;
  font-weight: bold;
}

/* 动画 */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-controls {
    flex-direction: column;
    gap: 2rem;
  }
  
  .joystick-area, .dpad-area {
    width: 120px;
    height: 120px;
  }
  
  .joystick-thumb, .dpad-thumb {
    width: 30px;
    height: 30px;
  }
}
</style>