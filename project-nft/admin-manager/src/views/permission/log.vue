<template>
  <div class="log-list-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="操作人">
          <el-input v-model="searchForm.operator" placeholder="用户名/姓名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="searchForm.module" placeholder="全部模块" clearable style="width: 200px">
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
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
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <div class="table-toolbar">
        <span class="toolbar-title">操作日志（共 {{ total }} 条）</span>
        <el-button type="success" :icon="Download" plain @click="handleExport">导出日志</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="操作人" min-width="130">
          <template #default="{ row }">
            <div class="operator-cell">
              <el-tag size="small" type="info">{{ row.operator }}</el-tag>
              <span>{{ row.operator_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.module }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="120" />
        <el-table-column prop="target" label="目标" min-width="130" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP 地址" width="150" />
        <el-table-column label="修改前" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'no-change': row.before_value === '-' }">{{ row.before_value }}</span>
          </template>
        </el-table-column>
        <el-table-column label="修改后" width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span :class="{ 'no-change': row.after_value === '-' }">{{ row.after_value }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="操作时间" width="180" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              <el-icon><View /></el-icon>详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="page.currentPage"
        v-model:page-size="page.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 详情 Dialog -->
    <el-dialog v-model="detailVisible" title="操作日志详情" width="720px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border class="detail-desc">
          <el-descriptions-item label="日志ID">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ detailRow.created_at }}</el-descriptions-item>
          <el-descriptions-item label="操作账号">{{ detailRow.operator }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ detailRow.operator_name }}</el-descriptions-item>
          <el-descriptions-item label="所属模块">{{ detailRow.module }}</el-descriptions-item>
          <el-descriptions-item label="操作行为">{{ detailRow.action }}</el-descriptions-item>
          <el-descriptions-item label="操作目标">{{ detailRow.target }}</el-descriptions-item>
          <el-descriptions-item label="IP 地址">{{ detailRow.ip }}</el-descriptions-item>
        </el-descriptions>

        <el-row :gutter="16" class="compare-row">
          <el-col :span="12">
            <div class="compare-block before">
              <div class="compare-title">
                <el-icon><Minus /></el-icon> 修改前
              </div>
              <pre class="compare-code">{{ formatJson(detailRow.before_value) }}</pre>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="compare-block after">
              <div class="compare-title">
                <el-icon><Plus /></el-icon> 修改后
              </div>
              <pre class="compare-code">{{ formatJson(detailRow.after_value) }}</pre>
            </div>
          </el-col>
        </el-row>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, RefreshLeft, Download, View, Minus, Plus } from '@element-plus/icons-vue'
import { permissionApi, type OperationLog } from '../../api'
import { paginate } from '../../utils/pagination'

interface LogItem {
  id: number
  operator: string
  operator_name: string
  module: string
  action: string
  target: string
  ip: string
  before_value: string
  after_value: string
  created_at: string
}

const moduleOptions = ['藏品管理', '盲盒管理', '用户管理', '订单管理', '系统配置', '营销活动']

const loading = ref(false)
const tableData = ref<LogItem[]>([])
const total = ref(0)
const localData = ref<LogItem[]>([])

const searchForm = reactive({
  operator: '',
  module: '',
  dateRange: [] as string[]
})

const page = reactive({
  currentPage: 1,
  pageSize: 10
})

function getFilteredData(): LogItem[] {
  let list = [...localData.value] as LogItem[]
  if (searchForm.operator) {
    const kw = searchForm.operator.toLowerCase()
    list = list.filter(l => l.operator.toLowerCase().includes(kw) || l.operator_name.includes(searchForm.operator))
  }
  if (searchForm.module) {
    list = list.filter(l => l.module === searchForm.module)
  }
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(l => {
      const d = l.created_at.substring(0, 10)
      return d >= start && d <= end
    })
  }
  return list
}

// 后端操作日志列表返回的扁平化/联表字段（操作人、模块、目标、前后值等），
// API 的 OperationLog 未覆盖，此处以其为基础叠加可选额外字段。
type OperationLogRaw = OperationLog & {
  operator?: string
  operatorName?: string
  operator_name?: string
  module?: string
  target?: string
  beforeValue?: string
  before_value?: string
  afterValue?: string
  after_value?: string
  created_at?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await permissionApi.operationLogs({ page: 1, pageSize: 100 })
    localData.value = result.list.map((l: OperationLogRaw) => ({
      id: Number(l.id),
      operator: l.operator || '',
      operator_name: l.operatorName || l.operator_name || '',
      module: l.module || '',
      action: l.action || '',
      target: l.target || '',
      ip: l.ip || '',
      before_value: l.beforeValue ?? l.before_value ?? '-',
      after_value: l.afterValue ?? l.after_value ?? '-',
      created_at: l.createdAt || l.created_at || ''
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    localData.value = []
  }
  loading.value = false
}

async function fetchData() {
  loading.value = true
  try {
    const filtered = getFilteredData()
    const result = paginate(filtered, page.currentPage, page.pageSize)
    tableData.value = result.list as LogItem[]
    total.value = result.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.currentPage = 1
  fetchData()
}

function handleReset() {
  searchForm.operator = ''
  searchForm.module = ''
  searchForm.dateRange = []
  page.currentPage = 1
  fetchData()
}

function handleExport() {
  const filtered = getFilteredData()
  ElMessage.success(`已导出 ${filtered.length} 条操作日志`)
}

// ===== 详情 Dialog =====
const detailVisible = ref(false)
const detailRow = ref<LogItem | null>(null)

function handleViewDetail(row: LogItem) {
  detailRow.value = row
  detailVisible.value = true
}

function formatJson(value: string): string {
  if (value === '-' || !value) return '无数据变更'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

onMounted(async () => {
  await loadData()
  fetchData()
})
</script>

<style scoped>
.search-form .el-form-item {
  margin-right: 16px;
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.operator-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.no-change {
  color: var(--text-placeholder);
}
.detail-desc {
  margin-bottom: 16px;
}
.compare-row {
  margin-top: 8px;
}
.compare-block {
  border-radius: var(--radius-base);
  overflow: hidden;
  border: 1px solid var(--border-color);
}
.compare-block.before {
  border-color: var(--color-danger);
}
.compare-block.after {
  border-color: var(--color-success);
}
.compare-title {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}
.compare-block.before .compare-title {
  background: #fef0f0;
  color: var(--color-danger);
}
.compare-block.after .compare-title {
  background: #f0f9eb;
  color: var(--color-success);
}
.compare-code {
  padding: 12px;
  margin: 0;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  background: var(--bg-page);
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
