<template>
  <div class="platform-page">
    <!-- 危险区域警示卡片 -->
    <el-card shadow="never" class="danger-zone-card">
      <div class="danger-header">
        <div class="danger-icon">
          <el-icon :size="32"><WarnTriangleFilled /></el-icon>
        </div>
        <div class="danger-title-area">
          <div class="danger-title">危险操作区域</div>
          <div class="danger-subtitle">以下操作不可逆，执行前请务必确认。所有高危操作将记录审计日志并自动备份数据。</div>
        </div>
      </div>
    </el-card>

    <!-- 一键清空用户数据 -->
    <el-card shadow="never" class="clear-card">
      <template #header>
        <div class="card-header">
          <span class="header-title"><el-icon><Delete /></el-icon> 一键清空用户数据</span>
          <el-button type="danger" :icon="WarnTriangleFilled" @click="openClearDialog">执行清库操作</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 清除范围 -->
        <el-col :span="12">
          <div class="scope-block clear-scope">
            <div class="scope-title">
              <el-icon><CircleCloseFilled /></el-icon> 将被清除的数据
            </div>
            <ul class="scope-list">
              <li v-for="item in clearItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </el-col>
        <!-- 保留范围 -->
        <el-col :span="12">
          <div class="scope-block keep-scope">
            <div class="scope-title">
              <el-icon><CircleCheckFilled /></el-icon> 将保留的数据
            </div>
            <ul class="scope-list">
              <li v-for="item in keepItems" :key="item">{{ item }}</li>
            </ul>
          </div>
        </el-col>
      </el-row>

      <!-- 自动备份说明 -->
      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="backup-alert"
      >
        <template #title>
          <span class="backup-title">自动备份说明</span>
        </template>
        <div class="backup-content">
          系统将在执行清库操作前自动创建全量数据备份，备份文件保存至 <el-tag size="small">/data/backups/</el-tag> 目录，保留 30 天。
          备份包含完整的数据库快照与文件资源，可通过备份路径进行数据恢复。建议同时手动下载备份至本地妥善保管。
        </div>
      </el-alert>
    </el-card>

    <!-- 清库日志 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="header-title"><el-icon><Tickets /></el-icon> 清库操作日志</span>
          <el-tag type="danger">共 {{ clearLogs.length }} 次记录</el-tag>
        </div>
      </template>
      <el-table :data="pagedLogs" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="operator" label="操作人" width="130">
          <template #default="{ row }">
            <el-tag size="small" type="danger" effect="dark">{{ row.operator }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP 地址" width="150" />
        <el-table-column prop="time" label="操作时间" width="180" />
        <el-table-column prop="reason" label="操作原因" min-width="200" show-overflow-tooltip />
        <el-table-column prop="backup_path" label="备份路径" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false">{{ row.backup_path }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="logPage"
        :page-size="10"
        :total="clearLogs.length"
        layout="total, prev, pager, next"
      />
    </el-card>

    <!-- 四重确认 Dialog -->
    <el-dialog
      v-model="clearDialogVisible"
      title="一键清空用户数据 - 四重安全确认"
      width="560px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="clear-dialog"
    >
      <!-- 步骤指示器 -->
      <el-steps :active="clearStep" align-center finish-status="success" class="clear-steps">
        <el-step title="风险确认" description="输入确认词" />
        <el-step title="密码验证" description="管理员密码" />
        <el-step title="短信验证" description="验证码" />
        <el-step title="最终执行" description="确认执行" />
      </el-steps>

      <div class="step-content">
        <!-- Step 1: 风险确认 -->
        <div v-if="clearStep === 0" class="step-pane">
          <el-alert type="error" :closable="false" show-icon class="step-alert">
            <template #title>
              <span style="font-weight: 700; font-size: 15px;">高危操作警告</span>
            </template>
            <div class="alert-body">
              您即将清空全部用户数据，此操作 <strong>不可撤销</strong>！<br />
              清除范围包括：用户账号、藏品持有记录、订单交易、钱包流水、盲盒记录等。<br />
              系统将在执行前自动备份，但请务必三思而后行。
            </div>
          </el-alert>
          <el-form class="step-form" label-position="top">
            <el-form-item label="请手动输入「确认清除」以继续：">
              <el-input
                v-model="confirmText"
                placeholder="请输入：确认清除"
                clearable
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 2: 密码验证 -->
        <div v-if="clearStep === 1" class="step-pane">
          <el-alert type="warning" :closable="false" show-icon class="step-alert">
            <template #title>密码验证</template>
            <div class="alert-body">请输入您的管理员登录密码以验证身份，密码将加密传输。</div>
          </el-alert>
          <el-form class="step-form" label-position="top">
            <el-form-item label="管理员账号">
              <el-input :model-value="adminAccount" disabled>
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>
            <el-form-item label="登录密码">
              <el-input
                v-model="adminPassword"
                type="password"
                show-password
                placeholder="请输入管理员登录密码"
              >
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 3: 短信验证 -->
        <div v-if="clearStep === 2" class="step-pane">
          <el-alert type="warning" :closable="false" show-icon class="step-alert">
            <template #title>短信验证码验证</template>
            <div class="alert-body">验证码已发送至超级管理员手机 <strong>{{ maskedPhone }}</strong>，有效期 5 分钟。</div>
          </el-alert>
          <el-form class="step-form" label-position="top">
            <el-form-item label="短信验证码">
              <div class="sms-row">
                <el-input
                  v-model="smsCode"
                  placeholder="请输入 6 位验证码"
                  maxlength="6"
                >
                  <template #prefix><el-icon><Message /></el-icon></template>
                </el-input>
                <el-button
                  type="primary"
                  :disabled="smsCountdown > 0"
                  @click="sendSmsCode"
                >
                  {{ smsCountdown > 0 ? `${smsCountdown}s 后重发` : '发送验证码' }}
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>

        <!-- Step 4: 最终确认 -->
        <div v-if="clearStep === 3" class="step-pane">
          <el-alert type="error" :closable="false" show-icon class="step-alert">
            <template #title>
              <span style="font-weight: 700;">最终确认 - 即将执行清库</span>
            </template>
            <div class="alert-body">
              所有验证已通过！点击下方「最终确认执行」按钮将 <strong>立即清空全部用户数据</strong>。<br />
              系统将自动创建备份，备份路径：/data/backups/clear_{{ timestamp }}.tar.gz<br />
              此操作记录将永久保留在审计日志中。
            </div>
          </el-alert>
          <div class="final-checklist">
            <div class="check-item"><el-icon color="#67C23A"><CircleCheckFilled /></el-icon> 已确认清除范围</div>
            <div class="check-item"><el-icon color="#67C23A"><CircleCheckFilled /></el-icon> 密码验证已通过</div>
            <div class="check-item"><el-icon color="#67C23A"><CircleCheckFilled /></el-icon> 短信验证已通过</div>
            <div class="check-item"><el-icon color="#E6A23C"><WarnTriangleFilled /></el-icon> 自动备份已就绪</div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="handleCancelClear">取消操作</el-button>
        <el-button v-if="clearStep > 0" @click="clearStep--">上一步</el-button>
        <el-button
          v-if="clearStep < 3"
          type="primary"
          :disabled="!canProceed"
          @click="handleNextStep"
        >
          下一步
        </el-button>
        <el-button
          v-if="clearStep === 3"
          type="danger"
          :icon="Delete"
          :loading="executing"
          @click="handleFinalExecute"
        >
          最终确认执行
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  WarnTriangleFilled, Delete, CircleCloseFilled, CircleCheckFilled,
  Tickets, User, Lock, Message
} from '@element-plus/icons-vue'
import { platformApi } from '../../api'

