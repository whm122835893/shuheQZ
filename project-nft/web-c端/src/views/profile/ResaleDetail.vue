<template>
  <div class="resale-page">
    <!-- Custom transparent navbar -->
    <div class="resale-nav">
      <div class="resale-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#1F2937" />
      </div>
    </div>

    <!-- Collectible card -->
    <div class="resale-card">
      <div class="resale-card__img">
        <img v-if="item?.collectible_image" :src="item.collectible_image" :alt="item?.collectible_name" class="resale-card__img-tag" />
        <van-icon v-else name="music-o" size="48" color="rgba(255,255,255,0.9)" />
      </div>
      <div class="resale-card__info">
        <div class="resale-card__name">{{ item?.collectible_name }}</div>
        <div class="resale-card__serial">{{ item?.serial_no }}</div>
        <div class="resale-card__detail">
          <span>持仓天数 {{ daysHeld }}</span>
          <span class="resale-card__sep">·</span>
          <span>购入价 ¥{{ Number(item?.acquired_price || 0).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <!-- Price setting -->
    <div class="resale-form">
      <div class="resale-form__title">设置寄售价格</div>
      <div class="resale-form__input-row">
        <span class="resale-form__symbol">¥</span>
        <input
          v-model="resalePrice"
          class="resale-form__input"
          type="number"
          placeholder="请输入寄售价格"
        />
      </div>
      <div class="resale-form__tips">
        <div class="resale-form__tip-row">
          <span>寄售价格</span>
          <span>¥{{ displayPrice }}</span>
        </div>
        <div class="resale-form__tip-row">
          <span>平台服务费（5%）</span>
          <span class="resale-form__fee">-¥{{ serviceFee }}</span>
        </div>
        <div class="resale-form__tip-divider"></div>
        <div class="resale-form__tip-row resale-form__tip-row--bold">
          <span>预计到账</span>
          <span class="resale-form__income">¥{{ estimatedAmount }}</span>
        </div>
        <p class="resale-form__min-tip">最低寄售价格：¥{{ minPrice.toFixed(2) }}</p>
      </div>
    </div>

    <!-- Bottom button -->
    <div class="resale-bottom">
      <button class="resale-btn" :disabled="!canSubmit" @click="onSubmit">
        确认寄售
      </button>
    </div>

    <!-- Transaction password popup -->
    <van-popup v-model:show="showPwdPopup" position="bottom" round :close-on-click-overlay="false">
      <div class="pwd-popup">
        <div class="pwd-popup__header">
          <span class="pwd-popup__title">请输入交易密码</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="closePwdPopup" />
        </div>
        <div class="pwd-popup__amount">¥{{ displayPrice }}</div>
        <div class="pwd-input-row">
          <input
            v-model="password"
            class="pwd-input"
            type="password"
            maxlength="6"
            placeholder="请输入6位交易密码"
            @keyup.enter="verifyPwd"
          />
        </div>
        <div v-if="pwdError" class="pwd-popup__error">
          <van-icon name="warning-o" size="14" color="#EF4444" />
          {{ pwdError }}
        </div>
        <div class="pwd-popup__tip" @click="goSetPassword">未设置交易密码？去设置</div>
        <button class="pwd-confirm-btn" @click="verifyPwd">确认寄售</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const route = useRoute()
const { hasTransactionPassword } = useUser()

// ===== 用户藏品详情（API 数据）=====
const item = ref(null)

async function fetchUserCollectible() {
  try {
    const res = await request.get('/user/collectibles', { params: { page: 1, page_size: 200, holding_status: 1 } })
    const found = (res.data?.list || []).find(i => String(i.id) === String(route.params.id))
    if (found) {
      item.value = found
    } else {
      showToast('藏品不存在')
      setTimeout(() => router.back(), 1500)
    }
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

onMounted(fetchUserCollectible)

const daysHeld = computed(() => {
  if (!item.value?.acquired_at) return 0
  const acquired = new Date(item.value.acquired_at.replace(/-/g, '/'))
  const now = new Date()
  return Math.max(0, Math.floor((now - acquired) / (1000 * 60 * 60 * 24)))
})

const resalePrice = ref('')
const minPrice = computed(() => {
  if (!item.value) return 0
  return Math.max(0.01, Number(item.value.acquired_price || 0) * 0.5)
})

// Real-time calculation
const parsedPrice = computed(() => {
  const p = parseFloat(resalePrice.value)
  return isNaN(p) || p <= 0 ? 0 : p
})

const displayPrice = computed(() => parsedPrice.value.toFixed(2))

const serviceFee = computed(() => (parsedPrice.value * 0.05).toFixed(2))

const estimatedAmount = computed(() => (parsedPrice.value * 0.95).toFixed(2))

const canSubmit = computed(() => {
  return parsedPrice.value >= minPrice.value
})

// Transaction password state
const showPwdPopup = ref(false)
const password = ref('')
const pwdError = ref('')
const checking = ref(false)

function goBack() {
  router.back()
}

function onSubmit() {
  if (!canSubmit.value) {
    showToast(`寄售价格不能低于 ¥${minPrice.value.toFixed(2)}`)
    return
  }

  if (!hasTransactionPassword()) {
    showDialog({
      title: '提示',
      message: '您还未设置交易密码，是否前往设置？',
      showCancelButton: true,
      confirmButtonText: '去设置'
    }).then(() => {
      router.push('/profile/transaction-password')
    }).catch(() => {})
    return
  }

  pwdError.value = ''
  password.value = ''
  showPwdPopup.value = true
}

function verifyPwd() {
  if (password.value.length !== 6) {
    pwdError.value = '请输入6位交易密码'
    return
  }
  submitResale()
}

async function submitResale() {
  showPwdPopup.value = false
  checking.value = true

  try {
    await request.post('/market/listings', {
      user_collectible_id: Number(route.params.id),
      price: parseFloat(resalePrice.value),
      transaction_password: password.value,
    })

    showDialog({
      title: '寄售成功',
      message: `藏品「${item.value.collectible_name}」已成功寄售，价格为 ¥${parseFloat(resalePrice.value).toFixed(2)}`,
      confirmButtonText: '查看挂单'
    }).then(() => {
      router.replace(`/market/album/${item.value.collectible_id}`)
    }).catch(() => {
      router.replace('/profile')
    })
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    checking.value = false
    password.value = ''
  }
}

function closePwdPopup() {
  showPwdPopup.value = false
  password.value = ''
  pwdError.value = ''
}

function goSetPassword() {
  closePwdPopup()
  router.push('/profile/transaction-password')
}
</script>

<style scoped>
.resale-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-top: calc(44px + env(safe-area-inset-top));
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* Custom transparent navbar */
.resale-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
}
.resale-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.resale-nav__right {
  margin-left: auto;
  margin-right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Collectible card */
.resale-card {
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--ht-shadow-card);
}
.resale-card__img {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.resale-card__img-tag {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.resale-card__info {
  flex: 1;
  min-width: 0;
}
.resale-card__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.resale-card__serial {
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-top: 4px;
}
.resale-card__detail {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 8px;
}
.resale-card__sep {
  margin: 0 6px;
}

/* Price form */
.resale-form {
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  padding: 16px;
  box-shadow: var(--ht-shadow-card);
}
.resale-form__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
  margin-bottom: 16px;
}
.resale-form__input-row {
  display: flex;
  align-items: center;
  height: 56px;
  border: 1px solid var(--ht-border);
  border-radius: 12px;
  padding: 0 16px;
  gap: 8px;
}
.resale-form__symbol {
  font-size: 20px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.resale-form__input {
  flex: 1;
  height: 100%;
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
  background: transparent;
  border: none;
  outline: none;
}
.resale-form__input::placeholder {
  font-size: 14px;
  font-weight: 400;
  color: var(--ht-text-tertiary);
}
.resale-form__tips {
  margin-top: 16px;
  padding: 12px;
  background: #F3F4F6;
  border-radius: 8px;
}
.resale-form__tip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--ht-text-secondary);
  line-height: 2;
}
.resale-form__tip-row--bold {
  font-weight: 600;
  color: var(--ht-text-primary);
}
.resale-form__fee {
  color: #EF4444;
}
.resale-form__income {
  color: #1F2937;
  font-size: 16px;
}
.resale-form__tip-divider {
  height: 1px;
  background: #E5E7EB;
  margin: 4px 0;
}
.resale-form__min-tip {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 8px;
}

/* Bottom button */
.resale-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--ht-border-light);
  z-index: 100;
}
.resale-btn {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
.resale-btn:disabled {
  background: #E5E7EB;
  color: #9CA3AF;
}

/* Password popup */
.pwd-popup {
  padding: 20px 24px 32px;
}
.pwd-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.pwd-popup__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.pwd-popup__amount {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: var(--ht-text-primary);
  margin-bottom: 20px;
}
.pwd-input-row {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}
.pwd-input {
  width: 100%;
  height: 48px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  text-align: center;
  font-size: 16px;
  letter-spacing: 8px;
  color: var(--ht-text-primary);
  outline: none;
  background: #F9FAFB;
}
.pwd-input:focus {
  border-color: #9CA3AF;
}
.pwd-popup__error {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #EF4444;
  margin-bottom: 8px;
}
.pwd-popup__tip {
  font-size: 13px;
  color: var(--ht-text-tertiary);
  text-align: center;
  margin-bottom: 16px;
  cursor: pointer;
}
.pwd-confirm-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
</style>
