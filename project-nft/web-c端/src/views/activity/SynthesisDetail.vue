<template>
  <div class="syn-detail-page">
    <!-- Custom navbar -->
    <div class="sd-nav">
      <div class="sd-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#1F2937" />
      </div>
      <span class="sd-nav__title">合成详情</span>
    </div>

    <template v-if="activity">
      <!-- Result collectible showcase -->
      <div class="sd-hero">
        <div class="sd-hero-card">
          <img v-if="resultCollectible?.image" :src="resultCollectible.image" :alt="resultCollectible.name" class="sd-hero-img" />
          <div v-else class="sd-hero-img sd-hero-img--gradient" :style="{ background: resultCollectible?.gradient }">
            <van-icon :name="resultCollectible?.icon || 'music-o'" size="80" color="rgba(255,255,255,0.85)" />
          </div>
        </div>
        <div class="sd-platform"></div>
        <div class="sd-platform-shadow"></div>
      </div>

      <!-- Title section -->
      <div class="sd-title-section">
        <div class="sd-title-row">
          <van-icon name="award-o" size="20" color="#3B82F6" />
          <span class="sd-name">{{ resultCollectible?.name }}</span>
          <van-icon name="award-o" size="20" color="#3B82F6" />
        </div>
        <div class="sd-subtitle">{{ activity.title }}</div>
      </div>

      <!-- Upcoming: show countdown instead of synthesis interface -->
      <div v-if="status === 'upcoming'" class="sd-section sd-section--center">
        <div class="sd-countdown-label">活动即将开始</div>
        <div class="sd-countdown-time">
          <template v-if="countdown.days !== '00'">
            <span class="sd-countdown-num">{{ countdown.days }}</span>
            <span class="sd-countdown-sep">天</span>
          </template>
          <span class="sd-countdown-num">{{ countdown.hours }}</span>
          <span class="sd-countdown-sep">:</span>
          <span class="sd-countdown-num">{{ countdown.minutes }}</span>
          <span class="sd-countdown-sep">:</span>
          <span class="sd-countdown-num">{{ countdown.seconds }}</span>
        </div>
        <div class="sd-countdown-hint">开始时间：{{ activity.startTime }}</div>
      </div>

      <!-- Ended: show ended message -->
      <div v-else-if="status === 'ended'" class="sd-section sd-section--center">
        <van-icon name="clock-o" size="48" color="#9CA3AF" />
        <div class="sd-ended-text">活动已结束</div>
        <div class="sd-ended-hint">{{ activity.permanent ? '' : activity.endTime }}</div>
      </div>

      <!-- Active: show synthesis interface -->
      <template v-else>
        <!-- Materials required -->
        <div class="sd-section">
          <div class="sd-section__title">合成材料</div>
          <div class="sd-materials">
            <div v-for="mat in activity.materials" :key="mat.collectible_id" class="sd-material">
              <div class="sd-material__thumb" :style="{ background: getMaterialInfo(mat.collectible_id)?.gradient }">
                <img v-if="getMaterialInfo(mat.collectible_id)?.image" :src="getMaterialInfo(mat.collectible_id).image" :alt="getMaterialInfo(mat.collectible_id)?.name" class="sd-material__img" />
                <van-icon v-else :name="getMaterialInfo(mat.collectible_id)?.icon || 'music-o'" size="28" color="rgba(255,255,255,0.9)" />
              </div>
              <div class="sd-material__info">
                <div class="sd-material__name">{{ getMaterialInfo(mat.collectible_id)?.name }}</div>
                <div class="sd-material__count">
                  需要 {{ mat.required_quantity }} 个 · 持有 <span :class="{ 'sd-material__count--insufficient': getOwnedCount(mat.collectible_id) < mat.required_quantity }">{{ getOwnedCount(mat.collectible_id) }}</span> 个
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Select materials from inventory -->
        <div class="sd-section">
          <div class="sd-section__title">选择合成材料</div>
          <div v-if="availableMaterials.length > 0" class="sd-select-grid">
            <div
              v-for="item in availableMaterials"
              :key="item.id"
              class="sd-select-item"
              :class="{ 'sd-select-item--selected': selectedIds.includes(item.id) }"
              @click="toggleSelect(item.id)"
            >
              <div class="sd-select-item__check" v-if="selectedIds.includes(item.id)">
                <van-icon name="success" size="14" color="#fff" />
              </div>
              <div class="sd-select-item__thumb" :style="{ background: item.gradient }">
                <img v-if="item.image" :src="item.image" :alt="item.name" class="sd-select-item__img" />
                <van-icon v-else :name="item.icon || 'music-o'" size="24" color="rgba(255,255,255,0.9)" />
              </div>
              <div class="sd-select-item__serial">{{ item.serial }}</div>
            </div>
          </div>
          <div v-else class="sd-empty-materials">
            <van-icon name="warning-o" size="24" color="#9CA3AF" />
            <span>仓库中没有足够的合成材料藏品</span>
          </div>
        </div>

        <!-- Bottom bar -->
        <div class="sd-bottom-spacer"></div>
        <div class="sd-bottom-bar">
          <div class="sd-bottom-info">
            <span class="sd-bottom-label">已选 {{ selectedIds.length }} / {{ totalRequired }} 个</span>
          </div>
          <button
            class="sd-action-btn"
            :class="{ 'sd-action-btn--disabled': !canSynthesize }"
            :disabled="!canSynthesize"
            @click="onSynthesize"
          >
            立即合成
          </button>
        </div>
      </template>

      <!-- Activity rules (always shown) -->
      <div class="sd-section">
        <div class="sd-section__title">活动规则</div>
        <div class="sd-rules-text">{{ activity.rules }}</div>
        <div class="sd-rules-meta">
          <span>活动时间：{{ activity.timeText }}</span>
        </div>
      </div>
    </template>

    <div v-else class="sd-notfound">
      <EmptyState text="活动不存在" />
    </div>

    <!-- Success popup -->
    <van-popup v-model:show="showSuccess" round closeable :style="{ width: '80%' }" @closed="onSuccessClosed">
      <div class="sd-success">
        <div class="sd-success__icon">
          <van-icon name="checked" size="56" color="#10B981" />
        </div>
        <div class="sd-success__title">合成成功！</div>
        <div class="sd-success__desc">恭喜获得「{{ resultCollectible?.name }}」</div>
        <div class="sd-success__thumb" :style="{ background: resultCollectible?.gradient }">
          <img v-if="resultCollectible?.image" :src="resultCollectible.image" :alt="resultCollectible.name" class="sd-success__img" />
          <van-icon v-else :name="resultCollectible?.icon || 'music-o'" size="48" color="rgba(255,255,255,0.9)" />
        </div>
        <div class="sd-success__serial">{{ newSerial }}</div>
        <button class="sd-success__btn" @click="showSuccess = false">查看仓库</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const route = useRoute()