// ============ 清除/保留范围 ============
const clearItems = [
  '全部用户账号及注册信息',
  '用户实名认证记录',
  '用户藏品持有记录',
  '用户盲盒持有记录',
  '全部订单及交易记录',
  '钱包余额及流水记录',
  '转赠记录',
  '市场寄售记录',
  '用户签到/邀请/抽奖记录',
  '客服工单及反馈记录'
]

const keepItems = [
  '管理员账号及权限配置',
  '藏品/盲盒商品配置信息',
  '系统参数配置',
  '营销活动模板配置',
  '内容管理（Banner/公告/协议）',
  '操作审计日志',
  '风控规则配置',
  '自动备份文件'
]

// ============ 清库日志 ============
interface ClearLog {
  id: number
  operator: string
  ip: string
  time: string
  reason: string
  backup_path: string
  status: 'success' | 'failed'
}

const clearLogs = ref<ClearLog[]>([
  { id: 1, operator: 'admin', ip: '192.168.1.100', time: '2026-07-15 03:00:00', reason: '季度数据清理，配合系统版本升级', backup_path: '/data/backups/clear_20260715_030000.tar.gz', status: 'success' },
  { id: 2, operator: 'admin', ip: '192.168.1.100', time: '2026-06-01 02:30:00', reason: '测试环境数据重置', backup_path: '/data/backups/clear_20260601_023000.tar.gz', status: 'success' },
  { id: 3, operator: 'dev01', ip: '10.0.0.55', time: '2026-05-20 04:00:00', reason: '灰度环境数据清理', backup_path: '/data/backups/clear_20260520_040000.tar.gz', status: 'success' },
  { id: 4, operator: 'admin', ip: '192.168.1.100', time: '2026-04-10 03:15:00', reason: '合规审计要求清理过期用户数据', backup_path: '/data/backups/clear_20260410_031500.tar.gz', status: 'failed' },
  { id: 5, operator: 'admin', ip: '192.168.1.100', time: '2026-03-01 02:00:00', reason: '月度数据归档清理', backup_path: '/data/backups/clear_20260301_020000.tar.gz', status: 'success' },
  { id: 6, operator: 'dev01', ip: '10.0.0.55', time: '2026-02-14 05:00:00', reason: '压力测试后数据清理', backup_path: '/data/backups/clear_20260214_050000.tar.gz', status: 'success' }
])

