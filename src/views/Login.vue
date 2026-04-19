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
          <p class="account-hint">可用账号</p>
          <div class="account-list">
            <button type="button" class="account-chip" @click="fillAccount('sha')">sha</button>
            <button type="button" class="account-chip" @click="fillAccount('nian')">nian</button>
            <button type="button" class="account-chip" @click="fillAccount('long')">long</button>
            <button type="button" class="account-chip" @click="fillAccount('abi')">abi</button>
          </div>
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

        <p class="hint">测试密码统一为 123456</p>
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
const allowedAccounts = ['sha', 'nian', 'long', 'abi']

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

function fillAccount(username) {
  form.username = username
  if (!form.password) {
    form.password = '123456'
  }
}

async function handleLogin() {
  if (!validate()) return
  loading.value = true
  // 模拟登录请求
  await new Promise(r => setTimeout(r, 800))
  const normalizedUsername = form.username.trim().toLowerCase()

  if (allowedAccounts.includes(normalizedUsername) && form.password === '123456') {
    userStore.setAuth({
      username: normalizedUsername,
      token: ''
    })
    router.push('/lobby')
  } else {
    errors.password = '账号或密码错误，请使用 sha / nian / long / abi 与 123456'
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
  position: relative;
  overflow: hidden;
  padding: 28px;
  background:
    radial-gradient(circle at 18% 20%, rgba(242, 160, 52, 0.26), transparent 22%),
    radial-gradient(circle at 82% 24%, rgba(91, 151, 119, 0.18), transparent 20%),
    linear-gradient(145deg, #170f07 0%, #2b190c 38%, #0f1714 100%);
}

.login-container::before,
.login-container::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  filter: blur(18px);
}

.login-container::before {
  width: 260px;
  height: 260px;
  top: -80px;
  right: -40px;
  background: radial-gradient(circle, rgba(255, 217, 138, 0.24), transparent 72%);
}

.login-container::after {
  width: 320px;
  height: 320px;
  left: -120px;
  bottom: -120px;
  background: radial-gradient(circle, rgba(74, 128, 103, 0.22), transparent 72%);
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(460px, 100%);
  padding: 48px 42px 38px;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(15, 21, 18, 0.86);
  border: 1px solid rgba(255, 217, 138, 0.22);
  box-shadow: 0 28px 90px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(22px);
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 217, 138, 0.08);
  pointer-events: none;
}

.logo {
  text-align: center;
  margin-bottom: 34px;
}

.mahjong-icon {
  font-size: 62px;
  display: block;
  margin-bottom: 14px;
  filter: drop-shadow(0 0 28px rgba(255, 171, 48, 0.75));
}

.logo h1 {
  color: #ffe6a6;
  font-size: 34px;
  margin: 0 0 10px;
  letter-spacing: 0.04em;
  text-shadow: 0 0 24px rgba(255, 204, 94, 0.18);
}

.logo p {
  color: rgba(255, 222, 160, 0.68);
  font-size: 14px;
  margin: 0;
}

.form-group {
  margin-bottom: 22px;
}

.form-group label {
  display: block;
  color: rgba(255, 230, 184, 0.84);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 217, 138, 0.18);
  border-radius: 16px;
  color: #fff7e6;
  font-size: 15px;
  outline: none;
  transition: all 0.25s ease;
}

.form-group input:focus {
  border-color: rgba(255, 217, 138, 0.5);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 4px rgba(255, 217, 138, 0.08);
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
  margin-top: 6px;
  display: block;
}

.account-hint {
  margin-top: 10px;
  color: rgba(255, 220, 150, 0.58);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.account-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.account-chip {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 217, 138, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #ffe9b7;
  cursor: pointer;
}

.account-chip:hover {
  border-color: rgba(255, 217, 138, 0.34);
  background: rgba(255, 217, 138, 0.09);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
}

.remember {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 224, 164, 0.62);
  font-size: 13px;
  cursor: pointer;
}

.forgot {
  color: rgba(255, 224, 164, 0.62);
  font-size: 13px;
  text-decoration: none;
}

.forgot:hover {
  color: #ffe09c;
}

.login-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #9c6418, #ffdb89 50%, #b8791d);
  border: none;
  border-radius: 16px;
  color: #241301;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 32px rgba(196, 137, 24, 0.28);
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 18px 38px rgba(196, 137, 24, 0.4);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.hint {
  text-align: center;
  color: rgba(255, 224, 164, 0.44);
  font-size: 12px;
  margin-top: 18px;
  margin-bottom: 0;
}

@media (max-width: 640px) {
  .login-container {
    padding: 18px;
  }

  .login-card {
    padding: 38px 24px 28px;
    border-radius: 24px;
  }

  .logo h1 {
    font-size: 28px;
  }

  .form-options {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>
