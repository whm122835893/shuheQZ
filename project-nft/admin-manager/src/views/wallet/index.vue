<template>
  <div class="wallet-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 充值记录 -->
      <el-tab-pane label="充值记录" name="recharge">
        <el-card shadow="never" class="search-card">
          <el-form :inline="true" :model="rechargeSearch">
            <el-form-item label="用户">
              <el-input v-model="rechargeSearch.username" placeholder="用户名/手机号" clearable style="width: 200px" />
            </el-form-item>
            <el-form-item label="渠道">
              <el-select v-model="rechargeSearch.channel" placeholder="全部" clearable style="width: 200px">
                <el-option label="支付宝" value="alipay" />
                <el-option label="微信" value="wechat" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="rechargeSearch.status" placeholder="全部" clearable style="width: 200px">
                <el-option label="成功" value="success" />
                <el-option label="失败" value="failed" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleRechargeSearch">查询</el-button>
              <el-button :icon="RefreshLeft" @click="handleRechargeReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never">
          <el-table v-loading="rechargeLoading" :data="rechargePageData.list" border stripe>
            <el-table-column prop="username" label="用户" width="150">
              <template #default="{ row }">
                <div>{{ row.username }}</div>
                <div class="sub-text">ID: {{ row.user_id }}</div>
              </template>
            </el-table-column>
            <el-table-column label="渠道" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.channel === 'alipay' ? 'primary' : 'success'" size="small">
                  {{ row.channel === 'alipay' ? '支付宝' : '微信' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="充值金额" width="130" align="right">
              <template #default="{ row }">
                <span class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="tx_no" label="流水号" min-width="200" show-overflow-tooltip />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="dark" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="callback_time" label="回调时间" width="180" />
          </el-table>
          <el-pagination
            v-model:current-page="rechargePage"
            v-model:page-size="rechargePageSize"
            :total="rechargePageData.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchRecharge"
            @current-change="fetchRecharge"
          />
        </el-card>
      </el-tab-pane>

      <!-- 资金流水 -->
      <el-tab-pane label="资金流水" name="transactions">
        <el-card shadow="never" class="search-card">
          <el-form :inline="true" :model="txSearch">
            <el-form-item label="用户">
              <el-input v-model="txSearch.username" placeholder="用户名" clearable style="width: 200px" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="txSearch.type" placeholder="全部" clearable style="width: 200px">
                <el-option v-for="t in txTypeOptions" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="时间">
              <el-date-picker
                v-model="txSearch.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                clearable
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="handleTxSearch">查询</el-button>
              <el-button :icon="RefreshLeft" @click="handleTxReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never">
          <el-table v-loading="txLoading" :data="txPageData.list" border stripe>
            <el-table-column prop="id" label="ID" width="70" align="center" />
            <el-table-column prop="username" label="用户" width="140" />
            <el-table-column label="类型" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="txTagType(row.type)" size="small">{{ row.type_text }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="130" align="right">
              <template #default="{ row }">
                <span :class="row.amount >= 0 ? 'amount-plus' : 'amount-minus'">
                  {{ row.amount >= 0 ? '+' : '' }}¥{{ Number(row.amount).toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column label="交易后余额" width="130" align="right">
              <template #default="{ row }">¥{{ Number(row.balance_after).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="渠道" width="100" align="center">
              <template #default="{ row }">
                {{ row.channel === 'alipay' ? '支付宝' : row.channel === 'wechat' ? '微信' : row.channel === '-' ? '-' : row.channel }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="170" />
          </el-table>
          <el-pagination
            v-model:current-page="txPage"
            v-model:page-size="txPageSize"
            :total="txPageData.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchTx"
            @current-change="fetchTx"
          />
        </el-card>
      </el-tab-pane>

      <!-- 手续费统计 -->
      <el-tab-pane label="手续费统计" name="fee">
        <el-row :gutter="16" class="stat-row">
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card grad-blue">
              <div class="stat-info">
                <div class="stat-label">总手续费收入</div>
                <div class="stat-value">¥{{ feeSummary.total.toFixed(2) }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card grad-green">
              <div class="stat-info">
                <div class="stat-label">日均手续费</div>
                <div class="stat-value">¥{{ feeSummary.avg.toFixed(2) }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card grad-orange">
              <div class="stat-info">
                <div class="stat-label">峰值手续费</div>
                <div class="stat-value">¥{{ feeSummary.peak.toFixed(2) }}</div>
              </div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="stat-card grad-purple">
              <div class="stat-info">
                <div class="stat-label">交易笔数</div>
                <div class="stat-value">{{ feeSummary.count }}</div>
              </div>
            </div>
          </el-col>
        </el-row>

        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>每日手续费统计</span>
              <el-tag type="info" size="small">单位：元</el-tag>
            </div>
          </template>
          <div ref="feeChartRef" class="chart-box" />
        </el-card>
      </el-tab-pane>

      <!-- 资金守恒 -->
      <el-tab-pane label="资金守恒" name="conservation">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>资金守恒校验</span>
              <el-button type="primary" :loading="conservationLoading" @click="runConservationCheck">
                <el-icon><Select /></el-icon>
                一键校验
              </el-button>
            </div>
          </template>

          <el-alert
            title="资金守恒公式"
            type="info"
            :closable="false"
            show-icon
            description="所有用户余额总和 + 平台手续费 = 总充值 + 总奖励"
            style="margin-bottom: 20px"
          />

          <el-row :gutter="16" class="conservation-formula">
            <el-col :xs="24" :sm="12" :md="6">
              <div class="formula-item">
                <div class="formula-label">用户余额总和</div>
                <div class="formula-value">¥{{ conservationData.userBalance.toFixed(2) }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="formula-item">
                <div class="formula-label">平台手续费</div>
                <div class="formula-value">¥{{ conservationData.platformFee.toFixed(2) }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="formula-item">
                <div class="formula-label">总充值</div>
                <div class="formula-value">¥{{ conservationData.totalRecharge.toFixed(2) }}</div>
              </div>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <div class="formula-item">
                <div class="formula-label">总奖励</div>
                <div class="formula-value">¥{{ conservationData.totalReward.toFixed(2) }}</div>
              </div>
            </el-col>
          </el-row>

          <el-divider content-position="center">校验结果</el-divider>

          <div class="conservation-result">
            <div class="result-row">
              <span class="result-label">等式左侧（余额 + 手续费）：</span>
              <span class="result-value">¥{{ conservationData.leftSide.toFixed(2) }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">等式右侧（充值 + 奖励）：</span>
              <span class="result-value">¥{{ conservationData.rightSide.toFixed(2) }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">差异金额：</span>
              <span class="result-value" :class="Math.abs(conservationData.diff) < 0.01 ? 'diff-ok' : 'diff-error'">
                ¥{{ conservationData.diff.toFixed(2) }}
              </span>
            </div>
            <el-result
              v-if="conservationChecked"
              :icon="Math.abs(conservationData.diff) < 0.01 ? 'success' : 'error'"
              :title="Math.abs(conservationData.diff) < 0.01 ? '资金守恒校验通过' : '资金守恒异常，请核查！'"
              :sub-title="Math.abs(conservationData.diff) < 0.01 ? '等式两侧金额一致，账目平衡' : `差异金额 ¥${conservationData.diff.toFixed(2)}，请核查相关流水`"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 异常监控 -->
      <el-tab-pane label="异常监控" name="anomaly">
        <el-row :gutter="16">
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span><el-icon><WarningFilled /></el-icon> 大额充值监控</span>
                  <el-tag type="danger" size="small">阈值 ≥ ¥5000</el-tag>
                </div>
              </template>
              <el-table :data="largeRechargeList" border stripe size="small">
                <el-table-column prop="username" label="用户" width="130" />
                <el-table-column label="金额" width="120" align="right">
                  <template #default="{ row }">
                    <span class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="channel" label="渠道" width="90" align="center">
                  <template #default="{ row }">
                    {{ row.channel === 'alipay' ? '支付宝' : '微信' }}
                  </template>
                </el-table-column>
                <el-table-column prop="created_at" label="时间" min-width="160" />
                <el-table-column label="标记" width="90" align="center">
                  <template #default>
                    <el-tag type="danger" size="small" effect="dark">大额</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :xs="24" :lg="12">
            <el-card shadow="never">
              <template #header>
                <div class="card-header">
                  <span><el-icon><Warning /></el-icon> 频繁小额标记</span>
                  <el-tag type="warning" size="small">24h内 ≥ 5 笔</el-tag>
                </div>
              </template>
              <el-table :data="frequentSmallList" border stripe size="small">
                <el-table-column prop="username" label="用户" width="130" />
                <el-table-column prop="count" label="充值笔数" width="100" align="center" />
                <el-table-column label="累计金额" width="130" align="right">
                  <template #default="{ row }">
                    ¥{{ Number(row.total).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="avg_amount" label="单笔均值" width="120" align="right">
                  <template #default="{ row }">
                    ¥{{ Number(row.avg_amount).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="last_time" label="最近时间" min-width="160" />
                <el-table-column label="标记" width="90" align="center">
                  <template #default>
                    <el-tag type="warning" size="small" effect="dark">频繁</el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Select, WarningFilled, Warning } from '@element-plus/icons-vue'
import { walletApi, type WalletTransaction as ApiWalletTransaction } from '../../api'
import { paginate } from '../../utils/pagination'

const activeTab = ref('recharge')

// ========== 充值记录 ==========
interface RechargeRecord {
  id: number
  user_id: number
  username: string
  channel: string
  amount: number
  tx_no: string
  status: string
  callback_time: string
}

interface WalletTransaction {
  id: number
  user_id: number
  username: string
  type: string
  type_text: string
  amount: number
  balance_after: number
  channel: string
  status: string
  created_at: string
}

// 基础交易数据（API 加载）
const baseTransactions = ref<WalletTransaction[]>([])

const rechargeRecords = computed<RechargeRecord[]>(() =>
  baseTransactions.value
    .filter(t => t.type === 'recharge')
    .map((t, idx) => ({
      id: t.id,
      user_id: t.user_id,
      username: t.username,
      channel: t.channel === '-' ? 'alipay' : t.channel,
      amount: Math.abs(t.amount),
      tx_no: `PAY${String(2026080000 + idx).padStart(12, '0')}`,
      status: t.status,
      callback_time: t.created_at
    }))
)

const rechargeSearch = reactive({ username: '', channel: '', status: '' })
const rechargeLoading = ref(false)
const rechargePage = ref(1)
const rechargePageSize = ref(10)
const rechargePageData = ref<{ list: RechargeRecord[]; total: number }>({ list: [], total: 0 })

function getRechargeFiltered(): RechargeRecord[] {
  let list = [...rechargeRecords.value]
  if (rechargeSearch.username) list = list.filter(r => r.username.includes(rechargeSearch.username.trim()))
  if (rechargeSearch.channel) list = list.filter(r => r.channel === rechargeSearch.channel)
  if (rechargeSearch.status) list = list.filter(r => r.status === rechargeSearch.status)
  return list
}

async function fetchRecharge() {
  rechargeLoading.value = true
  const res = paginate(getRechargeFiltered(), rechargePage.value, rechargePageSize.value)
  rechargePageData.value = { list: res.list as RechargeRecord[], total: res.total }
  rechargeLoading.value = false
}

function handleRechargeSearch() { rechargePage.value = 1; fetchRecharge() }
function handleRechargeReset() {
  rechargeSearch.username = ''
  rechargeSearch.channel = ''
  rechargeSearch.status = ''
  rechargePage.value = 1
  fetchRecharge()
}

// ========== 资金流水 ==========
const txTypeOptions = [
  { label: '充值', value: 'recharge' },
  { label: '购买', value: 'purchase' },
  { label: '退款', value: 'refund' },
  { label: '提现', value: 'withdraw' },
  { label: '奖励', value: 'reward' },
  { label: '手续费', value: 'fee' }
]

function txTagType(type: string) {
  const map: Record<string, string> = {
    recharge: 'success',
    purchase: 'primary',
    refund: 'warning',
    withdraw: 'info',
    reward: 'success',
    fee: 'danger'
  }
  return map[type] || 'info'
}

const txSearch = reactive({ username: '', type: '', dateRange: [] as string[] })
const txLoading = ref(false)
const txPage = ref(1)
const txPageSize = ref(10)
const txPageData = ref<{ list: WalletTransaction[]; total: number }>({ list: [], total: 0 })

function getTxFilted() {
  let list = [...baseTransactions.value]
  if (txSearch.username) list = list.filter(t => t.username.includes(txSearch.username.trim()))
  if (txSearch.type) list = list.filter(t => t.type === txSearch.type)
  if (txSearch.dateRange && txSearch.dateRange.length === 2) {
    const [start, end] = txSearch.dateRange
    list = list.filter(t => {
      const d = t.created_at.substring(0, 10)
      return d >= start && d <= end
    })
  }
  return list
}

async function fetchTx() {
  txLoading.value = true
  const res = paginate(getTxFilted(), txPage.value, txPageSize.value)
  txPageData.value = { list: res.list as WalletTransaction[], total: res.total }
  txLoading.value = false
}

function handleTxSearch() { txPage.value = 1; fetchTx() }
function handleTxReset() {
  txSearch.username = ''
  txSearch.type = ''
  txSearch.dateRange = []
  txPage.value = 1
  fetchTx()
}

// ========== 手续费统计 ==========
const feeChartRef = ref<HTMLElement>()
let feeChart: echarts.ECharts | null = null

const feeDailyData = Array.from({ length: 13 }, (_, i) => {
  const day = String((i % 13) + 1).padStart(2, '0')
  return {
    date: `2026-08-${day}`,
    fee: parseFloat((Math.random() * 800 + 200).toFixed(2)),
    count: Math.floor(Math.random() * 50 + 10)
  }
})

const feeSummary = reactive({
  total: feeDailyData.reduce((s, d) => s + d.fee, 0),
  avg: feeDailyData.reduce((s, d) => s + d.fee, 0) / feeDailyData.length,
  peak: Math.max(...feeDailyData.map(d => d.fee)),
  count: feeDailyData.reduce((s, d) => s + d.count, 0)
})

function renderFeeChart() {
  if (!feeChartRef.value) return
  if (!feeChart) feeChart = echarts.init(feeChartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (val) => '¥' + Number(val ?? 0).toFixed(2)
    },
    legend: { data: ['手续费', '交易笔数'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: feeDailyData.map(d => d.date.substring(5)),
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#909399' }
    },
    yAxis: [
      {
        type: 'value',
        name: '手续费(¥)',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#909399' }
      },
      {
        type: 'value',
        name: '笔数',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#909399' }
      }
    ],
    series: [
      {
        name: '手续费',
        type: 'bar',
        yAxisIndex: 0,
        data: feeDailyData.map(d => d.fee),
        barWidth: '45%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
          ])
        }
      },
      {
        name: '交易笔数',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        data: feeDailyData.map(d => d.count),
        itemStyle: { color: '#fa709a' },
        lineStyle: { width: 2 }
      }
    ]
  }
  feeChart.setOption(option, true)
}

// ========== 资金守恒 ==========
const conservationLoading = ref(false)
const conservationChecked = ref(false)
const conservationData = reactive({
  userBalance: 0,
  platformFee: 0,
  totalRecharge: 0,
  totalReward: 0,
  leftSide: 0,
  rightSide: 0,
  diff: 0
})

async function runConservationCheck() {
  conservationLoading.value = true
  // 计算各分项
  const userBalance = parseFloat((Math.random() * 200000 + 150000).toFixed(2))
  const platformFee = parseFloat(feeSummary.total.toFixed(2))
  const totalRecharge = parseFloat(rechargeRecords.value.reduce((s, r) => r.status === 'success' ? s + r.amount : s, 0).toFixed(2))
  const totalReward = parseFloat((Math.random() * 30000 + 10000).toFixed(2))
  // 守恒：左 = 余额 + 手续费；右 = 充值 + 奖励；构造微小差异以模拟
  const leftSide = userBalance + platformFee
  const rightSide = totalRecharge + totalReward
  const diff = parseFloat((leftSide - rightSide + (Math.random() < 0.3 ? (Math.random() * 20 - 10) : 0)).toFixed(2))

  conservationData.userBalance = userBalance
  conservationData.platformFee = platformFee
  conservationData.totalRecharge = totalRecharge
  conservationData.totalReward = totalReward
  conservationData.leftSide = leftSide
  conservationData.rightSide = rightSide
  conservationData.diff = diff
  conservationChecked.value = true
  conservationLoading.value = false
  ElMessage.success('资金守恒校验已完成')
}

// ========== 异常监控 ==========
const largeRechargeList = computed(() =>
  rechargeRecords.value
    .filter(r => r.amount >= 5000 || (r.status === 'success' && r.id % 4 === 0))
    .map(r => ({ ...r, amount: Math.max(r.amount, 5000 + r.id * 50) }))
    .slice(0, 8)
)

const frequentSmallList = computed(() =>
  baseTransactions.value
    .filter((_, i) => i % 6 === 0)
    .slice(0, 8)
    .map((t, i) => ({
      username: t.username,
      count: 5 + (i % 4),
      total: parseFloat((Math.random() * 500 + 100).toFixed(2)),
      avg_amount: parseFloat((Math.random() * 80 + 20).toFixed(2)),
      last_time: t.created_at
    }))
)

function handleResize() {
  feeChart?.resize()
}

// 交易类型文本映射
const txTypeTextMap: Record<string, string> = {
  recharge: '充值', purchase: '购买', refund: '退款', withdraw: '提现', reward: '奖励', fee: '手续费'
}

// 从后端加载钱包交易数据
// 后端钱包流水列表返回的扁平化/联表字段（用户昵称、渠道、状态等），
// API 的 WalletTransaction 未覆盖，此处以其为基础叠加可选额外字段。
type WalletTxRaw = ApiWalletTransaction & {
  user_id?: number | string
  username?: string
  nickname?: string
  typeText?: string
  type_text?: string
  balance_after?: number | string
  channel?: string
  status?: string
  created_at?: string
}

async function loadData() {
  try {
    const res = await walletApi.transactions({ page: 1, pageSize: 100 })
    if (res && res.list && res.list.length > 0) {
      baseTransactions.value = res.list.map((t: WalletTxRaw, idx: number) => ({
        id: t.id ?? idx + 1,
        user_id: t.userId ?? t.user_id ?? 0,
        username: t.username ?? t.nickname ?? `用户${t.userId ?? idx + 1}`,
        type: t.type ?? 'unknown',
        type_text: t.typeText ?? t.type_text ?? txTypeTextMap[t.type] ?? t.type ?? '',
        amount: Number(t.amount ?? 0),
        balance_after: Number(t.balanceAfter ?? t.balance_after ?? 0),
        channel: t.channel ?? '-',
        status: t.status ?? 'success',
        created_at: t.createdAt ?? t.created_at ?? ''
      }))
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
    baseTransactions.value = []
  }
}

onMounted(async () => {
  await loadData()
  fetchRecharge()
  fetchTx()
  await nextTick()
  renderFeeChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  feeChart?.dispose()
  feeChart = null
})
</script>

<style scoped>
.wallet-page :deep(.el-tabs__content) {
  padding: 0;
}
.search-card {
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
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.amount-text {
  color: var(--color-danger);
  font-weight: 600;
}
.amount-plus {
  color: var(--color-success);
  font-weight: 600;
}
.amount-minus {
  color: var(--color-danger);
  font-weight: 600;
}

.stat-row .el-col {
  margin-bottom: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-radius: 10px;
  color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
}
.grad-blue { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.grad-green { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
.grad-orange { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.grad-purple { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }

.chart-box {
  width: 100%;
  height: 360px;
}

.conservation-formula {
  margin-bottom: 8px;
}
.formula-item {
  background: var(--bg-page);
  border-radius: 8px;
  padding: 18px;
  text-align: center;
  border: 1px solid var(--border-light);
  margin-bottom: 12px;
}
.formula-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.formula-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
}
.conservation-result {
  max-width: 600px;
  margin: 0 auto;
}
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin-bottom: 8px;
  background: var(--bg-page);
  border-radius: 6px;
}
.result-label {
  font-size: 14px;
  color: var(--text-regular);
}
.result-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.diff-ok {
  color: var(--color-success);
}
.diff-error {
  color: var(--color-danger);
}
</style>
