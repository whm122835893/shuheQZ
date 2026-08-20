<template>
  <div class="user-detail-page" v-loading="loading">
    <!-- 返回 & 标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" plain @click="goBack">返回列表</el-button>
        <span class="page-title">用户详情</span>
      </div>
      <div class="header-right">
        <el-tag v-if="userInfo" :type="userInfo.status === 'frozen' ? 'danger' : 'success'">
          {{ userInfo.status === 'frozen' ? '已冻结' : '正常' }}
        </el-tag>
        <template v-if="userInfo">
          <el-button type="warning" size="small" @click="handleForceOffline">强制下线</el-button>
          <el-button type="primary" size="small" @click="handleResetPassword">重置密码</el-button>
          <el-button type="danger" size="small" @click="handleBlacklist">加入黑名单</el-button>
        </template>
      </div>
    </div>

    <template v-if="userInfo">
      <!-- 概览卡片 -->
      <el-card shadow="never" class="overview-card">
        <el-row :gutter="16">
          <el-col :xs="12" :sm="6">
            <div class="overview-item">
              <div class="overview-label">用户昵称</div>
              <div class="overview-value">{{ userInfo.nickname }}</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="overview-item">
              <div class="overview-label">钱包余额</div>
              <div class="overview-value price">¥{{ userInfo.walletBalance.toFixed(2) }}</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="overview-item">
              <div class="overview-label">持有藏品</div>
              <div class="overview-value">{{ userInfo.collectibleCount }} 件</div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="6">
            <div class="overview-item">
              <div class="overview-label">邀请人数</div>
              <div class="overview-value">{{ userInfo.inviteCount }} 人</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- Tab 切换 -->
      <el-card shadow="never">
        <el-tabs v-model="activeTab" class="detail-tabs">
          <!-- 基础信息 -->
          <el-tab-pane label="基础信息" name="basic">
            <el-descriptions :column="3" border>
              <el-descriptions-item label="用户ID">{{ userInfo.id }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
              <el-descriptions-item label="昵称">{{ userInfo.nickname }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ userInfo.phone }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ userInfo.registerTime }}</el-descriptions-item>
              <el-descriptions-item label="实名状态">
                <el-tag :type="realnameTagType(userInfo.realnameStatus)" size="small">
                  {{ realnameText(userInfo.realnameStatus) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="邀请人">{{ userInfo.inviter }}</el-descriptions-item>
              <el-descriptions-item label="账号状态">
                <el-tag :type="userInfo.status === 'frozen' ? 'danger' : 'success'" size="small">
                  {{ userInfo.status === 'frozen' ? '已冻结' : '正常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="钱包余额">¥{{ userInfo.walletBalance.toFixed(2) }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 钱包资产 -->
          <el-tab-pane label="钱包资产" name="wallet">
            <div class="wallet-overview">
              <div class="wallet-balance-box">
                <div class="balance-label">钱包余额</div>
                <div class="balance-value">¥{{ userInfo.walletBalance.toFixed(2) }}</div>
                <div class="balance-actions">
                  <el-button type="primary" size="small" @click="handleManualAdjust">手动调账</el-button>
                  <el-button size="small" @click="handleRechargeRecord">充值记录</el-button>
                </div>
              </div>
            </div>

            <div class="section-title">交易记录</div>
            <el-table :data="walletTransactions" border stripe size="small">
              <el-table-column prop="id" label="流水ID" width="80" align="center" />
              <el-table-column prop="type_text" label="交易类型" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="walletTypeTag(row.type)" size="small">{{ row.type_text }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="金额" width="120" align="right">
                <template #default="{ row }">
                  <span :class="row.amount >= 0 ? 'amount-in' : 'amount-out'">
                    {{ row.amount >= 0 ? '+' : '' }}¥{{ row.amount.toFixed(2) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="交易后余额" width="120" align="right">
                <template #default="{ row }">
                  ¥{{ row.balance_after.toFixed(2) }}
                </template>
              </el-table-column>
              <el-table-column prop="channel" label="渠道" width="90" align="center">
                <template #default="{ row }">
                  {{ channelText(row.channel) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                    {{ row.status === 'success' ? '成功' : '失败' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="时间" min-width="160" />
            </el-table>
            <el-pagination
              v-model:current-page="walletPage.currentPage"
              :page-size="walletPage.pageSize"
              :total="walletTransactionsAll.length"
              layout="total, prev, pager, next"
              @current-change="handleWalletPageChange"
            />
          </el-tab-pane>

          <!-- 用户仓库 -->
          <el-tab-pane label="用户仓库" name="warehouse">
            <div class="section-title">
              持有藏品（{{ userCollectibles.length }}）
            </div>
            <el-table :data="userCollectibles" border stripe size="small">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column label="藏品" min-width="200">
                <template #default="{ row }">
                  <div class="product-cell">
                    <el-image :src="row.image" class="product-thumb" fit="cover" />
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="100" align="center" />
              <el-table-column label="获得价格" width="120" align="right">
                <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="acquired_at" label="获得时间" width="170" />
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_listed ? 'warning' : 'info'" size="small">
                    {{ row.is_listed ? '寄售中' : '持有中' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="danger" link size="small" @click="handleRecall(row, 'collectible')">
                    强制回收
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="section-title" style="margin-top: 24px">
              持有盲盒（{{ userBlindboxes.length }}）
            </div>
            <el-table :data="userBlindboxes" border stripe size="small">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column label="盲盒" min-width="200">
                <template #default="{ row }">
                  <div class="product-cell">
                    <el-image :src="row.image" class="product-thumb" fit="cover" />
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="持有数量" width="100" align="center" />
              <el-table-column label="购入价格" width="120" align="right">
                <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="acquired_at" label="获得时间" width="170" />
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_opened ? 'success' : 'info'" size="small">
                    {{ row.is_opened ? '已开启' : '未开启' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center" fixed="right">
                <template #default="{ row }">
                  <el-button type="danger" link size="small" @click="handleRecall(row, 'blindbox')">
                    强制回收
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <!-- 优先购资格台账 -->
          <el-tab-pane label="优先购资格" name="priority">
            <div class="priority-summary">
              <div class="summary-item">
                <span class="summary-num text-success">{{ priorityStats.valid }}</span>
                <span class="summary-label">有效资格</span>
              </div>
              <div class="summary-item">
                <span class="summary-num text-warning">{{ priorityStats.expired }}</span>
                <span class="summary-label">已过期</span>
              </div>
              <div class="summary-item">
                <span class="summary-num text-info">{{ priorityStats.used }}</span>
                <span class="summary-label">已用完</span>
              </div>
            </div>

            <el-table :data="priorityList" border stripe size="small">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="collectible_name" label="藏品名称" min-width="180" />
              <el-table-column prop="source" label="资格来源" width="130" align="center" />
              <el-table-column prop="total_quota" label="总配额" width="90" align="center" />
              <el-table-column prop="used_quota" label="已使用" width="90" align="center" />
              <el-table-column label="剩余" width="90" align="center">
                <template #default="{ row }">
                  {{ row.total_quota - row.used_quota }}
                </template>
              </el-table-column>
              <el-table-column label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="priorityTagType(row.status)" size="small">
                    {{ priorityStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="expire_at" label="到期时间" width="170" />
            </el-table>
          </el-tab-pane>

          <!-- 邀请关系链 -->
          <el-tab-pane label="邀请关系" name="invite">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="邀请码">{{ inviteInfo.inviteCode }}</el-descriptions-item>
              <el-descriptions-item label="邀请链接">{{ inviteInfo.inviteLink }}</el-descriptions-item>
              <el-descriptions-item label="累计邀请人数">{{ inviteInfo.totalInvited }} 人</el-descriptions-item>
              <el-descriptions-item label="本月邀请">{{ inviteInfo.monthInvited }} 人</el-descriptions-item>
              <el-descriptions-item label="邀请奖励总额">¥{{ inviteInfo.rewardTotal.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="邀请人">{{ userInfo.inviter }}</el-descriptions-item>
            </el-descriptions>

            <div class="section-title" style="margin-top: 20px">邀请明细</div>
            <el-table :data="inviteList" border stripe size="small">
              <el-table-column prop="id" label="ID" width="70" align="center" />
              <el-table-column prop="username" label="被邀请人" min-width="130" />
              <el-table-column prop="phone" label="手机号" width="140" align="center" />
              <el-table-column prop="register_time" label="注册时间" width="170" />
              <el-table-column label="奖励金额" width="120" align="right">
                <template #default="{ row }">¥{{ row.reward.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.is_active ? 'success' : 'info'" size="small">
                    {{ row.is_active ? '活跃' : '沉默' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 用户不存在 -->
    <el-card v-if="!loading && !userInfo" shadow="never">
      <el-empty description="用户不存在" />
    </el-card>

    <!-- 充值记录弹窗 -->
    <el-dialog v-model="rechargeDialog.visible" title="充值记录" width="720px">
      <el-table :data="rechargeDialog.list" border stripe size="small">
        <el-table-column prop="id" label="流水号" width="140" align="center" />
        <el-table-column label="充值金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-in">+¥{{ row.amount.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="channel" label="充值渠道" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="time" label="充值时间" min-width="160" />
      </el-table>
      <template #footer>
        <el-button @click="rechargeDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { userApi } from '../../api'
import { post } from '../../api/request'

const route = useRoute()
const router = useRouter()
const loading = ref(true)
const activeTab = ref('basic')

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

const userInfo = ref<UserInfo | null>(null)

// 钱包交易记录
const walletTransactionsAll = ref<any[]>([])
const walletTransactions = ref<any[]>([])
const walletPage = reactive({ currentPage: 1, pageSize: 5 })

// 用户仓库 - 持有藏品
// TODO: 待对接后端 API 获取用户持有藏品数据
const userCollectibles = ref<any[]>([])

// 用户仓库 - 持有盲盒
// TODO: 待对接后端 API 获取用户持有盲盒数据
const userBlindboxes = ref<any[]>([])

// 优先购资格台账
// TODO: 待对接后端 API 获取用户优先购资格数据
const priorityList = ref<any[]>([])

const priorityStats = computed(() => ({
  valid: priorityList.value.filter((p: any) => p.status === 'valid').length,
  expired: priorityList.value.filter((p: any) => p.status === 'expired').length,
  used: priorityList.value.filter((p: any) => p.status === 'used').length
}))

// 邀请关系
// TODO: 待对接后端 API 获取用户邀请关系数据
const inviteInfo = ref({
  inviteCode: 'INV' + String(route.params.id).padStart(6, '0'),
  inviteLink: 'https://app.example.com/i/' + String(route.params.id).padStart(6, '0'),
  totalInvited: 0,
  monthInvited: 0,
  rewardTotal: 0
})

// 邀请明细
// TODO: 待对接后端 API 获取用户邀请明细数据
const inviteList = ref<any[]>([])

function realnameText(status: string) {
  const map: Record<string, string> = { verified: '已实名', pending: '审核中', unverified: '未实名' }
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

function walletTypeTag(type: string): 'success' | 'warning' | 'danger' | 'primary' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'danger' | 'primary' | 'info'> = {
    recharge: 'success',
    purchase: 'danger',
    refund: 'warning',
    withdraw: 'primary',
    reward: 'success',
    fee: 'info'
  }
  return map[type] || 'info'
}

function channelText(channel: string) {
  const map: Record<string, string> = { alipay: '支付宝', wechat: '微信', '-': '-' }
  return map[channel] || channel
}

function priorityTagType(status: string): 'success' | 'warning' | 'info' {
  const map: Record<string, 'success' | 'warning' | 'info'> = {
    valid: 'success',
    expired: 'warning',
    used: 'info'
  }
  return map[status] || 'info'
}

function priorityStatusText(status: string) {
  const map: Record<string, string> = { valid: '有效', expired: '已过期', used: '已用完' }
  return map[status] || '未知'
}

function handleWalletPageChange(page: number) {
  const start = (page - 1) * walletPage.pageSize
  walletTransactions.value = walletTransactionsAll.value.slice(start, start + walletPage.pageSize)
}

async function handleRecall(row: any, type: 'collectible' | 'blindbox') {
  const typeName = type === 'collectible' ? '藏品' : '盲盒'
  try {
    await ElMessageBox.confirm(
      `确定要强制回收${typeName}「${row.name}」吗？回收后将从用户仓库中移除，并按原价退款至用户钱包。此操作不可撤销。`,
      '强制回收确认',
      {
        confirmButtonText: '确定回收',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }
  try {
    await post('/users/recover-collectible', { userId: Number(route.params.id), collectibleId: row.id })
    if (type === 'collectible') {
      userCollectibles.value = userCollectibles.value.filter(c => c.id !== row.id)
    } else {
      userBlindboxes.value = userBlindboxes.value.filter(b => b.id !== row.id)
    }
    ElMessage.success(`已强制回收${typeName}「${row.name}」，退款 ¥${row.price.toFixed(2)} 已退回用户钱包`)
  } catch (e: any) {
    ElMessage.error(e.message || `强制回收${typeName}失败`)
  }
}

async function handleManualAdjust() {
  let value: string
  try {
    const result = await ElMessageBox.prompt('请输入调账金额（正数为加款，负数为扣款）', '手动调账', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^-?\d+(\.\d{1,2})?$/,
      inputErrorMessage: '请输入有效金额（最多两位小数）'
    })
    value = result.value
  } catch {
    return
  }
  const amount = parseFloat(value)
  try {
    await post('/wallet/adjust', { userId: Number(route.params.id), amount })
    if (userInfo.value) {
      userInfo.value.walletBalance = parseFloat((userInfo.value.walletBalance + amount).toFixed(2))
    }
    ElMessage.success(`调账成功，金额 ${amount >= 0 ? '+' : ''}¥${amount.toFixed(2)}`)
  } catch (e: any) {
    ElMessage.error(e.message || '调账失败')
  }
}

// 充值记录弹窗
// TODO: 待对接后端 API 获取用户充值记录数据
const rechargeDialog = reactive({
  visible: false,
  list: [] as any[]
})

function handleRechargeRecord() {
  rechargeDialog.visible = true
}

// 强制下线
async function handleForceOffline() {
  try {
    await ElMessageBox.confirm(
      `确认强制用户「${userInfo.value?.nickname}」下线吗？该用户的所有会话将立即失效。`,
      '强制下线',
      { type: 'warning' }
    )
  } catch {
    return
  }
  try {
    await post('/users/force-logout', { userId: Number(route.params.id) })
    ElMessage.success('已强制下线，用户所有会话已失效')
  } catch (e: any) {
    ElMessage.error(e.message || '强制下线失败')
  }
}

// 重置密码
async function handleResetPassword() {
  try {
    await ElMessageBox.prompt('请输入新密码（至少6位）', '重置密码', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^.{6,}$/,
      inputErrorMessage: '密码至少6位'
    })
  } catch {
    return
  }
  try {
    await post('/users/reset-password', { userId: Number(route.params.id) })
    ElMessage.success('密码已重置')
  } catch (e: any) {
    ElMessage.error(e.message || '重置密码失败')
  }
}

// 加入黑名单
async function handleBlacklist() {
  let value: string
  try {
    const result = await ElMessageBox.prompt('请输入拉黑原因', '加入黑名单', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入拉黑原因',
      inputValidator: (val: string) => (!!val && val.trim().length > 0) || '请输入拉黑原因'
    })
    value = result.value
  } catch {
    return
  }
  try {
    await post('/security/blacklist', { type: 1, target: String(route.params.id), reason: value })
    ElMessage.success(`已加入黑名单，原因：${value}`)
  } catch (e: any) {
    ElMessage.error(e.message || '加入黑名单失败')
  }
}

function goBack() {
  router.push('/user')
}

// 手机号脱敏
function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.substring(0, 3) + '****' + phone.slice(-4)
}

async function loadData() {
  loading.value = true
  try {
    const userId = Number(route.params.id)
    let user: UserInfo | null = null

    // 优先调用后端接口获取用户详情
    try {
      const res = await userApi.detail(userId)
      if (res) {
        const u: any = res
        const phone = u.phone ?? ''
        user = {
          id: Number(u.id ?? userId),
          username: u.username ?? '',
          nickname: u.nickname ?? '',
          phone: phone ? maskPhone(phone) : '-',
          realPhone: phone,
          registerTime: u.createdAt ?? '',
          realnameStatus: u.realnameStatus ?? u.realname_status ?? 'unverified',
          inviter: u.inviter ?? '-',
          status: u.status === 0 || u.status === 'frozen' ? 'frozen' : 'normal',
          walletBalance: Number(u.walletBalance ?? 0),
          collectibleCount: Number(u.collectibleCount ?? 0),
          blindboxCount: Number(u.blindboxCount ?? 0),
          inviteCount: Number(u.inviteCount ?? 0)
        }
      }
    } catch (apiErr) {
      ElMessage.error('数据加载失败')
    }

    if (user) {
      userInfo.value = user
      inviteInfo.value.totalInvited = user.inviteCount

      // 并行加载各子标签页数据
      const results = await Promise.allSettled([
        userApi.wallet(userId),
        userApi.collectibles(userId),
        userApi.blindboxes(userId),
        userApi.invites(userId),
        userApi.priorityQualifications(userId)
      ])

      // 钱包交易记录
      if (results[0].status === 'fulfilled') {
        const walletRes: any = results[0].value
        const txList = Array.isArray(walletRes) ? walletRes : (walletRes?.list ?? walletRes?.transactions ?? [])
        walletTransactionsAll.value = txList.map((t: any) => ({
          id: t.id,
          type_text: t.typeText || t.type_text || '',
          type: t.type || '',
          amount: Number(t.amount ?? 0),
          balance_after: Number(t.balanceAfter ?? t.balance_after ?? 0),
          channel: t.channel || '-',
          status: t.status || 'success',
          created_at: t.createdAt || t.created_at || ''
        }))
      } else {
        walletTransactionsAll.value = []
      }
      handleWalletPageChange(1)

      // 持有藏品
      if (results[1].status === 'fulfilled') {
        const colRes: any = results[1].value
        const colList = Array.isArray(colRes) ? colRes : (colRes?.list ?? [])
        userCollectibles.value = colList.map((c: any) => ({
          id: c.id,
          image: c.image || c.coverImage || '',
          name: c.name || c.collectibleName || '',
          category: c.category || '',
          price: Number(c.price ?? c.acquiredPrice ?? 0),
          acquired_at: c.acquiredAt || c.acquired_at || '',
          is_listed: !!c.isListed
        }))
      }

      // 持有盲盒
      if (results[2].status === 'fulfilled') {
        const bbRes: any = results[2].value
        const bbList = Array.isArray(bbRes) ? bbRes : (bbRes?.list ?? [])
        userBlindboxes.value = bbList.map((b: any) => ({
          id: b.id,
          image: b.image || b.coverImage || '',
          name: b.name || b.blindboxName || '',
          quantity: Number(b.quantity ?? 1),
          price: Number(b.price ?? b.acquiredPrice ?? 0),
          acquired_at: b.acquiredAt || b.acquired_at || '',
          is_opened: !!b.isOpened
        }))
      }

      // 邀请关系
      if (results[3].status === 'fulfilled') {
        const invRes: any = results[3].value
        const invList = Array.isArray(invRes) ? invRes : (invRes?.list ?? [])
        if (invRes?.inviteCode) inviteInfo.value.inviteCode = invRes.inviteCode
        if (invRes?.inviteLink) inviteInfo.value.inviteLink = invRes.inviteLink
        if (invRes?.totalInvited != null) inviteInfo.value.totalInvited = invRes.totalInvited
        if (invRes?.monthInvited != null) inviteInfo.value.monthInvited = invRes.monthInvited
        if (invRes?.rewardTotal != null) inviteInfo.value.rewardTotal = Number(invRes.rewardTotal)
        inviteList.value = invList.map((i: any) => ({
          id: i.id,
          username: i.username || i.nickname || '',
          phone: i.phone ? maskPhone(i.phone) : '-',
          register_time: i.registerTime || i.register_time || i.createdAt || '',
          reward: Number(i.reward ?? 0),
          is_active: !!i.isActive
        }))
      }

      // 优先购资格
      if (results[4].status === 'fulfilled') {
        const priRes: any = results[4].value
        const priList = Array.isArray(priRes) ? priRes : (priRes?.list ?? [])
        priorityList.value = priList.map((p: any) => ({
          id: p.id,
          collectible_name: p.collectibleName || p.collectible_name || '',
          source: p.source || '',
          total_quota: Number(p.totalQuota ?? p.total_quota ?? 0),
          used_quota: Number(p.usedQuota ?? p.used_quota ?? 0),
          status: p.status || 'valid',
          expire_at: p.expireAt || p.expire_at || ''
        }))
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.overview-card {
  margin-bottom: 16px;
}
.overview-item {
  text-align: center;
  padding: 8px 0;
}
.overview-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.overview-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}
.overview-value.price {
  color: var(--color-danger);
}

.detail-tabs {
  min-height: 400px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid var(--color-primary);
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-small);
  flex-shrink: 0;
}

.amount-in {
  color: var(--color-success);
  font-weight: 600;
}
.amount-out {
  color: var(--color-danger);
  font-weight: 600;
}

.wallet-overview {
  margin-bottom: 20px;
}
.wallet-balance-box {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-base);
  padding: 24px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.balance-label {
  font-size: 14px;
  opacity: 0.85;
  margin-bottom: 8px;
}
.balance-value {
  font-size: 32px;
  font-weight: 700;
}
.balance-actions {
  display: flex;
  gap: 8px;
}

.priority-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.summary-item {
  flex: 1;
  background: var(--bg-page);
  border-radius: var(--radius-base);
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.summary-num {
  font-size: 30px;
  font-weight: 700;
}
.summary-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.text-success { color: var(--color-success); }
.text-warning { color: var(--color-warning); }
.text-info { color: var(--color-info); }
</style>
