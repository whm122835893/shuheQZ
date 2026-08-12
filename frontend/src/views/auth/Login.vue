<template>
  <div class="auth-page">
    <div class="back-arrow" @click="goBack">
      <van-icon name="arrow-left" size="24" color="#1F2937" />
    </div>

    <div class="title-area">
      <h2 class="title">你好，<br />欢迎登录数和文创！</h2>
    </div>

    <div class="form-area">
      <div class="form-item">
        <label class="form-item__label">手机号</label>
        <input
          v-model="phone"
          class="form-item__input"
          type="tel"
          placeholder="请输入手机号"
        />
      </div>

      <div class="form-item" v-if="loginType === 'code'">
        <label class="form-item__label">验证码</label>
        <input
          v-model="code"
          class="form-item__input"
          type="text"
          placeholder="请输入验证码"
        />
        <span class="form-item__code-btn" @click="sendCode">{{ text }}</span>
      </div>

      <div class="form-item" v-else>
        <label class="form-item__label">密码</label>
        <input
          v-model="password"
          class="form-item__input"
          type="password"
          placeholder="请输入登录密码"
        />
      </div>

      <div class="helper-row">
        <span class="helper-text">没有账号？<span class="helper-link" @click="goRegister">去注册</span></span>
        <span class="helper-link" @click="goReset">忘记密码</span>
      </div>

      <button class="btn-primary" :disabled="loading" @click="onLogin">{{ loading ? '登录中...' : '登录' }}</button>
      <button class="btn-secondary" @click="toggleLoginType">
        {{ loginType === 'code' ? '密码登录' : '验证码登录' }}
      </button>

      <div class="agree-row" @click="agreed = !agreed">
        <span class="agree-radio" :class="{ 'agree-radio--active': agreed }">
          <van-icon v-if="agreed" name="success" size="12" color="#fff" />
        </span>
        <span class="agree-text">我已同意数和文创<span class="agree-link" @click.stop="goAgreement">《用户协议》</span>和<span class="agree-link" @click.stop="goPrivacy">《隐私政策》</span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import { useCountdown } from '@/composables/useCountdown'
import { useUser } from '@/composables/useUser'
import request from '@/api/request'

const router = useRouter()
const route = useRoute()
const phone = ref('')
const code = ref('')
const password = ref('')
const loginType = ref('code')
const agreed = ref(false)
const loading = ref(false)

const { text, start } = useCountdown(60)
const { login } = useUser()

function toggleLoginType() {
  loginType.value = loginType.value === 'code' ? 'password' : 'code'
}

function goBack() {
  router.back()
}
function goAgreement() {
  router.push('/auth/user-agreement')
}
function goPrivacy() {
  router.push('/auth/privacy-policy')
}
function goRegister() {
  router.push('/auth/register')
}
function goReset() {
  router.push('/auth/reset-password')
}

// 发送短信验证码（scene=2 为登录场景）
async function sendCode() {
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    showToast('手机号格式不正确')
    return
  }
  try {
    const res = await request.post('/sms/send', { phone: phone.value, scene: 2 })
    // 开发模式后端会返回验证码，方便测试
    if (res.data?.code) {
      showToast(`验证码: ${res.data.code}`)
    } else {
      showToast('验证码已发送')
    }
    start()
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

async function onLogin() {
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (loginType.value === 'code' && !code.value) {
    showToast('请输入验证码')
    return
  }
  if (loginType.value === 'password' && !password.value) {
    showToast('请输入登录密码')
    return
  }
  if (!agreed.value) {
    showToast('请先同意用户协议和隐私政策')
    return
  }

  loading.value = true
  try {
    const payload =
      loginType.value === 'code'
        ? { phone: phone.value, code: code.value }
        : { phone: phone.value, login_password: password.value }

    const res = await request.post('/user/login', payload)
    // res = { code: 200, data: { token, refresh_token, user }, message }
    login(res.data)
    showToast('登录成功')
    const redirect = route.query.redirect
    router.replace(redirect || '/home')
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 180px);
}

.back-arrow {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 12px;
  padding-top: calc(env(safe-area-inset-top) + 12px);
  cursor: pointer;
}

.title-area {
  margin-top: 0;
  padding-top: calc(env(safe-area-inset-top) + 24px + 30px);
  padding-left: 24px;
}
.title {
  font-size: 28px;
  font-weight: 600;
  color: var(--ht-text-primary);
  line-height: 1.4;
}

.form-area {
  margin-top: 60px;
  padding: 0 24px;
}

.form-item {
  display: flex;
  align-items: center;
  height: 56px;
  border: 1px solid var(--ht-border);
  border-radius: 15px;
  padding: 0 16px;
  margin-bottom: 16px;
}
.form-item__label {
  width: 70px;
  flex-shrink: 0;
  font-size: 16px;
  color: var(--ht-text-primary);
  text-align: left;
}
.form-item__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 16px;
  color: var(--ht-text-primary);
  background: transparent;
}
.form-item__input::placeholder {
  color: var(--ht-text-tertiary);
}
.form-item__code-btn {
  flex-shrink: 0;
  margin-left: 12px;
  font-size: 14px;
  color: var(--ht-text-secondary);
  white-space: nowrap;
}

.helper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}
.helper-text {
  font-size: 14px;
  color: var(--ht-text-secondary);
}
.helper-link {
  font-size: 14px;
  color: #3B82F6;
}

.btn-primary {
  width: 100%;
  height: 50px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 25px;
  margin-top: 40px;
}
.btn-secondary {
  width: 100%;
  height: 50px;
  background: var(--ht-bg-gray);
  color: var(--ht-text-primary);
  font-size: 16px;
  border: none;
  border-radius: 25px;
  margin-top: 16px;
}

.agree-row {
  display: flex;
  align-items: flex-start;
  margin-top: 20px;
  cursor: pointer;
}
.agree-radio {
  width: 16px;
  height: 16px;
  border: 1px solid #D1D5DB;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 2px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.agree-radio--active {
  background: #3B82F6;
  border-color: #3B82F6;
}
.agree-text {
  font-size: 13px;
  color: var(--ht-text-secondary);
  line-height: 1.5;
}
.agree-link {
  color: #3B82F6;
}
</style>
