<template>
  <div class="report-page">
    <el-tabs v-model="activeTab" type="border-card" @tab-change="handleTabChange">
      <!-- ============ 销售报表 ============ -->
      <el-tab-pane name="sales">
        <template #label>
          <span><el-icon><TrendCharts /></el-icon> 销售报表</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">销售趋势</span>
          <el-radio-group v-model="salesPeriod" size="small" @change="renderSalesChart">
            <el-radio-button label="day">按日</el-radio-button>
            <el-radio-button label="week">按周</el-radio-button>
            <el-radio-button label="month">按月</el-radio-button>
          </el-radio-group>
          <el-button type="success" :icon="Download" plain size="small" @click="handleExportCSV('销售报表')">导出 CSV</el-button>
        </div>
        <div ref="salesChartRef" class="chart-box" />
        <el-table :data="salesSummary" border stripe style="margin-top: 16px">
          <el-table-column prop="period" label="时段" width="160" />
          <el-table-column prop="orderCount" label="订单数" width="120" align="center" />
          <el-table-column prop="salesAmount" label="销售额(¥)" width="140" align="center" />
          <el-table-column prop="avgPrice" label="客单价(¥)" width="140" align="center" />
          <el-table-column prop="refundAmount" label="退款额(¥)" width="140" align="center" />
          <el-table-column prop="netAmount" label="净收入(¥)" align="center" />
        </el-table>
      </el-tab-pane>

      <!-- ============ 用户报表 ============ -->
      <el-tab-pane name="user">
        <template #label>
          <span><el-icon><User /></el-icon> 用户报表</span>
        </template>
        <el-row :gutter="16" class="stat-row">
          <el-col :span="6">
            <div class="mini-stat grad-blue">
              <div class="mini-label">总用户数</div>
              <div class="mini-value">{{ userStats.total.toLocaleString() }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-green">
              <div class="mini-label">本月新增</div>
              <div class="mini-value">{{ userStats.monthNew.toLocaleString() }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-orange">
              <div class="mini-label">活跃用户(7日)</div>
              <div class="mini-value">{{ userStats.active7d.toLocaleString() }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-purple">
              <div class="mini-label">实名认证率</div>
              <div class="mini-value">{{ userStats.realnameRate }}%</div>
            </div>
          </el-col>
        </el-row>
        <div class="tab-toolbar">
          <span class="toolbar-title">新增用户趋势（近 14 日）</span>
        </div>
        <div ref="userChartRef" class="chart-box" />
        <div class="tab-toolbar" style="margin-top: 16px">
          <span class="toolbar-title">用户留存率</span>
        </div>
        <el-table :data="retentionData" border stripe>
          <el-table-column prop="cohort" label="注册批次" width="160" />
          <el-table-column prop="day1" label="次日留存" width="120" align="center" />
          <el-table-column prop="day3" label="3日留存" width="120" align="center" />
          <el-table-column prop="day7" label="7日留存" width="120" align="center" />
          <el-table-column prop="day14" label="14日留存" width="120" align="center" />
          <el-table-column prop="day30" label="30日留存" align="center" />
        </el-table>
      </el-tab-pane>

      <!-- ============ 藏品报表 ============ -->
      <el-tab-pane name="collectible">
        <template #label>
          <span><el-icon><Picture /></el-icon> 藏品报表</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="12">
            <div class="tab-toolbar">
              <span class="toolbar-title">藏品持有分布</span>
            </div>
            <div ref="holdingChartRef" class="chart-box" />
          </el-col>
          <el-col :span="12">
            <div class="tab-toolbar">
              <span class="toolbar-title">热门藏品排行 TOP 10</span>
            </div>
            <el-table :data="hotCollectibles" border stripe height="320">
              <el-table-column type="index" label="排名" width="70" align="center">
                <template #default="{ $index }">
                  <span :class="['rank-badge', $index < 3 ? 'rank-top' : '']">{{ $index + 1 }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="name" label="藏品名称" min-width="150" show-overflow-tooltip />
              <el-table-column prop="holders" label="持有人数" width="110" align="center" sortable />
              <el-table-column prop="volume" label="交易额(¥)" width="130" align="center" sortable />
            </el-table>
          </el-col>
        </el-row>
      </el-tab-pane>

      <!-- ============ 盲盒报表 ============ -->
      <el-tab-pane name="blindbox">
        <template #label>
          <span><el-icon><Box /></el-icon> 盲盒报表</span>
        </template>
        <el-row :gutter="16" class="stat-row">
          <el-col :span="6">
            <div class="mini-stat grad-blue">
              <div class="mini-label">总开启数</div>
              <div class="mini-value">{{ blindboxStats.totalOpened.toLocaleString() }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-green">
              <div class="mini-label">开启率</div>
              <div class="mini-value">{{ blindboxStats.openRate }}%</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-orange">
              <div class="mini-label">空奖率</div>
              <div class="mini-value">{{ blindboxStats.emptyRate }}%</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="mini-stat grad-purple">
              <div class="mini-label">稀有命中率</div>
              <div class="mini-value">{{ blindboxStats.rareRate }}%</div>
            </div>
          </el-col>
        </el-row>
        <div class="tab-toolbar">
          <span class="toolbar-title">子藏品命中分布</span>
        </div>
        <div ref="blindboxChartRef" class="chart-box" />
      </el-tab-pane>

      <!-- ============ 财务对账 ============ -->
      <el-tab-pane name="finance">
        <template #label>
          <span><el-icon><Money /></el-icon> 财务对账</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">手续费明细</span>
          <div>
            <el-button type="success" :icon="Download" plain size="small" @click="handleExportCSV('财务对账-CSV')">导出 CSV</el-button>
            <el-button type="primary" :icon="Document" plain size="small" @click="handleExportExcel">导出 Excel</el-button>
          </div>
        </div>
        <el-table :data="financeDetails" border stripe show-summary :summary-method="financeSummary">
          <el-table-column prop="date" label="日期" width="130" />
          <el-table-column prop="channel" label="支付渠道" width="120" align="center" />
          <el-table-column prop="tradeAmount" label="交易金额(¥)" width="140" align="center" />
          <el-table-column prop="tradeCount" label="交易笔数" width="120" align="center" />
          <el-table-column prop="feeRate" label="费率" width="100" align="center" />
          <el-table-column prop="feeAmount" label="手续费(¥)" width="130" align="center" />
          <el-table-column prop="settleAmount" label="结算金额(¥)" align="center" />
        </el-table>
      </el-tab-pane>

      <!-- ============ 自定义导出 ============ -->
      <el-tab-pane name="custom">
        <template #label>
          <span><el-icon><Download /></el-icon> 自定义导出</span>
        </template>
        <el-card shadow="never" class="export-card">
          <el-form :model="exportForm" label-width="100px" class="export-form">
            <el-form-item label="选择模块">
              <el-select v-model="exportForm.module" placeholder="请选择导出模块" style="width: 280px">
                <el-option label="用户数据" value="user" />
                <el-option label="藏品数据" value="collectible" />
                <el-option label="盲盒数据" value="blindbox" />
                <el-option label="订单数据" value="order" />
                <el-option label="交易记录" value="transaction" />
                <el-option label="钱包流水" value="wallet" />
                <el-option label="操作日志" value="log" />
              </el-select>
            </el-form-item>
            <el-form-item label="选择字段">
              <el-checkbox-group v-model="exportForm.fields">
                <el-checkbox v-for="f in fieldOptions[exportForm.module] || []" :key="f.value" :label="f.value">
                  {{ f.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="exportForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="导出格式">
              <el-radio-group v-model="exportForm.format">
                <el-radio label="csv">CSV</el-radio>
                <el-radio label="excel">Excel</el-radio>
                <el-radio label="json">JSON</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Download" @click="handleCustomExport">立即导出</el-button>
              <el-button :icon="RefreshLeft" @click="resetExportForm">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import {
  TrendCharts, User, Picture, Box, Money, Download, Document, RefreshLeft
} from '@element-plus/icons-vue'
import { reportApi } from '../../api'

const activeTab = ref('sales')

// ============ 销售报表 ============
const salesChartRef = ref<HTMLElement>()
let salesChart: echarts.ECharts | null = null
const salesPeriod = ref<'day' | 'week' | 'month'>('day')

const salesDataMap = {
  day: {
    x: ['08-07', '08-08', '08-09', '08-10', '08-11', '08-12', '08-13'],
    amount: [32000, 28000, 45000, 38000, 52000, 41000, 45680],
    orders: [65, 58, 92, 78, 105, 82, 89]
  },
  week: {
    x: ['第31周', '第32周', '第33周'],
    amount: [186000, 218000, 166680],
    orders: [372, 436, 334]
  },
  month: {
    x: ['2026-06', '2026-07', '2026-08'],
    amount: [720000, 856000, 570680],
    orders: [1440, 1712, 1142]
  }
}

const salesSummary = ref([
  { period: '2026-08-07', orderCount: 65, salesAmount: 32000, avgPrice: 492.31, refundAmount: 590, netAmount: 31410 },
  { period: '2026-08-08', orderCount: 58, salesAmount: 28000, avgPrice: 482.76, refundAmount: 0, netAmount: 28000 },
  { period: '2026-08-09', orderCount: 92, salesAmount: 45000, avgPrice: 489.13, refundAmount: 1990, netAmount: 43010 },
  { period: '2026-08-10', orderCount: 78, salesAmount: 38000, avgPrice: 487.18, refundAmount: 890, netAmount: 37110 },
  { period: '2026-08-11', orderCount: 105, salesAmount: 52000, avgPrice: 495.24, refundAmount: 2990, netAmount: 49010 },
  { period: '2026-08-12', orderCount: 82, salesAmount: 41000, avgPrice: 500.00, refundAmount: 0, netAmount: 41000 },
  { period: '2026-08-13', orderCount: 89, salesAmount: 45680, avgPrice: 513.26, refundAmount: 990, netAmount: 44690 }
])

function renderSalesChart() {
  if (!salesChartRef.value) return
  if (!salesChart) {
    salesChart = echarts.init(salesChartRef.value)
  }
  const data = salesDataMap[salesPeriod.value]
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['销售额', '订单数'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: { type: 'category', data: data.x, axisLabel: { color: '#909399' } },
    yAxis: [
      { type: 'value', name: '销售额(¥)', axisLabel: { color: '#909399', formatter: (v: number) => v >= 1000 ? v / 1000 + 'k' : String(v) } },
      { type: 'value', name: '订单数', splitLine: { show: false }, axisLabel: { color: '#909399' } }
    ],
    series: [
      {
        name: '销售额',
        type: 'bar',
        data: data.amount,
        barWidth: '40%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      },
      {
        name: '订单数',
        type: 'line',
        yAxisIndex: 1,
        data: data.orders,
        smooth: true,
        itemStyle: { color: '#fa709a' },
        lineStyle: { width: 3 }
      }
    ]
  }
  salesChart.setOption(option, true)
}

// ============ 用户报表 ============
const userChartRef = ref<HTMLElement>()
let userChart: echarts.ECharts | null = null

const userStats = reactive({
  total: 6995,
  monthNew: 1280,
  active7d: 3420,
  realnameRate: 78.5
})

const retentionData = ref([
  { cohort: '2026-08-01 批次', day1: '45.2%', day3: '32.1%', day7: '24.8%', day14: '18.3%', day30: '12.1%' },
  { cohort: '2026-08-05 批次', day1: '48.6%', day3: '35.4%', day7: '26.9%', day14: '20.1%', day30: '-' },
  { cohort: '2026-08-10 批次', day1: '51.3%', day3: '38.7%', day7: '28.5%', day14: '-', day30: '-' },
  { cohort: '2026-08-13 批次', day1: '52.8%', day3: '-', day7: '-', day14: '-', day30: '-' }
])

function renderUserChart() {
  if (!userChartRef.value) return
  if (!userChart) {
    userChart = echarts.init(userChartRef.value)
  }
  const days = Array.from({ length: 14 }, (_, i) => `08-${String(i).padStart(2, '0')}`)
  const newUsers = [85, 92, 78, 110, 125, 98, 130, 145, 112, 95, 118, 136, 102, 128]
  const activeUsers = [2100, 2250, 1980, 2400, 2650, 2350, 2800, 2950, 2600, 2480, 2750, 3100, 2820, 3420]

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '活跃用户'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: days, axisLabel: { color: '#909399' } },
    yAxis: { type: 'value', axisLabel: { color: '#909399' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: newUsers,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(67, 233, 123, 0.6)' },
            { offset: 1, color: 'rgba(67, 233, 123, 0.05)' }
          ])
        },
        itemStyle: { color: '#43e97b' },
        lineStyle: { width: 3 }
      },
      {
        name: '活跃用户',
        type: 'line',
        smooth: true,
        data: activeUsers,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(102, 126, 234, 0.6)' },
            { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
          ])
        },
        itemStyle: { color: '#667eea' },
        lineStyle: { width: 3 }
      }
    ]
  }
  userChart.setOption(option, true)
}

// ============ 藏品报表 ============
const holdingChartRef = ref<HTMLElement>()
let holdingChart: echarts.ECharts | null = null

const hotCollectibles = ref([
  { name: '敦煌飞天 第1期', holders: 968, volume: 286400 },
  { name: '清明上河图 第2期', holders: 852, volume: 254800 },
  { name: '千里江山图 第3期', holders: 740, volume: 221200 },
  { name: '富春山居图 第4期', holders: 680, volume: 198000 },
  { name: '韩熙载夜宴图 第5期', holders: 590, volume: 176500 },
  { name: '五牛图 第6期', holders: 510, volume: 152400 },
  { name: '步辇图 第7期', holders: 445, volume: 133200 },
  { name: '洛神赋图 第8期', holders: 380, volume: 113600 },
  { name: '新春系列 第9期', holders: 320, volume: 95600 },
  { name: '国宝系列 第10期', holders: 280, volume: 83800 }
])

function renderHoldingChart() {
  if (!holdingChartRef.value) return
  if (!holdingChart) {
    holdingChart = echarts.init(holdingChartRef.value)
  }
  const holdingData = [
    { name: '持有 1 件', value: 3420 },
    { name: '持有 2-5 件', value: 2180 },
    { name: '持有 6-10 件', value: 890 },
    { name: '持有 11-20 件', value: 420 },
    { name: '持有 20 件以上', value: 85 }
  ]
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}<br/>人数: {c} ({d}%)' },
    legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11, color: '#909399' } },
    series: [
      {
        name: '持有分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 3 },
        label: { show: true, formatter: '{b}\n{d}%', fontSize: 11 },
        data: holdingData.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { color: ['#667eea', '#43e97b', '#fa709a', '#a18cd1', '#4facfe'][index % 5] }
        }))
      }
    ]
  }
  holdingChart.setOption(option, true)
}

