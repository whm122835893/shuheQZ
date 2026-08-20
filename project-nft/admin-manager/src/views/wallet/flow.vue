<template>
  <div class="flow-page">
    <div class="page-header">
      <span class="page-title">资金流水</span>
      <el-button type="success" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出CSV
      </el-button>
    </div>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 200px">
            <el-option label="充值" value="recharge" />
            <el-option label="消费" value="consume" />
            <el-option label="退款" value="refund" />
            <el-option label="提现" value="withdraw" />
            <el-option label="手续费" value="fee" />
            <el-option label="转入" value="transfer_in" />
            <el-option label="转出" value="transfer_out" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
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
        <el-table-column prop="flow_no" label="流水号" width="200" fixed="left" show-overflow-tooltip />
        <el-table-column prop="user" label="用户" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="140" align="right">
          <template #default="{ row }">
            <span :class="row.amount >= 0 ? 'amount-plus' : 'amount-minus'">
              {{ row.amount >= 0 ? '+' : '' }}¥{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="变动后余额" width="140" align="right">
          <template #default="{ row }">¥{{ Number(row.balance_after).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column prop="created_at" label="时间" width="180" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { walletApi, type WalletTransaction } from '../../api'
import { paginate } from '../../utils/pagination'

type FlowType = 'recharge' | 'consume' | 'refund' | 'withdraw' | 'fee' | 'transfer_in' | 'transfer_out'

interface FlowItem {
  id: number
  flow_no: string
  user: string
  phone: string
  type: FlowType
  amount: number
  balance_after: number
  remark: string
  created_at: string
}

const localList = ref<FlowItem[]>([])

const searchForm = reactive({
  phone: '',
  type: '' as '' | FlowType,
  dateRange: [] as string[]
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: FlowItem[]; total: number }>({ list: [], total: 0 })

function typeText(type: FlowType) {
  const map: Record<FlowType, string> = {
    recharge: '充值',
    consume: '消费',
    refund: '退款',
    withdraw: '提现',
    fee: '手续费',
    transfer_in: '转入',
    transfer_out: '转出'
  }
  return map[type]
}

function typeTagType(type: FlowType): 'success' | 'primary' | 'warning' | 'info' | 'danger' {
  const map: Record<FlowType, 'success' | 'primary' | 'warning' | 'info' | 'danger'> = {
    recharge: 'success',
    consume: 'primary',
    refund: 'warning',
    withdraw: 'info',
    fee: 'danger',
    transfer_in: 'success',
    transfer_out: 'primary'
  }
  return map[type]
}

function getFilteredList(): FlowItem[] {
  let list = [...localList.value]
  if (searchForm.phone) {
    list = list.filter(f => f.phone.includes(searchForm.phone.trim()))
  }
  if (searchForm.type) list = list.filter(f => f.type === searchForm.type)
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(f => {
      const d = f.created_at.substring(0, 10)
      return d >= start && d <= end
    })
  }
  return list
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as FlowItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.phone = ''
  searchForm.type = ''
  searchForm.dateRange = []
  page.value = 1
  fetchData()
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['流水号', '用户', '手机号', '类型', '金额', '变动后余额', '备注', '时间']
  const rows = list.map(f => [
    f.flow_no,
    f.user,
    f.phone,
    typeText(f.type),
    (f.amount >= 0 ? '+' : '') + f.amount.toFixed(2),
    f.balance_after.toFixed(2),
    f.remark,
    f.created_at
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `资金流水_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条记录`)
}

// API 类型到 FlowType 的映射
const apiTypeToFlowType: Record<string, FlowType> = {
  recharge: 'recharge',
  purchase: 'consume',
  consume: 'consume',
  refund: 'refund',
  withdraw: 'withdraw',
  fee: 'fee',
  transfer_in: 'transfer_in',
  transfer_out: 'transfer_out'
}

// 从后端加载资金流水数据
// 后端流水列表返回的扁平化/联表字段（用户昵称、手机号、流水号等），
// API 的 WalletTransaction 未覆盖，此处以其为基础叠加可选额外字段。
type WalletTxRaw = WalletTransaction & {
  flowNo?: string
  username?: string
  nickname?: string
  phone?: string
  balance_after?: number | string
  typeText?: string
  created_at?: string
}

async function loadData() {
  try {
    const res = await walletApi.transactions({ page: 1, pageSize: 100 })
    if (res && res.list && res.list.length > 0) {
      localList.value = res.list.map((t: WalletTxRaw, idx: number) => ({
        id: Number(t.id ?? idx + 1),
        flow_no: t.flowNo ?? `FLW${String(40000000 + idx).padStart(12, '0')}`,
        user: t.username ?? t.nickname ?? `用户${t.userId ?? idx + 1}`,
        phone: t.phone ?? '-',
        type: apiTypeToFlowType[t.type] ?? 'consume',
        amount: Number(t.amount ?? 0),
        balance_after: Number(t.balanceAfter ?? t.balance_after ?? 0),
        remark: t.remark ?? t.typeText ?? '',
        created_at: t.createdAt ?? t.created_at ?? ''
      }))
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
.amount-plus {
  color: var(--color-success);
  font-weight: 600;
}
.amount-minus {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