const { isLoggedIn } = useUser()

// 合成活动详情（从后端接口获取）
const activity = ref(null)

// 用户持有的合成材料藏品（从后端接口获取）
const availableMaterials = ref([])

// Reactive current time for countdown
const now = ref(new Date())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 1000)
  init()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

async function init() {
  await loadActivity()  // 内部已调用 loadUserCollectibles
}

// 获取合成活动详情（内部会同步刷新用户持有材料）
async function loadActivity() {
  try {
    const res = await request.get(`/synthesis/activities/${route.params.id}`)
    const d = res.data
    if (!d) {
      activity.value = null
      availableMaterials.value = []
      return
    }
    const permanent = d.type === 'permanent'
    activity.value = {
      id: d.id,
      name: d.name,
      title: d.name,
      type: d.type,
      permanent,
      result_collectible: d.result_collectible || null,
      materials: d.materials || [],
      can_synthesize: d.can_synthesize,
      my_used_count: d.my_used_count,
      per_user_limit: d.per_user_limit,
      endTime: d.end_time || '',
      startTime: d.start_time || '',
      totalLimit: d.total_limit,
      usedCount: d.used_count,
      timeText: permanent ? '常驻活动 全天开放' : (d.end_time ? `全民: ${d.end_time}` : ''),
      rules: '活动期间收集材料藏品即可合成限定藏品'
    }
    // activity.value 设置完成后，立即刷新用户持有材料（依赖 activity.value.materials）
    await loadUserCollectibles()
  } catch (e) {
    // 获取失败，显示"活动不存在"
    activity.value = null
    availableMaterials.value = []
  }
}

