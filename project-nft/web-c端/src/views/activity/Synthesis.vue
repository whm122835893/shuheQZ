<template>
  <div class="synthesis-page">
    <NavBar title="合成中心" right-text="活动记录" @right-click="showToast('暂无活动记录')" />

    <!-- Banner area -->
    <div class="banner">
      <!-- Background image -->
      <img src="/synthesis-banner.jpg" class="banner__bg" alt="合成兑换活动" />

      <!-- Text -->
      <div class="banner__text">
        <div class="banner__subtitle">#SYNTHESIS EXCHANGE#</div>
        <div class="banner__title">合成兑换活动</div>
      </div>
    </div>

    <!-- Search bar -->
    <div class="search-wrap">
      <van-search
        v-model="keyword"
        placeholder="输入活动关键词"
        shape="round"
        background="transparent"
        :show-action="false"
      />
    </div>

    <!-- Tab switch -->
    <div class="tab-switch">
      <div
        class="tab-switch__item"
        :class="{ 'tab-switch__item--active': activeTab === 'limit' }"
        @click="activeTab = 'limit'"
      >限时活动</div>
      <div
        class="tab-switch__item"
        :class="{ 'tab-switch__item--active': activeTab === 'permanent' }"
        @click="activeTab = 'permanent'"
      >常驻活动</div>
    </div>

    <!-- Activity cards -->
    <div class="card-list" v-if="filteredActivities.length > 0">
      <div v-for="item in filteredActivities" :key="item.id" class="act-card">
        <!-- Tag row -->
        <div class="act-card__head">
          <div
            class="act-card__tag"
            :class="{
              'act-card__tag--active': getStatus(item) === 'active',
              'act-card__tag--upcoming': getStatus(item) === 'upcoming',
              'act-card__tag--ended': getStatus(item) === 'ended'
            }"
          >
            {{ statusLabel(item) }}
          </div>
        </div>
        <div class="act-card__body">
          <!-- Thumbnail (no overlay tag) -->
          <div class="act-card__thumb">
            <img :src="item.image" :alt="item.title" class="act-card__thumb-img" />
          </div>
          <div class="act-card__content">
            <div class="act-card__title">{{ item.title }}</div>
            <div class="act-card__mid">
              <span class="act-card__rule" @click="showRules(item)">活动规则</span>
              <!-- Active: go synthesize -->
              <button
                v-if="getStatus(item) === 'active'"
                class="act-card__btn act-card__btn--active"
                @click="goSynthesis(item.id)"
              >去合成</button>
              <!-- Upcoming: countdown in disabled button -->
              <button v-else-if="getStatus(item) === 'upcoming'" class="act-card__btn act-card__btn--countdown" disabled>{{ getCountdownTime(item) }}</button>
              <!-- Ended: disabled button -->
              <button v-else-if="getStatus(item) === 'ended'" class="act-card__btn" disabled>已结束</button>
            </div>
            <div class="act-card__time">{{ item.timeText }}</div>
          </div>
        </div>
      </div>
    </div>
    <EmptyState v-else text="暂无活动" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/api/request'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const keyword = ref('')
const activeTab = ref('limit')

// 从后端接口获取的合成活动列表
const synthesisActivities = ref([])

// Reactive current time — updates every second for countdown
const now = ref(new Date())
let timer = null

async function loadActivities() {
  try {
    const res = await request.get('/synthesis/activities', {
      params: { page: 1, page_size: 20 }
    })
    const list = res.data?.list || []
    // 将后端字段映射为前端需要的格式
    synthesisActivities.value = list.map(item => {
      const permanent = item.type === 'permanent'
      return {
        id: item.id,
        title: item.name,
        image: item.result_collectible?.image || '',
        type: item.type,
        permanent,
        endTime: item.end_time || '',
        startTime: item.start_time || '',
        totalLimit: item.total_limit,
        usedCount: item.used_count,
        limit: item.per_user_limit,
        timeText: permanent ? '常驻活动 全天开放' : (item.end_time ? `全民: ${item.end_time}` : ''),
        rules: '活动期间收集材料藏品即可合成限定藏品'
      }
    })
  } catch (e) {
    // 错误提示已由拦截器处理
  }
}

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  loadActivities()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// Filter activities by active tab (type) and search keyword (title)
const filteredActivities = computed(() => {
  return synthesisActivities.value.filter(a => {
    const matchTab = a.type === activeTab.value
    const matchKeyword = !keyword.value || a.title.includes(keyword.value)
    return matchTab && matchKeyword
  })
})

// Calculate activity status based on current time
// 后端列表未返回 start_time，仅根据 end_time 和总量判断
function getStatus(activity) {
  if (activity.permanent) return 'active'
  if (activity.endTime) {
    const end = new Date(activity.endTime.replace(/-/g, '/'))
    if (now.value >= end) return 'ended'
  }
  if (activity.totalLimit && activity.usedCount >= activity.totalLimit) return 'ended'
  return 'active'
}