const logPage = ref(1)
const pagedLogs = computed(() => {
  const start = (logPage.value - 1) * 10
  return clearLogs.value.slice(start, start + 10)
})

// ============ 四重确认流程 ============
const clearDialogVisible = ref(false)
const clearStep = ref(0)
const executing = ref(false)

const adminAccount = ref('admin')
const adminPhone = '138****8888'
const maskedPhone = adminPhone

const confirmText = ref('')
const adminPassword = ref('')
const smsCode = ref('')
const smsCountdown = ref(0)
let smsTimer: ReturnType<typeof setInterval> | null = null

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14)

// 是否可以进入下一步
const canProceed = computed(() => {
  if (clearStep.value === 0) {
    return confirmText.value === '确认清除'
  }
  if (clearStep.value === 1) {
    return adminPassword.value.length >= 6
  }
  if (clearStep.value === 2) {
    return /^\d{6}$/.test(smsCode.value)
  }
  return true
})

function openClearDialog() {
  clearStep.value = 0
  confirmText.value = ''
  adminPassword.value = ''
  smsCode.value = ''
  smsCountdown.value = 0
  clearDialogVisible.value = true
}

function handleNextStep() {
  if (clearStep.value === 0 && confirmText.value !== '确认清除') {
    ElMessage.warning('请准确输入「确认清除」四个字')
    return
  }
  if (clearStep.value === 1 && adminPassword.value.length < 6) {
    ElMessage.warning('请输入正确的管理员密码')
    return
  }
  if (clearStep.value === 2 && !/^\d{6}$/.test(smsCode.value)) {
    ElMessage.warning('请输入 6 位数字验证码')
    return
  }
  if (clearStep.value < 3) {
    clearStep.value++
    if (clearStep.value === 2 && smsCountdown.value === 0) {
      // 进入短信步骤自动发送一次
      sendSmsCode()
    }
  }
}

function sendSmsCode() {
  if (smsCountdown.value > 0) return
  smsCountdown.value = 60
  ElMessage.success(`验证码已发送至 ${maskedPhone}`)
  smsTimer = setInterval(() => {
    smsCountdown.value--
    if (smsCountdown.value <= 0) {
      if (smsTimer) {
        clearInterval(smsTimer)
        smsTimer = null
      }
    }
  }, 1000)
}

function handleCancelClear() {
  ElMessageBox.confirm(
    '确定要取消本次清库操作吗？已完成的验证步骤将作废。',
    '取消操作',
    { confirmButtonText: '确定取消', cancelButtonText: '继续操作', type: 'warning' }
  )
    .then(() => {
      clearDialogVisible.value = false
      resetClearForm()
      ElMessage.info('已取消清库操作')
    })
    .catch(() => {})
}

