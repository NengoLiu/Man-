<template>
  <div class="login">
    <h1>登录</h1>
    <form @submit.prevent="onSubmit">
      <input v-model="username" placeholder="用户名" />
      <input v-model="password" type="password" placeholder="密码" />
      <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
    </form>
    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const onSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    // 本地模拟登录（避免 UTS2307 模块未找到）
    if (!username.value || !password.value) {
      throw new Error('请输入用户名与密码')
    }
    const token = 'dev-token'
    uni.setStorageSync('token', token)

    // 跳转到控制页（pages.json 已配置）
    uni.reLaunch({ url: '/uni-app/pages/DirectRobotController' })
  } catch (e: any) {
    error.value = e?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login { max-width: 360px; margin: 40px auto; display: flex; flex-direction: column; gap: 12px; }
input { padding: 8px 10px; }
button { padding: 8px 10px; }
</style>
