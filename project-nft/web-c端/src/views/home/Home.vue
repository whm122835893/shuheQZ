<template>
  <div class="home-page">
    <!-- Top header -->
    <header class="home-header">
      <span class="home-logo">数和文创</span>
      <div class="home-notice" @click="go('/activity')">
        <van-icon name="volume-o" size="14" color="#6B7280" class="home-notice__icon" />
        <div class="home-notice__wrapper">
          <transition name="notice-slide" mode="out-in">
            <div class="home-notice__text" :key="currentNoticeIndex">
              {{ notices[currentNoticeIndex] }}
            </div>
          </transition>
        </div>
      </div>
    </header>

    <!-- Banner carousel -->
    <van-swipe class="home-banner" :autoplay="4000" :duration="500" indicator-color="#ffffff">
      <van-swipe-item v-for="(b, i) in banners" :key="i">
        <div class="banner-slide">
          <img :src="b.image" class="banner-slide__img" />
          <div class="banner-slide__desc">{{ b.title }}</div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <!-- Function grid card -->
    <div class="func-card">
      <!-- Row 1 & Row 2: 2x2 cells -->
      <div class="func-grid">
        <div class="func-cell" @click="go('/activity/synthesis')">
          <span class="func-cell__label">合成兑换</span>
          <span class="func-cell__img">🔬</span>
        </div>
        <div class="func-cell" @click="go('/home/lucky-draw')">
          <span class="func-cell__label">幸运抽奖</span>
          <span class="func-cell__img">🎰</span>
        </div>
        <div class="func-cell" @click="go('/home/lottery')">
          <span class="func-cell__label">抽签活动</span>
          <span class="func-cell__img">🎲</span>
        </div>
        <div class="func-cell" @click="go('/home/checkin')">
          <span class="func-cell__label">签到专区</span>
          <span class="func-cell__img">📅</span>
        </div>
      </div>

      <div class="func-divider"></div>

      <!-- Row 3: 4 quick circular icons -->
      <div class="func-quick">
        <div class="func-quick__item" @click="go('/home/furnace')">
          <span class="func-quick__img">🔥</span>
          <span class="func-quick__label">幻化熔炉</span>
        </div>
        <div class="func-quick__item" @click="go('/home/hall-of-fame')">
          <span class="func-quick__img">🏆</span>
          <span class="func-quick__label">名人堂</span>
        </div>
        <div class="func-quick__item" @click="go('/home/beginner-guide')">
          <span class="func-quick__img">📖</span>
          <span class="func-quick__label">新手指南</span>
        </div>
        <div class="func-quick__item" @click="go('/home/museum')">
          <span class="func-quick__img">🏛️</span>
          <span class="func-quick__label">文物展馆</span>
        </div>
      </div>
    </div>

    <!-- First release section -->
    <section class="section">
      <div class="section__header">
        <div class="release-tabs">
          <span
            class="release-tab"
            :class="{ 'release-tab--active': activeReleaseTab === 'premiere' }"
            @click="activeReleaseTab = 'premiere'"
          >首发</span>
          <span
            class="release-tab"
            :class="{ 'release-tab--active': activeReleaseTab === 'blindbox' }"
            @click="activeReleaseTab = 'blindbox'"
          >盲盒</span>
        </div>
        <span class="section__more" @click="go('/home/release-calendar')">
          发售日历 <van-icon name="calendar-o" />
        </span>
      </div>

      <div class="release-list" v-if="currentReleaseList.length > 0">
        <div
          v-for="item in currentReleaseList"
          :key="item.id"
          class="release-card"
          @click="goDetail(item.id)"
        >
          <!-- Background image -->
          <img :src="item.image" :alt="item.name" class="release-card__bg" />

          <!-- Top badges -->
          <div class="release-card__top">
            <div class="release-badge-fused">
              <span class="release-badge release-badge--red">发行</span>
              <span class="release-badge release-badge--gray">{{ item.edition }}份</span>
            </div>
            <span v-if="getReleaseStatus(item) === 'soldout'" class="release-badge release-badge--soldout">
              <span class="release-badge__dot"></span>
              已售罄
            </span>
            <span v-else-if="getReleaseStatus(item) === 'upcoming'" class="release-badge release-badge--selling">
              <span class="release-badge__dot release-badge__dot--blue"></span>
              即将发售
            </span>
            <span v-else class="release-badge release-badge--selling">
              <span class="release-badge__dot release-badge__dot--red"></span>
              正在发售
            </span>
          </div>

          <!-- Bottom content with gradient overlay -->
          <div class="release-card__bottom">
            <div class="release-card__info">
              <div class="release-card__title">{{ item.name }}</div>
              <div class="release-card__brand">
                <span class="release-card__logo">
                  <span class="release-card__logo-text">数和</span>
                </span>
                <span class="release-card__brand-text">数和文创</span>
              </div>
            </div>
            <div class="release-card__price">¥{{ item.price }}</div>
          </div>
        </div>
      </div>
      <EmptyState v-else text="暂无发售藏品" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const { isLoggedIn } = useUser()