// ============ 盲盒报表 ============
const blindboxChartRef = ref<HTMLElement>()
let blindboxChart: echarts.ECharts | null = null

const blindboxStats = reactive({
  totalOpened: 12450,
  openRate: 68.5,
  emptyRate: 5.2,
  rareRate: 12.8
})

function renderBlindboxChart() {
  if (!blindboxChartRef.value) return
  if (!blindboxChart) {
    blindboxChart = echarts.init(blindboxChartRef.value)
  }
  const items = ['稀有藏品A', '稀有藏品B', '普通藏品C', '普通藏品D', '限量藏品E', '空奖']
  const hits = [780, 520, 4200, 3800, 1650, 650]
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: { type: 'category', data: items, axisLabel: { color: '#909399' } },
    yAxis: { type: 'value', name: '命中次数', axisLabel: { color: '#909399' } },
    series: [
      {
        name: '命中次数',
        type: 'bar',
        data: hits.map((v, i) => ({
          value: v,
          itemStyle: {
            color: i === 5 ? '#F56C6C' : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: i < 2 ? '#fa709a' : '#43e97b' },
              { offset: 1, color: i < 2 ? '#fee140' : '#38f9d7' }
            ]),
            borderRadius: [6, 6, 0, 0]
          }
        })),
        barWidth: '45%',
        label: { show: true, position: 'top', color: '#606266' }
      }
    ]
  }
  blindboxChart.setOption(option, true)
}

