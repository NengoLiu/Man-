<template>
  <div class="robot">
    <h1>Robot Controller</h1>
    <p v-if="user">你好，{{ user.username }}</p>

    <section>
      <p style="opacity:.8; font-size: 14px; line-height: 1.4;">
        提示：原生 TCP 仅在 App-Plus(打包到手机) 环境可用；H5 环境不支持原生 TCP，已提供 WebSocket 直连示例。
        如需纯 TCP，请在真机 App 中运行或在 ESP8266 侧启用 WebSocket/网桥。
      </p>
    </section>

    <section class="card">
      <div class="row">
        <label>设备 IP</label>
        <input v-model.trim="ip" placeholder="例如 192.168.4.1" />
      </div>
      <div class="row">
        <label>端口</label>
        <input v-model.number="port" type="number" min="1" max="65535" />
      </div>
      <div class="row">
        <label>传输</label>
        <select v-model="mode">
          <option value="socketTask">WebSocket（推荐：ESP8266 开启 socketTask 服务）</option>
          <option value="tcp">TCP（需 App-Plus 原生能力）</option>
        </select>
      </div>

      <div class="row actions">
        <button :disabled="status!=='disconnected'" @click="connect">连接</button>
        <button :disabled="status==='disconnected'" @click="disconnect">断开</button>
        <span class="status" :data-state="status">状态：{{ status }}</span>
      </div>
    </section>

    <section class="pad">
      <div class="pad-row">
        <button class="wide" @click="sendCommand('F')">前进</button>
      </div>
      <div class="pad-row">
        <button @click="sendCommand('L')">左转</button>
        <button class="danger" @click="sendCommand('S')">停止</button>
        <button @click="sendCommand('R')">右转</button>
      </div>
      <div class="pad-row">
        <button class="wide" @click="sendCommand('B')">后退</button>
      </div>

      <div class="row" style="margin-top:8px;">
        <input v-model.trim="customPayload" placeholder="自定义指令（例如：G90 或 PWM:120）" />
        <button @click="sendCustom">发送</button>
      </div>
    </section>

    <section class="card">
      <div class="row" style="justify-content: space-between; align-items:center;">
        <strong>通信日志</strong>
        <button @click="logs=[]">清空</button>
      </div>
      <pre class="logs"><code>{{ logs.join('\n') }}</code></pre>
    </section>

    <button @click="logOpen">记录打开面板日志（示例）</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

// 仅用于类型消除（UTS 环境无 DOM 类型）
declare const plus: any
declare const navigator: any

// 避免 UTS 联合对象字面量类型报错
const user = ref<any>(null)

const mode = ref<'socketTask' | 'tcp'>('socketTask')
const ip = ref('192.168.4.1')
const port = ref<number>(8080)
const status = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const logs = ref<string[]>([])
const customPayload = ref('')

let socketTask: UniApp.SocketTask | null = null

const isAppPlus = ref(false)
const isAndroid = ref(false)

// 平台检测（条件编译避免 UTS 检查 DOM）
const detectPlatform = () => {
  // #ifdef APP-PLUS
  isAppPlus.value = true
  isAndroid.value = (plus?.os?.name || '').toLowerCase() === 'android'
  // #endif

  // #ifdef H5
  const ua = navigator?.userAgent || ''
  isAppPlus.value = false
  isAndroid.value = /Android/i.test(ua)
  // #endif
}

// 轮询等待 plus 可用（不依赖 document）
const waitForPlus = () =>
  new Promise<void>((resolve) => {
    // @ts-ignore
    if (typeof plus !== 'undefined') return resolve()
    const timer = setInterval(() => {
      // @ts-ignore
      if (typeof plus !== 'undefined') {
        clearInterval(timer)
        resolve()
      }
    }, 50)
  })

onMounted(async () => {
  detectPlatform()
  // #ifdef APP-PLUS
  await waitForPlus()
  detectPlatform()
  appendLog('plusready: 原生能力可用')
  // #endif
})

onUnmounted(() => {
  try { disconnect() } catch {}
})

function appendLog(line: string) {
  const stamp = new Date().toLocaleTimeString()
  logs.value.push(`[${stamp}] ${line}`)
  if (logs.value.length > 300) logs.value.shift()
}