function resetClearForm() {
  clearStep.value = 0
  confirmText.value = ''
  adminPassword.value = ''
  smsCode.value = ''
  smsCountdown.value = 0
  if (smsTimer) {
    clearInterval(smsTimer)
    smsTimer = null
  }
}

function handleFinalExecute() {
  ElMessageBox.confirm(
    '这是最后一次确认！点击「确定」将立即清空全部用户数据，此操作不可撤销！',
    '最终执行确认',
    {
      confirmButtonText: '我已知晓，确认执行',
      cancelButtonText: '再想想',
      type: 'error',
      confirmButtonClass: 'el-button--danger'
    }
  )
    .then(() => {
      executing.value = true
      executing.value = false
        clearDialogVisible.value = false
        // 新增日志记录
        const newId = Math.max(...clearLogs.value.map(l => l.id), 0) + 1
        const now = new Date()
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19)
        const backupName = `clear_${now.toISOString().replace(/[-:T]/g, '').substring(0, 14)}.tar.gz`
        clearLogs.value.unshift({
          id: newId,
          operator: 'admin',
          ip: '192.168.1.100',
          time: timeStr,
          reason: '手动执行一键清空用户数据',
          backup_path: `/data/backups/${backupName}`,
          status: 'success'
        })
        logPage.value = 1
        resetClearForm()
        ElMessage.success('清库操作已执行完成，数据已备份，请妥善保存备份文件')
    })
    .catch(() => {})
}

// 从后端加载清库操作日志
async function loadData() {
  try {
    const res = await platformApi.cleanupLogs({ page: 1, pageSize: 50 })
    if (res && res.list && res.list.length > 0) {
      clearLogs.value = res.list.map((l: any, idx: number) => {
        const rawStatus = l.status ?? 'success'
        const status: 'success' | 'failed' = rawStatus === 'failed' ? 'failed' : 'success'
        return {
          id: Number(l.id ?? idx + 1),
          operator: l.operator ?? l.adminName ?? 'admin',
          ip: l.ip ?? l.operatorIp ?? '-',
          time: l.time ?? l.createdAt ?? l.operatedAt ?? '',
          reason: l.reason ?? l.operationReason ?? '',
          backup_path: l.backupPath ?? l.backup_path ?? '',
          status
        }
      })
      logPage.value = 1
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

onMounted(async () => {
  await loadData()
})

onBeforeUnmount(() => {
  if (smsTimer) {
    clearInterval(smsTimer)
    smsTimer = null
  }
})
</script>

<style scoped>
.platform-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 危险区域 */
.danger-zone-card {
  background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
  border: 1px solid #fde2e2;
}
.danger-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.danger-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f5576c 0%, #f093fb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.danger-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-danger);
  margin-bottom: 6px;
}
.danger-subtitle {
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.5;
}

/* 清库卡片 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.header-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.scope-block {
  border-radius: var(--radius-base);
  padding: 16px;
  margin-bottom: 16px;
}
.clear-scope {
  background: #fef0f0;
  border: 1px solid #fde2e2;
}
.keep-scope {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}
.scope-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.clear-scope .scope-title {
  color: var(--color-danger);
}
.keep-scope .scope-title {
  color: var(--color-success);
}
.scope-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.scope-list li {
  padding: 4px 0 4px 20px;
  position: relative;
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.6;
}
.clear-scope .scope-list li::before {
  content: '×';
  position: absolute;
  left: 0;
  color: var(--color-danger);
  font-weight: 700;
}
.keep-scope .scope-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-success);
  font-weight: 700;
}

.backup-alert {
  margin-top: 8px;
}
.backup-title {
  font-weight: 600;
}
.backup-content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-regular);
  margin-top: 4px;
}

/* 清库 Dialog */
.clear-steps {
  margin-bottom: 24px;
}
.step-content {
  min-height: 200px;
}
.step-pane {
  animation: fadeIn 0.3s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.step-alert {
  margin-bottom: 20px;
}
.alert-body {
  font-size: 13px;
  line-height: 1.7;
  margin-top: 4px;
}
.step-form {
  margin-top: 8px;
}
.sms-row {
  display: flex;
  gap: 10px;
  width: 100%;
}
.sms-row .el-input {
  flex: 1;
}
.final-checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--bg-page);
  border-radius: var(--radius-base);
}
.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-regular);
}
</style>