// 藏品列表数据（从后端获取）
const premieres = ref([])
const blindboxes = ref([])

// 发售区域tab：premiere=首发 | blindbox=盲盒
const activeReleaseTab = ref('premiere')
const currentReleaseList = computed(() => {
  return activeReleaseTab.value === 'blindbox' ? blindboxes.value : premieres.value
})

// 根据后端 status 判断发售状态
// 后端 status: 1=即将发售 2=发售中 3=已售罄
function getReleaseStatus(item) {
  // 兼容数字和字符串两种 status
  const status = Number(item.status)
  if (status === 3 || item.circulate <= 0) return 'soldout'
  if (status === 1) return 'upcoming'
  // 根据 onsale_at 判断是否还未到发售时间
  if (item.onsale_at) {
    const saleDate = new Date(typeof item.onsale_at === 'string' ? item.onsale_at.replace(' ', 'T') : item.onsale_at)
    if (saleDate > new Date()) return 'upcoming'
  }
  return 'onsale'
}

// 轮播图默认兜底数据（后端返回为空时使用）
const DEFAULT_BANNER = { image: '/banner-1.jpg', title: '听见未来 收藏热爱' }
const DEFAULT_NOTICE = '暂无公告'

// 轮播图数据（从后端获取）
const banners = ref([])

// 公告数据（从后端获取）
const notices = ref([])

const currentNoticeIndex = ref(0)
let noticeTimer = null

onMounted(async () => {
  // 公告轮播定时器（notices 有数据后自动轮播）
  noticeTimer = setInterval(() => {
    if (notices.value.length > 0) {
      currentNoticeIndex.value = (currentNoticeIndex.value + 1) % notices.value.length
    }
  }, 3000)

  // 并行拉取轮播图、公告、首发藏品和盲盒列表
  const fetchBanners = request.get('/banners').then((res) => {
    const list = res.data?.list || []
    banners.value = list.length > 0 ? list : [DEFAULT_BANNER]
  }).catch(() => {
    banners.value = [DEFAULT_BANNER]
  })

  const fetchNotices = request
    .get('/announcements', { params: { page: 1, page_size: 5 } })
    .then((res) => {
      const list = res.data?.list || []
      notices.value = list.length > 0 ? list.map((n) => n.title) : [DEFAULT_NOTICE]
    })
    .catch(() => {
      notices.value = [DEFAULT_NOTICE]
    })

  const fetchPremieres = request
    .get('/collectibles', { params: { page: 1, page_size: 20 } })
    .then((res) => {
      premieres.value = res.data?.list || []
    })
    .catch(() => {})

  const fetchBlindboxes = request
    .get('/blind-boxes', { params: { page: 1, page_size: 20 } })
    .then((res) => {
      blindboxes.value = res.data?.list || []
    })
    .catch(() => {})

  await Promise.all([fetchBanners, fetchNotices, fetchPremieres, fetchBlindboxes])
})

onUnmounted(() => {
  if (noticeTimer) clearInterval(noticeTimer)
})

function requireLogin() {
  if (!isLoggedIn.value) {
    showDialog({
      title: '提示',
      message: '还未登录，请先登录后再操作！',
      showCancelButton: true,
      confirmButtonText: '去登录'
    }).then(() => {
      router.push('/auth/login')
    }).catch(() => {})
    return false
  }
  return true
}

