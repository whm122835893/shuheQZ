<template>
  <div class="wallet-page">
    <NavBar title="我的钱包" />

    <!-- Banner -->
    <div class="wallet-banner">* 所有资金均由第三方持牌支付机构进行支付、清算</div>

    <!-- Balance card -->
    <div class="wallet-balance">
      <span class="wallet-balance__label">余额: ¥{{ balance.toFixed(2) }}</span>
    </div>

    <!-- Payment channel list -->
    <div class="wallet-list">
      <div class="wallet-card" v-for="(card, i) in cards" :key="i">
        <div class="wallet-card__logo">
          <div class="wallet-card__logo-icon" :style="{ background: card.logoBg }">
            <van-icon :name="card.icon" size="18" color="#fff" />
          </div>
          <span class="wallet-card__name" :style="{ color: card.textColor }">{{ card.name }}</span>
        </div>
        <div class="wallet-card__btn" :style="{ background: card.btnBg }" @click="onOpen(card)">
          立即开通
        </div>
      </div>
    </div>

    <!-- Transaction records -->
    <div class="wallet-records">
      <div class="wallet-records__title">交易记录</div>
      <div v-if="records.length === 0" class="wallet-records__empty">暂无交易记录</div>
      <div v-for="(record, i) in records" :key="i" class="record-item">
        <div class="record-item__info">
          <div class="record-item__type">{{ record.type }}</div>
          <div class="record-item__time">{{ record.time }}</div>
        </div>
        <div class="record-item__amount" :class="{ 'record-item__amount--minus': record.amount < 0 }">
          {{ record.amount > 0 ? '+' : '' }}{{ record.amount.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Recharge popup -->
    <van-popup v-model:show="showRechargePopup" position="bottom" round :style="{ maxHeight: '80%' }">
      <div class="recharge-popup">
        <div class="recharge-popup__header">
          <span class="recharge-popup__title">充值</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="showRechargePopup = false" />
        </div>

        <div class="recharge-popup__channel" v-if="selectedChannel">
          <div class="recharge-popup__channel-icon" :style="{ background: selectedChannel.logoBg }">
            <van-icon :name="selectedChannel.icon" size="18" color="#fff" />
          </div>
          <span class="recharge-popup__channel-name">{{ selectedChannel.name }}</span>
        </div>

        <div class="recharge-popup__field">
          <label class="recharge-popup__label">充值金额（元）</label>
          <div class="recharge-popup__input-wrap">
            <van-field
              v-model="rechargeAmount"
              placeholder="请输入充值金额"
              type="number"
              clearable
              :border="false"
            />
          </div>
        </div>

        <div class="recharge-popup__btn-wrap">
          <button class="recharge-popup__btn" @click="confirmRecharge">确认充值</button>
        </div>
      </div>
    </van-popup>

    <!-- Transaction password popup -->
    <van-popup v-model:show="showPwdPopup" position="bottom" round :close-on-click-overlay="false">
      <div class="pwd-popup">
        <div class="pwd-popup__header">
          <span class="pwd-popup__title">请输入交易密码</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="showPwdPopup = false" />
        </div>
        <div class="pwd-popup__hint">充值需要验证交易密码</div>
        <div class="pwd-input-row">
          <input
            v-model="txPassword"
            class="pwd-input"
            type="password"
            maxlength="6"
            placeholder="请输入6位交易密码"
            @keyup.enter="doRecharge"
          />
        </div>
        <div v-if="pwdError" class="pwd-popup__error">
          <van-icon name="warning-o" size="14" color="#EF4444" />
          {{ pwdError }}
        </div>
        <div class="pwd-popup__tip" @click="goSetPassword">未设置交易密码？去设置</div>
        <button class="pwd-confirm-btn" @click="doRecharge">确认充值</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'

// 钱包信息（API 数据）
const balance = ref(0)
const frozenBalance = ref(0)
const totalRecharged = ref(0)
const totalConsumed = ref(0)

// 交易记录（API 数据）
const records = ref([])
const loading = ref(false)

// 交易类型中文映射
const typeLabels = {
  recharge: '充值',
  consume: '消费',
  refund: '退款',
  transfer_in: '转入',
  transfer_out: '转出',
  sale_income: '寄售收益',
  withdrawal: '提现',
  reward: '奖励',
}

async function fetchWallet() {
  loading.value = true
  try {
    const [walletRes, txnsRes] = await Promise.all([
      request.get('/wallet'),
      request.get('/wallet/transactions', { params: { page: 1, page_size: 50 } }),
    ])

    balance.value = Number(walletRes.data?.balance) || 0
    frozenBalance.value = Number(walletRes.data?.frozen_balance) || 0
    totalRecharged.value = Number(walletRes.data?.total_recharged) || 0
    totalConsumed.value = Number(walletRes.data?.total_consumed) || 0

    records.value = (txnsRes.data?.list || []).map(r => ({
      type: typeLabels[r.type] || r.type || '其他',
      amount: r.direction === 'out' ? -Math.abs(Number(r.amount)) : Math.abs(Number(r.amount)),
      time: formatTime(r.created_at),
      remark: r.remark || '',
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(/-/g, '/'))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

onMounted(() => {
  fetchWallet()
  fetchChannels()
})

const cards = ref([])

async function fetchChannels() {
  try {
    const res = await request.get('/wallet/channels')
    const list = res.data?.list || []
    cards.value = list.filter(c => c.status === 1).map(c => ({
      id: c.id,
      name: c.name,
      code: c.code,
      icon: c.icon || 'balance-o',
      logoBg: 'linear-gradient(135deg,#A78BFA,#8B5CF6)',
      textColor: '#8B5CF6',
      btnBg: '#3B82F6'
    }))
    // 如果后端无数据，保留默认渠道
    if (cards.value.length === 0) {
      cards.value = [
        { name: '汇付天下', icon: 'balance-o', logoBg: 'linear-gradient(135deg,#A78BFA,#8B5CF6)', textColor: '#8B5CF6', btnBg: '#3B82F6' },
        { name: '易宝账户2.0', icon: 'gold-coin-o', logoBg: '#10B981', textColor: '#10B981', btnBg: '#3B82F6' },
        { name: '数字钱包', icon: 'balance-pay', logoBg: '#10B981', textColor: '#10B981', btnBg: '#3B82F6' }
      ]
    }
  } catch (e) {
    // 降级使用默认渠道
    cards.value = [
      { name: '汇付天下', icon: 'balance-o', logoBg: 'linear-gradient(135deg,#A78BFA,#8B5CF6)', textColor: '#8B5CF6', btnBg: '#3B82F6' },
      { name: '易宝账户2.0', icon: 'gold-coin-o', logoBg: '#10B981', textColor: '#10B981', btnBg: '#3B82F6' },
      { name: '数字钱包', icon: 'balance-pay', logoBg: '#10B981', textColor: '#10B981', btnBg: '#3B82F6' }
    ]
  }
}

// 充值弹窗状态
const showRechargePopup = ref(false)
const rechargeAmount = ref('')
const selectedChannel = ref(null)

// 交易密码弹窗状态
const showPwdPopup = ref(false)
const txPassword = ref('')
const pwdError = ref('')

const router = useRouter()

function goSetPassword() {
  showPwdPopup.value = false
  router.push('/profile/transaction-password')
}

function onOpen(channel) {
  selectedChannel.value = channel
  rechargeAmount.value = ''
  showRechargePopup.value = true
}

async function confirmRecharge() {
  const amount = Number(rechargeAmount.value)
  if (!amount || amount <= 0) {
    showToast('请输入有效金额')
    return
  }
  // 打开交易密码弹窗
  txPassword.value = ''
  pwdError.value = ''
  showPwdPopup.value = true
}

async function doRecharge() {
  if (!txPassword.value) {
    pwdError.value = '请输入6位交易密码'
    return
  }
  if (!/^\d{6}$/.test(txPassword.value)) {
    pwdError.value = '交易密码必须为6位数字'
    return
  }

  const amount = Number(rechargeAmount.value)
  try {
    await request.post('/wallet/recharge', {
      amount: amount.toFixed(2),
      payment_method: selectedChannel.value?.code || 'balance',
      transaction_password: txPassword.value,
    })
    showToast('充值请求已提交')
    showRechargePopup.value = false
    showPwdPopup.value = false
    fetchWallet()  // 刷新余额
  } catch (e) {
    const status = e?.response?.status
    const msg = e?.response?.data?.message || ''
    if (status === 422 && msg.includes('交易密码')) {
      // 未设置交易密码
      pwdError.value = '尚未设置交易密码'
    } else if (status === 403) {
      pwdError.value = msg || '交易密码错误'
    } else if (status === 429) {
      pwdError.value = msg || '操作过于频繁，请稍后再试'
    }
    // 其他错误由拦截器处理
  }
}
</script>

<style scoped>
.wallet-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}
.wallet-banner {
  width: 100%;
  height: 36px;
  background: #1E3A8A;
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  text-align: center;
}
.wallet-list {
  padding: 12px;
}
.wallet-card {
  background: var(--ht-bg-card);
  border-radius: 12px;
  box-shadow: var(--ht-shadow-card);
  margin-bottom: 12px;
  overflow: hidden;
}
.wallet-card__logo {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
}
.wallet-card__logo-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.wallet-card__name {
  margin-left: 10px;
  font-size: 16px;
  font-weight: 600;
}
.wallet-card__btn {
  width: 100%;
  height: 50px;
  border-radius: 0 0 12px 12px;
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Balance card */
.wallet-balance {
  margin: 12px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #3B82F6, #3B82F6);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(33, 150, 243, 0.25);
}
.wallet-balance__label {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

/* Transaction records */
.wallet-records {
  margin: 12px;
  padding: 16px;
  background: var(--ht-bg-card);
  border-radius: 12px;
  box-shadow: var(--ht-shadow-card);
}
.wallet-records__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
  margin-bottom: 12px;
}
.wallet-records__empty {
  text-align: center;
  font-size: 14px;
  color: var(--ht-text-tertiary);
  padding: 20px 0;
}
.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--ht-border-light);
}
.record-item:last-child {
  border-bottom: none;
}
.record-item__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.record-item__type {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 500;
}
.record-item__time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
.record-item__amount {
  font-size: 16px;
  font-weight: 600;
  color: #10B981;
}
.record-item__amount--minus {
  color: #EF4444;
}

/* Recharge popup */
.recharge-popup {
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}
.recharge-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.recharge-popup__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.recharge-popup__channel {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ht-bg-page);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
}
.recharge-popup__channel-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.recharge-popup__channel-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.recharge-popup__field {
  margin-bottom: 20px;
}
.recharge-popup__label {
  display: block;
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}
.recharge-popup__input-wrap {
  background: var(--ht-bg-page);
  border-radius: 8px;
  overflow: hidden;
}
.recharge-popup__input-wrap :deep(.van-field) {
  padding: 10px 12px;
}
.recharge-popup__btn-wrap {
  padding-top: 4px;
}
.recharge-popup__btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

/* Transaction password popup */
.pwd-popup {
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}
.pwd-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.pwd-popup__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.pwd-popup__hint {
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-bottom: 16px;
}
.pwd-input-row {
  background: var(--ht-bg-page);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}
.pwd-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 18px;
  letter-spacing: 4px;
  color: var(--ht-text-primary);
}
.pwd-popup__error {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #EF4444;
  margin-bottom: 12px;
}
.pwd-popup__tip {
  font-size: 13px;
  color: #3B82F6;
  text-align: center;
  margin-bottom: 16px;
  cursor: pointer;
}
.pwd-confirm-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
</style>