// 获取用户持有的藏品，筛选出材料配方中需要的藏品
async function loadUserCollectibles() {
  if (!isLoggedIn.value) {
    availableMaterials.value = []
    return
  }
  try {
    const res = await request.get('/user/collectibles', {
      params: { holding_status: 1, page: 1, page_size: 200 }
    })
    const list = res.data?.list || []
    const requiredIds = new Set((activity.value?.materials || []).map(m => m.collectible_id))
    availableMaterials.value = list
      .filter(item => requiredIds.has(item.collectible_id))
      .map(item => ({
        id: item.id,
        collectibleId: item.collectible_id,
        collectible_id: item.collectible_id,
        name: item.collectible_name,
        image: item.collectible_image,
        serial: item.serial_no,
        icon: 'music-o'
      }))
  } catch (e) {
    availableMaterials.value = []
  }
}

// Activity status (reactive)
// 后端未返回 start_time，主要根据 can_synthesize 与 end_time 判断状态
const status = computed(() => {
  if (!activity.value) return 'ended'
  if (activity.value.can_synthesize) return 'active'
  // 不能合成，判断活动是否已结束
  if (activity.value.endTime) {
    const end = new Date(activity.value.endTime.replace(/-/g, '/'))
    if (now.value >= end) return 'ended'
  }
  if (activity.value.totalLimit && activity.value.usedCount >= activity.value.totalLimit) return 'ended'
  return 'active'
})

// Countdown for upcoming activities
const countdown = computed(() => {
  if (!activity.value || activity.value.permanent || !activity.value.startTime) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00' }
  }
  const start = new Date(activity.value.startTime.replace(/-/g, '/'))
  let diff = Math.max(0, start - now.value)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  diff -= days * 1000 * 60 * 60 * 24
  const hours = Math.floor(diff / (1000 * 60 * 60))
  diff -= hours * 1000 * 60 * 60
  const minutes = Math.floor(diff / (1000 * 60))
  diff -= minutes * 1000 * 60
  const seconds = Math.floor(diff / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return { days: pad(days), hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) }
})

const resultCollectible = computed(() => {
  if (!activity.value) return null
  return activity.value.result_collectible || null
})

// Get material collectible info (从活动详情的 materials 数组中查找)
function getMaterialInfo(collectibleId) {
  if (!activity.value) return null
  return activity.value.materials.find(m => m.collectible_id === collectibleId) || null
}

// Get owned count for a collectible (从 materials 的 my_holding 中查找)
function getOwnedCount(collectibleId) {
  if (!activity.value) return 0
  const m = activity.value.materials.find(m => m.collectible_id === collectibleId)
  return m ? m.my_holding : 0
}

// Total required materials (对 materials 的 required_quantity 求和)
const totalRequired = computed(() => {
  if (!activity.value) return 0
  return activity.value.materials.reduce((sum, m) => sum + (m.required_quantity || 0), 0)
})

// Selected material item ids
const selectedIds = ref([])

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    if (selectedIds.value.length >= totalRequired.value) {
      showToast(`最多选择 ${totalRequired.value} 个材料`)
      return
    }
    selectedIds.value.push(id)
  }
}

// Check if can synthesize
const canSynthesize = computed(() => {
  if (!activity.value) return false
  if (status.value !== 'active') return false
  return selectedIds.value.length === totalRequired.value
})

// Verify selected items match required materials
function verifySelection() {
  if (!activity.value) return false
  const requiredMap = {}
  activity.value.materials.forEach(m => {
    requiredMap[m.collectible_id] = m.required_quantity
  })

  const selectedMap = {}
  selectedIds.value.forEach(id => {
    const item = availableMaterials.value.find(i => i.id === id)
    if (item) {
      const cid = item.collectible_id
      selectedMap[cid] = (selectedMap[cid] || 0) + 1
    }
  })

  for (const [cid, count] of Object.entries(requiredMap)) {
    if ((selectedMap[cid] || 0) < count) return false
  }
  return true
}

// Success popup state
const showSuccess = ref(false)
const newSerial = ref('')

function onSynthesize() {
  if (!isLoggedIn.value) {
    showToast('请先登录')
    return
  }
  if (!canSynthesize.value) return
  if (!verifySelection()) {
    showToast('选择的材料不满足合成要求')
    return
  }

  showDialog({
    title: '确认合成',
    message: `将消耗 ${totalRequired.value} 个材料藏品合成「${resultCollectible.value?.name}」，确认继续吗？`,
    showCancelButton: true,
    confirmButtonText: '确认合成'
  }).then(() => {
    doSynthesize()
  }).catch(() => {})
}

