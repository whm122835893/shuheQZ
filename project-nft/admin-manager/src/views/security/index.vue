<template>
  <div class="security-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- ============ 黑名单 ============ -->
      <el-tab-pane name="blacklist">
        <template #label>
          <span><el-icon><CircleClose /></el-icon> 黑名单</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">黑名单列表（共 {{ blacklist.length }} 条）</span>
          <el-button type="danger" :icon="Plus" @click="openBlacklistDialog">加入黑名单</el-button>
        </div>
        <el-table :data="pagedBlacklist" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="user" label="用户" min-width="130" show-overflow-tooltip />
          <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="operator" label="操作人" width="120" align="center" />
          <el-table-column prop="expire_at" label="过期时间" width="180" />
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'danger' : 'info'" size="small">
                {{ row.status === 'active' ? '生效中' : '已过期' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link size="small" @click="handleRemoveBlacklist(row)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="pageMap.blacklist"
          :page-size="10"
          :total="blacklist.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>

      <!-- ============ 风控告警 ============ -->
      <el-tab-pane name="alert">
        <template #label>
          <span><el-icon><WarningFilled /></el-icon> 风控告警</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">风控告警列表（共 {{ riskAlerts.length }} 条）</span>
          <el-tag type="danger">待处理 {{ alertPendingCount }}</el-tag>
        </div>
        <el-table :data="pagedAlerts" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="type" label="告警类型" width="140">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="user" label="用户" min-width="130" show-overflow-tooltip />
          <el-table-column prop="desc" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="严重程度" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="severityTag(row.severity)" size="small" effect="dark">
                {{ severityText(row.severity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'pending' ? 'warning' : 'success'" size="small">
                {{ row.status === 'pending' ? '待处理' : '已处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button
                type="primary"
                link
                size="small"
                :disabled="row.status !== 'pending'"
                @click="openAlertDialog(row)"
              >
                处理
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="pageMap.alert"
          :page-size="10"
          :total="riskAlerts.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>

      <!-- ============ 安全事件 ============ -->
      <el-tab-pane name="event">
        <template #label>
          <span><el-icon><Monitor /></el-icon> 安全事件</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">安全事件列表（共 {{ securityEvents.length }} 条）</span>
        </div>
        <el-table :data="pagedEvents" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="type" label="事件类型" width="140">
            <template #default="{ row }">
              <el-tag :type="eventTag(row.type)" size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="user" label="用户" min-width="120" show-overflow-tooltip />
          <el-table-column prop="ip" label="IP" width="140" />
          <el-table-column prop="ua" label="User-Agent" min-width="200" show-overflow-tooltip />
          <el-table-column prop="desc" label="描述" min-width="180" show-overflow-tooltip />
          <el-table-column prop="handler" label="处理人" width="110" align="center" />
          <el-table-column prop="handle_time" label="处理时间" width="180" />
        </el-table>
        <el-pagination
          v-model:current-page="pageMap.event"
          :page-size="10"
          :total="securityEvents.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>

      <!-- ============ 交易密码锁定 ============ -->
      <el-tab-pane name="pwdLock">
        <template #label>
          <span><el-icon><Lock /></el-icon> 交易密码锁定</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">交易密码锁定列表（共 {{ pwdLocks.length }} 条）</span>
          <el-tag type="danger">锁定中 {{ pwdLockActiveCount }}</el-tag>
        </div>
        <el-table :data="pagedPwdLocks" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="user" label="用户" min-width="130" show-overflow-tooltip />
          <el-table-column prop="reason" label="锁定原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="lock_time" label="锁定时间" width="180" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'locked' ? 'danger' : 'success'" size="small">
                {{ row.status === 'locked' ? '锁定中' : '已解锁' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button
                type="success"
                link
                size="small"
                :disabled="row.status !== 'locked'"
                @click="handleUnlockPwd(row)"
              >
                手动解锁
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="pageMap.pwdLock"
          :page-size="10"
          :total="pwdLocks.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>

      <!-- ============ 敏感操作审批 ============ -->
      <el-tab-pane name="approval">
        <template #label>
          <span><el-icon><Checked /></el-icon> 敏感操作审批</span>
        </template>
        <div class="tab-toolbar">
          <span class="toolbar-title">敏感操作审批列表（共 {{ approvals.length }} 条）</span>
          <el-tag type="warning">待审批 {{ approvalPendingCount }}</el-tag>
        </div>
        <el-table :data="pagedApprovals" border stripe>
          <el-table-column prop="id" label="ID" width="70" align="center" />
          <el-table-column prop="type" label="操作类型" width="160">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" type="warning">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="target" label="目标" min-width="160" show-overflow-tooltip />
          <el-table-column prop="initiator" label="发起人" width="120" align="center" />
          <el-table-column prop="approver" label="审批人" width="120" align="center" />
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="approvalTag(row.status)" size="small">{{ approvalText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <template v-if="row.status === 'pending'">
                <el-button type="success" link size="small" @click="handleApproval(row, 'approved')">通过</el-button>
                <el-button type="danger" link size="small" @click="handleApproval(row, 'rejected')">拒绝</el-button>
              </template>
              <span v-else class="text-muted">已处理</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="pageMap.approval"
          :page-size="10"
          :total="approvals.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 加入黑名单 Dialog -->
    <el-dialog v-model="blacklistDialogVisible" title="加入黑名单" width="480px" :close-on-click-modal="false">
      <el-form ref="blacklistFormRef" :model="blacklistForm" :rules="blacklistRules" label-width="90px">
        <el-form-item label="用户" prop="user">
          <el-input v-model="blacklistForm.user" placeholder="请输入用户名/手机号/UID" />
        </el-form-item>
        <el-form-item label="原因" prop="reason">
          <el-input v-model="blacklistForm.reason" type="textarea" :rows="3" placeholder="请输入拉黑原因" />
        </el-form-item>
        <el-form-item label="过期时间" prop="expire_at">
          <el-date-picker
            v-model="blacklistForm.expire_at"
            type="datetime"
            placeholder="选择过期时间（留空为永久）"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blacklistDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleAddBlacklist">确认拉黑</el-button>
      </template>
    </el-dialog>

    <!-- 处理告警 Dialog -->
    <el-dialog v-model="alertDialogVisible" title="处理风控告警" width="480px" :close-on-click-modal="false">
      <template v-if="alertRow">
        <el-descriptions :column="1" border size="small" class="alert-desc">
          <el-descriptions-item label="告警类型">{{ alertRow.type }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ alertRow.user }}</el-descriptions-item>
          <el-descriptions-item label="描述">{{ alertRow.desc }}</el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="severityTag(alertRow.severity)" size="small" effect="dark">
              {{ severityText(alertRow.severity) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <el-form class="alert-form">
          <el-form-item label="处理意见">
            <el-input v-model="alertOpinion" type="textarea" :rows="4" placeholder="请输入处理意见和结果" />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="alertDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAlertProcess">提交处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus, CircleClose, WarningFilled, Monitor, Lock, Checked
} from '@element-plus/icons-vue'
import {
  securityApi,
  type Blacklist as ApiBlacklist,
  type RiskAlert as ApiRiskAlert,
  type SecurityEvent as ApiSecurityEvent,
  type Approval as ApiApproval
} from '../../api'

// ============ 黑名单数据 ============
interface BlacklistItem {
  id: number
  user: string
  reason: string
  operator: string
  expire_at: string
  status: 'active' | 'expired'
}

const blacklist = ref<BlacklistItem[]>([])

const pageMap = reactive({
  blacklist: 1,
  alert: 1,
  event: 1,
  pwdLock: 1,
  approval: 1
})

const activeTab = ref('blacklist')

function slicePage<T>(list: T[], page: number, size = 10): T[] {
  const start = (page - 1) * size
  return list.slice(start, start + size)
}

const pagedBlacklist = computed(() => slicePage(blacklist.value, pageMap.blacklist))

const blacklistDialogVisible = ref(false)
const blacklistFormRef = ref<FormInstance>()
const blacklistForm = reactive({
  user: '',
  reason: '',
  expire_at: ''
})
const blacklistRules: FormRules = {
  user: [{ required: true, message: '请输入用户', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入拉黑原因', trigger: 'blur' }]
}

function openBlacklistDialog() {
  blacklistForm.user = ''
  blacklistForm.reason = ''
  blacklistForm.expire_at = ''
  blacklistFormRef.value?.clearValidate()
  blacklistDialogVisible.value = true
}

async function handleAddBlacklist() {
  if (!blacklistFormRef.value) return
  blacklistFormRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      const res = await securityApi.blacklistAdd({
        type: 1,
        target: blacklistForm.user,
        reason: blacklistForm.reason,
        expiredAt: blacklistForm.expire_at || undefined
      })
      const newId = (res as any)?.id || Date.now()
      blacklist.value.unshift({
        id: newId,
        user: blacklistForm.user,
        reason: blacklistForm.reason,
        operator: '当前管理员',
        expire_at: blacklistForm.expire_at || '永久',
        status: 'active'
      })
      ElMessage.success(`已将「${blacklistForm.user}」加入黑名单`)
      blacklistDialogVisible.value = false
      pageMap.blacklist = 1
    } catch (e: any) {
      ElMessage.error(e?.message || '加入黑名单失败')
    }
  })
}

async function handleRemoveBlacklist(row: BlacklistItem) {
  try {
    await ElMessageBox.confirm(
      `确定要将「${row.user}」从黑名单中移除吗？移除后该用户可恢复正常使用。`,
      '移除黑名单确认',
      { confirmButtonText: '确定移除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await securityApi.blacklistRemove(row.id)
    blacklist.value = blacklist.value.filter(b => b.id !== row.id)
    ElMessage.success(`已将「${row.user}」移出黑名单`)
  } catch (e: any) {
    ElMessage.error(e?.message || '移除黑名单失败')
  }
}

// ============ 风控告警数据 ============
interface RiskAlert {
  id: number
  type: string
  user: string
  desc: string
  severity: 'high' | 'medium' | 'low'
  status: 'pending' | 'processed'
}

const riskAlerts = ref<RiskAlert[]>([])

const alertPendingCount = computed(() => riskAlerts.value.filter(a => a.status === 'pending').length)
const pagedAlerts = computed(() => slicePage(riskAlerts.value, pageMap.alert))

function severityText(s: string) {
  return s === 'high' ? '严重' : s === 'medium' ? '中等' : '低'
}
function severityTag(s: string): 'danger' | 'warning' | 'info' {
  return s === 'high' ? 'danger' : s === 'medium' ? 'warning' : 'info'
}

const alertDialogVisible = ref(false)
const alertRow = ref<RiskAlert | null>(null)
const alertOpinion = ref('')

function openAlertDialog(row: RiskAlert) {
  alertRow.value = row
  alertOpinion.value = ''
  alertDialogVisible.value = true
}

function handleAlertProcess() {
  if (!alertOpinion.value.trim()) {
    ElMessage.warning('请输入处理意见')
    return
  }
  if (alertRow.value) {
    alertRow.value.status = 'processed'
    ElMessage.success(`告警 #${alertRow.value.id} 已处理`)
  }
  alertDialogVisible.value = false
}

// ============ 安全事件数据 ============
interface SecurityEvent {
  id: number
  type: string
  user: string
  ip: string
  ua: string
  desc: string
  handler: string
  handle_time: string
}

const securityEvents = ref<SecurityEvent[]>([])

const pagedEvents = computed(() => slicePage(securityEvents.value, pageMap.event))

function eventTag(type: string): 'danger' | 'warning' | 'info' {
  if (['SQL注入', 'XSS攻击', 'DDoS'].includes(type)) return 'danger'
  if (['暴力破解', '撞库攻击', '越权访问'].includes(type)) return 'warning'
  return 'info'
}

// ============ 交易密码锁定数据 ============
interface PwdLock {
  id: number
  user: string
  reason: string
  lock_time: string
  status: 'locked' | 'unlocked'
}

const pwdLocks = ref<PwdLock[]>([
  { id: 1, user: '用户0005', reason: '连续输错交易密码 5 次', lock_time: '2026-08-13 10:15:00', status: 'locked' },
  { id: 2, user: '用户0011', reason: '连续输错交易密码 5 次', lock_time: '2026-08-13 08:40:00', status: 'locked' },
  { id: 3, user: '用户0019', reason: '异地异常操作触发风控锁定', lock_time: '2026-08-12 19:20:00', status: 'locked' },
  { id: 4, user: '用户0024', reason: '连续输错交易密码 5 次', lock_time: '2026-08-12 14:05:00', status: 'unlocked' },
  { id: 5, user: '用户0033', reason: '安全事件触发临时锁定', lock_time: '2026-08-12 11:30:00', status: 'locked' },
  { id: 6, user: '用户0040', reason: '连续输错交易密码 5 次', lock_time: '2026-08-11 20:50:00', status: 'unlocked' },
  { id: 7, user: '用户0047', reason: '设备指纹异常触发锁定', lock_time: '2026-08-11 16:15:00', status: 'locked' },
  { id: 8, user: '用户0053', reason: '连续输错交易密码 5 次', lock_time: '2026-08-11 09:25:00', status: 'unlocked' },
  { id: 9, user: '用户0056', reason: '异地异常操作触发风控锁定', lock_time: '2026-08-10 22:10:00', status: 'locked' },
  { id: 10, user: '用户0059', reason: '连续输错交易密码 5 次', lock_time: '2026-08-10 15:35:00', status: 'unlocked' }
])

const pwdLockActiveCount = computed(() => pwdLocks.value.filter(p => p.status === 'locked').length)
const pagedPwdLocks = computed(() => slicePage(pwdLocks.value, pageMap.pwdLock))

function handleUnlockPwd(row: PwdLock) {
  ElMessageBox.confirm(
    `确定要手动解锁用户「${row.user}」的交易密码吗？解锁后用户可立即重置并使用交易密码。`,
    '手动解锁确认',
    { confirmButtonText: '确定解锁', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      row.status = 'unlocked'
      ElMessage.success(`已解锁用户「${row.user}」的交易密码`)
    })
    .catch(() => {})
}

// ============ 敏感操作审批数据 ============
interface Approval {
  id: number
  type: string
  target: string
  initiator: string
  approver: string
  status: 'pending' | 'approved' | 'rejected'
}

const approvals = ref<Approval[]>([])

const approvalPendingCount = computed(() => approvals.value.filter(a => a.status === 'pending').length)
const pagedApprovals = computed(() => slicePage(approvals.value, pageMap.approval))

function approvalText(s: string) {
  return s === 'pending' ? '待审批' : s === 'approved' ? '已通过' : '已拒绝'
}
function approvalTag(s: string): 'warning' | 'success' | 'danger' {
  return s === 'pending' ? 'warning' : s === 'approved' ? 'success' : 'danger'
}

function handleApproval(row: Approval, action: 'approved' | 'rejected') {
  const text = action === 'approved' ? '通过' : '拒绝'
  ElMessageBox.confirm(
    `确定要${text}「${row.type}」审批申请吗？\n目标：${row.target}\n发起人：${row.initiator}`,
    `${text}审批确认`,
    { confirmButtonText: `确定${text}`, cancelButtonText: '取消', type: action === 'approved' ? 'success' : 'warning' }
  )
    .then(() => {
      row.status = action
      row.approver = '当前管理员'
      ElMessage.success(`已${text}「${row.type}」审批申请`)
    })
    .catch(() => {})
}

// 后端返回的扁平化/联表字段，API 类型未完全覆盖，此处叠加可选额外字段。
type BlacklistRaw = ApiBlacklist & {
  adminName?: string
  operator?: string
  username?: string
  user?: string
  expire_at?: string
}

type RiskAlertRaw = ApiRiskAlert & {
  username?: string
  user?: string
  desc?: string
  severity?: string
}

type SecurityEventRaw = ApiSecurityEvent & {
  user?: string
  username?: string
  ua?: string
  desc?: string
  description?: string
  handler?: string
  handleTime?: string
  handle_time?: string
}

type ApprovalRaw = ApiApproval & {
  target?: string
  initiator?: string
  approver?: string
}

const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [blacklistRes, alertRes, eventRes, approvalRes] = await Promise.all([
      securityApi.blacklist({ page: 1, pageSize: 100 }),
      securityApi.riskAlerts({ page: 1, pageSize: 100 }),
      securityApi.events({ page: 1, pageSize: 100 }),
      securityApi.approvals({ page: 1, pageSize: 100 })
    ])

    // 黑名单
    blacklist.value = blacklistRes.list.map((b: BlacklistRaw) => ({
      id: Number(b.id),
      user: b.user || b.username || b.target || '',
      reason: b.reason || '',
      operator: b.operator || b.adminName || (b.adminId ? String(b.adminId) : '-'),
      expire_at: b.expire_at || b.expiredAt || '永久',
      status: (b.status as any) === 1 || (b.status as any) === 'active' ? 'active' : 'expired'
    }))

    // 风控告警
    riskAlerts.value = alertRes.list.map((a: RiskAlertRaw) => {
      const severity = a.severity || (a.level === 3 ? 'high' : a.level === 2 ? 'medium' : 'low')
      return {
        id: Number(a.id),
        type: a.type || '',
        user: a.user || a.username || (a.userId ? String(a.userId) : '-'),
        desc: a.desc || a.description || '',
        severity: severity as 'high' | 'medium' | 'low',
        status: (a.status as any) === 0 || (a.status as any) === 'pending' ? 'pending' : 'processed'
      }
    })

    // 安全事件
    securityEvents.value = eventRes.list.map((e: SecurityEventRaw) => ({
      id: Number(e.id),
      type: e.type || '',
      user: e.user || e.username || (e.userId ? String(e.userId) : '-'),
      ip: e.ip || '',
      ua: e.ua || e.userAgent || '',
      desc: e.desc || e.description || '',
      handler: e.handler || '',
      handle_time: e.handleTime || e.handle_time || ''
    }))

    // 敏感操作审批
    approvals.value = approvalRes.list.map((p: ApprovalRaw) => {
      const statusNum = typeof p.status === 'number' ? p.status : 0
      const status = statusNum === 1 ? 'approved' : statusNum === 2 ? 'rejected' : 'pending'
      return {
        id: Number(p.id),
        type: p.type || '',
        target: p.target || `${p.targetType || ''} #${p.targetId || ''}`,
        initiator: p.initiator || p.applicantName || (p.applicantId ? String(p.applicantId) : '-'),
        approver: p.approver || p.handlerName || (p.handlerId ? String(p.handlerId) : '-'),
        status: status as 'pending' | 'approved' | 'rejected'
      }
    })
  } catch (e) {
    ElMessage.error('安全数据加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.security-page {
  display: flex;
  flex-direction: column;
}
.tab-toolbar {
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
.text-muted {
  color: var(--text-placeholder);
  font-size: 12px;
}
.alert-desc {
  margin-bottom: 16px;
}
.alert-form {
  margin-top: 8px;
}
</style>