function go(path) {
  if (!requireLogin()) return
  router.push(path)
}

function goDetail(id) {
  if (!requireLogin()) return
  router.push(`/home/release/${id}`)
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 180px);
  padding-bottom: calc(58px + env(safe-area-inset-bottom) + 16px);
}

/* Header */
.home-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
}
.home-logo {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: #3B82F6;
  flex-shrink: 0;
}

/* Announcement ticker */
.home-notice {
  flex: 1;
  min-width: 0;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border-radius: 8px;
  padding: 0 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  cursor: pointer;
}
.home-notice__icon {
  flex-shrink: 0;
}
.home-notice__wrapper {
  flex: 1;
  min-width: 0;
  height: 32px;
  overflow: hidden;
  position: relative;
}
.home-notice__text {
  font-size: 12px;
  color: #6B7280;
  line-height: 32px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notice-slide-enter-active,
.notice-slide-leave-active {
  transition: transform 0.4s ease, opacity 0.4s ease;
}
.notice-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.notice-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

/* Banner */
.home-banner {
  margin: 12px;
  border-radius: 16px;
  overflow: hidden;
  height: 200px;
}
.banner-slide {
  position: relative;
  height: 200px;
  overflow: hidden;
}
.banner-slide__img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner-slide__desc {
  position: absolute;
  bottom: 12px;
  left: 16px;
  z-index: 2;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

/* Function card */
.func-card {
  margin: 16px 12px 0;
  padding: 16px 12px;
  background: var(--ht-bg-card);
}
.func-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.func-cell {
  height: 56px;
  background: #F9FAFB;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.func-cell:active {
  transform: scale(0.97);
}
.func-cell__label {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}
.func-cell__img {
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.func-divider {
  height: 1px;
  background: #F3F4F6;
  margin: 16px 0;
}

.func-quick {
  display: flex;
  justify-content: space-around;
}
.func-quick__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.func-quick__item:active {
  transform: scale(0.94);
}
.func-quick__img {
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.func-quick__label {
  margin-top: 8px;
  font-size: 12px;
  color: #1F2937;
}

/* Section */
.section {
  padding: 0 16px;
  margin-top: 20px;
}
.section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
}

/* Release tabs (same style as market top-tabs) */
.release-tabs {
  display: flex;
  align-items: center;
  gap: 32px;
}
.release-tab {
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-secondary);
  line-height: 1.2;
  position: relative;
  cursor: pointer;
}
.release-tab--active {
  font-size: 24px;
  font-weight: 700;
  color: var(--ht-text-primary);
}
.release-tab--active::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--ht-red);
}
.section__more {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: #FF7A00;
}
.section__more .van-icon {
  font-size: 15px;
}

/* Release cards */
.release-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.release-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.release-card:active {
  transform: scale(0.98);
}
.release-card__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Top badges */
.release-card__top {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 2;
}
.release-badge-fused {
  display: inline-flex;
  border-radius: 20px;
  overflow: hidden;
}
.release-badge-fused .release-badge {
  border-radius: 0;
}
.release-badge {
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
.release-badge--red {
  background: #B30A03;
  color: #fff;
  padding-left: 9px;
  padding-right: 9px;
}
.release-badge--gray {
  background: rgba(255, 255, 255, 0.85);
  color: #333;
}
.release-badge--soldout {
  background: rgba(80, 80, 80, 0.75);
  color: #fff;
}
.release-badge--selling {
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
}
.release-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fff;
}
.release-badge__dot--red {
  background: #B30A03;
}
.release-badge__dot--blue {
  background: #3B82F6;
}

/* Bottom content with gradient overlay */
.release-card__bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 14px 14px;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  z-index: 2;
}
.release-card__info {
  flex: 1;
  min-width: 0;
}
.release-card__title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.release-card__brand {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.release-card__logo {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.release-card__logo-text {
  line-height: 1;
}
.release-card__brand-text {
  font-size: 13px;
  color: #fff;
}
.release-card__price {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
