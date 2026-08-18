<template>
  <div class="refund-page">
    <div class="page-header">
      <span class="page-title">退款审批</span>
    </div>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="用户">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-table-column prop="order_no" label="订单号" width="170" fixed="left" />
        <el-table-column label="用户" width="150">
          <template #default="{ row }">
            <div>{{ row.username }}</div>
            <div class="sub-text">ID: {{ row.user_id }}</div>
          </template>
        </el-table-column>
        <el-table-column label="退款金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="退款原因" min-width="130" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="申请人" width="130" />
        <el-table-column prop="approver" label="审批人" width="120">
          <template #default="{ row }">
            {{ row.approver || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="170">
          <template #default="{ row }">
            {{ row.created_at }}
          </template>
        </el-table-column>
        <el-table-column label="审批时间" width="170">
          <template #default="{ row }">
            {{ row.approved_at || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button link type="success" size="small" @click="handleApprove(row)">审批通过</el-button>
              <el-button link type="danger" size="small" @click="openReject(row)">审批拒绝</el-button>
            </template>
            <span v-else class="sub-text">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 拒绝原因弹窗 -->
    <el-dialog v-model="rejectVisible" title="拒绝退款" width="480px">
      <el-form :model="rejectForm" label-width="90px">
        <el-form-item label="订单号">
          <span>{{ rejectForm.orderNo }}</span>
        </el-form-item>
        <el-form-item label="退款金额">
          <span class="amount-text">¥{{ Number(rejectForm.amount).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="拒绝原因" required>
          <el-input
            v-model="rejectForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因，将通知用户"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="rejectLoading" @click="confirmReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="confirmPwd" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelPwd">取消</el-button>
        <el-button type="primary" @click="confirmPwd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { refundApi } from '../../api'
import { paginate } from '../../utils/pagination'

interface RefundItem {
  id: number
  order_no: string
  user_id: number
  username: string
  amount: number
  reason: string
  status: string
  status_text: string
  approver: string
  created_at: string
  approved_at: string | null
}

const statusOptions = [
  { label: '待审批', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' }
]

const searchForm = reactive({
  orderNo: '',
  username: '',
  status: ''
})

const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const pageData = ref<{ list: RefundItem[]; total: number }>({ list: [], total: 0 })

const localRefunds = ref<RefundItem[]>([])

function statusTagType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

function getFilteredList(): RefundItem[] {
  let list = [...localRefunds.value]
  if (searchForm.orderNo) {
    list = list.filter(r => r.order_no.includes(searchForm.orderNo.trim()))
  }
  if (searchForm.username) {
    list = list.filter(r => r.username.includes(searchForm.username.trim()))
  }
  if (searchForm.status) {
    list = list.filter(r => r.status === searchForm.status)
  }
  return list
}

// 退款状态文本映射
const refundStatusTextMap: Record<string, string> = {
  pending: '待审批', approved: '已通过', rejected: '已拒绝'
}

async function loadData() {
  loading.value = true
  try {
    const result = await refundApi.list({ page: 1, pageSize: 100 })
    localRefunds.value = result.list.map((item: any) => {
      const statusNumMap: Record<number, string> = { 0: 'pending', 1: 'approved', 2: 'rejected' }
      const status = typeof item.status === 'number' ? (statusNumMap[item.status] || 'pending') : (item.status || 'pending')
      return {
        id: Number(item.id),
        order_no: item.orderNo || item.order_no || '',
        user_id: Number(item.userId || item.user_id) || 0,
        username: item.username || '',
        amount: parseFloat(item.amount) || 0,
        reason: item.reason || '',
        status,
        status_text: item.statusText || refundStatusTextMap[status] || status,
        approver: item.approver || item.reviewer || item.approverName || '',
        created_at: item.createdAt || item.created_at || '',
        approved_at: item.approvedAt || item.reviewedAt || item.processedAt || item.approved_at || null
      } as RefundItem
    })
  } catch (e) {
    ElMessage.error('数据加载失败')
    localRefunds.value = []
  }
  loading.value = false
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as RefundItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.orderNo = ''
  searchForm.username = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 审批通过
async function handleApprove(row: RefundItem) {
  try {
    await ElMessageBox.confirm(
      `确认通过退款申请吗？\n订单号：${row.order_no}\n退款金额：¥${Number(row.amount).toFixed(2)}`,
      '审批通过',
      { type: 'warning' }
    )
    const ok = await requirePassword('退款审批通过')
    if (!ok) return
    row.status = 'approved'
    row.status_text = '已通过'
    row.approver = '管理员'
    row.approved_at = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    ElMessage.success('退款已审批通过')
  } catch {
    // 取消
  }
}

// 审批拒绝
const rejectVisible = ref(false)
const rejectLoading = ref(false)
const rejectForm = reactive({
  id: 0,
  orderNo: '',
  amount: 0,
  reason: ''
})
function openReject(row: RefundItem) {
  rejectForm.id = row.id
  rejectForm.orderNo = row.order_no
  rejectForm.amount = row.amount
  rejectForm.reason = ''
  rejectVisible.value = true
}
async function confirmReject() {
  if (!rejectForm.reason.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  rejectLoading.value = true
  const target = localRefunds.value.find(r => r.id === rejectForm.id)
  if (target) {
    target.status = 'rejected'
    target.status_text = '已拒绝'
    target.approver = '管理员'
    target.approved_at = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  }
  rejectLoading.value = false
  rejectVisible.value = false
  ElMessage.success('已拒绝退款申请')
  fetchData()
}

// 密码验证
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(action: string): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.resolve = resolve
    pwdDialog.visible = true
  })
}
function confirmPwd() {
  if (!pwdDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  pwdDialog.visible = false
  pwdDialog.resolve?.(true)
}
function cancelPwd() {
  pwdDialog.visible = false
  pwdDialog.resolve?.(false)
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
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
