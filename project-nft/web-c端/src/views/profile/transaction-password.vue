<template>
  <div class="trans-pwd-page">
    <NavBar title="交易密码" />

    <div class="trans-pwd-desc">
      <van-icon name="shield-o" size="40" color="#3B82F6" />
      <p class="trans-pwd-text">交易密码用于购买藏品时的身份验证，请妥善保管。</p>
    </div>

    <div class="trans-pwd-form">
      <div class="form-item">
        <label class="form-item__label">手机号</label>
        <input
          v-model="phone"
          class="form-item__input"
          type="tel"
          :readonly="!!phone"
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
        <label class="form-item__label">设置交易密码</label>
        <input
          v-model="password"
          class="form-item__input"
          type="password"
          maxlength="6"
          placeholder="请输入6位数字交易密码"
        />
      </div>
      <div class="form-item form-item--last">
        <label class="form-item__label">确认交易密码</label>
        <input
          v-model="confirmPassword"
          class="form-item__input"
          type="password"
          maxlength="6"
          placeholder="请再次输入交易密码"
        />
      </div>
    </div>

    <div class="trans-pwd-tips">
      <p>温馨提示：</p>
      <ul>
        <li>交易密码为6位纯数字</li>
        <li>请勿与登录密码相同</li>
        <li>购买藏品时需要输入交易密码</li>
      </ul>
    </div>

    <div class="trans-pwd-bottom">
      <button class="trans-pwd-btn" :disabled="loading" @click="onSubmit">{{ loading ? '设置中...' : '确认设置' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useCountdown } from '@/composables/useCountdown'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { phone: userPhone, setTransactionPassword } = useUser()
const { text, countdown, start: startCountdown } = useCountdown(60)

// 默认展示当前登录用户的手机号
const phone = ref(userPhone.value || '')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const sending = ref(false)
const loading = ref(false)

async function start() {
  if (countdown.value > 0 || sending.value) return
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  sending.value = true
  try {
    const res = await request.post('/sms/send', { phone: phone.value, scene: 4 })
    // 测试环境可能返回验证码明文，自动填入输入框
    if (res.data && res.data.code) {
      code.value = res.data.code
    }
    startCountdown()
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  } finally {
    sending.value = false
  }
}

async function onSubmit() {
  if (!phone.value) {
    showToast('请输入手机号')
    return
  }
  if (!code.value) {
    showToast('请输入验证码')
    return
  }
  if (!password.value || password.value.length !== 6) {
    showToast('请输入6位数字交易密码')
    return
  }
  if (!/^\d{6}$/.test(password.value)) {
    showToast('交易密码必须为6位数字')
    return
  }
  if (password.value !== confirmPassword.value) {
    showToast('两次输入的密码不一致')
    return
  }
  if (loading.value) return
  loading.value = true
  try {
    await request.post('/user/transaction-password', {
      code: code.value,
      transaction_password: password.value
    })
    setTransactionPassword()
    showToast('交易密码设置成功')
    setTimeout(() => router.back(), 1200)
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.trans-pwd-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

.trans-pwd-desc {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 16px;
}
.trans-pwd-text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--ht-text-secondary);
  text-align: center;
  line-height: 1.6;
}

.trans-pwd-form {
  background: #fff;
  margin: 12px;
  border-radius: 12px;
  padding: 8px 16px;
  box-shadow: var(--ht-shadow-card);
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
.form-item--last {
  margin-bottom: 0;
}
.form-item__label {
  width: 110px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--ht-text-primary);
}
.form-item__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 16px;
  color: var(--ht-text-primary);
  background: transparent;
  letter-spacing: 4px;
}
.form-item__input::placeholder {
  color: var(--ht-text-tertiary);
  letter-spacing: 0;
}
.form-item__code-btn {
  flex-shrink: 0;
  margin-left: 12px;
  font-size: 14px;
  color: var(--ht-text-secondary);
  white-space: nowrap;
}

.trans-pwd-tips {
  margin: 16px 24px;
  padding: 12px 16px;
  background: #F3F4F6;
  border-radius: 8px;
}
.trans-pwd-tips p {
  font-size: 13px;
  color: var(--ht-text-secondary);
  font-weight: 600;
  margin-bottom: 6px;
}
.trans-pwd-tips ul {
  padding-left: 16px;
}
.trans-pwd-tips li {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  line-height: 1.8;
}

.trans-pwd-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: var(--ht-bg-page);
  z-index: 100;
}
.trans-pwd-btn {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
</style>