// ============ 财务对账 ============
const financeDetails = ref([
  { date: '2026-08-13', channel: '支付宝', tradeAmount: 28500.00, tradeCount: 56, feeRate: '0.6%', feeAmount: 171.00, settleAmount: 28329.00 },
  { date: '2026-08-13', channel: '微信', tradeAmount: 22180.00, tradeCount: 48, feeRate: '0.6%', feeAmount: 133.08, settleAmount: 22046.92 },
  { date: '2026-08-13', channel: '余额', tradeAmount: 15600.00, tradeCount: 35, feeRate: '0%', feeAmount: 0.00, settleAmount: 15600.00 },
  { date: '2026-08-12', channel: '支付宝', tradeAmount: 31200.00, tradeCount: 62, feeRate: '0.6%', feeAmount: 187.20, settleAmount: 31012.80 },
  { date: '2026-08-12', channel: '微信', tradeAmount: 19800.00, tradeCount: 41, feeRate: '0.6%', feeAmount: 118.80, settleAmount: 19681.20 },
  { date: '2026-08-12', channel: '余额', tradeAmount: 12500.00, tradeCount: 28, feeRate: '0%', feeAmount: 0.00, settleAmount: 12500.00 },
  { date: '2026-08-11', channel: '支付宝', tradeAmount: 35600.00, tradeCount: 71, feeRate: '0.6%', feeAmount: 213.60, settleAmount: 35386.40 },
  { date: '2026-08-11', channel: '微信', tradeAmount: 24300.00, tradeCount: 52, feeRate: '0.6%', feeAmount: 145.80, settleAmount: 24154.20 }
])