// Status label text
function statusLabel(activity) {
  const s = getStatus(activity)
  if (s === 'active') return '进行中'
  if (s === 'upcoming') return '敬请期待'
  return '已结束'
}

// Format countdown string for upcoming activities (full with label, used elsewhere)
function getCountdown(activity) {
  if (activity.permanent) return ''
  if (!activity.startTime) return ''
  const start = new Date(activity.startTime.replace(/-/g, '/'))
  let diff = Math.max(0, start - now.value)
  if (diff <= 0) return ''

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  diff -= days * 1000 * 60 * 60 * 24
  const hours = Math.floor(diff / (1000 * 60 * 60))
  diff -= hours * 1000 * 60 * 60
  const minutes = Math.floor(diff / (1000 * 60))
  diff -= minutes * 1000 * 60
  const seconds = Math.floor(diff / 1000)

  const pad = (n) => String(n).padStart(2, '0')
  if (days > 0) {
    return `倒计时 ${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `倒计时 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Format countdown time only (for button display)
function getCountdownTime(activity) {
  if (activity.permanent) return ''
  if (!activity.startTime) return ''
  const start = new Date(activity.startTime.replace(/-/g, '/'))
  let diff = Math.max(0, start - now.value)
  if (diff <= 0) return ''

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  diff -= days * 1000 * 60 * 60 * 24
  const hours = Math.floor(diff / (1000 * 60 * 60))
  diff -= hours * 1000 * 60 * 60
  const minutes = Math.floor(diff / (1000 * 60))
  diff -= minutes * 1000 * 60
  const seconds = Math.floor(diff / 1000)

  const pad = (n) => String(n).padStart(2, '0')
  if (days > 0) {
    return `${days}天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

// Show activity rules as a toast
function showRules(item) {
  showToast({ message: item.rules, duration: 3000 })
}

function goSynthesis(id) {
  router.push(`/activity/synthesis/${id}`)
}
</script>

<style scoped>
.synthesis-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-bottom: 16px;
}

/* Banner */
.banner {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}
.banner__bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.banner__text {
  position: absolute;
  top: 24px;
  left: 16px;
  z-index: 2;
}
.banner__subtitle {
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  color: var(--ht-text-secondary);
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.banner__title {
  font-size: 30px;
  font-weight: 800;
  color: var(--ht-text-primary);
}

/* Search bar */
.search-wrap {
  padding: 12px;
}
.search-wrap :deep(.van-search) {
  padding: 0;
  background: transparent;
}
.search-wrap :deep(.van-search__content) {
  height: 40px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 24px;
}

/* Tab switch */
.tab-switch {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 28px;
  padding: 4px 0 16px;
}
.tab-switch__item {
  font-size: 14px;
  color: var(--ht-text-secondary);
  position: relative;
  padding-bottom: 6px;
  cursor: pointer;
}
.tab-switch__item--active {
  color: var(--ht-text-primary);
  font-weight: 600;
}
.tab-switch__item--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  height: 2px;
  background: var(--ht-text-primary);
  border-radius: 1px;
}

/* Activity cards */
.card-list {
  padding: 0 0 4px;
}
.act-card {
  background: var(--ht-bg-card);
  border-radius: 12px;
  margin: 0 12px 12px;
  padding: 12px;
  box-shadow: var(--ht-shadow-card);
}
/* Status tag colors */
.act-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.act-card__tag {
  display: inline-block;
  border-radius: 4px;
  font-size: 12px;
  padding: 2px 6px;
  color: #fff;
}
.act-card__tag--active {
  background: #EF4444;   /* red for 进行中 */
}
.act-card__tag--upcoming {
  background: #9CA3AF;   /* gray for 敬请期待 */
}
.act-card__tag--ended {
  background: #9CA3AF;   /* gray for 已结束 */
}

.act-card__body {
  display: flex;
  gap: 12px;
}
.act-card__thumb {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.act-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.act-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 2px 0;
}
.act-card__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.act-card__mid {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.act-card__rule {
  font-size: 12px;
  color: var(--ht-blue);
}
.act-card__btn {
  background: var(--ht-border);
  color: var(--ht-text-tertiary);
  border-radius: 999px;
  font-size: 12px;
  padding: 6px 12px;
  cursor: not-allowed;
}
.act-card__btn--active {
  background: var(--ht-blue);
  color: #fff;
  cursor: pointer;
}
.act-card__btn--countdown {
  background: var(--ht-border);
  color: #1F2937;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.act-card__countdown {
  font-size: 12px;
  color: #1F2937;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.act-card__time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
</style>
