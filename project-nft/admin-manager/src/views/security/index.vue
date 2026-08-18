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
import { securityApi, type SecurityEvent as ApiSecurityEvent } from '../../api'

// ============ 黑名单数据 ============
interface BlacklistItem {
  id: number
  user: string
  reason: string
  operator: string
  expire_at: string
  status: 'active' | 'expired'
}

const blacklist = ref<BlacklistItem[]>([
  { id: 1, user: '用户0012', reason: '恶意刷单，频繁发起退款', operator: '风控赵六', expire_at: '2026-12-31 23:59:59', status: 'active' },
  { id: 2, user: '用户0028', reason: '虚假交易，利用市场套利', operator: 'admin', expire_at: '2026-09-30 23:59:59', status: 'active' },
  { id: 3, user: '138****1234', reason: '批量注册小号', operator: '风控赵六', expire_at: '2026-08-20 23:59:59', status: 'active' },
  { id: 4, user: '用户0035', reason: '转赠洗钱嫌疑', operator: 'admin', expire_at: '2026-06-30 23:59:59', status: 'expired' },
  { id: 5, user: '用户0042', reason: '使用外挂抢单', operator: '风控赵六', expire_at: '永久', status: 'active' },
  { id: 6, user: '139****5678', reason: '薅羊毛，批量领取空投', operator: 'risk01', expire_at: '2026-10-15 23:59:59', status: 'active' },
  { id: 7, user: '用户0051', reason: '发布违规言论', operator: 'service01', expire_at: '2026-08-25 23:59:59', status: 'active' },
  { id: 8, user: '用户0058', reason: '冒用他人实名信息', operator: 'admin', expire_at: '2026-05-30 23:59:59', status: 'expired' },
  { id: 9, user: '137****9999', reason: '异常登录，多IP频繁切换', operator: '风控赵六', expire_at: '2026-09-10 23:59:59', status: 'active' },
  { id: 10, user: '用户0060', reason: '恶意举报他人', operator: 'service02', expire_at: '2026-08-18 23:59:59', status: 'active' },
  { id: 11, user: '用户0063', reason: '利用漏洞重复领取奖励', operator: 'admin', expire_at: '永久', status: 'active' },
  { id: 12, user: '135****3333', reason: '虚假实名认证', operator: '风控赵六', expire_at: '2026-11-01 23:59:59', status: 'active' }
])

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

function handleAddBlacklist() {
  blacklistFormRef.value?.validate((valid) => {
    if (!valid) return
    const newId = Math.max(...blacklist.value.map(b => b.id), 0) + 1
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
  })
}