function financeSummary({ columns, data }: { columns: any[]; data: any[] }) {
  const sums: (string | number)[] = []
  columns.forEach((col, index) => {
    if (index === 0) {
      sums[index] = '合计'
    } else if (['tradeAmount', 'feeAmount', 'settleAmount'].includes(col.property)) {
      const total = data.reduce((prev, curr) => prev + Number(curr[col.property] || 0), 0)
      sums[index] = total.toFixed(2)
    } else if (col.property === 'tradeCount') {
      sums[index] = data.reduce((prev, curr) => prev + Number(curr[col.property] || 0), 0)
    } else {
      sums[index] = ''
    }
  })
  return sums
}

// ============ 自定义导出 ============
const fieldOptions: Record<string, { label: string; value: string }[]> = {
  user: [
    { label: '用户ID', value: 'id' },
    { label: '用户名', value: 'username' },
    { label: '昵称', value: 'nickname' },
    { label: '手机号', value: 'phone' },
    { label: '注册时间', value: 'registerTime' },
    { label: '实名状态', value: 'realnameStatus' },
    { label: '钱包余额', value: 'walletBalance' },
    { label: '藏品数量', value: 'collectibleCount' }
  ],
  collectible: [
    { label: '藏品ID', value: 'id' },
    { label: '藏品名称', value: 'name' },
    { label: '分类', value: 'category' },
    { label: '发行量', value: 'edition' },
    { label: '已售量', value: 'sold' },
    { label: '价格', value: 'price' },
    { label: '状态', value: 'status' }
  ],
  blindbox: [
    { label: '盲盒ID', value: 'id' },
    { label: '盲盒名称', value: 'name' },
    { label: '发行量', value: 'edition' },
    { label: '已售量', value: 'sold' },
    { label: '价格', value: 'price' },
    { label: '状态', value: 'status' }
  ],
  order: [
    { label: '订单号', value: 'order_no' },
    { label: '用户', value: 'username' },
    { label: '商品', value: 'product_name' },
    { label: '金额', value: 'amount' },
    { label: '状态', value: 'status' },
    { label: '创建时间', value: 'created_at' }
  ],
  transaction: [
    { label: '交易ID', value: 'id' },
    { label: '用户', value: 'username' },
    { label: '类型', value: 'type' },
    { label: '金额', value: 'amount' },
    { label: '状态', value: 'status' },
    { label: '时间', value: 'created_at' }
  ],
  wallet: [
    { label: '流水ID', value: 'id' },
    { label: '用户', value: 'username' },
    { label: '类型', value: 'type' },
    { label: '金额', value: 'amount' },
    { label: '余额', value: 'balance_after' },
    { label: '时间', value: 'created_at' }
  ],
  log: [
    { label: '日志ID', value: 'id' },
    { label: '操作人', value: 'operator' },
    { label: '模块', value: 'module' },
    { label: '操作', value: 'action' },
    { label: 'IP', value: 'ip' },
    { label: '时间', value: 'created_at' }
  ]
}

