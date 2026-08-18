<template>
  <div class="admin-list-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="全部角色" clearable style="width: 200px">
            <el-option v-for="r in roleOptions" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
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
        <span class="toolbar-title">管理员列表（共 {{ total }} 人）</span>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增管理员</el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
        <el-table-column prop="username" label="用户名" min-width="130" show-overflow-tooltip />
        <el-table-column prop="real_name" label="真实姓名" min-width="120" show-overflow-tooltip />
        <el-table-column label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small" effect="dark">
              {{ row.role_name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="150" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_login" label="最后登录" width="180" />
        <el-table-column prop="login_count" label="登录次数" width="100" align="center" />
        <el-table-column label="操作" width="290" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button type="warning" link size="small" @click="handleResetPwd(row)">
              <el-icon><Key /></el-icon>重置密码
            </el-button>
            <el-switch
              :model-value="row.status === 1"
              inline-prompt
              active-text="启用"
              inactive-text="禁用"
              style="--el-switch-on-color: #67C23A; --el-switch-off-color: #F56C6C; margin-left: 8px"
              @change="(val: any) => handleToggleStatus(row, val as boolean)"
            />
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

    <!-- 新增/编辑管理员 Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '新增管理员' : '编辑管理员'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="adminForm" :rules="formRules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="adminForm.username" placeholder="请输入登录用户名" :disabled="dialogMode === 'edit'" />
        </el-form-item>
        <el-form-item label="真实姓名" prop="real_name">
          <el-input v-model="adminForm.real_name" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'add'" label="登录密码" prop="password">
          <el-input v-model="adminForm.password" type="password" show-password placeholder="请输入登录密码" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="adminForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="r in roleOptions"
              :key="r.value"
              :label="r.label"
              :value="r.value"
              :disabled="r.value === 'super_admin'"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="adminForm.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, RefreshLeft, Plus, Edit, Key } from '@element-plus/icons-vue'
import { permissionApi, type AdminUserListItem } from '../../api'
import { paginate } from '../../utils/pagination'

interface AdminItem {
  id: number
  username: string
  real_name: string
  role: string
  role_name: string
  phone: string
  status: number
  last_login: string
  login_count: number
  created_at: string
}

const roleOptions = [
  { label: '超级管理员', value: 'super_admin' },
  { label: '运营', value: 'operator' },
  { label: '财务', value: 'finance' },
  { label: '风控', value: 'risk' },
  { label: '客服', value: 'customer_service' }
]

const roleNameMap: Record<string, string> = {
  super_admin: '超级管理员',
  operator: '运营',
  finance: '财务',
  risk: '风控',
  customer_service: '客服'
}

const loading = ref(false)
const tableData = ref<AdminItem[]>([])
const total = ref(0)

const searchForm = reactive({
  username: '',
  role: '',
  status: '' as '' | number
})

const page = reactive({
  currentPage: 1,
  pageSize: 10
})

function roleTagType(role: string): 'danger' | 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'danger' | 'primary' | 'success' | 'warning' | 'info'> = {
    super_admin: 'danger',
    operator: 'primary',
    finance: 'success',
    risk: 'warning',
    customer_service: 'info'
  }
  return map[role] || 'info'
}

// 本地数据副本，用于编辑回写
const localData = ref<AdminItem[]>([])

function getFilteredData(): AdminItem[] {
  let list = [...localData.value]
  if (searchForm.username) {
    list = list.filter(u => u.username.includes(searchForm.username))
  }
  if (searchForm.role) {
    list = list.filter(u => u.role === searchForm.role)
  }
  if (searchForm.status !== '') {
    list = list.filter(u => u.status === searchForm.status)
  }
  return list
}

// 后端管理员列表返回的扁平化/联表字段（真实姓名、手机号、角色代码、登录信息等），
// API 的 AdminUserListItem 未覆盖，此处以其为基础叠加可选额外字段。
type AdminRaw = AdminUserListItem & {
  real_name?: string
  phone?: string
  roleCode?: string
  roleName?: string
  role_name?: string
  lastLogin?: string
  last_login?: string
  login_count?: number | string
  created_at?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await permissionApi.admins({ page: 1, pageSize: 100 })
    localData.value = result.list.map((a: AdminRaw) => ({
      id: Number(a.id),
      username: a.username || '',
      real_name: a.realName || a.real_name || '',
      role: (a.role || a.roleCode || '') as string,
      role_name: (roleNameMap[(a.role || a.roleCode) as string] || a.roleName || a.role_name || a.role || '') as string,
      phone: a.phone || '',
      status: Number(a.status ?? 1),
      last_login: a.lastLogin || a.last_login || '-',
      login_count: Number(a.loginCount ?? a.login_count ?? 0),
      created_at: a.createdAt || a.created_at || ''
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
    tableData.value = result.list as AdminItem[]
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
  searchForm.username = ''
  searchForm.role = ''
  searchForm.status = ''
  page.currentPage = 1
  fetchData()
}

// ===== 新增/编辑 Dialog =====
const dialogVisible = ref(false)
const dialogMode = ref<'add' | 'edit'>('add')
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const adminForm = reactive({
  username: '',
  real_name: '',
  password: '',
  role: '',
  phone: ''
})

const formRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号', trigger: 'blur' }
  ]
}

function resetForm() {
  adminForm.username = ''
  adminForm.real_name = ''
  adminForm.password = ''
  adminForm.role = ''
  adminForm.phone = ''
  editingId.value = null
  formRef.value?.clearValidate()
}

function handleAdd() {
  dialogMode.value = 'add'
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: AdminItem) {
  dialogMode.value = 'edit'
  resetForm()
  editingId.value = row.id
  adminForm.username = row.username
  adminForm.real_name = row.real_name
  adminForm.role = row.role
  adminForm.phone = row.phone.replace(/[*]/g, '')
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    try {
      if (dialogMode.value === 'add') {
        await permissionApi.createAdmin({
          username: adminForm.username,
          password: adminForm.password,
          realName: adminForm.real_name,
          role: Number(adminForm.role) || 0,
          phone: adminForm.phone,
        })
        ElMessage.success(`管理员「${adminForm.username}」创建成功`)
      } else {
        await permissionApi.updateAdmin(editingId.value!, {
          realName: adminForm.real_name,
          role: Number(adminForm.role) || 0,
          phone: adminForm.phone,
        })
        ElMessage.success(`管理员信息已更新`)
      }
      dialogVisible.value = false
      fetchData()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  })
}

// ===== 重置密码 =====
async function handleResetPwd(row: AdminItem) {
  try {
    await ElMessageBox.confirm(
      `确定要重置管理员「${row.real_name}」(${row.username}) 的登录密码吗？重置后新密码将通过短信发送至其手机。`,
      '重置密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await permissionApi.resetAdminPassword(row.id, {})
    ElMessage.success(`已重置管理员「${row.username}」的密码，新密码已发送至 ${row.phone}`)
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

// ===== 启用/禁用 =====
async function handleToggleStatus(row: AdminItem, newVal: boolean) {
  const action = newVal ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}管理员「${row.real_name}」(${row.username}) 吗？${newVal ? '启用后该账号可正常登录。' : '禁用后该账号将无法登录系统。'}`,
      `${action}确认`,
      {
        confirmButtonText: `确定${action}`,
        cancelButtonText: '取消',
        type: newVal ? 'success' : 'warning'
      }
    )
    await permissionApi.updateAdmin(row.id, { status: newVal ? 1 : 0 })
    row.status = newVal ? 1 : 0
    ElMessage.success(`已${action}管理员「${row.username}」`)
  } catch (e: any) {
    // 用户取消或操作失败，不修改状态
    if (e?.message) ElMessage.error(e.message)
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
</style>
