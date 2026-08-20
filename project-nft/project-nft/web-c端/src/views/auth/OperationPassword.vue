<template>
  <div class="op-page">
    <NavBar title="设置操作密码" />

    <div class="form-area">
      <div class="form-group">
        <label class="form-group__label">请设置操作密码</label>
        <div class="input-wrapper">
          <input
            v-model="opPassword"
            class="rounded-input"
            type="password"
            maxlength="6"
            placeholder="请输入6位数字"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">请再次输入操作密码</label>
        <div class="input-wrapper">
          <input
            v-model="opPasswordConfirm"
            class="rounded-input"
            type="password"
            maxlength="6"
            placeholder="请输入6位数字"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">手机号码</label>
        <div class="input-wrapper">
          <input
            v-model="phone"
            class="rounded-input"
            type="tel"
            placeholder="请输入手机号码"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">验证码</label>
        <div class="input-wrapper input-wrapper--code">
          <input
            v-model="code"
            class="rounded-input"
            type="text"
            placeholder="请输入验证码"
          />
          <button class="code-btn" @click="start">{{ text }}</button>
        </div>
      </div>

      <button class="btn-primary" :disabled="loading" @click="onConfirm">确认</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import { useCountdown } from '@/composables/useCountdown'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { setTransactionPassword } = useUser()
const opPassword = ref('')
const opPasswordConfirm = ref('')
const phone = ref('')
const code = ref('')
const loading = ref(false)

const { text, start: startCountdown } = useCountdown(60)

// 验证手机号格式
function isValidPhone(val) {
  return /^1[3-9]\d{9}$/.test(val)
}

// 发送短信验证码（scene=4 设置交易密码）
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
    const res = await request.post('/sms/send', { phone: phone.value, scene: 4 })
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
  // 操作密码为6位数字
  if (!/^\d{6}$/.test(opPassword.value)) {
    showToast('请输入6位数字操作密码')
    return
  }
  if (opPassword.value !== opPasswordConfirm.value) {
    showToast('两次输入的密码不一致')
    return
  }
  loading.value = true
  try {
    const res = await request.post('/user/transaction-password', {
      code: code.value,
      transaction_password: opPassword.value
    })
    // 更新本地用户状态
    setTransactionPassword()
    showToast(res.message || '交易密码设置成功')
    router.back()
  } catch (e) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.op-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

.form-area {
  padding: 0 24px;
  margin-top: 24px;
}

.form-group {
  margin-bottom: 20px;
}
.form-group__label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-primary);
  margin-bottom: 8px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  height: 50px;
  padding: 0 16px;
  background: #fff;
  border: 1px solid var(--ht-border);
  border-radius: 24px;
}
.input-wrapper:focus-within {
  border-color: var(--ht-red);
}
.rounded-input {
  flex: 1;
  height: 100%;
  font-size: 16px;
  color: var(--ht-text-primary);
  background: transparent;
}
.rounded-input::placeholder {
  color: var(--ht-text-tertiary);
}

.code-btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  background: #3B82F6;
  color: #fff;
  font-size: 12px;
  border: none;
  border-radius: 16px;
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
