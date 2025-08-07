<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div 
        class="celestial-body" 
        v-for="(body, index) in celestialBodies" 
        :key="index"
        :style="body.style"
      ></div>
    </div>
    
    <!-- 主内容 -->
    <div class="main-content">
      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="logo-container">
            <span class="logo-text">🤖</span>
          </div>
          <h1 class="app-title">机器人控制中心</h1>
          <p class="app-subtitle">Robot Control Center</p>
        </div>
        
        <!-- 表单部分 -->
        <div class="form-section">
          <!-- 用户名输入 -->
          <div class="input-group">
            <label class="input-label">用户名</label>
            <input 
              class="input-field" 
              v-model="username" 
              placeholder="请输入用户名"
              type="text"
            />
          </div>
          
          <!-- 密码输入 -->
          <div class="input-group">
            <label class="input-label">密码</label>
            <input 
              class="input-field" 
              v-model="password" 
              placeholder="请输入密码"
              type="password"
            />
          </div>
          
          <!-- 网络选择 -->
          <div class="input-group">
            <label class="input-label">机器人网络</label>
            <div class="network-selector">
              <select 
                class="network-select"
                v-model="selectedNetwork"
              >
                <option v-for="(network, index) in robotNetworks" :key="index" :value="index">
                  {{ network }}
                </option>
              </select>
              <button 
                class="wifi-button" 
                @click="openWifiSettings"
              >
                📶
              </button>
            </div>
          </div>
          
          <!-- 连接状态 -->
          <div class="connection-status">
            <div :class="['status-indicator', connectionStatus]"></div>
            <span class="status-text">{{ connectionText }}</span>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="actions-section">
          <button 
            class="login-button" 
            :class="{ 'loading': isLoading }"
            @click="handleLogin"
            :disabled="isLoading"
          >
            <span v-if="!isLoading">登录</span>
            <span v-else>登录中...</span>
          </button>
          
          <div class="secondary-actions">
            <a class="action-link" @click="handleForgot">忘记密码?</a>
            <a class="action-link" @click="handleRegister">注册账号</a>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部信息 -->
    <div class="footer">
      <p class="footer-text">© 2024 Robot Control Center</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 响应式数据
type CelestialBody = {
  style: {
    left: string;
    top: string;
    animationDelay: string;
    opacity: number;
  };
};
const username = ref('')
const password = ref('')
const selectedNetwork = ref(0)
const connectionStatus = ref('disconnected')
const isLoading = ref(false)
const celestialBodies = ref<any[]>([]);

// 计算属性
const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected': return '已连接到机器人网络'
    case 'connecting': return '正在连接...'
    case 'disconnected': return '未连接'
    default: return '网络状态未知'
  }
})

// 网络选项
const robotNetworks = ['自动检测', 'Robot-5G-001', 'Robot-2.4G-001', 'Robot-Lab-WiFi']

// 生命周期
onMounted(() => {
  startAnimation()
  checkCurrentConnection()
})

// 发射事件
const emit = defineEmits<{
  loginSuccess: []
}>()

// 方法
const startAnimation = () => {
  createCelestialBodies()
}

const createCelestialBodies = () => {
  // 明确 bodies 是 CelestialBody 类型的数组
  const bodies: CelestialBody[] = []; 
  for (let i = 0; i < 20; i++) {
    bodies.push({
      style: {
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        animationDelay: Math.random() * 5 + 's',
        opacity: Math.random() * 0.5 + 0.1
      }
    });
  }
  celestialBodies.value = bodies; // 类型完全匹配，无错误
};

const openWifiSettings = () => {
  uni.showToast({
	  title: '请在系统设置中连接WiFi',
	  icon: 'none',
	  duration: 1500
  })
}

const checkCurrentConnection = () => {
  // 模拟网络状态检查
  setTimeout(() => {
    connectionStatus.value = 'connected'
  }, 2000)
}

const handleLogin = () => {
  if (!username.value.trim()) {
    uni.showToast({
		title: '登陆成功！',
		icon: 'success',
		duration: 2000
	})
    return
  }
  
  if (!password.value.trim()) {
    uni.showToast({
		title: '请输入密码',
		icon: 'none',
		duration: 2000
	})
    return
  }
  
  isLoading.value = true
  
  // 模拟登录过程
  setTimeout(() => {
    isLoading.value = false
    if (username.value === 'admin' && password.value === '123456') {
      uni.showToast({
		  title: '登陆成功！',
		  icon: 'success',
		  duration: 2000
	  })
      emit('loginSuccess')
    } else {
      uni.showToast({
		  title: '用户或密码错误',
		  icon: 'none',
		  duration: 1500
	  })
    }
  }, 2000)
}

const handleForgot = () => {
  uni.showToast({
	  title: '功能开发中...',
	  icon: 'none',
	  duration: 1500
  })
}

const handleRegister = () => {
  uni.showToast({
	  title: '功能开发中...',
	  icon: 'none',
	  duration: 1500
  })
}
</script>

<style scoped>
.login-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.celestial-body {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  animation: twinkle 3s infinite ease-in-out;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.main-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-container {
  margin-bottom: 1rem;
}

.logo-text {
  font-size: 3rem;
  line-height: 1;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  margin: 0 0 0.5rem 0;
}

.app-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

.form-section {
  margin-bottom: 1.5rem;
}

.input-group {
  margin-bottom: 1rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.input-field {
  width: 100%;
  height: 3rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 0 1rem;
  font-size: 1rem;
  color: #333;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
  background: #fff;
}

.network-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.network-select {
  flex: 1;
  height: 3rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 10px;
  padding: 0 1rem;
  font-size: 1rem;
  color: #333;
}

.network-select:focus {
  outline: none;
  border-color: #667eea;
  background: #fff;
}

.wifi-button {
  width: 3rem;
  height: 3rem;
  background: #667eea;
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wifi-button:hover {
  background: #5a67d8;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.connected {
  background: #28a745;
}

.status-indicator.connecting {
  background: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-indicator.disconnected {
  background: #dc3545;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.status-text {
  font-size: 0.9rem;
  color: #666;
}

.actions-section {
  text-align: center;
}

.login-button {
  width: 100%;
  height: 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.login-button.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-button:disabled {
  cursor: not-allowed;
}

.secondary-actions {
  display: flex;
  justify-content: space-between;
}

.action-link {
  color: #667eea;
  font-size: 0.9rem;
  text-decoration: underline;
  cursor: pointer;
}

.action-link:hover {
  color: #5a67d8;
}

.footer {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}

.footer-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  margin: 0;
}
</style>