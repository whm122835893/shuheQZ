<template>
  <div class="recharge-page">
    <div class="page-header">
      <span class="page-title">充值记录</span>
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
        <el-form-item label="充值渠道">
          <el-select v-model="searchForm.channel" placeholder="全部" clearable style="width: 200px">
            <el-option label="微信" value="wechat" />
            <el-option label="支付宝" value="alipay" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="待支付" value="pending" />
            <el-option label="成功" value="success" />
            <el-option label="失败" value="failed" />
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
        <el-table-column prop="order_no" label="充值单号" width="200" fixed="left" show-overflow-tooltip />
        <el-table-column prop="nickname" label="用户昵称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="充值渠道" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.channel === 'alipay' ? 'primary' : 'success'" size="small">
              {{ row.channel === 'alipay' ? '支付宝' : '微信' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="dark">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column prop="paid_at" label="支付时间" width="180">
          <template #default="{ row }">{{ row.paid_at || '-' }}</template>
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { walletApi, type WalletTransaction } from '../../api'
import { paginate } from '../../utils/pagination'

type RechargeStatus = 'pending' | 'success' | 'failed'
type RechargeChannel = 'wechat' | 'alipay'

interface RechargeItem {
  id: number
  order_no: string
  nickname: string
  phone: string
  channel: RechargeChannel
  amount: number
  status: RechargeStatus
  created_at: string
  paid_at: string | null
}

const localList = ref<RechargeItem[]>([])

const searchForm = reactive({
  phone: '',
  channel: '' as '' | RechargeChannel,
  status: '' as '' | RechargeStatus,
  dateRange: [] as string[]
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: RechargeItem[]; total: number }>({ list: [], total: 0 })

function statusText(status: RechargeStatus) {
  const map: Record<RechargeStatus, string> = { pending: '待支付', success: '成功', failed: '失败' }
  return map[status]
}

function statusTagType(status: RechargeStatus): 'warning' | 'success' | 'danger' {
  const map: Record<RechargeStatus, 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    success: 'success',
    failed: 'danger'
  }
  return map[status]
}

function getFilteredList(): RechargeItem[] {
  let list = [...localList.value]
  if (searchForm.phone) {
    list = list.filter(r => r.phone.includes(searchForm.phone.trim()))
  }
  if (searchForm.channel) list = list.filter(r => r.channel === searchForm.channel)
  if (searchForm.status) list = list.filter(r => r.status === searchForm.status)
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(r => {
      const d = r.created_at.substring(0, 10)
      return d >= start && d <= end
    })
  }
  return list
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as RechargeItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.phone = ''
  searchForm.channel = ''
  searchForm.status = ''
  searchForm.dateRange = []
  page.value = 1
  fetchData()
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['充值单号', '用户昵称', '手机号', '充值渠道', '金额', '状态', '创建时间', '支付时间']
  const rows = list.map(r => [
    r.order_no,
    r.nickname,
    r.phone,
    r.channel === 'alipay' ? '支付宝' : '微信',
    r.amount.toFixed(2),
    statusText(r.status),
    r.created_at,
    r.paid_at || '-'
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `充值记录_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条记录`)
}

// 从后端加载充值记录数据
// 后端充值列表返回的扁平化/联表字段（用户昵称、手机号、渠道、单号等），
// API 的 WalletTransaction 未覆盖，此处以其为基础叠加可选额外字段。
type WalletTxRaw = WalletTransaction & {
  orderNo?: string
  nickname?: string
  username?: string
  phone?: string
  channel?: string
  status?: string
  created_at?: string
  paidAt?: string
  paid_at?: string
}

async function loadData() {
  try {
    const res = await walletApi.transactions({ type: 'recharge', page: 1, pageSize: 100 })
    if (res && res.list && res.list.length > 0) {
      localList.value = res.list.map((t: WalletTxRaw, idx: number) => {
        const rawChannel = t.channel ?? 'wechat'
        const channel: RechargeChannel = rawChannel === 'alipay' ? 'alipay' : 'wechat'
        const rawStatus = t.status ?? 'success'
        const status: RechargeStatus =
          rawStatus === 'failed' ? 'failed' : rawStatus === 'pending' ? 'pending' : 'success'
        return {
          id: Number(t.id ?? idx + 1),
          order_no: t.orderNo ?? `RCG${String(30000000 + idx).padStart(12, '0')}`,
          nickname: t.nickname ?? t.username ?? `用户${t.userId ?? idx + 1}`,
          phone: t.phone ?? '-',
          channel,
          amount: Math.abs(Number(t.amount ?? 0)),
          status,
          created_at: t.createdAt ?? t.created_at ?? '',
          paid_at: t.paidAt ?? t.paid_at ?? (status === 'success' ? (t.createdAt ?? t.created_at ?? '') : null)
        }
      })
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
.amount-text {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
