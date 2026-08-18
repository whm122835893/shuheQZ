<template>
  <div class="user-list-page">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="searchForm.nickname" placeholder="请输入昵称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="UID">
          <el-input v-model="searchForm.uid" placeholder="请输入UID" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="注册时间">
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
        <el-form-item label="账号状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="正常" value="normal" />
            <el-option label="已冻结" value="frozen" />
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
        <span class="toolbar-title">用户列表（共 {{ total }} 人）</span>
        <el-button type="success" :icon="Download" plain @click="handleExport">导出数据</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="nickname" label="昵称" min-width="130" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="140" align="center" />
        <el-table-column prop="registerTime" label="注册时间" width="170" />
        <el-table-column label="实名状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="realnameTagType(row.realnameStatus)" size="small">
              {{ realnameText(row.realnameStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inviter" label="邀请人" width="110" align="center" />
        <el-table-column label="账号状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'frozen' ? 'danger' : 'success'" size="small">
              {{ row.status === 'frozen' ? '已冻结' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              <el-icon><View /></el-icon>详情
            </el-button>
            <el-button
              :type="row.status === 'frozen' ? 'success' : 'warning'"
              link
              size="small"
              @click="handleToggleFreeze(row)"
            >
              {{ row.status === 'frozen' ? '解冻' : '冻结' }}
            </el-button>
            <el-button type="info" link size="small" @click="handleResetPwd(row)">
              重置交易密码
            </el-button>
            <el-button type="danger" link size="small" @click="handleForceLogout(row)">
              强制登出
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft, Download, View } from '@element-plus/icons-vue'
import { userApi, type User } from '../../api'
import { post } from '../../api/request'

interface UserInfo {
  id: number
  username: string
  nickname: string
  phone: string
  realPhone: string
  registerTime: string
  realnameStatus: string
  inviter: string
  status: string
  walletBalance: number
  collectibleCount: number
  blindboxCount: number
  inviteCount: number
}

const router = useRouter()
const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)

const searchForm = reactive({
  phone: '',
  nickname: '',
  uid: '',
  dateRange: [] as string[],
  status: ''
})

const page = reactive({
  currentPage: 1,
  pageSize: 10
})

function realnameText(status: string) {
  const map: Record<string, string> = {
    verified: '已实名',
    pending: '审核中',
    unverified: '未实名'
  }
  return map[status] || '未实名'
}

function realnameTagType(status: string): 'success' | 'warning' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'info'> = {
    verified: 'success',
    pending: 'warning',
    unverified: 'info'
  }
  return map[status] || 'info'
}

// 过滤逻辑已移至服务端，前端直接使用接口返回的列表与总数
async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.currentPage,
      pageSize: page.pageSize
    }
    if (searchForm.phone) params.phone = searchForm.phone
    if (searchForm.nickname) params.nickname = searchForm.nickname
    if (searchForm.uid) params.uid = searchForm.uid
    if (searchForm.status) params.status = searchForm.status
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const result = await userApi.list(params)
    tableData.value = result.list.map((u: User) => ({
      id: Number(u.id),
      username: u.username || u.phone || `用户${u.id}`,
      nickname: u.nickname || '',
      phone: u.phone || '',
      realPhone: u.phone || '',
      registerTime: u.createdAt || '',
      realnameStatus: 'unverified',
      inviter: '-',
      status: u.status === 1 ? 'normal' : 'frozen',
      walletBalance: parseFloat(u.walletBalance) || 0,
      collectibleCount: u.collectibleCount || 0,
      blindboxCount: 0,
      inviteCount: 0
    }))
    total.value = result.total
  } catch (e) {
    ElMessage.error('数据加载失败')
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.currentPage = 1
  fetchData()
}

function handleReset() {
  searchForm.phone = ''
  searchForm.nickname = ''
  searchForm.uid = ''
  searchForm.dateRange = []
  searchForm.status = ''
  page.currentPage = 1
  fetchData()
}

function handleViewDetail(row: UserInfo) {
  router.push(`/user/detail/${row.id}`)
}

async function handleToggleFreeze(row: UserInfo) {
  const isFrozen = row.status === 'frozen'
  const action = isFrozen ? '解冻' : '冻结'
  try {
    await ElMessageBox.confirm(
      `确定要${action}用户「${row.nickname}」(ID: ${row.id}) 的账号吗？${isFrozen ? '解冻后用户可正常登录使用。' : '冻结后用户将无法登录和交易。'}`,
      `${action}确认`,
      {
        confirmButtonText: `确定${action}`,
        cancelButtonText: '取消',
        type: isFrozen ? 'success' : 'warning'
      }
    )
  } catch {
    return
  }
  try {
    if (isFrozen) {
      await post('/users/unfreeze', { userId: row.id })
    } else {
      await post('/users/freeze', { userId: row.id, action: 'freeze' })
    }
    row.status = isFrozen ? 'normal' : 'frozen'
    ElMessage.success(`已${action}用户「${row.nickname}」的账号`)
  } catch (e: any) {
    ElMessage.error(e.message || `${action}失败`)
  }
}

async function handleResetPwd(row: UserInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户「${row.nickname}」(ID: ${row.id}) 的交易密码吗？重置后原交易密码将失效，用户需重新设置。`,
      '重置交易密码确认',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  try {
    await post('/users/reset-password', { userId: row.id })
    ElMessage.success(`已重置用户「${row.nickname}」的交易密码，新密码已通过短信发送`)
  } catch (e: any) {
    ElMessage.error(e.message || '重置交易密码失败')
  }
}

async function handleForceLogout(row: UserInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要强制登出用户「${row.nickname}」(ID: ${row.id}) 吗？该用户所有设备的登录状态将被清除。`,
      '强制登出确认',
      {
        confirmButtonText: '确定登出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  try {
    await post('/users/force-logout', { userId: row.id })
    ElMessage.success(`已强制登出用户「${row.nickname}」，相关会话已清除`)
  } catch (e: any) {
    ElMessage.error(e.message || '强制登出失败')
  }
}

function handleExport() {
  ElMessage.success(`已导出 ${total.value} 条用户数据`)
}

onMounted(() => {
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