// 示例按钮上报（本地提示；如需接入真实接口，请在 H5 用 fetch/uni.request）
const logOpen = async () => {
  uni.showToast({ title: '已记录', icon: 'none', duration: 2000 })
}

function connect() {
  if (status.value !== 'disconnected') return
  if (!ip.value || !port.value) {
    uni.showToast({ title: '请填写正确的 IP 与端口', icon: 'none', duration: 2000 })
    return
  }

  if (mode.value === 'socketTask') {
    const url = `socketTask://${ip.value}:${port.value}`
    appendLog(`socketTask 连接 ${url} ...`)
    status.value = 'connecting'
    try {
      socketTask = uni.connectSocket({ url, header: { 'Content-Type': 'application/json' } })

      socketTask.onOpen(() => {
        status.value = 'connected'
        appendLog('socketTask 已连接')
      })

      socketTask.onMessage((evt) => {
        let text = ''
        if (evt.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8')
          text = decoder.decode(new Uint8Array(evt.data))
        } else {
          text = String(evt.data || '')
        }
        appendLog(`<- ${text.trim()}`)
      })

      socketTask.onError((err) => {
        status.value = 'error'
        appendLog(`socketTask 错误: ${JSON.stringify(err)}`)
      })

      socketTask.onClose(() => {
        appendLog('socketTask 已断开')
        status.value = 'disconnected'
        socketTask = null
      })
    } catch (e: any) {
      status.value = 'error'
      appendLog('socketTask 连接异常: ' + (e?.message || e))
    }
    return
  }

  if (!isAppPlus.value) {
    uni.showToast({ title: 'TCP 需在 App-Plus(真机) 环境使用；请改用 WebSocket 或打包到手机再试', icon: 'none', duration: 3000 })
    return
  }
  if (!isAndroid.value) {
    uni.showToast({ title: '当前示例仅演示 Android TCP（iOS 需原生插件实现）', icon: 'none', duration: 3000 })
    return
  }
  appendLog('TCP 需借助原生插件或 plus.android Java Socket 实现，建议优先使用 WebSocket。')
}

function disconnect() {
  if (socketTask) {
    try { socketTask.close() } catch {}
    socketTask = null
  }
  status.value = 'disconnected'
}

function send(txt: string) {
  if (status.value !== 'connected') {
    uni.showToast({ title: '尚未连接', icon: 'none', duration: 1500 })
    return
  }
  const payload = txt.endsWith('\n') ? txt : txt + '\n'
  if (socketTask) {
    socketTask.send({
      data: payload,
      success: () => appendLog(`-> ${txt.trim()}`),
      fail: (err) => {
        appendLog(`发送失败: ${JSON.stringify(err)}`)
        uni.showToast({ title: '发送失败', icon: 'none', duration: 1500 })
      }
    })
  }
}

function sendCommand(cmd: 'F'|'B'|'L'|'R'|'S') {
  send(cmd)
}

function sendCustom() {
  if (!customPayload.value) return
  send(customPayload.value)
  customPayload.value = ''
}
</script>

<style scoped>
.robot { max-width: 720px; margin: 24px auto; display: flex; flex-direction: column; gap: 12px; padding: 0 12px; }
.card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
.row { display:flex; gap:8px; align-items:center; }
.row > label { width: 80px; opacity:.8; }
.row > input, .row > select { flex:1; padding:8px; border:1px solid #e5e7eb; border-radius:8px; }
.row.actions { gap:12px; }
.row.actions > button { padding:8px 12px; }
.status[data-state="connected"] { color: #16a34a; }
.status[data-state="connecting"] { color: #ca8a04; }
.status[data-state="error"] { color: #dc2626; }

.pad { border: 1px dashed #e5e7eb; border-radius: 10px; padding: 12px; display:flex; flex-direction:column; gap:8px; }
.pad-row { display:flex; gap:8px; justify-content:center; }
.pad-row button { padding: 12px 16px; border-radius: 10px; border: 1px solid #e5e7eb; min-width: 96px; }
.pad-row .wide { min-width: 180px; }
.pad-row .danger { background: #fee2e2; border-color: #fecaca; }

.logs { background:#0b1020; color:#d1e9ff; padding:10px; border-radius:8px; max-height:220px; overflow:auto; white-space:pre-wrap; }
</style>