// 调用后端合成接口
async function doSynthesize() {
  try {
    const res = await request.post(`/synthesis/activities/${route.params.id}/synthesize`, {
      material_user_collectible_ids: [...selectedIds.value]
    })
    const data = res.data
    // 使用后端返回的 serial_no 作为新藏品编号
    newSerial.value = data?.serial_no || ''
    // 重置选择
    selectedIds.value = []
    // 重新加载活动详情（内部已包含 loadUserCollectibles），更新持有数量与可合成状态
    await loadActivity()
    // 显示成功弹窗
    showSuccess.value = true
  } catch (e) {
    // 错误提示已由拦截器处理
  }
}

function onSuccessClosed() {
  router.replace('/profile')
}

function goBack() {
  router.back()
}
</script>

<style scoped>
.syn-detail-page {
  min-height: 100vh;
  background: #F8F9FA;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

/* Navbar */
.sd-nav {
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
.sd-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sd-nav__title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
}

/* Hero */
.sd-hero {
  position: relative;
  padding-top: calc(44px + env(safe-area-inset-top));
  background: var(--ht-gradient-blue-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 16px;
}
.sd-hero-card {
  position: relative;
  width: 70%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 2;
}
.sd-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sd-hero-img--gradient {
  display: flex;
  align-items: center;
  justify-content: center;
}
.sd-platform {
  width: 90%;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #E5E7EB 100%);
  margin-top: -8px;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.sd-platform-shadow {
  width: 70%;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
  margin-top: 2px;
}

/* Title */
.sd-title-section {
  text-align: center;
  padding: 8px 24px 16px;
}
.sd-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.sd-name {
  font-size: 22px;
  font-weight: 700;
  color: #1F2937;
}
.sd-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  margin-top: 6px;
}

/* Sections */
.sd-section {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.sd-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 12px;
}

/* Materials list */
.sd-materials {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sd-material {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 12px;
}
.sd-material__thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sd-material__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sd-material__info {
  flex: 1;
  min-width: 0;
}
.sd-material__name {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
}
.sd-material__count {
  font-size: 12px;
  color: #6B7280;
  margin-top: 4px;
}
.sd-material__count--insufficient {
  color: #EF4444;
  font-weight: 600;
}

/* Select grid */
.sd-select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.sd-select-item {
  position: relative;
  background: #F9FAFB;
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.sd-select-item--selected {
  border-color: #3B82F6;
  background: #EFF6FF;
}
.sd-select-item__check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3B82F6;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.sd-select-item__thumb {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sd-select-item__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sd-select-item__serial {
  font-size: 11px;
  color: #6B7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.sd-empty-materials {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px;
  color: #9CA3AF;
  font-size: 13px;
}

/* Rules */
.sd-rules-text {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.7;
}
.sd-rules-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #9CA3AF;
}

/* Bottom bar */
.sd-bottom-spacer {
  height: 20px;
}
.sd-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding: 0 16px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid #F3F4F6;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 100;
}
.sd-bottom-info {
  flex: 1;
}
.sd-bottom-label {
  font-size: 14px;
  color: #6B7280;
}
.sd-action-btn {
  height: 44px;
  padding: 0 32px;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  cursor: pointer;
}
.sd-action-btn--disabled {
  background: #E5E7EB;
  color: #9CA3AF;
  box-shadow: none;
  cursor: not-allowed;
}

/* Success popup */
.sd-success {
  padding: 32px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.sd-success__icon {
  margin-bottom: 12px;
}
.sd-success__title {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
}
.sd-success__desc {
  font-size: 14px;
  color: #6B7280;
  margin-top: 6px;
}
.sd-success__thumb {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
}
.sd-success__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sd-success__serial {
  font-size: 13px;
  color: #6B7280;
  margin-top: 8px;
}
.sd-success__btn {
  margin-top: 20px;
  width: 100%;
  height: 44px;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}

/* Not found */
.sd-notfound {
  padding-top: 120px;
}

/* Center section (countdown / ended) */
.sd-section--center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 16px;
}
.sd-countdown-label {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
}
.sd-countdown-time {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sd-countdown-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 36px;
  background: #1F2937;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
}
.sd-countdown-sep {
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
}
.sd-countdown-hint {
  font-size: 13px;
  color: #9CA3AF;
  margin-top: 4px;
}
.sd-ended-text {
  font-size: 18px;
  font-weight: 600;
  color: #6B7280;
}
.sd-ended-hint {
  font-size: 13px;
  color: #9CA3AF;
}
</style>
