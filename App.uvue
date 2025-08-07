<template>
  <div id="app">
    <Login v-if="!isLoggedIn" @loginSuccess="handleLoginSuccess" />
    <RobotController v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Login from './components/Login.vue'
import RobotController from './components/RobotController.vue'

const isLoggedIn = ref(false)

const handleLoginSuccess = () => {
  isLoggedIn.value = true
}
</script>

<style>
#app {
  margin: 0;
  padding: 0;
}
</style>