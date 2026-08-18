<template>
  <div class="orders-page">
    <NavBar title="我的订单" />

    <!-- Tabs -->
    <div class="orders-tabs">
      <div
        v-for="(tab, idx) in tabs"
        :key="tab.key"
        class="orders-tab"
        :class="{ 'orders-tab--active': activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- Order list -->
    <div class="orders-list">
      <div v-for="order in filteredOrders" :key="order.id" class="order-card">
        <div class="order-header">
          <span class="order-no">订单号：{{ order.no }}</span>
          <span class="order-status" :class="`status-${order.status}`">
            {{ statusText(order.status) }}
            <span v-if="order.status === 'pending'" class="order-countdown">
              {{ formatCountdown(order.countdown) }}
            </span>
          </span>
        </div>
        <div class="order-body">
          <div class="order-image" :style="{ background: order.gradient || 'linear-gradient(135deg, #3B82F6, #6366F1)' }">
            <img v-if="order.image" :src="order.image" style="width:100%;height:100%;object-fit:cover;" />
            <van-icon v-else :name="order.icon || 'music-o'" size="32" color="rgba(255,255,255,0.9)" />
          </div>
          <div class="order-info">
            <div class="order-name">{{ order.name }}</div>
            <div class="order-serial">{{ order.serial }}</div>
            <div class="order-time">{{ order.time }}</div>
          </div>
          <div class="order-price" v-if="order.source === 'airdrop'">空投获得</div>
          <div class="order-price" v-else>¥{{ (order.price * (order.quantity || 1)).toFixed(2) }}</div>
        </div>
        <div class="order-footer">
          <span class="order-total" v-if="order.source === 'airdrop'">空投获得</span>
          <span class="order-total" v-else>共{{ order.quantity || 1 }}件 合计：<strong>¥{{ (order.price * (order.quantity || 1)).toFixed(2) }}</strong></span>
          <div class="order-actions">
            <button v-if="order.status === 'pending' && order.source !== 'airdrop'" class="order-btn order-btn--primary" @click="onPay(order)">去支付</button>
            <button v-if="order.status === 'pending' && order.source !== 'airdrop'" class="order-btn" @click="onCancel(order)">取消订单</button>
            <button v-if="(order.status === 'completed' || order.status === 'cancelled') && order.source !== 'airdrop'" class="order-btn order-btn--primary" @click="onAgain(order)">再次购买</button>
          </div>
        </div>
      </div>

      <EmptyState v-if="filteredOrders.length === 0" :text="emptyText" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'

const router = useRouter()
const activeTab = ref(0)
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
  { key: 'pending', label: '待支付' },
  { key: 'cancelled', label: '已取消' },
  { key: 'airdrop', label: '空投记录' }
]

// tab key → 后端 status 值
const statusParamMap = { completed: 2, pending: 1, cancelled: 3 }
// 后端 status 数字 → 前端字符串
const statusStringMap = { 1: 'pending', 2: 'completed', 3: 'cancelled' }

const orders = ref([])
let countdownTimer = null

// 根据到期时间计算剩余秒数
function calcCountdown(expiresAt) {
  if (!expiresAt) return 0
  const target = new Date(String(expiresAt).replace(/-/g, '/')).getTime()
  const diff = Math.floor((target - Date.now()) / 1000)
  return diff > 0 ? diff : 0
}

// 将API返回数据映射为前端格式
function mapOrder(item) {
  const status = statusStringMap[item.status] || 'unknown'
  return {
    id: item.id,
    no: item.order_no,
    name: item.collectible_name,
    image: item.collectible_image,
    price: Number(item.unit_price) || 0,
    quantity: item.quantity,
    status,
    source: item.source,
    time: item.created_at,
    gradient: null,
    icon: 'music-o',
    serial: '#' + String(item.order_no || '').slice(-4),
    countdown: status === 'pending' ? calcCountdown(item.expires_at) : 0
  }
}

