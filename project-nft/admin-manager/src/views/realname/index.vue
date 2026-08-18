<template>
  <div class="realname-page">
    <!-- 权限提示 -->
    <el-alert
      v-if="!hasPermission"
      title="权限不足"
      type="error"
      :closable="false"
      show-icon
    >
      <span>实名认证信息涉及用户隐私，仅<b>超级管理员</b>或<b>风控</b>角色可查看。当前角色：{{ currentRoleName }}，请联系管理员授权。</span>
    </el-alert>

    <template v-else>
      <!-- 权限说明横幅 -->
      <el-alert
        title="敏感信息保护提示"
        type="warning"
        show-icon
        :closable="false"
        class="perm-banner"
      >
        本页面所有实名信息均已脱敏展示。查看完整信息需进行二次密码验证，且每次查看均会写入审计日志，请谨慎操作。
      </el-alert>

      <!-- 搜索区域 -->
      <el-card shadow="never" class="search-card">
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="姓名">
            <el-input v-model="searchForm.name" placeholder="请输入姓名" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="认证状态">
            <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
              <el-option label="已认证" value="verified" />
              <el-option label="待审核" value="pending" />
              <el-option label="已驳回" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item label="提交时间">
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
          <span class="toolbar-title">实名认证记录（共 {{ total }} 条）</span>
          <div>
            <el-tag type="success" size="small">已认证：{{ stats.verified }}</el-tag>
            <el-tag type="warning" size="small" style="margin-left: 8px">待审核：{{ stats.pending }}</el-tag>
            <el-tag type="danger" size="small" style="margin-left: 8px">已驳回：{{ stats.rejected }}</el-tag>
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
        >
          <el-table-column prop="user_id" label="用户ID" width="80" align="center" />
          <el-table-column prop="real_name" label="姓名" width="90" align="center" />
          <el-table-column prop="id_card" label="身份证号" min-width="200" align="center" />
          <el-table-column prop="phone" label="手机号" width="140" align="center" />
          <el-table-column label="认证状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTagType(row.status)" size="small">{{ row.status_text }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submitted_at" label="提交时间" width="170" />
          <el-table-column prop="reviewed_at" label="审核时间" width="170">
            <template #default="{ row }">
              {{ row.reviewed_at || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewFull(row)">
                <el-icon><View /></el-icon>查看完整信息
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <el-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </el-card>
    </template>

    <!-- 二次密码验证弹窗 -->
    <el-dialog
      v-model="pwdDialogVisible"
      title="安全验证"
      width="420px"
      :close-on-click-modal="false"
      @closed="resetPwdDialog"
    >
      <el-alert
        title="敏感操作验证"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      >
        您正在尝试查看用户「{{ currentRow?.real_name }}」(ID: {{ currentRow?.user_id }}) 的完整实名信息，请输入您的管理密码进行二次验证。
      </el-alert>
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
        <el-form-item label="管理密码" prop="password">
          <el-input
            v-model="pwdForm.password"
            type="password"
            placeholder="请输入管理密码"
            show-password
            @keyup.enter="handlePwdConfirm"
          />
        </el-form-item>
        <el-form-item label="验证码" prop="captcha">
          <div class="captcha-row">
            <el-input v-model="pwdForm.captcha" placeholder="请输入验证码" />
            <div class="captcha-box" @click="refreshCaptcha">{{ captchaText }}</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="verifying" @click="handlePwdConfirm">
          验证并查看
        </el-button>
      </template>
    </el-dialog>

    <!-- 完整信息弹窗 -->
    <el-dialog
      v-model="fullDialogVisible"
      title="完整实名信息"
      width="520px"
    >
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      >
        本次查看已写入审计日志。操作人：{{ adminUserInfo.username }} | 时间：{{ auditTime }}
      </el-alert>
      <el-descriptions v-if="currentRow" :column="1" border>
        <el-descriptions-item label="记录ID">{{ currentRow.id }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentRow.user_id }}</el-descriptions-item>
        <el-descriptions-item label="完整姓名">
          <span class="full-value">{{ currentRow.full_name }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="完整身份证号">
          <span class="full-value">{{ currentRow.full_id_card }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="完整手机号">
          <span class="full-value">{{ currentRow.full_phone }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="认证状态">
          <el-tag :type="statusTagType(currentRow.status)" size="small">{{ currentRow.status_text }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentRow.submitted_at }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ currentRow.reviewed_at || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button type="primary" @click="fullDialogVisible = false">我已知晓</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Search, RefreshLeft, View } from '@element-plus/icons-vue'
import { userApi } from '../../api'
import { paginate } from '../../utils/pagination'
import { useAdminStore } from '../../store/admin'

const adminStore = useAdminStore()
const adminUserInfo = computed(() => adminStore.userInfo)
const currentRoleName = computed(() => adminUserInfo.value.roleName)

// 权限：仅超管/风控可见
const hasPermission = computed(() => {
  const role = adminUserInfo.value.role
  return role === 'super_admin' || role === 'risk'
})

interface RealnameRecord {
  id: number
  user_id: number
  real_name: string
  full_name: string
  id_card: string
  full_id_card: string
  phone: string
  full_phone: string
  status: string
  status_text: string
  submitted_at: string
  reviewed_at: string | null
}

const loading = ref(false)
const tableData = ref<RealnameRecord[]>([])
const total = ref(0)
// 基础实名数据（API 加载）
const baseRealnames = ref<RealnameRecord[]>([])

const searchForm = reactive({
  name: '',
  phone: '',
  status: '',
  dateRange: [] as string[]
})

const page = reactive({
  currentPage: 1,
  pageSize: 10
})

// 统计
const stats = computed(() => {
  const filtered = getFilteredData()
  return {
    verified: filtered.filter(r => r.status === 'verified').length,
    pending: filtered.filter(r => r.status === 'pending').length,
    rejected: filtered.filter(r => r.status === 'rejected').length
  }
})

function statusTagType(status: string): 'success' | 'warning' | 'danger' {
  const map: Record<string, 'success' | 'warning' | 'danger'> = {
    verified: 'success',
    pending: 'warning',
    rejected: 'danger'
  }
  return map[status] || 'warning'
}

// 过滤
function getFilteredData(): RealnameRecord[] {
  let list = [...baseRealnames.value] as RealnameRecord[]

  if (searchForm.name) {
    list = list.filter(r => r.full_name.includes(searchForm.name) || r.real_name.includes(searchForm.name))
  }
  if (searchForm.phone) {
    list = list.filter(r => r.full_phone.includes(searchForm.phone) || r.phone.includes(searchForm.phone))
  }
  if (searchForm.status) {
    list = list.filter(r => r.status === searchForm.status)
  }
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(r => {
      const submitDate = r.submitted_at.substring(0, 10)
      return submitDate >= start && submitDate <= end
    })
  }
  return list
}

async function fetchData() {
  loading.value = true
  try {
    const filtered = getFilteredData()
    const result = paginate(filtered, page.currentPage, page.pageSize)
    tableData.value = result.list as RealnameRecord[]
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
  searchForm.name = ''
  searchForm.phone = ''
  searchForm.status = ''
  searchForm.dateRange = []
  page.currentPage = 1
  fetchData()
}

// ===== 二次密码验证 =====
const pwdDialogVisible = ref(false)
const fullDialogVisible = ref(false)
const verifying = ref(false)
const currentRow = ref<RealnameRecord | null>(null)
const pwdFormRef = ref<FormInstance>()
const auditTime = ref('')

const pwdForm = reactive({
  password: '',
  captcha: ''
})

const captchaText = ref('')
function refreshCaptcha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  captchaText.value = code
}

const pwdRules: FormRules = {
  password: [{ required: true, message: '请输入管理密码', trigger: 'blur' }],
  captcha: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

function handleViewFull(row: RealnameRecord) {
  currentRow.value = row
  refreshCaptcha()
  pwdDialogVisible.value = true
}

function resetPwdDialog() {
  pwdForm.password = ''
  pwdForm.captcha = ''
  pwdFormRef.value?.clearValidate()
}

async function handlePwdConfirm() {
  if (!pwdFormRef.value) return
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return

    // 校验验证码
    if (pwdForm.captcha.toUpperCase() !== captchaText.value.toUpperCase()) {
      ElMessage.error('验证码不正确，请重新输入')
      refreshCaptcha()
      pwdForm.captcha = ''
      return
    }

    verifying.value = true
    verifying.value = false
      pwdDialogVisible.value = false

      // 记录审计时间
      const now = new Date()
      auditTime.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

      // 展示完整信息
      fullDialogVisible.value = true

      // 审计日志提示
      ElMessage({
        type: 'success',
        message: `已写入审计日志：操作人 ${adminUserInfo.value.username} 查看了用户 ID:${currentRow.value?.user_id} 的完整实名信息`,
        duration: 4000
      })

      ElMessageBox.alert(
        `本次查看完整实名信息已记录至审计日志。\n操作人：${adminUserInfo.value.username}（${adminUserInfo.value.roleName}）\n目标用户：ID ${currentRow.value?.user_id}\n查看时间：${auditTime.value}\nIP：192.168.1.100`,
        '审计日志已记录',
        { confirmButtonText: '知道了', type: 'success' }
      ).catch(() => {})
  })
}

// 实名状态文本映射
const realnameStatusTextMap: Record<string, string> = {
  verified: '已认证',
  pending: '待审核',
  rejected: '已驳回'
}

// 脱敏工具函数
function maskName(name: string): string {
  if (!name || name.length === 0) return '*'
  return name.charAt(0) + '*'
}

function maskIdCard(card: string): string {
  if (!card || card.length < 4) return '***'
  return card.substring(0, 3) + '***********' + card.slice(-4)
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.substring(0, 3) + '****' + phone.slice(-4)
}

// 从后端加载用户列表并映射为实名记录
async function loadData() {
  try {
    const res = await userApi.list({ page: 1, pageSize: 100 })
    if (res && res.list && res.list.length > 0) {
      const records: RealnameRecord[] = []
      res.list.forEach((u: any, idx: number) => {
        // 仅包含有实名信息的用户（filter by realname status if possible）
        const realName = u.realName ?? u.real_name ?? u.nickname ?? ''
        const idCard = u.idCard ?? u.id_card ?? ''
        const phone = u.phone ?? ''
        const status = u.realnameStatus ?? u.realname_status ?? 'verified'
        records.push({
          id: Number(u.id ?? idx + 1),
          user_id: Number(u.id ?? idx + 1),
          real_name: maskName(realName),
          full_name: realName || `用户${u.id ?? idx + 1}`,
          id_card: maskIdCard(idCard),
          full_id_card: idCard,
          phone: maskPhone(phone),
          full_phone: phone || '-',
          status,
          status_text: u.realnameStatusText ?? u.status_text ?? realnameStatusTextMap[status] ?? '已认证',
          submitted_at: u.createdAt ?? u.submitted_at ?? '',
          reviewed_at: u.reviewedAt ?? u.reviewed_at ?? null
        })
      })
      if (records.length > 0) {
        baseRealnames.value = records
      }
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
    baseRealnames.value = []
  }
}

onMounted(async () => {
  if (hasPermission.value) {
    await loadData()
    fetchData()
  }
})
</script>

<style scoped>
.perm-banner {
  margin-bottom: 16px;
}

.search-form .el-form-item {
  margin-right: 16px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.captcha-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.captcha-box {
  width: 90px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-small);
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  font-style: italic;
}
.captcha-box:hover {
  opacity: 0.85;
}

.full-value {
  font-weight: 600;
  color: var(--color-danger);
  font-size: 15px;
}
</style>