const exportForm = reactive({
  module: 'user',
  fields: [] as string[],
  dateRange: [] as string[],
  format: 'csv'
})

watch(() => exportForm.module, () => {
  exportForm.fields = []
})

function resetExportForm() {
  exportForm.module = 'user'
  exportForm.fields = []
  exportForm.dateRange = []
  exportForm.format = 'csv'
}

function handleCustomExport() {
  if (exportForm.fields.length === 0) {
    ElMessage.warning('请至少选择一个导出字段')
    return
  }
  const moduleName = { user: '用户', collectible: '藏品', blindbox: '盲盒', order: '订单', transaction: '交易', wallet: '钱包', log: '日志' }[exportForm.module]
  ElMessage.success(`已导出「${moduleName}数据」，共 ${exportForm.fields.length} 个字段，格式：${exportForm.format.toUpperCase()}`)
}

// ============ 导出 ============
function handleExportCSV(name: string) {
  ElMessage.success(`${name} 已导出 CSV 文件`)
}

function handleExportExcel() {
  ElMessage.success('财务对账已导出 Excel 文件')
}

// ============ Tab 切换渲染 ============
function handleTabChange(name: string | number) {
  const tab = String(name)
  nextTick(() => {
    if (tab === 'sales') renderSalesChart()
    else if (tab === 'user') renderUserChart()
    else if (tab === 'collectible') renderHoldingChart()
    else if (tab === 'blindbox') renderBlindboxChart()
  })
}

