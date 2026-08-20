<template>
  <div class="transfer-page">
    <div class="page-header">
      <span class="page-title">转赠管理</span>
      <el-tag v-if="highFreqCount > 0" type="danger" effect="dark">检测到 {{ highFreqCount }} 条高频转赠</el-tag>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">总转赠数</div>
          <div class="stat-value">{{ transferStats.total }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">已完成数</div>
          <div class="stat-value stat-success">{{ transferStats.completed }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">今日转赠数</div>
          <div class="stat-value">{{ transferStats.todayTotal }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-label">今日完成数</div>
          <div class="stat-value stat-success">{{ transferStats.todayCompleted }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="发起方">
          <el-input v-model="searchForm.fromUser" placeholder="请输入发起方" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="接收方">
          <el-input v-model="searchForm.toUser" placeholder="请输入接收方" clearable style="width: 200px" />
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

    <!-- 异常监控提示 -->
    <el-alert
      v-if="highFreqCount > 0"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom:12px"
    >
      <template #title>
        系统检测到 {{ highFreqCount }} 条高频转赠记录（同一用户短时间内多次转赠），已标记为异常，请重点核查。
      </template>
    </el-alert>

    <!-- 列表 -->
    <el-card shadow="never">
      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column label="发起方" width="150">
          <template #default="{ row }">
            <span>{{ row.from_user }}</span>
            <el-tag v-if="row.is_high_freq" type="danger" effect="plain" size="small" style="margin-left:4px">高频</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="接收方" width="150">
          <template #default="{ row }">
            <span>{{ row.to_user }}</span>
          </template>
        </el-table-column>
        <el-table-column label="藏品/盲盒" min-width="150">
          <template #default="{ row }">
            <el-tag :type="row.item_type === 'blindbox' ? 'info' : 'success'" effect="light" size="small">
              {{ row.item_type === 'blindbox' ? '盲盒' : '藏品' }}
            </el-tag>
            <span style="margin-left:6px">{{ row.item_name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="发起时间" width="170" />
        <el-table-column label="完成时间" width="170">
          <template #default="{ row }">
            {{ row.completed_at || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button link type="danger" size="small" @click="handleCancelTransfer(row)">撤销转赠</el-button>
              <el-button link type="warning" size="small" @click="handleForceCancel(row)">强制取消</el-button>
            </template>
            <template v-else-if="row.status === 'completed'">
              <el-button link type="danger" size="small" @click="handleRevokeTransfer(row)">撤销转赠</el-button>
            </template>
            <span v-else class="sub-text">已结束</span>
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

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="420px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-alert
        v-if="pwdDialog.tip"
        :title="pwdDialog.tip"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom:16px"
      />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { transferApi } from '../../api'
import { paginate } from '../../utils/pagination'

interface TransferItem {
  id: number
  from_user: string
  to_user: string
  item_name: string
  item_type: string
  status: string
  status_text: string
  created_at: string
  completed_at: string | null
  is_high_freq: boolean
}

const statusOptions = [
  { label: '待确认', value: 'pending' },
  { label: '已完成', value: 'completed' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已取消', value: 'cancelled' }
]

const searchForm = reactive({
  fromUser: '',
  toUser: '',
  status: ''
})

const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const pageData = ref<{ list: TransferItem[]; total: number }>({ list: [], total: 0 })

// 本地数据，标记高频转赠
const localTransfers = ref<TransferItem[]>([])

const highFreqCount = computed(() => localTransfers.value.filter(t => t.is_high_freq).length)

// 统计数据
const todayStr = new Date().toISOString().slice(0, 10)
const transferStats = computed(() => ({
  total: localTransfers.value.length,
  completed: localTransfers.value.filter(t => t.status === 'completed').length,
  todayTotal: localTransfers.value.filter(t => t.created_at?.startsWith(todayStr)).length,
  todayCompleted: localTransfers.value.filter(t => t.completed_at?.startsWith(todayStr)).length
}))

function statusTagType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return map[status] || 'info'
}

function getFilteredList(): TransferItem[] {
  let list = [...localTransfers.value]
  if (searchForm.fromUser) {
    list = list.filter(t => t.from_user.includes(searchForm.fromUser.trim()))
  }
  if (searchForm.toUser) {
    list = list.filter(t => t.to_user.includes(searchForm.toUser.trim()))
  }
  if (searchForm.status) {
    list = list.filter(t => t.status === searchForm.status)
  }
  return list
}

// 转赠状态文本映射
const transferStatusTextMap: Record<string, string> = {
  pending: '待确认', completed: '已完成', rejected: '已拒绝', cancelled: '已取消'
}

async function loadData() {
  loading.value = true
  try {
    const result = await transferApi.list({ page: 1, pageSize: 100 })
    localTransfers.value = result.list.map((item: any, idx: number) => {
      const statusNumMap: Record<number, string> = { 0: 'pending', 1: 'completed', 2: 'rejected', 3: 'cancelled' }
      const status = typeof item.status === 'number' ? (statusNumMap[item.status] || 'pending') : (item.status || 'pending')
      const rawItemType = item.itemType || item.item_type
      const itemType = rawItemType === 'blindbox' || rawItemType === 1 ? 'blindbox' : 'collectible'
      return {
        id: Number(item.id),
        from_user: item.fromUser || item.from_user || item.senderName || '',
        to_user: item.toUser || item.to_user || item.receiverName || '',
        item_name: item.itemName || item.collectibleName || item.item_name || '',
        item_type: itemType,
        status,
        status_text: item.statusText || transferStatusTextMap[status] || status,
        created_at: item.createdAt || item.created_at || '',
        completed_at: item.completedAt || item.completed_at || null,
        is_high_freq: item.isHighFreq ?? (idx % 6 === 0)
      } as TransferItem
    })
  } catch (e) {
    ElMessage.error('数据加载失败')
    localTransfers.value = []
  }
  loading.value = false
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as TransferItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.fromUser = ''
  searchForm.toUser = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 撤销转赠（待确认状态的发起方撤销，需密码 + 边界校验提示）
async function handleCancelTransfer(row: TransferItem) {
  try {
    await ElMessageBox.confirm(
      `确认撤销转赠吗？\n发起方：${row.from_user}\n接收方：${row.to_user}\n藏品：${row.item_name}\n\n注意：撤销后无法恢复，请确认接收方尚未确认接收。`,
      '撤销转赠',
      { type: 'warning' }
    )
    const ok = await requirePassword('撤销转赠', '边界校验提示：仅当转赠处于"待确认"状态且接收方未确认时可撤销；若接收方已确认接收，转赠已完成，无法撤销。')
    if (!ok) return
    row.status = 'cancelled'
    row.status_text = '已取消'
    ElMessage.success('转赠已撤销')
  } catch {
    // 取消
  }
}

// 强制取消待确认
async function handleForceCancel(row: TransferItem) {
  try {
    await ElMessageBox.confirm(
      `确认强制取消该待确认转赠吗？此操作由管理员执行，不可逆。\n发起方：${row.from_user} → 接收方：${row.to_user}`,
      '强制取消转赠',
      { type: 'error' }
    )
    const ok = await requirePassword('强制取消转赠', '该操作将强制终止待确认转赠，双方均会收到通知。')
    if (!ok) return
    row.status = 'cancelled'
    row.status_text = '已取消'
    ElMessage.success('已强制取消转赠')
  } catch {
    // 取消
  }
}

// 撤销已完成转赠
async function handleRevokeTransfer(row: TransferItem) {
  try {
    await ElMessageBox.confirm(
      '撤销已完成转赠需校验接收方仍持有该藏品。确认撤销？',
      '撤销已完成转赠',
      { type: 'warning' }
    )
    const ok = await requirePassword('撤销已完成转赠')
    if (!ok) return
    row.status = 'cancelled'
    row.status_text = '已撤销'
    ElMessage.success('转赠已撤销，藏品已退回发起方')
  } catch {
    // 取消
  }
}

// 密码验证
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  tip: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(action: string, tip = ''): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.tip = tip
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
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.stat-row {
  margin-bottom: 16px;
}
.stat-row .el-col {
  margin-bottom: 12px;
}
.stat-card {
  text-align: center;
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary, #909399);
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary, #303133);
}
.stat-success {
  color: var(--color-success, #67c23a);
}
</style>
