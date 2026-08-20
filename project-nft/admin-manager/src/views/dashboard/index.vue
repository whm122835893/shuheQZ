<template>
  <div class="dashboard-page">
    <!-- 指标卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">今日新增用户</div>
            <div class="stat-value">{{ metrics.todayNewUsers }}</div>
          </div>
          <div class="stat-icon"><el-icon><User /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">今日销售额</div>
            <div class="stat-value">¥{{ metrics.todaySales.toFixed(2) }}</div>
          </div>
          <div class="stat-icon"><el-icon><Money /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">今日订单量</div>
            <div class="stat-value">{{ metrics.todayOrders }}</div>
          </div>
          <div class="stat-icon"><el-icon><Document /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-purple">
          <div class="stat-info">
            <div class="stat-label">活跃藏品数</div>
            <div class="stat-value">{{ metrics.activeCollectibles }}</div>
          </div>
          <div class="stat-icon"><el-icon><Picture /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-cyan">
          <div class="stat-info">
            <div class="stat-label">寄售中数量</div>
            <div class="stat-value">{{ metrics.resaleCount }}</div>
          </div>
          <div class="stat-icon"><el-icon><Shop /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="12" :md="8" :lg="4">
        <div class="stat-card grad-pink">
          <div class="stat-info">
            <div class="stat-label">盲盒发售中</div>
            <div class="stat-value">{{ metrics.blindboxOnSale }}</div>
          </div>
          <div class="stat-icon"><el-icon><Box /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>近7日销售/订单/盲盒趋势</span>
              <el-radio-group v-model="trendType" size="small" @change="renderTrendChart">
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="sales">销售额</el-radio-button>
                <el-radio-button label="orders">订单量</el-radio-button>
                <el-radio-button label="blindbox">盲盒</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="trendChartRef" class="chart-box" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>钱包余额分布</span>
            </div>
          </template>
          <div ref="walletChartRef" class="chart-box" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 库存预警 & 实时动态 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="alert-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><WarningFilled /></el-icon> 库存预警面板</span>
              <el-tag type="danger" size="small">{{ alerts.length }} 条告警</el-tag>
            </div>
          </template>
          <div class="alert-list">
            <div
              v-for="(alert, index) in alerts"
              :key="index"
              class="alert-item"
            >
              <el-tag :type="alert.type" size="small" effect="dark">
                {{ alertTagText(alert.type) }}
              </el-tag>
              <span class="alert-message">{{ alert.message }}</span>
              <span class="alert-time">{{ alert.time }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="activity-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Bell /></el-icon> 实时动态</span>
              <el-tag type="success" size="small" effect="plain">
                <el-icon class="live-dot"><VideoPlay /></el-icon>直播中
              </el-tag>
            </div>
          </template>
          <div class="activity-list">
            <div
              v-for="(activity, index) in activityList"
              :key="index"
              class="activity-item"
            >
              <el-avatar :size="32" class="activity-avatar">
                {{ activity.user.charAt(0) }}
              </el-avatar>
              <div class="activity-content">
                <span class="activity-user">{{ activity.user }}</span>
                <span class="activity-action">{{ activity.action }}</span>
                <span v-if="activity.amount !== '-'" class="activity-amount">{{ activity.amount }}</span>
              </div>
              <span class="activity-time">{{ activity.time }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { dashboardApi } from '../../api'
import { ElMessage } from 'element-plus'

type TrendType = 'all' | 'sales' | 'orders' | 'blindbox'

// 指标卡片 - 使用真实 API 数据
const metrics = ref({
  todayNewUsers: 0,
  todaySales: 0,
  todayOrders: 0,
  activeCollectibles: 0,
  resaleCount: 0,
  blindboxOnSale: 0
})
const trendType = ref<TrendType>('all')

const trendChartRef = ref<HTMLElement>()
const walletChartRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null
let walletChart: echarts.ECharts | null = null
let activityTimer: ReturnType<typeof setInterval> | null = null

// 趋势数据（从后端加载）
const trendData = ref<{ dates: string[]; sales: number[]; orders: number[]; blindboxSales: number[] }>({
  dates: [],
  sales: [],
  orders: [],
  blindboxSales: []
})

// 钱包余额分布（从后端加载）
const walletDistribution = ref<{ name: string; value: number }[]>([])

// 实时动态列表（循环滚动）
const activityList = ref<any[]>([])

// 告警列表
const alerts = ref<any[]>([])

function alertTagText(type: string) {
  const map: Record<string, string> = {
    warning: '预警',
    danger: '严重',
    info: '通知'
  }
  return map[type] || '通知'
}

// 趋势折线图
function renderTrendChart() {
  if (!trendChartRef.value) return
  if (!trendChart) {
    trendChart = echarts.init(trendChartRef.value)
  }

  const dates = trendData.value.dates
  const showSales = trendType.value === 'all' || trendType.value === 'sales'
  const showOrders = trendType.value === 'all' || trendType.value === 'orders'
  const showBlindbox = trendType.value === 'all' || trendType.value === 'blindbox'

  const series: echarts.SeriesOption[] = []

  if (showSales) {
    series.push({
      name: '销售额',
      type: 'line',
      smooth: true,
      yAxisIndex: 0,
      data: trendData.value.sales,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(102, 126, 234, 0.6)' },
          { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
        ])
      },
      itemStyle: { color: '#667eea' },
      lineStyle: { width: 3 }
    })
  }
  if (showOrders) {
    series.push({
      name: '订单量',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trendData.value.orders,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(250, 112, 154, 0.6)' },
          { offset: 1, color: 'rgba(250, 112, 154, 0.05)' }
        ])
      },
      itemStyle: { color: '#fa709a' },
      lineStyle: { width: 3 }
    })
  }
  if (showBlindbox) {
    series.push({
      name: '盲盒销量',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trendData.value.blindboxSales,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(67, 233, 123, 0.6)' },
          { offset: 1, color: 'rgba(67, 233, 123, 0.05)' }
        ])
      },
      itemStyle: { color: '#43e97b' },
      lineStyle: { width: 3 }
    })
  }

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (val) => {
        if (typeof val === 'number' && val > 1000) {
          return '¥' + val.toFixed(2)
        }
        return String(val ?? '')
      }
    },
    legend: {
      data: series.map(s => s.name as string),
      top: 0
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(¥)',
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: {
          color: '#909399',
          formatter: (val: number) => (val >= 1000 ? val / 1000 + 'k' : String(val))
        }
      },
      {
        type: 'value',
        name: '数量',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#909399' }
      }
    ],
    series
  }

  trendChart.setOption(option, true)
}