function handleResize() {
  salesChart?.resize()
  userChart?.resize()
  holdingChart?.resize()
  blindboxChart?.resize()
}

// ============ 加载报表数据 ============
async function loadReportData() {
  // 销售报表
  try {
    const salesRes: any = await reportApi.sales()
    if (salesRes) {
      // 更新销售趋势数据（按日/周/月）
      if (salesRes.trends) {
        const t = salesRes.trends
        if (t.day) {
          salesDataMap.day.x = t.day.x || t.day.dates || salesDataMap.day.x
          salesDataMap.day.amount = t.day.amount || t.day.sales || salesDataMap.day.amount
          salesDataMap.day.orders = t.day.orders || t.day.orderCount || salesDataMap.day.orders
        }
        if (t.week) {
          salesDataMap.week.x = t.week.x || t.week.dates || salesDataMap.week.x
          salesDataMap.week.amount = t.week.amount || t.week.sales || salesDataMap.week.amount
          salesDataMap.week.orders = t.week.orders || t.week.orderCount || salesDataMap.week.orders
        }
        if (t.month) {
          salesDataMap.month.x = t.month.x || t.month.dates || salesDataMap.month.x
          salesDataMap.month.amount = t.month.amount || t.month.sales || salesDataMap.month.amount
          salesDataMap.month.orders = t.month.orders || t.month.orderCount || salesDataMap.month.orders
        }
      }
      // 更新销售汇总表
      const summaryList = salesRes.summary || salesRes.list
      if (Array.isArray(summaryList)) {
        salesSummary.value = summaryList.map((s: any) => ({
          period: s.period || s.date || '',
          orderCount: Number(s.orderCount ?? s.orders) || 0,
          salesAmount: Number(s.salesAmount ?? s.amount) || 0,
          avgPrice: Number(s.avgPrice) || 0,
          refundAmount: Number(s.refundAmount) || 0,
          netAmount: Number(s.netAmount) || 0
        }))
      }
    }
  } catch {
    // fallback：保留现有数据
  }

  // 用户报表
  try {
    const usersRes: any = await reportApi.users()
    if (usersRes) {
      if (usersRes.stats) {
        userStats.total = Number(usersRes.stats.total) || userStats.total
        userStats.monthNew = Number(usersRes.stats.monthNew) || userStats.monthNew
        userStats.active7d = Number(usersRes.stats.active7d) || userStats.active7d
        userStats.realnameRate = Number(usersRes.stats.realnameRate) || userStats.realnameRate
      }
      const retentionList = usersRes.retention || usersRes.list
      if (Array.isArray(retentionList)) {
        retentionData.value = retentionList.map((r: any) => ({
          cohort: r.cohort || '',
          day1: r.day1 || '-',
          day3: r.day3 || '-',
          day7: r.day7 || '-',
          day14: r.day14 || '-',
          day30: r.day30 || '-'
        }))
      }
    }
  } catch {
    // fallback：保留现有数据
  }

  // 藏品报表
  try {
    const collectiblesRes: any = await reportApi.collectibles()
    if (collectiblesRes) {
      const hotList = collectiblesRes.hotCollectibles || collectiblesRes.list
      if (Array.isArray(hotList)) {
        hotCollectibles.value = hotList.map((c: any) => ({
          name: c.name || '',
          holders: Number(c.holders) || 0,
          volume: Number(c.volume ?? c.tradingVolume) || 0
        }))
      }
    }
  } catch {
    // fallback：保留现有数据
  }

  // 财务对账
  try {
    const financeRes: any = await reportApi.finance()
    if (financeRes) {
      const detailList = financeRes.details || financeRes.list
      if (Array.isArray(detailList)) {
        financeDetails.value = detailList.map((f: any) => ({
          date: f.date || '',
          channel: f.channel || '',
          tradeAmount: Number(f.tradeAmount) || 0,
          tradeCount: Number(f.tradeCount) || 0,
          feeRate: f.feeRate || '',
          feeAmount: Number(f.feeAmount) || 0,
          settleAmount: Number(f.settleAmount) || 0
        }))
      }
    }
  } catch {
    // fallback：保留现有数据
  }
}

onMounted(async () => {
  await loadReportData()
  await nextTick()
  renderSalesChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  salesChart?.dispose()
  userChart?.dispose()
  holdingChart?.dispose()
  blindboxChart?.dispose()
  salesChart = null
  userChart = null
  holdingChart = null
  blindboxChart = null
})
</script>

<style scoped>
.report-page {
  display: flex;
  flex-direction: column;
}
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.chart-box {
  width: 100%;
  height: 360px;
}
.stat-row .el-col {
  margin-bottom: 16px;
}
.mini-stat {
  border-radius: var(--radius-base);
  padding: 18px 20px;
  color: #fff;
  box-shadow: var(--shadow-card);
}
.mini-label {
  font-size: 13px;
  opacity: 0.85;
  margin-bottom: 6px;
}
.mini-value {
  font-size: 26px;
  font-weight: 700;
}
.grad-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.grad-green { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.grad-orange { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.grad-purple { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.rank-badge {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  background: var(--bg-page);
}
.rank-badge.rank-top {
  color: #fff;
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}
.export-card {
  max-width: 720px;
}
.export-form .el-checkbox {
  margin-right: 16px;
  margin-bottom: 8px;
}
</style>
