<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo">
        <span class="mahjong-icon">🀄</span>
        <h1>棋牌乐园</h1>
        <p>欢迎回来，开始游戏吧</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            :class="{ error: errors.username }"
          />
          <span v-if="errors.username" class="error-msg">{{ errors.username }}</span>
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :class="{ error: errors.password }"
          />
          <span v-if="errors.password" class="error-msg">{{ errors.password }}</span>
        </div>

        <div class="form-options">
          <label class="remember">
            <input type="checkbox" v-model="form.remember" />
            记住我
          </label>
          <a href="#" class="forgot">忘记密码？</a>
        </div>

        <button type="submit" class="login-btn" :disabled="loading">
          <span v-if="loading">登录中...</span>
          <span v-else>立即登录</span>
        </button>

        <p class="hint">测试账号：admin / 123456</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const errors = reactive({
  username: '',
  password: ''
})

function validate() {
  errors.username = ''
  errors.password = ''
  let valid = true
  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    valid = false
  }
  if (!form.password) {
    errors.password = '请输入密码'
    valid = false
  }
  return valid
}

async function handleLogin() {
  if (!validate()) return
  loading.value = true
  // 模拟登录请求
  await new Promise(r => setTimeout(r, 800))
  if (form.username === 'admin' && form.password === '123456') {
    userStore.setAuth({
      username: form.username,
      token: `mock-token-${form.username}`
    })
    router.push('/lobby')
  } else {
    errors.password = '用户名或密码错误'
  }
  loading.value = false
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%);
  background-image: radial-gradient(ellipse at 20% 50%, rgba(180, 80, 0, 0.3) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 50%, rgba(180, 80, 0, 0.3) 0%, transparent 60%),
    linear-gradient(135deg, #1a0a00 0%, #3d1a00 50%, #1a0a00 100%);
}

.login-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 200, 100, 0.2);
  border-radius: 20px;
  padding: 48px 40px;
  width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 200, 100, 0.1);
}

.logo {
  text-align: center;
  margin-bottom: 36px;
}

.mahjong-icon {
  font-size: 56px;
  display: block;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(255, 160, 0, 0.8));
}

.logo h1 {
  color: #ffd700;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.logo p {
  color: rgba(255, 200, 100, 0.6);
  font-size: 14px;
  margin: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  color: rgba(255, 200, 100, 0.8);
  font-size: 14px;
  margin-bottom: 8px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 200, 100, 0.2);
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: rgba(255, 200, 100, 0.6);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(255, 200, 100, 0.1);
}

.form-group input.error {
  border-color: #ff6b6b;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.error-msg {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 200, 100, 0.6);
  font-size: 13px;
  cursor: pointer;
}

.forgot {
  color: rgba(255, 200, 100, 0.6);
  font-size: 13px;
  text-decoration: none;
}

.forgot:hover {
  color: #ffd700;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #c8860a, #ffd700, #c8860a);
  border: none;
  border-radius: 10px;
  color: #1a0a00;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255, 215, 0, 0.5);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hint {
  text-align: center;
  color: rgba(255, 200, 100, 0.4);
  font-size: 12px;
  margin-top: 16px;
  margin-bottom: 0;
}
</style>
