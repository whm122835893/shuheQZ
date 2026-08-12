<template>
  <div class="order-page">
    <template v-if="collectible">
    <NavBar title="数字藏品订单信息" />

    <!-- Subtitle -->
    <div class="order-subtitle">{{ subtitleText }}</div>

    <!-- Order cancelled notice -->
    <div v-if="isOrderCancelled" class="order-cancelled-notice">
      <van-icon name="warning-o" size="20" color="#EF4444" />
      <span>订单已超时取消，请重新下单</span>
    </div>

    <!-- Product card -->
    <div class="order-product-card">
      <div class="order-product-top">
        <div class="order-thumb" :style="{ background: collectible.gradient }">
          <img v-if="collectible.image" :src="collectible.image" :alt="collectible.name" class="order-thumb__img" />
          <van-icon v-else :name="collectible.icon" size="28" color="rgba(255,255,255,0.92)" />
        </div>
        <div class="order-product-info">
          <span class="order-product-name">{{ collectible.name }}</span>
          <span v-if="isMarketPurchase" class="order-product-tag">寄售购买</span>
          <span v-else-if="isPriorityPurchase" class="order-product-tag order-product-tag--priority">优先购</span>
          <span v-else class="order-product-tag order-product-tag--release">发售购买</span>
        </div>
      </div>
      <div class="order-price-row">
        <span class="order-price-label">单价</span>
        <span class="order-price-value">¥{{ unitPrice.toFixed(2) }}</span>
      </div>
    </div>

    <!-- Quantity selector (仅发售/优先购可选数量，寄售购买固定1件) -->
    <div v-if="!isMarketPurchase" class="order-quantity-card">
      <span class="order-quantity-label">购买数量</span>
      <div class="order-quantity-control">
        <button
          class="qty-btn"
          :disabled="quantity <= 1"
          @click="changeQty(-1)"
        >-</button>
        <span class="qty-num">{{ quantity }}</span>
        <button
          class="qty-btn"
          :disabled="quantity >= maxQty"
          @click="changeQty(1)"
        >+</button>
      </div>
      <span class="order-quantity-max">最多{{ maxQty }}件</span>
    </div>

    <!-- Total amount -->
    <div class="order-total-card">
      <span class="order-total-label">合计</span>
      <span class="order-total-value">¥{{ totalPrice.toFixed(2) }}</span>
    </div>

    <!-- Payment method card -->
    <div class="order-payment-card">
      <div class="order-payment-title">付款方式</div>
      <div class="payment-methods">
        <div
          v-for="method in paymentMethods"
          :key="method.key"
          class="payment-method"
          :class="{ 'payment-method--active': selectedMethod === method.key }"
          @click="selectedMethod = method.key"
        >
          <div class="payment-method__icon" :style="{ background: method.bg }">
            {{ method.text }}
          </div>
          <span class="payment-method__name">{{ method.label }}</span>
          <div class="payment-method__radio">
            <van-icon
              :name="selectedMethod === method.key ? 'checked' : 'circle'"
              size="20"
              :color="selectedMethod === method.key ? '#3B82F6' : '#D1D5DB'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom fixed pay button -->
    <div class="order-bottom">
      <button
        class="order-pay-btn"
        :class="{ 'order-pay-btn--disabled': isOrderCancelled }"
        :disabled="isOrderCancelled"
        @click="onPay"
      >
        {{ isOrderCancelled ? '订单已取消' : `立即支付 ¥${totalPrice.toFixed(2)}` }}
      </button>
    </div>

    <!-- Transaction password popup -->
    <van-popup v-model:show="showPwdPopup" position="bottom" round :close-on-click-overlay="false">
      <div class="pwd-popup">
        <div class="pwd-popup__header">
          <span class="pwd-popup__title">请输入交易密码</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="closePwdPopup" />
        </div>
        <div class="pwd-popup__amount">¥{{ totalPrice.toFixed(2) }}</div>
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
        <button class="pwd-confirm-btn" @click="verifyPwd">确认支付</button>
      </div>
    </van-popup>
    </template>
    <div v-else class="order-empty">藏品不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const route = useRoute()

const collectible = ref(null)
const loading = ref(true)

