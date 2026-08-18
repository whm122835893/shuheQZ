<template>
  <div class="release-detail-page">
    <template v-if="collectible">
    <!-- Custom transparent navbar -->
    <div class="rd-nav">
      <div class="rd-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#1F2937" />
      </div>
      <div class="rd-nav__right">
        <van-icon
          :name="isFavorited ? 'like' : 'like-o'"
          size="22"
          :color="isFavorited ? '#B30A03' : '#1F2937'"
          @click="onToggleFavorite"
        />
      </div>
    </div>

    <!-- Hero: collectible image with gradient bg -->
    <div class="rd-hero">
      <div class="rd-hero-card">
        <img v-if="collectible.image" :src="collectible.image" :alt="collectible.name" class="rd-hero-img" />
        <div v-else class="rd-hero-img rd-hero-img--gradient" :style="{ background: collectible.gradient }">
          <van-icon :name="collectible.icon" size="80" color="rgba(255,255,255,0.85)" />
        </div>
        <div class="rd-hero-tag" :class="{ 'rd-hero-tag--upcoming': isUpcoming }">{{ heroTagText }}</div>
      </div>
      <!-- 3D platform base -->
      <div class="rd-platform"></div>
      <div class="rd-platform-shadow"></div>
    </div>

    <!-- Info section -->
    <div class="rd-info">
      <div class="rd-info-header">
        <div class="rd-info-titles">
          <h1 class="rd-info-name">{{ collectible.name }}</h1>
          <p class="rd-info-subtitle">{{ collectible.subtitle }}</p>
        </div>
      </div>

      <!-- Tags -->
      <div class="rd-info-tags">
        <div class="rd-tag-fused">
          <span class="rd-tag rd-tag--primary">限量</span>
          <span class="rd-tag rd-tag--gray">{{ collectible.edition }}份</span>
        </div>
        <div class="rd-tag-fused">
          <span class="rd-tag rd-tag--primary">流通</span>
          <span class="rd-tag rd-tag--gray">{{ collectible.circulate }}份</span>
        </div>
        <span v-if="isSoldOut" class="rd-tag rd-tag--soldout">已售罄</span>
      </div>

      <!-- Countdown for upcoming -->
      <div v-if="isUpcoming" class="rd-countdown">
        <span class="rd-countdown__label">距发售还有</span>
        <div class="rd-countdown__time">
          <template v-if="countdown.days !== '00'">
            <span class="rd-countdown__num">{{ countdown.days }}</span>
            <span class="rd-countdown__sep">天</span>
          </template>
          <span class="rd-countdown__num">{{ countdown.hours }}</span>
          <span class="rd-countdown__sep">:</span>
          <span class="rd-countdown__num">{{ countdown.minutes }}</span>
          <span class="rd-countdown__sep">:</span>
          <span class="rd-countdown__num">{{ countdown.seconds }}</span>
        </div>
      </div>

      <!-- Progress for onsale/soldout -->
      <div v-else class="rd-progress">
        <div class="rd-progress__header">
          <span class="rd-progress__label">发售进度</span>
          <span class="rd-progress__percent">{{ soldPercent }}%</span>
        </div>
        <div class="rd-progress__bar">
          <div class="rd-progress__fill" :style="{ width: soldPercent + '%' }"></div>
        </div>
        <div class="rd-progress__text">剩余 {{ collectible.circulate }} / {{ collectible.edition }}</div>
      </div>
    </div>

    <!-- 优先购通道卡片 -->
    <div v-if="prioritySale" class="rd-priority-card">
      <div class="rd-priority-header">
        <span class="rd-priority-badge">优先购</span>
        <span class="rd-priority-name">{{ prioritySale.name }}</span>
      </div>
      <div class="rd-priority-time">
        {{ formatTime(prioritySale.start_time) }} ~ {{ formatTime(prioritySale.end_time) }}
      </div>
      <div v-if="prioritySale.my_whitelist" class="rd-priority-quota">
        可购数量：{{ prioritySale.my_whitelist.max_quantity - prioritySale.my_whitelist.used_quantity }} / {{ prioritySale.my_whitelist.max_quantity }}
      </div>
      <button
        class="rd-priority-btn"
        :disabled="!prioritySale.my_whitelist?.can_buy"
        @click="goPriorityBuy"
      >
        {{ prioritySale.my_whitelist?.can_buy ? '优先购购买' : '暂无资格或已结束' }}
      </button>
    </div>

    <!-- Issuer info card -->
    <div class="rd-issuer">
      <div class="rd-issuer__avatar">
        <img src="/logo.jpg" alt="数和文创" class="rd-issuer__avatar-img" />
      </div>
      <div class="rd-issuer__info">
        <div class="rd-issuer__name">{{ collectible.issuer }}</div>
        <div class="rd-issuer__desc">官方发行方</div>
      </div>
      <van-icon name="arrow" size="16" color="#9CA3AF" />
    </div>

    <!-- Detail info list -->
    <div class="rd-detail-list">
      <div class="rd-detail-item">
        <span class="rd-detail-label">作品编号</span>
        <span class="rd-detail-value">{{ collectible.serialNo }}</span>
      </div>
      <div class="rd-detail-item">
        <span class="rd-detail-label">发行时间</span>
        <span class="rd-detail-value">{{ collectible.releaseDate }}</span>
      </div>
      <div class="rd-detail-item">
        <span class="rd-detail-label">所属专辑</span>
        <span class="rd-detail-value">{{ collectible.album }}</span>
      </div>
      <div class="rd-detail-item">
        <span class="rd-detail-label">合约地址</span>
        <span class="rd-detail-value mono">{{ collectible.contract }}</span>
      </div>
      <div class="rd-detail-item">
        <span class="rd-detail-label">认证标识</span>
        <span class="rd-detail-value">{{ collectible.certId }}</span>
      </div>
    </div>

    <!-- Purchase notes -->
    <div class="rd-notes">
      <div class="rd-notes__title">购买须知</div>
      <div class="rd-notes__content">
        数字藏品为虚拟数字商品，而非实物，仅限实名认证为年满18周岁，并小于60周岁的中国大陆用户购买。数字藏品的版权由发行方或原创者拥有，除另行取得版权拥有者书面同意外，用户不得将数字藏品用于任何商业用途。本商品一经售出，不支持退换。请勿对数字藏品进行炒作、场外交易、欺诈，或以任何其他非法方式进行使用。
      </div>
    </div>

    <!-- Spacer for bottom bar -->
    <div class="rd-bottom-spacer"></div>

    <!-- Bottom fixed action bar -->
    <div class="rd-bottom-bar">
      <div class="rd-bottom-price">
        <span class="rd-bottom-price__label">价格</span>
        <span class="rd-bottom-price__value">¥{{ collectible.price }}</span>
      </div>
      <button
        v-if="isSoldOut"
        class="rd-action-btn rd-action-btn--soldout"
        @click="goMarket"
      >
        已售罄，去市场看看吧
      </button>
      <button
        v-else-if="isUpcoming"
        class="rd-action-btn rd-action-btn--remind"
        @click="setRemind"
      >
        开售提醒
      </button>
      <button
        v-else
        class="rd-action-btn rd-action-btn--buy"
        @click="goBuy"
      >
        立即购买
      </button>
    </div>
    </template>
    <div v-else class="rd-empty">藏品不存在</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const route = useRoute()

