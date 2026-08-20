<template>
  <div class="approval-page">
    <div class="page-header">
      <span class="page-title">交易审批</span>
      <el-button type="success" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出CSV
      </el-button>
    </div>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 200px">
            <el-option label="实名认证" value="realname" />
            <el-option label="提现申请" value="withdraw" />
            <el-option label="空投发放" value="airdrop" />
            <el-option label="高危操作" value="high_risk" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="待审批" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已拒绝" value="rejected" />
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
        <el-table-column prop="approval_no" label="审批编号" width="160" fixed="left" />
        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small" effect="plain">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applicant" label="申请人" width="130" />
        <el-table-column prop="content" label="申请内容" min-width="220" show-overflow-tooltip />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">
            <span v-if="row.amount > 0" class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="apply_time" label="申请时间" width="180" />
        <el-table-column prop="approval_time" label="审批时间" width="180">
          <template #default="{ row }">
            {{ row.approval_time || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button link type="success" size="small" @click="openDialog(row, 'approved')">通过</el-button>
              <el-button link type="danger" size="small" @click="openDialog(row, 'rejected')">拒绝</el-button>
            </template>
            <span v-else class="text-muted">已处理</span>
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

    <!-- 审批弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogAction === 'approved' ? '通过审批' : '拒绝审批'"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-descriptions v-if="currentRow" :column="1" border size="small" style="margin-bottom: 16px">
        <el-descriptions-item label="审批编号">{{ currentRow.approval_no }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ typeText(currentRow.type) }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentRow.applicant }}</el-descriptions-item>
        <el-descriptions-item label="申请内容">{{ currentRow.content }}</el-descriptions-item>
      </el-descriptions>
      <el-form ref="formRef" :model="dialogForm" :rules="dialogRules" label-width="90px">
        <el-form-item label="审批意见" prop="opinion">
          <el-input
            v-model="dialogForm.opinion"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="dialogForm.password"
            type="password"
            show-password
            placeholder="请输入管理员密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          :type="dialogAction === 'approved' ? 'success' : 'danger'"
          :loading="submitting"
          @click="confirmAction"
        >确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { securityApi, type Approval } from '../../api'
import { paginate } from '../../utils/pagination'

type ApprovalType = 'realname' | 'withdraw' | 'airdrop' | 'high_risk'
type ApprovalStatus = 'pending' | 'approved' | 'rejected'

interface ApprovalItem {
  id: number
  approval_no: string
  type: ApprovalType
  applicant: string
  content: string
  amount: number
  status: ApprovalStatus
  apply_time: string
  approval_time: string | null
}

const localList = ref<ApprovalItem[]>([])

const searchForm = reactive({
  type: '' as '' | ApprovalType,
  status: '' as '' | ApprovalStatus
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: ApprovalItem[]; total: number }>({ list: [], total: 0 })

function typeText(type: ApprovalType) {
  const map: Record<ApprovalType, string> = {
    realname: '实名认证',
    withdraw: '提现申请',
    airdrop: '空投发放',
    high_risk: '高危操作'
  }
  return map[type]
}

function typeTagType(type: ApprovalType): 'primary' | 'warning' | 'success' | 'danger' {
  const map: Record<ApprovalType, 'primary' | 'warning' | 'success' | 'danger'> = {
    realname: 'primary',
    withdraw: 'warning',
    airdrop: 'success',
    high_risk: 'danger'
  }
  return map[type]
}

function statusText(status: ApprovalStatus) {
  const map: Record<ApprovalStatus, string> = { pending: '待审批', approved: '已通过', rejected: '已拒绝' }
  return map[status]
}

function statusTagType(status: ApprovalStatus): 'warning' | 'success' | 'danger' {
  const map: Record<ApprovalStatus, 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status]
}

function getFilteredList(): ApprovalItem[] {
  let list = [...localList.value]
  if (searchForm.type) list = list.filter(a => a.type === searchForm.type)
  if (searchForm.status) list = list.filter(a => a.status === searchForm.status)
  return list
}

// 后端审批列表返回的扁平化/联表字段（审批单号、申请人、内容、金额、时间等），
// API 的 Approval 未覆盖，此处以其为基础叠加可选额外字段。
type ApprovalRaw = Approval & {
  approvalNo?: string
  approval_no?: string
  applicant?: string
  content?: string
  amount?: number | string
  applyTime?: string
  apply_time?: string
  approvalTime?: string
  approval_time?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await securityApi.approvals({ page: 1, pageSize: 100 })
    localList.value = result.list.map((a: ApprovalRaw) => ({
      id: Number(a.id),
      approval_no: a.approvalNo || a.approval_no || '',
      type: (a.type || 'high_risk') as ApprovalType,
      applicant: a.applicant || '',
      content: a.content || '',
      amount: Number(a.amount ?? 0),
      status: (a.status || 'pending') as ApprovalStatus,
      apply_time: a.applyTime || a.apply_time || '',
      approval_time: a.approvalTime ?? a.approval_time ?? null
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    localList.value = []
  }
  loading.value = false
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as ApprovalItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.type = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 审批弹窗
const dialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const currentRow = ref<ApprovalItem | null>(null)
const dialogAction = ref<'approved' | 'rejected'>('approved')
const dialogForm = reactive({
  opinion: '',
  password: ''
})
const dialogRules: FormRules = {
  opinion: [{ required: true, message: '请输入审批意见', trigger: 'blur' }],
  password: [{ required: true, message: '请输入管理员密码', trigger: 'blur' }]
}

function openDialog(row: ApprovalItem, action: 'approved' | 'rejected') {
  currentRow.value = row
  dialogAction.value = action
  dialogForm.opinion = ''
  dialogForm.password = ''
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function confirmAction() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    if (currentRow.value) {
      currentRow.value.status = dialogAction.value
      currentRow.value.approval_time = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      ElMessage.success(`已${dialogAction.value === 'approved' ? '通过' : '拒绝'}审批 ${currentRow.value.approval_no}`)
    }
    submitting.value = false
    dialogVisible.value = false
    fetchData()
  })
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['审批编号', '类型', '申请人', '申请内容', '金额', '状态', '申请时间', '审批时间']
  const rows = list.map(a => [
    a.approval_no,
    typeText(a.type),
    a.applicant,
    a.content,
    a.amount > 0 ? a.amount.toFixed(2) : '-',
    statusText(a.status),
    a.apply_time,
    a.approval_time || '-'
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `交易审批_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条记录`)
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
.text-muted {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