// ===== 购买类型判断 =====
// 市场寄售购买：URL 带 ?listing=xxx&price=xxx → 调 POST /market/listings/:id/buy
// 优先购购买：URL 带 ?priority=xxx → 调 POST /priority-sales/:id/buy
// 发售购买：URL 无 listing/priority 参数 → 调 POST /collectibles/:id/buy（仅发售中可买）
const listingId = computed(() => route.query.listing ? Number(route.query.listing) : null)
const prioritySaleId = computed(() => route.query.priority ? Number(route.query.priority) : null)
const isMarketPurchase = computed(() => !!listingId.value)
const isPriorityPurchase = computed(() => !!prioritySaleId.value)
const isOrderCancelled = ref(false)

// 市场寄售价格（从 URL query 传入）
const listingPrice = computed(() => {
  if (!isMarketPurchase.value) return null
  return Number(route.query.price) || 0
})

const subtitleText = computed(() => {
  if (isMarketPurchase.value) return '购买市场寄售藏品'
  if (isPriorityPurchase.value) return '优先购专属通道，限量购买'
  return '付款后将按平台到款顺序排队发放'
})

onMounted(async () => {
  try {
    const res = await request.get(`/collectibles/${route.params.id}`)
    // 后端 DECIMAL 字段返回字符串，转为 Number 供模板 .toFixed() 使用
    const data = res.data
    if (data) {
      data.price = Number(data.price) || 0
      data.circulate = Number(data.circulate) || 0
    }
    collectible.value = data
  } catch (err) {
    collectible.value = null
  } finally {
    loading.value = false
  }
})

const { isLoggedIn } = useUser()

// 购买数量（市场寄售固定为1）
const quantity = ref(1)

// 最大可购买数量
const maxQty = computed(() => {
  if (!collectible.value) return 1
  return Math.min(collectible.value.circulate || 1, 20)
})

// 实际单价：市场购买用寄售价，发售购买用藏品发行价
const unitPrice = computed(() => {
  if (isMarketPurchase.value) return listingPrice.value
  return collectible.value ? Number(collectible.value.price) : 0
})

// 总价
const totalPrice = computed(() => {
  if (isMarketPurchase.value) return listingPrice.value
  if (!collectible.value) return 0
  return Number(collectible.value.price) * quantity.value
})

// 修改数量
function changeQty(delta) {
  const newQty = quantity.value + delta
  if (newQty < 1 || newQty > maxQty.value) return
  quantity.value = newQty
}

// Payment methods
const selectedMethod = ref('balance')
const paymentMethods = [
  { key: 'balance', label: '余额支付', text: '余', bg: '#FF9500' },
  { key: 'alipay', label: '支付宝', text: '支', bg: '#1677FF' },
  { key: 'wechat', label: '微信支付', text: '微', bg: '#07C160' }
]

// Transaction password state
const showPwdPopup = ref(false)
const password = ref('')
const pwdError = ref('')
const paying = ref(false)

function onPay() {
  pwdError.value = ''
  password.value = ''
  showPwdPopup.value = true
}

async function verifyPwd() {
  if (password.value.length !== 6) {
    pwdError.value = '请输入6位交易密码'
    return
  }

  showPwdPopup.value = false
  paying.value = true

  await doPurchase(password.value)
}