const collectible = ref(null)
const loading = ref(true)
const prioritySale = ref(null)
const { isLoggedIn, isRealname } = useUser()
const { isFavorited: checkFavorited, toggleFavorite } = useFavorites()

const isFavorited = computed(() => checkFavorited(route.params.id))

function onToggleFavorite() {
  if (!isLoggedIn.value) {
    showToast('请先登录')
    return
  }
  const newState = toggleFavorite(route.params.id)
  showToast(newState ? '已收藏' : '取消收藏')
}

// 前端实时状态：当倒计时归零时从"即将发售"切换到"发售中"
const saleStarted = ref(false)

// 判断是否为即将发售状态
// 后端 status: 1=即将发售 2=发售中 3=已售罄
// 前端额外判断：status=1 且倒计时未归零时才显示"即将发售"
const isUpcoming = computed(() => {
  if (!collectible.value) return false
  return Number(collectible.value.status) === 1 && !saleStarted.value
})

// 发售结束时间判断：当前时间超过 off_sale_at 则视为售罄
const isSaleEnded = computed(() => {
  if (!collectible.value) return false
  const offSaleAt = collectible.value.off_sale_at
  if (!offSaleAt) return false
  const endTime = new Date(
    typeof offSaleAt === 'string' ? offSaleAt.replace(' ', 'T') : offSaleAt
  )
  return new Date() > endTime
})

// 售罄：后端 status=3、库存为0、或发售时间已过
const isSoldOut = computed(() => {
  if (!collectible.value) return false
  if (isSaleEnded.value) return true
  return Number(collectible.value.status) === 3 || collectible.value.circulate <= 0
})

const heroTagText = computed(() => {
  if (!collectible.value) return ''
  if (isSoldOut.value) return '已售罄'
  if (isUpcoming.value) return '即将发售'
  return '正在发售'
})

const soldPercent = computed(() => {
  if (!collectible.value) return 0
  const total = collectible.value.edition
  const claimed = total - collectible.value.circulate
  return Math.min(Math.round((claimed / total) * 100), 100)
})

const countdown = reactive({
  days: '00',
  hours: '00',
  minutes: '00',
  seconds: '00'
})