// 启动倒计时（仅对待支付订单生效）
function startCountdown() {
  if (countdownTimer) return
  countdownTimer = setInterval(() => {
    let hasPending = false
    orders.value.forEach(order => {
      if (order.status === 'pending') {
        if (order.countdown > 0) {
          order.countdown--
          hasPending = true
        }
      }
    })
    if (!hasPending) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

// 获取订单列表
async function fetchOrders() {
  // 先清理旧定时器，避免 Tab 切换后多个 setInterval 同时运行
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  const key = tabs[activeTab.value].key

  if (key === 'airdrop') {
    // 空投记录：查询用户藏品中 source=airdrop 的记录
    orders.value = []
    try {
      const res = await request.get('/user/collectibles', { params: { page: 1, page_size: 20, source: 'airdrop' } })
      const list = res.data?.list || []
      orders.value = list.map(item => ({
        id: item.id,
        no: '空投-' + item.id,
        name: item.collectible_name,
        image: item.collectible_image,
        price: 0,
        quantity: 1,
        status: 'completed',
        source: 'airdrop',
        time: item.acquired_at,
        gradient: null,
        icon: 'gift-o',
        serial: item.serial_no || '',
        countdown: 0
      }))
    } catch (e) {
      orders.value = []
    }
    return
  }

  const params = { page: 1, page_size: 20 }
  if (key !== 'all') {
    params.status = statusParamMap[key]
  }
  orders.value = []
  try {
    const res = await request.get('/orders', { params })
    const list = res.data?.list || []
    orders.value = list.map(mapOrder)
    startCountdown()
  } catch (e) {
    // 错误提示已由拦截器处理
    orders.value = []
  }
}

// 已通过 status 参数在后端筛选，直接返回全部
const filteredOrders = computed(() => orders.value)

const emptyText = computed(() => {
  const map = { all: '暂无订单', completed: '暂无已完成订单', pending: '暂无待支付订单', cancelled: '暂无已取消订单', airdrop: '暂无空投记录' }
  return map[tabs[activeTab.value].key]
})

function statusText(status) {
  const map = { completed: '已完成', pending: '待支付', cancelled: '已取消', airdrop: '空投' }
  return map[status] || status
}

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function onPay(order) {
  // API 未返回 collectibleId，使用订单 id 跳转，由购买页处理
  router.push(`/market/order/${order.id}?orderId=${order.id}`)
}

function onCancel(order) {
  showConfirmDialog({
    title: '取消订单',
    message: '确定要取消该订单吗？取消后订单将释放。'
  }).then(async () => {
    try {
      await request.put(`/orders/${order.id}/cancel`)
      showToast('订单已取消')
      fetchOrders()
    } catch (e) {
      // 错误提示已由拦截器处理
    }
  }).catch(() => {})
}

function onAgain(order) {
  // API 未返回 collectibleId，简化处理：引导至市场重新购买
  if (order.collectibleId) {
    if (order.source === 'release') {
      router.push(`/home/release/${order.collectibleId}`)
    } else {
      router.push(`/market/album/${order.collectibleId}`)
    }
  } else {
    showToast('请前往市场重新购买')
    router.push('/market')
  }
}

onMounted(() => {
  fetchOrders()
})

watch(activeTab, () => {
  fetchOrders()
})

onUnmounted(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* Tabs */
.orders-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid var(--ht-border-light);
}
.orders-tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: var(--ht-text-secondary);
  position: relative;
  cursor: pointer;
}
.orders-tab--active {
  color: var(--ht-text-primary);
  font-weight: 600;
}
.orders-tab--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--ht-text-primary);
  border-radius: 2px;
}

/* Order list */
.orders-list {
  padding: 12px;
}
.order-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 12px 16px;
  box-shadow: var(--ht-shadow-card);
}
.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.order-no {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
.order-status {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}
.order-countdown {
  font-size: 12px;
  color: var(--ht-red);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.status-completed { color: #10B981; }
.status-pending { color: var(--ht-red); }
.status-cancelled { color: var(--ht-text-tertiary); }

.order-body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.order-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.order-info {
  flex: 1;
  min-width: 0;
}
.order-name {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 500;
}
.order-serial {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.order-time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 2px;
}
.order-price {
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 700;
  flex-shrink: 0;
}

.order-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ht-border-light);
}
.order-total {
  font-size: 13px;
  color: var(--ht-text-secondary);
}
.order-total strong {
  color: var(--ht-text-primary);
  font-size: 15px;
}
.order-actions {
  display: flex;
  gap: 8px;
}
.order-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--ht-border);
  background: #fff;
  font-size: 13px;
  color: var(--ht-text-primary);
}
.order-btn--primary {
  background: #3B82F6;
  color: #fff;
  border: none;
}
</style>