async function doPurchase(txPassword) {
  paying.value = true
  try {
    let orderId

    if (isMarketPurchase.value) {
      // 市场寄售购买：POST /market/listings/:listingId/buy
      const buyRes = await request.post(`/market/listings/${listingId.value}/buy`, {
        transaction_password: txPassword,
        payment_method: selectedMethod.value,
      })
      orderId = buyRes.data?.order_id
    } else if (isPriorityPurchase.value) {
      // 优先购购买：POST /priority-sales/:id/buy
      const buyRes = await request.post(`/priority-sales/${prioritySaleId.value}/buy`, {
        quantity: quantity.value,
        payment_method: selectedMethod.value,
        transaction_password: txPassword,
      })
      orderId = buyRes.data?.order_id
    } else {
      // 发售购买：POST /collectibles/:id/buy
      const buyRes = await request.post(`/collectibles/${route.params.id}/buy`, {
        transaction_password: txPassword,
        quantity: quantity.value,
        payment_method: selectedMethod.value,
      })
      orderId = buyRes.data?.order_id
    }

    if (!orderId) {
      showToast('创建订单失败')
      return
    }

    // 处理支付（POST /payments）
    const payRes = await request.post('/payments', {
      order_id: orderId,
      payment_method: selectedMethod.value,
    })

    // 支付成功
    const payToastMap = {
      balance: '余额支付成功',
      alipay: '支付宝支付成功',
      wechat: '微信支付成功'
    }
    showToast(payToastMap[selectedMethod.value] || '支付成功')

    const msg = quantity.value > 1
      ? `藏品「${collectible.value.name}」×${quantity.value}已发放至您的仓库`
      : `藏品「${collectible.value.name}」已发放至您的仓库`

    showDialog({
      title: '支付成功',
      message: msg,
      confirmButtonText: '查看订单',
      showCancelButton: true,
      cancelButtonText: '继续浏览'
    }).then(() => {
      router.replace('/profile')
    }).catch(() => {
      router.back()
    })
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    paying.value = false
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
.order-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* Subtitle */
.order-subtitle {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  padding: 16px 24px 0;
}

/* Cancelled notice */
.order-cancelled-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px;
  padding: 12px 16px;
  background: #FEF2F2;
  border-radius: 8px;
  font-size: 14px;
  color: #EF4444;
}

/* Product card */
.order-product-card {
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  padding: 16px;
  box-shadow: var(--ht-shadow-card);
}
.order-product-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.order-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.order-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.order-product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.order-product-name {
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.order-product-tag {
  font-size: 12px;
  color: #B30A03;
  background: #FEF2F2;
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
}
.order-product-tag--release {
  color: #3B82F6;
  background: #EFF6FF;
}
.order-product-tag--priority {
  color: #7C3AED;
  background: #F3E8FF;
}
.order-price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--ht-border-light);
}
.order-price-label {
  font-size: 14px;
  color: var(--ht-text-tertiary);
}
.order-price-value {
  font-size: 18px;
  color: var(--ht-text-primary);
  font-weight: 700;
}

/* Payment method card */
.order-payment-card {
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  padding: 16px;
  box-shadow: var(--ht-shadow-card);
}

/* Quantity selector */
.order-quantity-card {
  background: #fff;
  border-radius: 16px;
  margin: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  box-shadow: var(--ht-shadow-card);
}
.order-quantity-label {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 500;
  flex-shrink: 0;
}
.order-quantity-control {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-left: auto;
}
.qty-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--ht-border);
  background: #fff;
  font-size: 18px;
  color: var(--ht-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.qty-btn:not(:disabled):active {
  background: #F3F4F6;
}
.qty-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--ht-text-primary);
  min-width: 24px;
  text-align: center;
}
.order-quantity-max {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-left: 12px;
  flex-shrink: 0;
}

/* Total amount */
.order-total-card {
  background: #fff;
  border-radius: 16px;
  margin: 0 12px 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--ht-shadow-card);
}
.order-total-label {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.order-total-value {
  font-size: 22px;
  font-weight: 700;
  color: #1F2937;
}
.order-payment-title {
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 600;
  margin-bottom: 12px;
}
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.payment-method {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--ht-border-light);
  cursor: pointer;
}
.payment-method:last-child {
  border-bottom: none;
}
.payment-method__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}
.payment-method__name {
  flex: 1;
  margin-left: 12px;
  font-size: 15px;
  color: var(--ht-text-primary);
}
.payment-method__radio {
  flex-shrink: 0;
}

/* Bottom fixed pay button */
.order-bottom {
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
.order-pay-btn {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
.order-pay-btn--disabled {
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
.pwd-popup__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  color: #EF4444;
}
.pwd-popup__tip {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ht-text-secondary);
  cursor: pointer;
}
.pwd-input-row {
  margin: 0 auto;
}
.pwd-input {
  width: 100%;
  height: 48px;
  text-align: center;
  font-size: 16px;
  letter-spacing: 8px;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  background: #F9FAFB;
  color: var(--ht-text-primary);
  outline: none;
}
.pwd-input:focus {
  border-color: #9CA3AF;
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
  margin-top: 20px;
}
.order-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  font-size: 14px;
  color: #9CA3AF;
}
</style>
