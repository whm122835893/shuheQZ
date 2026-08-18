<template>
  <div class="auth-page">
    <div class="back-arrow" @click="goBack">
      <van-icon name="arrow-left" size="24" color="#1F2937" />
    </div>

    <div class="title-area">
      <h2 class="title">你好，<br />修改密码</h2>
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
        <label class="form-item__label">验证码</label>
        <input
          v-model="code"
          class="form-item__input"
          type="text"
          placeholder="请输入验证码"
        />
        <span class="form-item__code-btn" @click="start">{{ text }}</span>
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

      <button class="btn-primary" :disabled="loading" @click="onConfirm">确认</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useCountdown } from '@/composables/useCountdown'
import request from '@/api/request'

const router = useRouter()
const phone = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)

const { text, start: startCountdown } = useCountdown(60)

// 验证手机号格式
function isValidPhone(val) {
  return /^1[3-9]\d{9}$/.test(val)
}

function goBack() {
  router.back()
}

// 发送短信验证码（scene=5 找回密码）
async function start() {
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (!isValidPhone(phone.value)) {
    showToast('手机号格式不正确')
    return
  }
  try {
    const res = await request.post('/sms/send', { phone: phone.value, scene: 5 })
    // 测试环境可能返回验证码明文，自动填入验证码输入框
    if (res.data && res.data.code) {
      code.value = res.data.code
    }
    startCountdown()
  } catch (e) {
    // 错误提示已由拦截器处理
  }
}

async function onConfirm() {
  if (loading.value) return
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (!code.value) {
    showToast('请输入验证码')
    return
  }
  if (!password.value) {
    showToast('请输入登录密码')
    return
  }
  if (!confirmPassword.value) {
    showToast('请输入确认密码')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次输入的密码不一致')
    return
  }
  // 密码格式：8-20位字母与数字组合
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/.test(password.value)) {
    showToast('密码需为8-20位字母与数字组合')
    return
  }
  loading.value = true
  try {
    const res = await request.post('/user/reset-password', {
      phone: phone.value,
      code: code.value,
      new_password: password.value
    })
    showToast(res.message || '密码已重置，请重新登录')
    router.replace('/auth/login')
  } catch (e) {
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
</style>
