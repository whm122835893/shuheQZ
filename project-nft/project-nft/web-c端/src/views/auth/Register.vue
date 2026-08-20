<template>
  <div class="auth-page">
    <div class="back-arrow" @click="goBack">
      <van-icon name="arrow-left" size="24" color="#1F2937" />
    </div>

    <div class="title-area">
      <h2 class="title">你好，<br />欢迎注册数和文创账号！</h2>
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

      <div class="form-item">
        <label class="form-item__label">登录密码</label>
        <input
          v-model="password"
          class="form-item__input"
          type="password"
          placeholder="请输入登录密码"
        />
      </div>

      <div class="form-item">
        <label class="form-item__label">确认密码</label>
        <input
          v-model="confirmPassword"
          class="form-item__input"
          type="password"
          placeholder="请输入确认密码"
        />
      </div>

      <p class="pwd-hint">密码格式:字母(区分大小写)、数字、符号，至少包含两种，密码长度大于等于8位数</p>

      <div class="form-item">
        <label class="form-item__label">验证码</label>
        <input
          v-model="code"
          class="form-item__input"
          type="text"
          placeholder="请输入验证码"
        />
        <span class="form-item__code-btn" @click="sendCode">{{ text }}</span>
      </div>

      <div class="form-item">
        <label class="form-item__label">邀请码</label>
        <input
          v-model="inviteCode"
          class="form-item__input"
          type="text"
          placeholder="请输入邀请码（选填）"
        />
      </div>

      <button class="btn-primary" :disabled="loading" @click="onRegister">{{ loading ? '注册中...' : '注册' }}</button>

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
const password = ref('')
const confirmPassword = ref('')
const code = ref('')
const inviteCode = ref(route.query.invite || '')
const agreed = ref(false)
const loading = ref(false)

const { text, start } = useCountdown(60)
const { register } = useUser()

function goBack() {
  router.back()
}
function goAgreement() {
  router.push('/auth/user-agreement')
}
function goPrivacy() {
  router.push('/auth/privacy-policy')
}

// 发送短信验证码（scene=1 为注册场景）
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
    const res = await request.post('/sms/send', { phone: phone.value, scene: 1 })
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

async function onRegister() {
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    showToast('手机号格式不正确')
    return
  }
  if (!password.value) {
    showToast('请输入登录密码')
    return
  }
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password.value)) {
    showToast('密码必须为8-20位字母与数字组合')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次密码不一致')
    return
  }
  if (!code.value) {
    showToast('请输入验证码')
    return
  }
  if (!agreed.value) {
    showToast('请先同意用户协议和隐私政策')
    return
  }

  loading.value = true
  try {
    const payload = {
      phone: phone.value,
      code: code.value,
      login_password: password.value,
      username: `用户${phone.value.slice(-4)}`,
    }
    if (inviteCode.value) {
      payload.inviter_uid = inviteCode.value
    }

    const res = await request.post('/user/register', payload)
    register(res.data)
    showToast('注册成功')
    router.push('/home')
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
  width: 80px;
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

.pwd-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--ht-text-tertiary);
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
