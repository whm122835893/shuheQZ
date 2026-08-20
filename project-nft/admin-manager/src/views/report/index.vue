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
          <el-radio-group v-model="salesPeriod" size="small">
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
import type {
  PaginationQuery,
  SalesReport,
  UsersReport,
  CollectiblesReport,
  BlindboxesReport,
  FinanceReport,
  SalesSummaryItem,
  RetentionItem,
  HotCollectibleItem,
  HoldingDistributionItem,
  FinanceDetailItem,
} from '../../api'

const activeTab = ref('sales')

// ============ 销售报表 ============
const salesChartRef = ref<HTMLElement>()
let salesChart: echarts.ECharts | null = null
const salesPeriod = ref<'day' | 'week' | 'month'>('day')

// 销售趋势图数据（按当前周期从后端拉取）
const salesChartData = ref<{ x: string[]; amount: number[]; orders: number[] }>({
  x: [],
  amount: [],
  orders: [],
})

const salesSummary = ref<SalesSummaryItem[]>([])

function renderSalesChart() {
  if (!salesChartRef.value) return
  if (!salesChart) {
    salesChart = echarts.init(salesChartRef.value)
  }
  const data = salesChartData.value
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
  total: 0,
  monthNew: 0,
  active7d: 0,
  realnameRate: 0,
})

// 新增/活跃用户趋势（从后端拉取）
const userChartData = ref<{ dates: string[]; newUsers: number[]; activeUsers: number[] }>({
  dates: [],
  newUsers: [],
  activeUsers: [],
})

const retentionData = ref<RetentionItem[]>([])