// 钱包余额分布环形图
function renderWalletChart() {
  if (!walletChartRef.value) return
  if (!walletChart) {
    walletChart = echarts.init(walletChartRef.value)
  }

  const total = walletDistribution.value.reduce((sum, item) => sum + item.value, 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}<br/>数量: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11, color: '#909399' }
    },
    series: [
      {
        name: '钱包余额分布',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|总用户}\n{b|${total.toLocaleString()}}`,
          rich: {
            a: { fontSize: 13, color: '#909399', lineHeight: 24 },
            b: { fontSize: 22, fontWeight: 'bold', color: '#303133' }
          }
        },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        labelLine: { show: false },
        data: walletDistribution.value.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: {
            color: ['#667eea', '#43e97b', '#fa709a', '#a18cd1', '#4facfe'][index % 5]
          }
        }))
      }
    ]
  }

  walletChart.setOption(option)
}

// 实时动态滚动：定时将首条移到末尾实现循环
function startActivityScroll() {
  activityTimer = setInterval(() => {
    if (activityList.value.length === 0) return
    const first = activityList.value.shift()
    if (first) {
      activityList.value.push(first)
    }
  }, 3000)
}

// 窗口缩放自适应
function handleResize() {
  trendChart?.resize()
  walletChart?.resize()
}

onMounted(async () => {
  await nextTick()
  
  // 并行获取所有仪表盘数据
  const [metricsRes, trendsRes, alertsRes, activitiesRes, financeRes] = await Promise.allSettled([
    dashboardApi.metrics(),
    dashboardApi.trends(7),
    dashboardApi.alerts(),
    dashboardApi.activities(),
    dashboardApi.finance(),
  ])

  // 核心指标
  if (metricsRes.status === 'fulfilled' && metricsRes.value) {
    const data = metricsRes.value
    metrics.value = {
      todayNewUsers: data.todayNewUsers || 0,
      todaySales: data.todayRevenue || 0,
      todayOrders: data.todayOrders || 0,
      activeCollectibles: data.totalCollectibles || 0,
      resaleCount: 0,
      blindboxOnSale: 0
    }
  }

  // 趋势数据
  if (trendsRes.status === 'fulfilled' && trendsRes.value) {
    const data = trendsRes.value as any
    const dailyData = data?.dailyData || data?.daily || []
    if (Array.isArray(dailyData) && dailyData.length > 0) {
      trendData.value = {
        dates: dailyData.map((d: any) => d.date || ''),
        sales: dailyData.map((d: any) => Number(d.revenue || d.sales || 0)),
        orders: dailyData.map((d: any) => Number(d.orders || 0)),
        blindboxSales: dailyData.map((d: any) => Number(d.blindboxSales || d.blindbox || 0))
      }
    }
  }

  // 告警数据
  if (alertsRes.status === 'fulfilled' && alertsRes.value) {
    const data = alertsRes.value as any
    const alertList = data?.alerts || data?.list || []
    if (Array.isArray(alertList) && alertList.length > 0) {
      alerts.value = alertList.map((a: any) => ({
        type: a.type || a.level || 'warning',
        message: a.message || a.content || a.title || '',
        time: a.time || a.createdAt || ''
      }))
    }
  }

  // 实时动态
  if (activitiesRes.status === 'fulfilled' && activitiesRes.value) {
    const data = activitiesRes.value as any
    const activityListData = data?.activities || data?.list || []
    if (Array.isArray(activityListData) && activityListData.length > 0) {
      activityList.value = activityListData.map((a: any) => ({
        user: a.user || a.username || a.nickname || '用户',
        action: a.action || a.description || '',
        amount: a.amount ? `¥${Number(a.amount).toFixed(2)}` : '-',
        time: a.time || a.createdAt || ''
      }))
    }
  }

  // 钱包余额分布
  if (financeRes.status === 'fulfilled' && financeRes.value) {
    const data = financeRes.value as any
    const dist = data?.walletDistribution || data?.distribution || []
    if (Array.isArray(dist) && dist.length > 0) {
      walletDistribution.value = dist.map((d: any) => ({
        name: d.name || d.label || '',
        value: Number(d.value || d.count || 0)
      }))
    }
  }
  
  renderTrendChart()
  renderWalletChart()
  startActivityScroll()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (activityTimer) {
    clearInterval(activityTimer)
    activityTimer = null
  }
  trendChart?.dispose()
  walletChart?.dispose()
  trendChart = null
  walletChart = null
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-row {
  margin-bottom: 0 !important;
}
.stat-row .el-col {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: var(--text-primary);
}
.card-header .el-icon {
  vertical-align: -2px;
  margin-right: 4px;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.chart-row .el-col {
  margin-bottom: 16px;
}

/* 库存预警 */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-page);
  border-radius: var(--radius-small);
  border-left: 3px solid var(--color-warning);
}
.alert-item:nth-child(2) {
  border-left-color: var(--color-danger);
}
.alert-item:nth-child(3) {
  border-left-color: var(--color-primary);
}
.alert-message {
  flex: 1;
  font-size: 13px;
  color: var(--text-regular);
}
.alert-time {
  font-size: 12px;
  color: var(--text-placeholder);
  white-space: nowrap;
}

/* 实时动态 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow: hidden;
}
.activity-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--border-light);
  transition: all 0.4s ease;
}
.activity-item:last-child {
  border-bottom: none;
}
.activity-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  flex-shrink: 0;
  font-size: 13px;
}
.activity-content {
  flex: 1;
  font-size: 13px;
  color: var(--text-regular);
  overflow: hidden;
}
.activity-user {
  font-weight: 600;
  color: var(--color-primary);
  margin-right: 4px;
}
.activity-amount {
  color: var(--color-danger);
  font-weight: 600;
  margin-left: 4px;
}
.activity-time {
  font-size: 12px;
  color: var(--text-placeholder);
  white-space: nowrap;
}

.live-dot {
  margin-right: 2px;
  animation: blink 1.5s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
</style>
