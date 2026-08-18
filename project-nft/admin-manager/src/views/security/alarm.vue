<template>
  <div class="alarm-page">
    <div class="page-header">
      <span class="page-title">风控告警</span>
      <el-button type="success" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出CSV
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">今日告警数</div>
            <div class="stat-value">{{ stats.today }}</div>
          </div>
          <el-icon class="stat-icon" style="color: #409eff"><Bell /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">未处理告警</div>
            <div class="stat-value" style="color: #e6a23c">{{ stats.pending }}</div>
          </div>
          <el-icon class="stat-icon" style="color: #e6a23c"><WarningFilled /></el-icon>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-info">
            <div class="stat-label">高危告警</div>
            <div class="stat-value" style="color: #f56c6c">{{ stats.high }}</div>
          </div>
          <el-icon class="stat-icon" style="color: #f56c6c"><CircleCloseFilled /></el-icon>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="告警类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 200px">
            <el-option label="设备异常" value="device" />
            <el-option label="IP异常" value="ip" />
            <el-option label="交易异常" value="trade" />
            <el-option label="登录异常" value="login" />
            <el-option label="充值异常" value="recharge" />
          </el-select>
        </el-form-item>
        <el-form-item label="级别">
          <el-select v-model="searchForm.level" placeholder="全部" clearable style="width: 200px">
            <el-option label="低危" value="low" />
            <el-option label="中危" value="medium" />
            <el-option label="高危" value="high" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="processed" />
            <el-option label="已忽略" value="ignored" />
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
        <el-table-column label="告警类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="级别" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="levelTagType(row.level)" size="small" effect="dark">
              {{ levelText(row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
        <el-table-column prop="user" label="关联用户" width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="trigger_time" label="触发时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              link
              type="primary"
              size="small"
              @click="openProcessDialog(row)"
            >处理</el-button>
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

    <!-- 处理弹窗 -->
    <el-dialog v-model="processDialogVisible" title="处理风控告警" width="500px" :close-on-click-modal="false">
      <template v-if="currentRow">
        <el-descriptions :column="1" border size="small" style="margin-bottom: 16px">
          <el-descriptions-item label="告警类型">{{ typeText(currentRow.type) }}</el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="levelTagType(currentRow.level)" size="small" effect="dark">
              {{ levelText(currentRow.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentRow.title }}</el-descriptions-item>
          <el-descriptions-item label="内容">{{ currentRow.content }}</el-descriptions-item>
          <el-descriptions-item label="关联用户">{{ currentRow.user }}</el-descriptions-item>
        </el-descriptions>
      </template>
      <el-form ref="processFormRef" :model="processForm" :rules="processRules" label-width="90px">
        <el-form-item label="处理备注" prop="remark">
          <el-input
            v-model="processForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入处理备注"
          />
        </el-form-item>
        <el-form-item label="处理方式">
          <el-radio-group v-model="processForm.action">
            <el-radio value="processed">标记已处理</el-radio>
            <el-radio value="ignored">忽略</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="processDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="confirmProcess">确认提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Download, Bell, WarningFilled, CircleCloseFilled } from '@element-plus/icons-vue'
import { securityApi, type RiskAlert } from '../../api'
import { paginate } from '../../utils/pagination'

type AlarmType = 'device' | 'ip' | 'trade' | 'login' | 'recharge'
type AlarmLevel = 'low' | 'medium' | 'high'
type AlarmStatus = 'pending' | 'processed' | 'ignored'

interface AlarmItem {
  id: number
  type: AlarmType
  level: AlarmLevel
  title: string
  content: string
  user: string
  status: AlarmStatus
  trigger_time: string
}

const localList = ref<AlarmItem[]>([])

const searchForm = reactive({
  type: '' as '' | AlarmType,
  level: '' as '' | AlarmLevel,
  status: '' as '' | AlarmStatus
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: AlarmItem[]; total: number }>({ list: [], total: 0 })

const stats = computed(() => ({
  today: localList.value.filter(a => a.trigger_time.startsWith('2026-08-13')).length,
  pending: localList.value.filter(a => a.status === 'pending').length,
  high: localList.value.filter(a => a.level === 'high' && a.status === 'pending').length
}))

function typeText(type: AlarmType) {
  const map: Record<AlarmType, string> = {
    device: '设备异常',
    ip: 'IP异常',
    trade: '交易异常',
    login: '登录异常',
    recharge: '充值异常'
  }
  return map[type]
}

function levelText(level: AlarmLevel) {
  const map: Record<AlarmLevel, string> = { low: '低危', medium: '中危', high: '高危' }
  return map[level]
}

function levelTagType(level: AlarmLevel): 'info' | 'warning' | 'danger' {
  const map: Record<AlarmLevel, 'info' | 'warning' | 'danger'> = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return map[level]
}

function statusText(status: AlarmStatus) {
  const map: Record<AlarmStatus, string> = { pending: '待处理', processed: '已处理', ignored: '已忽略' }
  return map[status]
}

function statusTagType(status: AlarmStatus): 'warning' | 'success' | 'info' {
  const map: Record<AlarmStatus, 'warning' | 'success' | 'info'> = {
    pending: 'warning',
    processed: 'success',
    ignored: 'info'
  }
  return map[status]
}

function getFilteredList(): AlarmItem[] {
  let list = [...localList.value]
  if (searchForm.type) list = list.filter(a => a.type === searchForm.type)
  if (searchForm.level) list = list.filter(a => a.level === searchForm.level)
  if (searchForm.status) list = list.filter(a => a.status === searchForm.status)
  return list
}

// 后端风险预警列表返回的扁平化/联表字段（标题、内容、用户、触发时间等），
// API 的 RiskAlert 未覆盖，此处以其为基础叠加可选额外字段。
type RiskAlertRaw = RiskAlert & {
  title?: string
  content?: string
  desc?: string
  user?: string
  triggerTime?: string
  trigger_time?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await securityApi.riskAlerts({ page: 1, pageSize: 100 })
    localList.value = result.list.map((a: RiskAlertRaw) => ({
      id: Number(a.id),
      type: (a.type || 'device') as AlarmType,
      level: (a.level || 'low') as AlarmLevel,
      title: a.title || '',
      content: a.content || a.desc || '',
      user: a.user || '',
      status: (a.status || 'pending') as AlarmStatus,
      trigger_time: a.triggerTime || a.trigger_time || ''
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
  pageData.value = { list: res.list as AlarmItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.type = ''
  searchForm.level = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 处理弹窗
const processDialogVisible = ref(false)
const submitting = ref(false)
const processFormRef = ref<FormInstance>()
const currentRow = ref<AlarmItem | null>(null)
const processForm = reactive({
  remark: '',
  action: 'processed' as AlarmStatus
})
const processRules: FormRules = {
  remark: [{ required: true, message: '请输入处理备注', trigger: 'blur' }]
}

function openProcessDialog(row: AlarmItem) {
  currentRow.value = row
  processForm.remark = ''
  processForm.action = 'processed'
  processFormRef.value?.clearValidate()
  processDialogVisible.value = true
}

async function confirmProcess() {
  if (!processFormRef.value) return
  await processFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    if (currentRow.value) {
      currentRow.value.status = processForm.action
      ElMessage.success(`告警 #${currentRow.value.id} 已${processForm.action === 'processed' ? '标记已处理' : '忽略'}`)
    }
    submitting.value = false
    processDialogVisible.value = false
    fetchData()
  })
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['告警类型', '级别', '标题', '内容', '关联用户', '状态', '触发时间']
  const rows = list.map(a => [
    typeText(a.type),
    levelText(a.level),
    a.title,
    a.content,
    a.user,
    statusText(a.status),
    a.trigger_time
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `风控告警_${Date.now()}.csv`
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
.stat-row {
  margin-bottom: 16px;
}
.stat-row .el-col {
  margin-bottom: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-icon {
  font-size: 40px;
  opacity: 0.8;
}
.text-muted {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
