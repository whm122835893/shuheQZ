<template>
  <div class="lottery-page">
    <!-- Header -->
    <div class="lottery-header">
      <div class="header-back" @click="goBack">
        <van-icon name="arrow-left" size="18" color="#333" />
      </div>
      <div class="header-title">抽奖活动</div>
      <div class="header-link" @click="goRecords">中奖记录</div>
    </div>

    <!-- Upper section: slot machine + action buttons -->
    <div class="lottery-upper">
      <div class="machine-wrapper" :class="{ 'machine-wrapper--shaking': isSpinning }">
        <div class="main-img"></div>
      </div>

      <div class="lottery-actions">
        <div class="lottery-remaining">剩余抽奖次数: {{ drawCount }}</div>
        <div class="lottery-btns">
          <div class="lottery-btn lottery-btn--once" :class="{ 'lottery-btn--disabled': isSpinning || drawCount === 0 }" @click="onDraw(1)">抽一次</div>
          <div class="lottery-btn" :class="{ 'lottery-btn--disabled': isSpinning || drawCount === 0 }" @click="onDraw(5)">抽五次</div>
        </div>
      </div>
    </div>

    <!-- Prize table -->
    <div class="lottery-body">
      <div class="prize-card">
        <div class="prize-table">
          <div class="prize-row prize-head">
            <div class="col-name">名称</div>
            <div class="col-count">已中/总数</div>
            <div class="col-prize">对应奖品</div>
          </div>
          <div class="prize-scroll">
            <div v-if="prizeList.length === 0" class="prize-empty">暂无奖品信息</div>
            <div v-for="(item, idx) in prizeList" :key="idx" class="prize-row">
              <div class="col-name">{{ item.name }}</div>
              <div class="col-count">{{ item.won }}/{{ item.total }}</div>
              <div class="col-prize">{{ item.prize }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Win dialog -->
    <van-popup v-model:show="showDialog" position="center" round closeable close-icon="close" :close-on-click-overlay="true"
      :style="{ width: '80%', maxWidth: '300px', padding: '0', overflow: 'hidden' }">
      <div class="win-dialog">
        <!-- Prize box image -->
        <div class="win-dialog__hero">
          <span class="win-dialog__hero-img">🎁</span>
        </div>

        <!-- Title -->
        <div class="win-dialog__title">
          <span class="win-dialog__title-img">恭喜获得</span>
        </div>

        <!-- Body -->
        <div class="win-dialog__body">
          <div class="win-dialog__list" :class="{ 'win-dialog__list--grid': drawResults.length > 1 }">
            <div v-for="(item, idx) in drawResults" :key="idx" class="win-dialog__item">
              <img v-if="item.image" :src="item.image" class="win-dialog__item-img" alt="奖品" />
              <div v-else class="win-dialog__item-img win-dialog__item-img--placeholder" :style="{ background: item.gradient }">
                <van-icon :name="item.icon || 'gift-o'" size="32" color="rgba(255,255,255,0.85)" />
              </div>
              <div class="win-dialog__item-name">{{ item.prize }}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="win-dialog__footer">
          <button class="win-dialog__btn" @click="closeDialog">收下奖励</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { isLoggedIn } = useUser()

const showDialog = ref(false)
const drawResults = ref([])
const isSpinning = ref(false)

// ===== 抽奖活动数据（API）=====
const activityId = ref(null)
const drawCount = ref(0)
const prizeList = ref([])

async function fetchActivityDetail() {
  if (!isLoggedIn.value) return
  try {
    // 1) 获取抽奖活动列表
    const listRes = await request.get('/lucky-draw/activities', { params: { page: 1, page_size: 10 } })
    const activities = listRes.data?.list || []
    if (activities.length === 0) {
      showToast('暂无抽奖活动')
      return
    }
    activityId.value = activities[0].id

    // 2) 获取活动详情（含奖品池和剩余次数）
    const detailRes = await request.get(`/lucky-draw/activities/${activityId.value}`)
    const data = detailRes.data
    drawCount.value = data.my_remaining_draws || 0
    prizeList.value = (data.prizes || []).map(p => ({
      name: p.name,
      prize: p.name,
      image: p.image || null,
      gradient: null,
      icon: 'gift-o',
      total: p.quantity_limit || 999,
      won: p.quantity_distributed || 0,
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

onMounted(fetchActivityDetail)

function goBack() {
  router.back()
}

function goRecords() {
  router.push('/profile/draw-records')
}

async function onDraw(times) {
  if (isSpinning.value) return
  if (drawCount.value <= 0) {
    showToast('今日抽奖次数已用完')
    return
  }
  if (drawCount.value < times) {
    showToast('抽奖次数不足')
    return
  }
  if (!activityId.value) {
    showToast('抽奖活动加载中，请稍后')
    return
  }

  isSpinning.value = true
  drawResults.value = []

  try {
    // 调用抽奖 API（每次抽1次，循环 times 次）
    const promises = []
    for (let i = 0; i < times; i++) {
      promises.push(request.post(`/lucky-draw/activities/${activityId.value}/draw`))
    }
    const results = await Promise.allSettled(promises)

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const res = result.value
        const prize = res.data?.prize
        if (prize) {
          drawResults.value.push({
            name: prize.name,
            prize: prize.name,
            image: prize.image || null,
            gradient: null,
            icon: 'gift-o',
          })
        } else {
          drawResults.value.push({
            name: '未中奖',
            prize: '未中奖',
            image: null,
            gradient: null,
            icon: 'close',
          })
        }
        // 更新剩余次数
        if (res.data?.remaining_draws !== undefined) {
          drawCount.value = res.data.remaining_draws
        }
      }
    }

    isSpinning.value = false
    showDialog.value = true

    if (drawCount.value === 0) {
      showToast('今日抽奖次数已用完')
    }

    // 刷新奖品池已中数量
    fetchActivityDetail()
  } catch (err) {
    isSpinning.value = false
    // 错误提示已由拦截器处理
  }
}

function closeDialog() {
  showDialog.value = false
}
</script>

<style scoped>
.lottery-page {
  box-sizing: border-box;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 60%);
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  overflow-x: hidden;
  position: relative;
}

/* Header */
.lottery-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 45px;
  padding: 0 16px;
  padding-top: env(safe-area-inset-top);
}
.header-back {
  width: 33px;
  height: 33px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
}
.header-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: #333;
}
.header-link {
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

/* Upper section */
.lottery-upper {
  position: relative;
  z-index: 1;
  padding: 24px 12px 0;
}

/* Slot machine wrapper */
.machine-wrapper {
  position: relative;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}
.machine-wrapper--shaking {
  animation: machine-shake 0.15s infinite;
}
@keyframes machine-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

.main-img {
  width: 100%;
  height: 280px;
  display: block;
  border-radius: 16px;
  background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #EC4899 100%);
}

.lottery-actions {
  padding: 0 8px;
  margin-top: 16px;
}
.lottery-remaining {
  text-align: center;
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 12px;
}
.lottery-btns {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.lottery-btn {
  flex: 1;
  height: 49px;
  line-height: 49px;
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  background: #3B82F6;
  border: none;
  border-radius: 519px;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.25);
  cursor: pointer;
  transition: opacity 0.2s;
}
.lottery-btn--once {
  background: #3B82F6;
}
.lottery-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Prize table */
.lottery-body {
  position: relative;
  z-index: 99;
  width: 100%;
  border-radius: 8px 8px 0 0;
  margin-top: 12px;
  padding: 15px 12px 20px;
}
.prize-card {
  background: #fff;
  border-radius: 12px;
  padding: 0 12px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}
.prize-table {
  width: 100%;
}
.prize-row {
  display: flex;
  align-items: center;
  padding: 12px 0;
}
.prize-head {
  font-size: 13px;
  font-weight: 500;
  color: #3B82F6;
  border-bottom: 0.5px solid #f0f0f0;
}
.col-name {
  width: 22%;
  flex-shrink: 0;
}
.col-count {
  width: 28%;
  text-align: center;
  flex-shrink: 0;
}
.col-prize {
  flex: 1;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-left: 8px;
}
.prize-scroll {
  max-height: 187px;
  overflow-y: auto;
}
.prize-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px 0;
}

/* Win dialog */
.win-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 60%);
}
.win-dialog__hero {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 24px;
}
.win-dialog__hero-img {
  width: 140px;
  height: 140px;
  font-size: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.win-dialog__title {
  text-align: center;
  margin-top: 8px;
}
.win-dialog__title-img {
  font-size: 22px;
  font-weight: 700;
  color: #3B82F6;
}
.win-dialog__body {
  width: 100%;
  padding: 16px 20px 12px;
}
.win-dialog__list {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.win-dialog__list--grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 8px;
}
.win-dialog__item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.win-dialog__item-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 6px;
}
.win-dialog__item-img--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.win-dialog__item-name {
  font-size: 13px;
  font-weight: 500;
  color: #1F2937;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 90px;
}
.win-dialog__footer {
  width: 100%;
  padding: 12px 20px 24px;
}
.win-dialog__btn {
  width: 100%;
  height: 46px;
  border-radius: 23px;
  background: #3B82F6;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  cursor: pointer;
}
</style>
