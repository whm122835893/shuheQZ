<template>
  <div class="checkin-page">
    <NavBar title="每日签到" />

    <!-- User info card -->
    <div class="user-card">
      <div class="user-card__top">
        <img class="user-card__logo" :src="userAvatar" alt="头像" />
        <div class="user-card__info">
          <div class="user-card__name">{{ displayName }}</div>
          <div class="user-card__uid">UID {{ uid || '未登录' }}</div>
        </div>
      </div>

      <div class="user-card__streak">
        <span class="user-card__streak-label">您已连续签到</span>
        <span class="user-card__streak-num">{{ streak }}</span>
        <span class="user-card__streak-unit">天</span>
      </div>
    </div>

    <!-- Calendar card -->
    <div class="cal-card">
      <div class="cal-card__month">
        <van-icon name="arrow-left" class="cal-card__arrow" @click="prevMonth" />
        <span class="cal-card__month-label">{{ monthLabel }}</span>
        <van-icon name="arrow" class="cal-card__arrow" @click="nextMonth" />
      </div>

      <div class="cal-card__weekdays">
        <span v-for="w in weekdays" :key="w">{{ w }}</span>
      </div>

      <div class="cal-card__grid">
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          class="cal-cell"
          :class="{
            'cal-cell--muted': cell.type !== 'current',
            'cal-cell--today': cell.isToday,
            'cal-cell--checked': cell.isChecked && !cell.isToday
          }"
          @click="onDateClick(cell)"
        >
          <span class="cal-cell__day">{{ cell.day }}</span>
          <span v-if="cell.isToday" class="cal-cell__today">今日</span>
          <span v-else-if="cell.isChecked" class="cal-cell__checked">已签</span>
        </div>
      </div>
    </div>

    <!-- Bottom fixed sign-in button -->
    <div class="checkin-footer">
      <button class="checkin-btn" :class="{ 'checkin-btn--done': hasCheckedIn }" :disabled="hasCheckedIn || checkingIn" @click="onCheckin">{{ hasCheckedIn ? '今日已签到' : (checkingIn ? '签到中...' : '立即签到') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const { isLoggedIn, username, avatar, uid } = useUser()
const userAvatar = computed(() => avatar.value)
const displayName = computed(() => isLoggedIn.value ? username.value : '未登录')

// Get the actual current date
const today = new Date()
const TODAY_YEAR = today.getFullYear()
const TODAY_MONTH = today.getMonth() // 0-indexed
const TODAY_DAY = today.getDate()

// Format a Date to a "YYYY-MM-DD" string
function formatDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Format month to "YYYY-MM"
function formatMonthStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// Today's date string
const todayStr = formatDateStr(today)

// ===== 签到状态（API 数据）=====
const hasCheckedIn = ref(false)
const streak = ref(0)
const checkingIn = ref(false)
const checkedInDates = ref(new Set())

async function fetchCheckinStatus() {
  if (!isLoggedIn.value) return
  try {
    const monthStr = formatMonthStr(new Date())
    const res = await request.get('/check-in/records', { params: { month: monthStr } })

    streak.value = res.data?.current_consecutive || 0

    // 检查今天是否已签到
    const records = res.data?.records || []
    checkedInDates.value = new Set(records.map(r => r.check_in_date))
    hasCheckedIn.value = checkedInDates.value.has(todayStr)
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

onMounted(fetchCheckinStatus)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const viewYear = ref(TODAY_YEAR)
const viewMonth = ref(TODAY_MONTH)

const monthLabel = computed(
  () => `${viewYear.value} / ${String(viewMonth.value + 1).padStart(2, '0')}`
)

const calendarCells = computed(() => buildCalendar(viewYear.value, viewMonth.value))

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []
  // Tail of previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, type: 'prev', isToday: false, isChecked: false })
  }
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      type: 'current',
      isToday: year === TODAY_YEAR && month === TODAY_MONTH && d === TODAY_DAY,
      isChecked: checkedInDates.value.has(dateStr),
    })
  }
  // Head of next month to fill 6 rows x 7 cols (42 cells)
  let next = 1
  while (cells.length < 42) {
    cells.push({ day: next, type: 'next', isToday: false, isChecked: false })
    next++
  }
  return cells
}