function renderUserChart() {
  if (!userChartRef.value) return
  if (!userChart) {
    userChart = echarts.init(userChartRef.value)
  }
  const data = userChartData.value

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '活跃用户'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: data.dates, axisLabel: { color: '#909399' } },
    yAxis: { type: 'value', axisLabel: { color: '#909399' }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [
      {
        name: '新增用户',
        type: 'line',
        smooth: true,
        data: data.newUsers,
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
        data: data.activeUsers,
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

const hotCollectibles = ref<HotCollectibleItem[]>([])

// 藏品持有分布（从后端拉取）
const holdingData = ref<HoldingDistributionItem[]>([])

function renderHoldingChart() {
  if (!holdingChartRef.value) return
  if (!holdingChart) {
    holdingChart = echarts.init(holdingChartRef.value)
  }
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
        data: holdingData.value.map((item, index) => ({
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
  totalOpened: 0,
  openRate: 0,
  emptyRate: 0,
  rareRate: 0,
})

// 盲盒子藏品命中分布（从后端拉取）
const blindboxItems = ref<string[]>([])
const blindboxHits = ref<number[]>([])

function renderBlindboxChart() {
  if (!blindboxChartRef.value) return
  if (!blindboxChart) {
    blindboxChart = echarts.init(blindboxChartRef.value)
  }
  const items = blindboxItems.value
  const hits = blindboxHits.value
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
            color: i === items.length - 1 ? '#F56C6C' : new echarts.graphic.LinearGradient(0, 0, 0, 1, [
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
const financeDetails = ref<FinanceDetailItem[]>([])

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
function applySalesData(data: SalesReport | undefined) {
  const daily = data?.dailyData || []
  salesChartData.value = {
    x: daily.map(d => d.date ?? ''),
    amount: daily.map(d => Number(d.revenue) || 0),
    orders: daily.map(d => Number(d.orders) || 0),
  }
  salesSummary.value = (data?.summary || []).map(s => ({
    period: s.period ?? '',
    orderCount: Number(s.orderCount) || 0,
    salesAmount: Number(s.salesAmount) || 0,
    avgPrice: Number(s.avgPrice) || 0,
    refundAmount: Number(s.refundAmount) || 0,
    netAmount: Number(s.netAmount) || 0,
  }))
}

// 按当前周期拉取销售报表并重渲染图表
async function loadSalesReport() {
  try {
    const data = await reportApi.sales({ period: salesPeriod.value } as PaginationQuery)
    applySalesData(data)
    await nextTick()
    renderSalesChart()
  } catch {
    ElMessage.error('销售报表数据加载失败')
  }
}

// 并行加载所有报表（任一接口失败不影响其它报表，仅提示错误并保持空数据）
async function loadAllReports() {
  const results = await Promise.allSettled([
    reportApi.sales({ period: salesPeriod.value } as PaginationQuery),
    reportApi.users(),
    reportApi.collectibles(),
    reportApi.blindboxes(),
    reportApi.finance(),
  ])

  const salesRes = results[0] as PromiseSettledResult<SalesReport>
  const usersRes = results[1] as PromiseSettledResult<UsersReport>
  const collectiblesRes = results[2] as PromiseSettledResult<CollectiblesReport>
  const blindboxesRes = results[3] as PromiseSettledResult<BlindboxesReport>
  const financeRes = results[4] as PromiseSettledResult<FinanceReport>

  // 销售报表
  if (salesRes.status === 'fulfilled') {
    applySalesData(salesRes.value)
  } else {
    ElMessage.error('销售报表数据加载失败')
  }

  // 用户报表
  if (usersRes.status === 'fulfilled') {
    const data = usersRes.value
    const newUsers = data?.newUsers || []
    const activeUsers = data?.activeUsers || []
    userChartData.value = {
      dates: newUsers.map(u => u.date ?? ''),
      newUsers: newUsers.map(u => Number(u.count) || 0),
      activeUsers: activeUsers.map(u => Number(u.count) || 0),
    }
    userStats.total = Number(data?.totalUsers) || 0
    userStats.realnameRate = Number(data?.realnameRate) || 0
    userStats.monthNew = newUsers.reduce((sum, u) => sum + (Number(u.count) || 0), 0)
    userStats.active7d = activeUsers.length
      ? Number(activeUsers[activeUsers.length - 1].count) || 0
      : 0
    retentionData.value = (data?.retentionData || []).map(r => ({
      cohort: r.cohort ?? '',
      day1: r.day1 ?? '-',
      day3: r.day3 ?? '-',
      day7: r.day7 ?? '-',
      day14: r.day14 ?? '-',
      day30: r.day30 ?? '-',
    }))
  } else {
    ElMessage.error('用户报表数据加载失败')
  }

  // 藏品报表
  if (collectiblesRes.status === 'fulfilled') {
    const data = collectiblesRes.value
    hotCollectibles.value = (data?.hotCollectibles || []).map(c => ({
      name: c.name ?? '',
      holders: Number(c.holders) || 0,
      volume: Number(c.volume) || 0,
    }))
    holdingData.value = (data?.holdingDistribution || []).map(h => ({
      name: h.name ?? '',
      value: Number(h.value) || 0,
    }))
  } else {
    ElMessage.error('藏品报表数据加载失败')
  }

  // 盲盒报表
  if (blindboxesRes.status === 'fulfilled') {
    const data = blindboxesRes.value
    blindboxStats.totalOpened = Number(data?.totalOpened) || 0
    blindboxStats.openRate = Number(data?.openRate) || 0
    blindboxStats.emptyRate = Number(data?.emptyRate) || 0
    blindboxStats.rareRate = Number(data?.rareRate) || 0
    const dist = data?.itemDistribution || []
    blindboxItems.value = dist.map(d => d.name ?? '')
    blindboxHits.value = dist.map(d => Number(d.hits) || 0)
  } else {
    ElMessage.error('盲盒报表数据加载失败')
  }

  // 财务对账
  if (financeRes.status === 'fulfilled') {
    const data = financeRes.value
    financeDetails.value = (data?.details || []).map(f => ({
      date: f.date ?? '',
      channel: f.channel ?? '',
      tradeAmount: Number(f.tradeAmount) || 0,
      tradeCount: Number(f.tradeCount) || 0,
      feeRate: f.feeRate ?? '',
      feeAmount: Number(f.feeAmount) || 0,
      settleAmount: Number(f.settleAmount) || 0,
    }))
  } else {
    ElMessage.error('财务对账数据加载失败')
  }
}

// 切换销售周期时重新拉取数据并重渲染图表
watch(salesPeriod, () => {
  loadSalesReport()
})

onMounted(async () => {
  await loadAllReports()
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
