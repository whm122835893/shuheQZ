<template>
  <div class="blacklist-page">
    <div class="page-header">
      <span class="page-title">黑名单管理</span>
      <div>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出CSV
        </el-button>
        <el-button type="danger" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          加入黑名单
        </el-button>
      </div>
    </div>

    <el-alert
      title="加入黑名单的用户将被禁止登录、下单与交易"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable style="width: 200px" />
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
        <el-table-column prop="user_id" label="用户ID" width="90" align="center" />
        <el-table-column prop="nickname" label="用户昵称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="reason" label="拉黑原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="120" align="center" />
        <el-table-column prop="created_at" label="加入时间" width="180" />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="handleRemove(row)">移出黑名单</el-button>
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

    <!-- 加入黑名单弹窗 -->
    <el-dialog v-model="addDialogVisible" title="加入黑名单" width="480px" :close-on-click-modal="false">
      <el-alert
        title="加入黑名单的用户将被禁止登录、下单与交易，请谨慎操作"
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />
      <el-form ref="formRef" :model="addForm" :rules="addRules" label-width="100px">
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="addForm.phone" placeholder="请输入用户手机号" />
        </el-form-item>
        <el-form-item label="拉黑原因" prop="reason">
          <el-input
            v-model="addForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入拉黑原因"
          />
        </el-form-item>
        <el-form-item label="管理员密码" prop="password">
          <el-input
            v-model="addForm.password"
            type="password"
            show-password
            placeholder="请输入管理员密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmAdd">确认拉黑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Download, Plus } from '@element-plus/icons-vue'
import { securityApi, type Blacklist } from '../../api'
import { paginate } from '../../utils/pagination'

interface BlacklistItem {
  id: number
  user_id: number
  nickname: string
  phone: string
  reason: string
  operator: string
  created_at: string
}

const localList = ref<BlacklistItem[]>([])

const searchForm = reactive({ phone: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: BlacklistItem[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): BlacklistItem[] {
  let list = [...localList.value]
  if (searchForm.phone) {
    list = list.filter(b => b.phone.includes(searchForm.phone.trim()))
  }
  return list
}

// 后端黑名单列表返回的扁平化/联表字段（用户ID、昵称、手机号、操作人等），
// API 的 Blacklist 未覆盖，此处以其为基础叠加可选额外字段。
type BlacklistRaw = Blacklist & {
  userId?: number | string
  user_id?: number | string
  nickname?: string
  phone?: string
  operator?: string
  created_at?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await securityApi.blacklist({ page: 1, pageSize: 100 })
    localList.value = result.list.map((b: BlacklistRaw) => ({
      id: Number(b.id),
      user_id: Number(b.userId ?? b.user_id ?? 0),
      nickname: b.nickname || '',
      phone: b.phone || '',
      reason: b.reason || '',
      operator: b.operator || '',
      created_at: b.createdAt || b.created_at || ''
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
  pageData.value = { list: res.list as BlacklistItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.phone = ''
  page.value = 1
  fetchData()
}

// 加入黑名单
const addDialogVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const addForm = reactive({
  phone: '',
  reason: '',
  password: ''
})
const addRules: FormRules = {
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入拉黑原因', trigger: 'blur' }],
  password: [{ required: true, message: '请输入管理员密码', trigger: 'blur' }]
}

function openAddDialog() {
  addForm.phone = ''
  addForm.reason = ''
  addForm.password = ''
  formRef.value?.clearValidate()
  addDialogVisible.value = true
}

async function confirmAdd() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    const newId = Math.max(...localList.value.map(b => b.id), 0) + 1
    localList.value.unshift({
      id: newId,
      user_id: Math.floor(Math.random() * 9000) + 1000,
      nickname: '新拉黑用户' + newId,
      phone: addForm.phone,
      reason: addForm.reason,
      operator: '当前管理员',
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    })
    submitting.value = false
    addDialogVisible.value = false
    ElMessage.success(`已将「${addForm.phone}」加入黑名单`)
    page.value = 1
    fetchData()
  })
}

// 移出黑名单
function handleRemove(row: BlacklistItem) {
  ElMessageBox.confirm(
    `确定要将「${row.nickname}(${row.phone})」从黑名单中移除吗？移除后该用户可恢复正常使用。`,
    '移出黑名单确认',
    { confirmButtonText: '确定移除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(async () => {
      localList.value = localList.value.filter(b => b.id !== row.id)
      ElMessage.success(`已将「${row.nickname}」移出黑名单`)
      fetchData()
    })
    .catch(() => {})
}

// 导出 CSV
function handleExport() {
  const list = getFilteredList()
  const header = ['用户ID', '用户昵称', '手机号', '拉黑原因', '操作人', '加入时间']
  const rows = list.map(b => [
    b.user_id,
    b.nickname,
    b.phone,
    b.reason,
    b.operator,
    b.created_at
  ])
  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `黑名单列表_${Date.now()}.csv`
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
</style>