function prevMonth() {
  let m = viewMonth.value - 1
  let y = viewYear.value
  if (m < 0) {
    m = 11
    y -= 1
  }
  viewMonth.value = m
  viewYear.value = y
}

function nextMonth() {
  let m = viewMonth.value + 1
  let y = viewYear.value
  if (m > 11) {
    m = 0
    y += 1
  }
  viewMonth.value = m
  viewYear.value = y
}

function onDateClick(cell) {
  if (cell.type !== 'current') return
  const mm = String(viewMonth.value + 1).padStart(2, '0')
  const dd = String(cell.day).padStart(2, '0')
  const dateStr = `${viewYear.value}-${mm}-${dd}`
  if (cell.isChecked) {
    showToast(`${viewYear.value}年${mm}月${dd}日 已签到`)
  } else {
    showToast(`${viewYear.value}年${mm}月${dd}日`)
  }
}

async function onCheckin() {
  if (hasCheckedIn.value) {
    showToast('今日已签到')
    return
  }
  if (checkingIn.value) return
  checkingIn.value = true

  try {
    const res = await request.post('/check-in')

    hasCheckedIn.value = true
    streak.value = res.data?.consecutive_days || streak.value + 1

    // 将今天加入已签到日期集合
    checkedInDates.value.add(todayStr)

    const rewardDesc = res.data?.reward_desc || ''
    showToast(res.message || `签到成功 ${rewardDesc}`)
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    checkingIn.value = false
  }
}
</script>

<style scoped>
.checkin-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: calc(env(safe-area-inset-bottom) + 100px);
}

/* User info card */
.user-card {
  margin: 16px 24px 0;
  background: var(--ht-bg-card);
  border-radius: 16px;
  padding: 20px;
  box-shadow: var(--ht-shadow-card);
}
.user-card__top {
  display: flex;
  align-items: center;
  gap: 14px;
}
.user-card__logo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.user-card__info {
  display: flex;
  flex-direction: column;
}
.user-card__name {
  font-size: 16px;
  font-weight: 500;
  color: #1F2937;
}
.user-card__uid {
  margin-top: 4px;
  font-size: 12px;
  color: #9CA3AF;
}
.user-card__streak {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 22px;
}
.user-card__streak-label {
  font-size: 16px;
  color: #1F2937;
}
.user-card__streak-num {
  font-size: 48px;
  font-weight: 700;
  color: #B30A03;
  line-height: 1;
}
.user-card__streak-unit {
  font-size: 16px;
  color: #1F2937;
}

/* Calendar card */
.cal-card {
  margin: 16px 12px;
  background: var(--ht-bg-card);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--ht-shadow-card);
}
.cal-card__month {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.cal-card__arrow.van-icon {
  font-size: 16px;
  color: #9CA3AF;
  cursor: pointer;
}
.cal-card__month-label {
  font-size: 14px;
  font-weight: 500;
  color: #1F2937;
}
.cal-card__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 8px;
}
.cal-card__weekdays span {
  text-align: center;
  font-size: 14px;
  color: #9CA3AF;
}
.cal-card__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.cal-cell__day {
  font-size: 14px;
  color: #1F2937;
}
.cal-cell--muted .cal-cell__day {
  color: #9CA3AF;
}
.cal-cell--today {
  background: #B30A03;
  border-radius: 10px;
}
.cal-cell--today .cal-cell__day {
  color: #fff;
  font-weight: 600;
}
.cal-cell__today {
  font-size: 9px;
  color: #fff;
  margin-top: 1px;
  line-height: 1;
}
.cal-cell--checked {
  background: #DBEAFE;
  border-radius: 10px;
}
.cal-cell--checked .cal-cell__day {
  color: #3B82F6;
  font-weight: 500;
}
.cal-cell__checked {
  font-size: 9px;
  color: #3B82F6;
  margin-top: 1px;
  line-height: 1;
}

/* Bottom fixed button */
.checkin-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 24px calc(env(safe-area-inset-bottom) + 16px);
  background: #fff;
  border-top: 1px solid var(--ht-border);
  z-index: 50;
}
.checkin-btn {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.checkin-btn:active {
  opacity: 0.85;
}
.checkin-btn--done {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}
.checkin-btn--done:active {
  opacity: 1;
}
.checkin-btn:disabled {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}
</style>
