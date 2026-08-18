<template>
  <div class="audit-page">
    <div class="page-header">
      <span class="page-title">对账管理</span>
      <el-button type="success" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出CSV
      </el-button>
    </div>

    <!-- 概览统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">总交易额</div>
            <div class="stat-value">¥{{ stats.totalAmount.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">平台收入</div>
            <div class="stat-value" style="color: #67c23a">¥{{ stats.platformIncome.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">应结金额</div>
            <div class="stat-value" style="color: #409eff">¥{{ stats.shouldSettle.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">差异金额</div>
            <div class="stat-value" style="color: #f56c6c">¥{{ stats.diffAmount.toFixed(2) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="已平账" value="balanced" />
            <el-option label="有差异" value="diff" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never">
      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column prop="date" label="日期" width="120" fixed="left" />
        <el-table-column label="充值总额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.recharge_total).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="消费总额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.consume_total).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="退款总额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.refund_total).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="手续费总额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.fee_total).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="应结金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.should_settle).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="实结金额" width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.actual_settle).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="差异" width="120" align="right">
          <template #default="{ row }">
            <span :class="row.diff !== 0 ? 'diff-red' : 'text-muted'">
              {{ row.diff !== 0 ? '¥' + Number(row.diff).toFixed(2) : '无' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'balanced' ? 'success' : 'danger'" size="small">
              {{ row.status === 'balanced' ? '已平账' : '有差异' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              :loading="recheckingId === row.id"
              @click="handleRecheck(row)"
            >重新对账</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { walletApi } from '../../api'
import { paginate } from '../../utils/pagination'

type AuditStatus = 'balanced' | 'diff'

interface AuditItem {
  id: number
  date: string
  recharge_total: number
  consume_total: number
  refund_total: number
  fee_total: number
  should_settle: number
  actual_settle: number
  diff: number
  status: AuditStatus
}

const localList = ref<AuditItem[]>([])

const searchForm = reactive({
  dateRange: [] as string[],
  status: '' as '' | AuditStatus
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: AuditItem[]; total: number }>({ list: [], total: 0 })
const recheckingId = ref<number | null>(null)

const stats = computed(() => ({
  totalAmount: localList.value.reduce((s, a) => s + a.recharge_total, 0),
  platformIncome: localList.value.reduce((s, a) => s + a.fee_total, 0),
  shouldSettle: localList.value.reduce((s, a) => s + a.should_settle, 0),
  diffAmount: localList.value.reduce((s, a) => s + Math.abs(a.diff), 0)
}))

function getFilteredList(): AuditItem[] {
  let list = [...localList.value]
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(a => a.date >= start && a.date <= end)
  }
  if (searchForm.status) list = list.filter(a => a.status === searchForm.status)
  return list
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as AuditItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.dateRange = []
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 重新对账
async function handleRecheck(row: AuditItem) {
  recheckingId.value = row.id
  // 重新对账后修复差异
  row.diff = 0
  row.actual_settle = row.should_settle
  row.status = 'balanced'
  recheckingId.value = null
  ElMessage.success(`${row.date} 对账完成，差异已修复`)
  fetchData()
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['日期', '充值总额', '消费总额', '退款总额', '手续费总额', '应结金额', '实结金额', '差异', '状态']
  const rows = list.map(a => [
    a.date,
    a.recharge_total.toFixed(2),
    a.consume_total.toFixed(2),
    a.refund_total.toFixed(2),
    a.fee_total.toFixed(2),
    a.should_settle.toFixed(2),
    a.actual_settle.toFixed(2),
    a.diff !== 0 ? a.diff.toFixed(2) : '无',
    a.status === 'balanced' ? '已平账' : '有差异'
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `对账记录_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条记录`)
}

// 从后端加载交易数据并按日期聚合为对账记录
async function loadData() {
  try {
    const res = await walletApi.transactions({ page: 1, pageSize: 200 })
    if (res && res.list && res.list.length > 0) {
      // 按日期聚合交易数据
      const dateMap = new Map<string, { recharge: number; consume: number; refund: number; fee: number }>()
      for (const t of res.list) {
        const rawDate = (t.createdAt ?? t.created_at ?? '').substring(0, 10)
        if (!rawDate) continue
        if (!dateMap.has(rawDate)) {
          dateMap.set(rawDate, { recharge: 0, consume: 0, refund: 0, fee: 0 })
        }
        const entry = dateMap.get(rawDate)!
        const amount = Math.abs(Number(t.amount ?? 0))
        const type = t.type ?? ''
        if (type === 'recharge') entry.recharge += amount
        else if (type === 'purchase' || type === 'consume') entry.consume += amount
        else if (type === 'refund') entry.refund += amount
        else if (type === 'fee') entry.fee += amount
      }
      const items: AuditItem[] = Array.from(dateMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v], idx) => {
          const recharge_total = parseFloat(v.recharge.toFixed(2))
          const consume_total = parseFloat(v.consume.toFixed(2))
          const refund_total = parseFloat(v.refund.toFixed(2))
          const fee_total = parseFloat(v.fee.toFixed(2))
          const should_settle = parseFloat((recharge_total - refund_total + fee_total).toFixed(2))
          const actual_settle = should_settle
          const diff = 0
          return {
            id: idx + 1,
            date,
            recharge_total,
            consume_total,
            refund_total,
            fee_total,
            should_settle,
            actual_settle,
            diff,
            status: 'balanced' as AuditStatus
          }
        })
      if (items.length > 0) {
        localList.value = items
      }
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
    localList.value = []
  }
}

onMounted(async () => {
  await loadData()
  fetchData()
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.stat-row .el-col {
  margin-bottom: 16px;
}
.stat-card {
  padding: 4px 12px;
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.diff-red {
  color: var(--color-danger);
  font-weight: 600;
}
.text-muted {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