function handleRemoveBlacklist(row: BlacklistItem) {
  ElMessageBox.confirm(
    `确定要将「${row.user}」从黑名单中移除吗？移除后该用户可恢复正常使用。`,
    '移除黑名单确认',
    { confirmButtonText: '确定移除', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      blacklist.value = blacklist.value.filter(b => b.id !== row.id)
      ElMessage.success(`已将「${row.user}」移出黑名单`)
    })
    .catch(() => {})
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

const riskAlerts = ref<RiskAlert[]>([
  { id: 1, type: '高频交易', user: '用户0007', desc: '1分钟内发起 15 笔交易，触发频率限制', severity: 'high', status: 'pending' },
  { id: 2, type: '异地登录', user: '用户0015', desc: '账号在北京登录后5分钟内在广州登录', severity: 'medium', status: 'pending' },
  { id: 3, type: '异常转赠', user: '用户0023', desc: '短时间内向 5 个不同账号转赠藏品', severity: 'high', status: 'pending' },
  { id: 4, type: '提现异常', user: '用户0031', desc: '单日提现金额超过 50000 元', severity: 'high', status: 'pending' },
  { id: 5, type: '批量注册', user: '136****8899', desc: '同一IP注册 8 个新账号', severity: 'medium', status: 'processed' },
  { id: 6, type: '抢单外挂', user: '用户0044', desc: '下单响应时间 < 50ms，疑似使用脚本', severity: 'high', status: 'pending' },
  { id: 7, type: '价格异常', user: '用户0019', desc: '市场挂单价格高于原价 10 倍', severity: 'low', status: 'processed' },
  { id: 8, type: '实名异常', user: '用户0052', desc: '实名信息与历史记录不符', severity: 'medium', status: 'pending' },
  { id: 9, type: '设备指纹', user: '用户0036', desc: '检测到模拟器环境运行', severity: 'medium', status: 'processed' },
  { id: 10, type: '关联账号', user: '用户0048', desc: '与 3 个封禁账号共用设备', severity: 'high', status: 'pending' },
  { id: 11, type: '接口异常', user: '用户0027', desc: '调用 API 频率超出正常阈值', severity: 'low', status: 'pending' },
  { id: 12, type: '充值异常', user: '用户0055', desc: '不同支付渠道反复充值后立即提现', severity: 'high', status: 'processed' }
])

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

const securityEvents = ref<SecurityEvent[]>([
  { id: 1, type: '暴力破解', user: '用户0003', ip: '45.62.1xx.22', ua: 'Mozilla/5.0 (Windows NT 10.0)', desc: '尝试登录失败 20 次', handler: '系统自动', handle_time: '2026-08-13 09:20:00' },
  { id: 2, type: 'SQL注入', user: '未知', ip: '103.2xx.45.1', ua: 'sqlmap/1.6', desc: '检测到 SQL 注入特征请求', handler: '风控赵六', handle_time: '2026-08-12 16:45:00' },
  { id: 3, type: 'XSS攻击', user: '用户0018', ip: '118.2xx.33.9', ua: 'Chrome/120', desc: '商品评论含恶意脚本', handler: '系统自动', handle_time: '2026-08-12 14:10:00' },
  { id: 4, type: 'CSRF', user: '用户0021', ip: '223.7xx.12.5', ua: 'Safari/17', desc: '跨站请求伪造访问', handler: '风控赵六', handle_time: '2026-08-11 11:30:00' },
  { id: 5, type: '越权访问', user: '用户0029', ip: '192.168.1.55', ua: 'PostmanRuntime/7.32', desc: '尝试访问其他用户订单数据', handler: 'admin', handle_time: '2026-08-11 10:05:00' },
  { id: 6, type: '撞库攻击', user: '多个账号', ip: '36.9xx.78.3', ua: 'Python-urllib/3.10', desc: '使用泄露密码库批量尝试', handler: '系统自动', handle_time: '2026-08-10 22:15:00' },
  { id: 7, type: '接口滥用', user: '用户0037', ip: '175.4xx.90.2', ua: 'okhttp/4.11', desc: '短时间内调用接口超 1000 次', handler: '风控赵六', handle_time: '2026-08-10 18:00:00' },
  { id: 8, type: '数据爬取', user: '未知', ip: '210.5xx.11.7', ua: 'Scrapy/2.10', desc: '批量爬取藏品信息', handler: '系统自动', handle_time: '2026-08-09 15:20:00' },
  { id: 9, type: '中间人攻击', user: '用户0046', ip: '121.3xx.55.8', ua: 'Chrome/120', desc: '检测到 SSL 证书异常', handler: 'admin', handle_time: '2026-08-09 09:45:00' },
  { id: 10, type: 'DDoS', user: '未知', ip: '多IP', ua: '-', desc: 'API 网关流量突增 50 倍', handler: '系统自动', handle_time: '2026-08-08 23:50:00' },
  { id: 11, type: '文件上传', user: '用户0050', ip: '183.6xx.22.4', ua: 'Chrome/120', desc: '尝试上传 .php 可执行文件', handler: '风控赵六', handle_time: '2026-08-08 14:30:00' }
])

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

const approvals = ref<Approval[]>([
  { id: 1, type: '大批量空投', target: '活动#12 - 向 5000 用户空投', initiator: '运营张三', approver: '-', status: 'pending' },
  { id: 2, type: '大额退款', target: '订单 ORD00001007 - 退款 ¥3999', initiator: '客服钱七', approver: '-', status: 'pending' },
  { id: 3, type: '藏品销毁', target: '藏品《敦煌飞天》销毁 200 份', initiator: '运营李四', approver: '-', status: 'pending' },
  { id: 4, type: '修改手续费', target: '市场寄售手续费 5% → 8%', initiator: 'finance01', approver: 'admin', status: 'approved' },
  { id: 5, type: '数据导出', target: '导出全部用户实名信息', initiator: 'risk01', approver: 'admin', status: 'approved' },
  { id: 6, type: '系统配置', target: '关闭全站转赠功能', initiator: '运营张三', approver: 'admin', status: 'rejected' },
  { id: 7, type: '大额提现', target: '用户0031 提现 ¥50000', initiator: '系统自动', approver: '-', status: 'pending' },
  { id: 8, type: '账号解冻', target: '解冻用户 用户0042', initiator: 'service01', approver: 'admin', status: 'approved' },
  { id: 9, type: '盲盒库存调整', target: '盲盒#3 追加发行 2000 份', initiator: '运营李四', approver: '-', status: 'pending' },
  { id: 10, type: '权限变更', target: '客服角色增加导出权限', initiator: 'admin', approver: 'admin', status: 'rejected' },
  { id: 11, type: '大额退款', target: '订单 ORD00001031 - 退款 ¥5990', initiator: '客服孙八', approver: '-', status: 'pending' },
  { id: 12, type: '数据清理', target: '清理 30 天前过期日志', initiator: 'dev01', approver: 'admin', status: 'approved' }
])

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

// 后端安全事件列表返回的扁平化/联表字段（用户、UA、描述、处理人等），
// API 的 SecurityEvent 未覆盖，此处以其为基础叠加可选额外字段。
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

async function loadData() {
  try {
    const result = await securityApi.events({ page: 1, pageSize: 100 })
    securityEvents.value = result.list.map((e: SecurityEventRaw) => ({
      id: Number(e.id),
      type: e.type || '',
      user: e.user || e.username || '',
      ip: e.ip || '',
      ua: e.ua || e.userAgent || '',
      desc: e.desc || e.description || '',
      handler: e.handler || '',
      handle_time: e.handleTime || e.handle_time || ''
    }))
  } catch {
    // fallback: keep inline data already loaded in securityEvents
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