let timer = null
function startCountdown() {
  if (!collectible.value || !collectible.value.onsale_at) return

  const releaseDate = new Date(
    typeof collectible.value.onsale_at === 'string'
      ? collectible.value.onsale_at.replace(' ', 'T')
      : collectible.value.onsale_at
  )
  let totalSeconds = Math.floor((releaseDate - new Date()) / 1000)

  function updateDisplay() {
    if (totalSeconds <= 0) {
      countdown.days = '00'
      countdown.hours = '00'
      countdown.minutes = '00'
      countdown.seconds = '00'
      if (timer) clearInterval(timer)
      // 倒计时归零：发售开始，切换到"发售中"状态
      saleStarted.value = true
      return
    }
    countdown.days = String(Math.floor(totalSeconds / 86400)).padStart(2, '0')
    countdown.hours = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, '0')
    countdown.minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
    countdown.seconds = String(totalSeconds % 60).padStart(2, '0')
  }

  updateDisplay()
  timer = setInterval(() => {
    totalSeconds--
    updateDisplay()
  }, 1000)
}

onMounted(async () => {
  try {
    const res = await request.get(`/collectibles/${route.params.id}`)
    collectible.value = res.data

    // 如果后端 status=1（即将发售），但前端判断 onsale_at 已过，
    // 说明后端状态未更新，前端自动切换为"发售中"
    if (Number(collectible.value.status) === 1 && collectible.value.onsale_at) {
      const onsaleTime = new Date(
        typeof collectible.value.onsale_at === 'string'
          ? collectible.value.onsale_at.replace(' ', 'T')
          : collectible.value.onsale_at
      )
      if (new Date() >= onsaleTime) {
        saleStarted.value = true
      } else {
        startCountdown()
      }
    }
  } catch (err) {
    // 错误提示已由拦截器处理
    collectible.value = null
  } finally {
    loading.value = false
  }

  // 查询是否有进行中的优先购活动
  try {
    const psRes = await request.get('/priority-sales', { params: { collectible_id: route.params.id } })
    const list = psRes.data?.list || []
    if (list.length > 0) {
      prioritySale.value = list[0]
    }
  } catch (e) {
    prioritySale.value = null
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function goBack() {
  router.back()
}

function setRemind() {
  showToast('已设置开售提醒')
}

function goBuy() {
  if (!isLoggedIn.value) {
    showDialog({
      title: '提示',
      message: '还未登录，请先登录后再操作！',
      showCancelButton: true,
      confirmButtonText: '去登录'
    }).then(() => {
      router.push('/auth/login')
    }).catch(() => {})
    return
  }
  if (!isRealname.value) {
    showDialog({
      title: '提示',
      message: '购买藏品需要完成实名认证',
      showCancelButton: true,
      confirmButtonText: '去实名'
    }).then(() => {
      router.push('/profile/certification')
    }).catch(() => {})
    return
  }
  router.push(`/market/order/${route.params.id}`)
}

function goMarket() {
  router.push('/market')
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(String(t).replace(/-/g, '/'))
  if (isNaN(d.getTime())) return t
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function goPriorityBuy() {
  if (!isLoggedIn.value) {
    showDialog({
      title: '提示',
      message: '还未登录，请先登录后再操作！',
      showCancelButton: true,
      confirmButtonText: '去登录'
    }).then(() => {
      router.push('/auth/login')
    }).catch(() => {})
    return
  }
  if (!isRealname.value) {
    showDialog({
      title: '提示',
      message: '购买藏品需要完成实名认证',
      showCancelButton: true,
      confirmButtonText: '去实名'
    }).then(() => {
      router.push('/profile/certification')
    }).catch(() => {})
    return
  }
  router.push(`/market/order/${route.params.id}?priority=${prioritySale.value.id}`)
}
</script>

<style scoped>
.release-detail-page {
  min-height: 100vh;
  background: #F8F9FA;
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

/* Navbar */
.rd-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.8) 0%, rgba(255, 255, 255, 0) 100%);
}
.rd-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.rd-nav__right {
  margin-left: auto;
  margin-right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Hero */
.rd-hero {
  position: relative;
  padding-top: calc(44px + env(safe-area-inset-top));
  background: var(--ht-gradient-blue-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 16px;
}
.rd-hero-card {
  position: relative;
  width: 78%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 2;
}
.rd-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rd-hero-img--gradient {
  display: flex;
  align-items: center;
  justify-content: center;
}
.rd-hero-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #B30A03;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255, 0, 0, 0.35);
}
.rd-hero-tag--upcoming {
  background: #3B82F6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

/* 3D platform */
.rd-platform {
  width: 90%;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #E5E7EB 100%);
  margin-top: -8px;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.rd-platform-shadow {
  width: 70%;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
  margin-top: 2px;
}

/* Info section */
.rd-info {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.rd-info-header {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.rd-info-titles {
  text-align: center;
}
.rd-info-name {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  margin: 0;
  line-height: 1.3;
}
.rd-info-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  margin: 4px 0 0;
}
.rd-info-price {
  display: flex;
  align-items: baseline;
  color: #1F2937;
  flex-shrink: 0;
  margin-left: 12px;
}
.rd-price-symbol {
  font-size: 14px;
  font-weight: 600;
}
.rd-price-num {
  font-size: 28px;
  font-weight: 700;
}

.rd-info-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.rd-tag-fused {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}
.rd-tag-fused .rd-tag {
  border-radius: 0;
}
.rd-tag {
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  white-space: nowrap;
}
.rd-tag--primary {
  background: #B30A03;
  color: #fff;
  padding-left: 9px;
  padding-right: 9px;
}
.rd-tag--red {
  background: rgba(255, 0, 0, 0.1);
  color: #B30A03;
}
.rd-tag--gray {
  background: #F3F4F6;
  color: #6B7280;
}
.rd-tag--soldout {
  background: #9CA3AF;
  color: #fff;
}

/* Countdown */
.rd-countdown {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rd-countdown__label {
  font-size: 14px;
  color: #9A3412;
  font-weight: 500;
}
.rd-countdown__time {
  display: flex;
  align-items: center;
  gap: 4px;
}
.rd-countdown__num {
  width: 32px;
  height: 32px;
  background: #fff;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #FF6B00;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.rd-countdown__sep {
  font-size: 16px;
  font-weight: 700;
  color: #FF6B00;
}

/* Progress */
.rd-progress {
  margin-top: 16px;
}
.rd-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.rd-progress__label {
  font-size: 13px;
  color: #6B7280;
}
.rd-progress__percent {
  font-size: 14px;
  font-weight: 700;
  color: #FF6B00;
}
.rd-progress__bar {
  height: 8px;
  background: #F3F4F6;
  border-radius: 4px;
  overflow: hidden;
}
.rd-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, #FF8C00 0%, #FF6B00 100%);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.rd-progress__text {
  margin-top: 6px;
  font-size: 12px;
  color: #9CA3AF;
  text-align: right;
}

/* Priority sale card */
.rd-priority-card {
  background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.2);
}
.rd-priority-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rd-priority-badge {
  background: #3B82F6;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 4px;
  white-space: nowrap;
}
.rd-priority-name {
  font-size: 15px;
  font-weight: 600;
  color: #1E40AF;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rd-priority-time {
  margin-top: 10px;
  font-size: 13px;
  color: #2563EB;
}
.rd-priority-quota {
  margin-top: 8px;
  font-size: 13px;
  color: #1E40AF;
  font-weight: 500;
}
.rd-priority-btn {
  margin-top: 14px;
  width: 100%;
  height: 42px;
  border-radius: 21px;
  border: none;
  background: #3B82F6;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  transition: opacity 0.15s;
}
.rd-priority-btn:disabled {
  background: #9CA3AF;
  color: #fff;
  box-shadow: none;
  cursor: not-allowed;
}

/* Issuer */
.rd-issuer {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
.rd-issuer__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}
.rd-issuer__avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rd-issuer__info {
  flex: 1;
  min-width: 0;
}
.rd-issuer__name {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
}
.rd-issuer__desc {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

/* Detail list */
.rd-detail-list {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 8px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.rd-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}
.rd-detail-item:last-child {
  border-bottom: none;
}
.rd-detail-label {
  font-size: 14px;
  color: #6B7280;
}
.rd-detail-value {
  font-size: 14px;
  color: #1F2937;
  font-weight: 500;
}
.rd-detail-value.mono {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

/* Notes */
.rd-notes {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.rd-notes__title {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 10px;
}
.rd-notes__content {
  font-size: 12px;
  color: #9CA3AF;
  line-height: 1.8;
}

.rd-bottom-spacer {
  height: 20px;
}

/* Bottom bar */
.rd-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 0 16px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid #F3F4F6;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
}
.rd-bottom-price {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.rd-bottom-price__label {
  font-size: 11px;
  color: #9CA3AF;
}
.rd-bottom-price__value {
  font-size: 22px;
  font-weight: 700;
  color: #1F2937;
}
.rd-action-btn {
  flex: 1;
  height: 46px;
  border-radius: 23px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  transition: opacity 0.15s;
}
.rd-action-btn--buy {
  background: #3B82F6;
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.rd-action-btn--remind {
  background: #3B82F6;
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.rd-action-btn--soldout {
  background: linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%);
  color: #fff;
  font-size: 14px;
}
.rd-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  font-size: 14px;
  color: #9CA3AF;
}
</style>
