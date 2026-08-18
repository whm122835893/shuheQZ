<template>
  <div class="ticket-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- ============ 工单列表 ============ -->
      <el-tab-pane name="ticket">
        <template #label>
          <span><el-icon><ChatLineSquare /></el-icon> 工单列表</span>
        </template>

        <!-- 搜索区域 -->
        <el-form :inline="true" :model="searchForm" class="search-form">
          <el-form-item label="用户">
            <el-input v-model="searchForm.username" placeholder="用户名/UID" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="工单类型">
            <el-select v-model="searchForm.type" placeholder="全部类型" clearable style="width: 200px">
              <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
              <el-option label="待处理" value="pending" />
              <el-option label="处理中" value="processing" />
              <el-option label="已解决" value="resolved" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-select v-model="searchForm.priority" placeholder="全部优先级" clearable style="width: 200px">
              <el-option label="紧急" value="high" />
              <el-option label="普通" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
          <el-table-column prop="id" label="工单ID" width="80" align="center">
            <template #default="{ row }">
              <el-link type="primary" @click="handleViewDetail(row)">#{{ row.id }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户" min-width="110" show-overflow-tooltip />
          <el-table-column prop="subject" label="主题" min-width="120" show-overflow-tooltip />
          <el-table-column label="优先级" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="priorityTag(row.priority)" size="small" effect="dark">
                {{ row.priority_text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">{{ row.status_text }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="assignee" label="分配人" width="110" align="center" />
          <el-table-column prop="created_at" label="创建时间" width="170" />
          <el-table-column prop="updated_at" label="更新时间" width="170" />
          <el-table-column label="操作" width="280" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleViewDetail(row)">
                <el-icon><View /></el-icon>详情
              </el-button>
              <el-button type="success" link size="small" @click="handleReply(row)">
                <el-icon><ChatLineRound /></el-icon>回复
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleAssign(row, cmd)">
                <el-button type="warning" link size="small">
                  分配<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="客服钱七">客服钱七</el-dropdown-item>
                    <el-dropdown-item command="客服孙八">客服孙八</el-dropdown-item>
                    <el-dropdown-item command="运营张三">运营张三</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button
                type="danger"
                link
                size="small"
                :disabled="row.status === 'resolved'"
                @click="handleClose(row)"
              >
                关闭
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="page.currentPage"
          v-model:page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </el-tab-pane>

      <!-- ============ 用户反馈 ============ -->
      <el-tab-pane name="feedback">
        <template #label>
          <span><el-icon><ChatDotRound /></el-icon> 用户反馈</span>
        </template>
        <div class="feedback-list">
          <el-card v-for="fb in feedbackList" :key="fb.id" shadow="hover" class="feedback-card">
            <div class="feedback-header">
              <el-avatar :size="36" class="feedback-avatar">{{ fb.user.charAt(fb.user.length - 1) }}</el-avatar>
              <div class="feedback-meta">
                <div class="feedback-user">{{ fb.user }}</div>
                <div class="feedback-time">{{ fb.time }}</div>
              </div>
              <el-rate v-model="fb.rating" disabled size="small" />
            </div>
            <div class="feedback-content">{{ fb.content }}</div>
            <div class="feedback-footer">
              <el-tag size="small" effect="plain">{{ fb.category }}</el-tag>
              <el-button type="primary" link size="small" @click="handleFeedbackReply(fb)">回复</el-button>
            </div>
          </el-card>
        </div>
        <el-pagination
          v-model:current-page="feedbackPage"
          :page-size="5"
          :total="feedbackList.length"
          layout="total, prev, pager, next"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 工单详情 Dialog -->
    <el-dialog v-model="detailVisible" title="工单详情" width="640px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单ID">#{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="priorityTag(detailRow.priority)" size="small" effect="dark">{{ detailRow.priority_text }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="用户">{{ detailRow.username }}</el-descriptions-item>
          <el-descriptions-item label="UID">{{ detailRow.user_id }}</el-descriptions-item>
          <el-descriptions-item label="主题">{{ detailRow.subject }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTag(detailRow.status)" size="small">{{ detailRow.status_text }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分配人">{{ detailRow.assignee }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ detailRow.created_at }}</el-descriptions-item>
        </el-descriptions>
        <div class="detail-section">
          <div class="detail-label">问题描述</div>
          <div class="detail-content">{{ detailRow.content }}</div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <span class="quick-label">快捷操作：</span>
          <el-button type="primary" size="small" :icon="User" @click="goUserAssets(detailRow)">查看用户资产</el-button>
          <el-button type="primary" size="small" :icon="Document" @click="goOrderDetail(detailRow)">订单详情</el-button>
        </div>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleReply(detailRow!)">回复工单</el-button>
      </template>
    </el-dialog>

    <!-- 回复工单 Dialog -->
    <el-dialog v-model="replyVisible" title="回复工单" width="520px" :close-on-click-modal="false">
      <template v-if="replyRow">
        <el-descriptions :column="1" border size="small" class="reply-desc">
          <el-descriptions-item label="工单">#{{ replyRow.id }} - {{ replyRow.subject }}</el-descriptions-item>
          <el-descriptions-item label="用户">{{ replyRow.username }}</el-descriptions-item>
        </el-descriptions>
        <el-form class="reply-form">
          <el-form-item label="回复内容">
            <el-input
              v-model="replyContent"
              type="textarea"
              :rows="5"
              placeholder="请输入回复内容，回复后将通知用户"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReplySubmit">发送回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, RefreshLeft, View, ChatLineRound, ChatLineSquare, ChatDotRound,
  ArrowDown, User, Document
} from '@element-plus/icons-vue'
import { ticketApi, type SupportTicket, type Feedback } from '../../api'
import { paginate } from '../../utils/pagination'

interface TicketItem {
  id: number
  user_id: number
  username: string
  subject: string
  content: string
  priority: string
  priority_text: string
  status: string
  status_text: string
  assignee: string
  created_at: string
  updated_at: string
}

interface FeedbackItem {
  id: number
  user: string
  content: string
  rating: number
  category: string
  time: string
}

const router = useRouter()
const activeTab = ref('ticket')

const typeOptions = ['支付异常', '藏品丢失', '盲盒问题', '转赠纠纷', '账号问题']

const loading = ref(false)
const tableData = ref<TicketItem[]>([])
const total = ref(0)

const searchForm = reactive({
  username: '',
  type: '',
  status: '',
  priority: ''
})

const page = reactive({
  currentPage: 1,
  pageSize: 10
})

// 本地副本支持状态变更
const localTickets = ref<TicketItem[]>([])

function priorityTag(p: string): 'danger' | 'warning' | 'info' {
  return p === 'high' ? 'danger' : p === 'medium' ? 'warning' : 'info'
}
function statusTag(s: string): 'warning' | 'primary' | 'success' {
  return s === 'pending' ? 'warning' : s === 'processing' ? 'primary' : 'success'
}

function getFilteredData(): TicketItem[] {
  let list = [...localTickets.value]
  if (searchForm.username) {
    list = list.filter(t => t.username.includes(searchForm.username) || String(t.user_id) === searchForm.username)
  }
  if (searchForm.type) {
    list = list.filter(t => t.subject === searchForm.type)
  }
  if (searchForm.status) {
    list = list.filter(t => t.status === searchForm.status)
  }
  if (searchForm.priority) {
    list = list.filter(t => t.priority === searchForm.priority)
  }
  return list
}

// 工单状态/优先级文本映射
const ticketStatusTextMap: Record<string, string> = {
  pending: '待处理', processing: '处理中', resolved: '已解决'
}
const ticketPriorityTextMap: Record<string, string> = {
  high: '紧急', medium: '普通', low: '低'
}

// 后端工单列表返回的扁平化/联表字段（用户昵称、主题、描述、处理人等），
// API 的 SupportTicket 未覆盖，此处以其为基础叠加可选额外字段。
type TicketRaw = SupportTicket & {
  user_id?: number | string
  username?: string
  subject?: string
  description?: string
  priorityText?: string
  statusText?: string
  assignee?: string
  assigneeName?: string
  handler?: string
  created_at?: string
  updated_at?: string
}

async function loadData() {
  loading.value = true
  try {
    const result = await ticketApi.list({ page: 1, pageSize: 100 })
    localTickets.value = result.list.map((item: TicketRaw) => {
      const statusNumMap: Record<number, string> = { 0: 'pending', 1: 'processing', 2: 'resolved' }
      const status = typeof item.status === 'number' ? (statusNumMap[item.status] || 'pending') : (item.status || 'pending')
      const priorityNumMap: Record<number, string> = { 0: 'low', 1: 'medium', 2: 'high' }
      const priority = typeof item.priority === 'number' ? (priorityNumMap[item.priority] || 'medium') : (item.priority || 'medium')
      return {
        id: Number(item.id),
        user_id: Number(item.userId || item.user_id) || 0,
        username: item.username || '',
        subject: item.subject || item.title || '',
        content: item.content || item.description || '',
        priority,
        priority_text: item.priorityText || ticketPriorityTextMap[priority] || priority,
        status,
        status_text: item.statusText || ticketStatusTextMap[status] || status,
        assignee: item.assignee || item.assigneeName || item.handler || '-',
        created_at: item.createdAt || item.created_at || '',
        updated_at: item.updatedAt || item.updated_at || ''
      } as TicketItem
    })
  } catch (e) {
    ElMessage.error('数据加载失败')
    localTickets.value = []
  }
  loading.value = false
}

async function fetchData() {
  loading.value = true
  try {
    const filtered = getFilteredData()
    const result = paginate(filtered, page.currentPage, page.pageSize)
    tableData.value = result.list as TicketItem[]
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
  searchForm.type = ''
  searchForm.status = ''
  searchForm.priority = ''
  page.currentPage = 1
  fetchData()
}

// ===== 详情 Dialog =====
const detailVisible = ref(false)
const detailRow = ref<TicketItem | null>(null)

function handleViewDetail(row: TicketItem) {
  detailRow.value = row
  detailVisible.value = true
}

// ===== 回复 Dialog =====
const replyVisible = ref(false)
const replyRow = ref<TicketItem | null>(null)
const replyContent = ref('')

function handleReply(row: TicketItem) {
  replyRow.value = row
  replyContent.value = ''
  replyVisible.value = true
}

function handleReplySubmit() {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  if (replyRow.value) {
    if (replyRow.value.status === 'pending') {
      replyRow.value.status = 'processing'
      replyRow.value.status_text = '处理中'
    }
    replyRow.value.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19)
    ElMessage.success(`已回复工单 #${replyRow.value.id}，用户将收到通知`)
  }
  replyVisible.value = false
}

// ===== 关闭工单 =====
function handleClose(row: TicketItem) {
  ElMessageBox.confirm(
    `确定要关闭工单 #${row.id}「${row.subject}」吗？关闭后用户仍可重新发起。`,
    '关闭工单确认',
    { confirmButtonText: '确定关闭', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      row.status = 'resolved'
      row.status_text = '已解决'
      row.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19)
      ElMessage.success(`工单 #${row.id} 已关闭`)
    })
    .catch(() => {})
}

// ===== 分配 =====
function handleAssign(row: TicketItem, assignee: string) {
  ElMessageBox.confirm(
    `确定要将工单 #${row.id} 分配给「${assignee}」吗？`,
    '分配确认',
    { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
  )
    .then(() => {
      row.assignee = assignee
      if (row.status === 'pending') {
        row.status = 'processing'
        row.status_text = '处理中'
      }
      ElMessage.success(`工单 #${row.id} 已分配给「${assignee}」`)
    })
    .catch(() => {})
}

// ===== 快捷操作 =====
function goUserAssets(row: TicketItem) {
  detailVisible.value = false
  router.push(`/user/detail/${row.user_id}`)
  ElMessage.info(`正在跳转到用户「${row.username}」的资产详情`)
}

function goOrderDetail(row: TicketItem) {
  detailVisible.value = false
  router.push('/order')
  ElMessage.info(`正在跳转到订单列表，可搜索用户「${row.username}」的订单`)
}

// ===== 用户反馈 =====
const feedbackPage = ref(1)
const feedbackList = ref<FeedbackItem[]>([
  { id: 1, user: '用户0012', content: 'App 首页加载有点慢，希望优化一下加载速度。', rating: 4, category: '功能建议', time: '2026-08-13 10:30' },
  { id: 2, user: '用户0028', content: '盲盒开启动画很酷！但是有时会卡顿，建议优化。', rating: 5, category: '体验反馈', time: '2026-08-13 09:15' },
  { id: 3, user: '用户0019', content: '希望增加藏品搜索功能，目前找藏品不太方便。', rating: 4, category: '功能建议', time: '2026-08-12 18:00' },
  { id: 4, user: '用户0035', content: '退款流程太复杂了，填了好多次才通过。', rating: 2, category: '问题反馈', time: '2026-08-12 14:20' },
  { id: 5, user: '用户0042', content: '客服响应很快，问题解决了，点赞！', rating: 5, category: '好评', time: '2026-08-12 11:05' },
  { id: 6, user: '用户0051', content: '转赠功能什么时候能支持批量操作？', rating: 3, category: '功能建议', time: '2026-08-11 16:45' },
  { id: 7, user: '用户0058', content: '希望增加更多国画风藏品，很喜欢这种风格。', rating: 5, category: '内容建议', time: '2026-08-11 10:30' }
])

function handleFeedbackReply(fb: FeedbackItem) {
  ElMessageBox.prompt('请输入回复内容', `回复「${fb.user}」的反馈`, {
    confirmButtonText: '发送',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '感谢您的反馈，我们会持续优化...'
  })
    .then(({ value }) => {
      if (value.trim()) {
        ElMessage.success(`已回复「${fb.user}」的反馈`)
      }
    })
    .catch(() => {})
}

// 反馈分类文本映射
const feedbackCategoryTextMap: Record<string, string> = {
  feature: '功能建议', experience: '体验反馈', bug: '问题反馈', praise: '好评', content: '内容建议'
}

// 后端反馈列表返回的扁平化/联表字段（用户、评分、分类等），
// API 的 Feedback 未覆盖，此处以其为基础叠加可选额外字段。
type FeedbackRaw = Feedback & {
  username?: string
  user?: string
  rating?: number | string
  score?: number | string
  category?: string
  time?: string
}

async function loadFeedbacks() {
  try {
    const result = await ticketApi.feedbacks({ page: 1, pageSize: 100 })
    feedbackList.value = result.list.map((item: FeedbackRaw) => ({
      id: Number(item.id),
      user: item.username || item.user || '',
      content: item.content || '',
      rating: Number(item.rating ?? item.score) || 0,
      category: item.category || feedbackCategoryTextMap[item.type] || item.type || '',
      time: item.createdAt || item.time || ''
    })) as FeedbackItem[]
  } catch {
    // fallback：保留已有的本地反馈数据
  }
}

onMounted(async () => {
  await loadData()
  loadFeedbacks()
  fetchData()
})
</script>

<style scoped>
.search-form .el-form-item {
  margin-right: 16px;
  margin-bottom: 16px;
}
.detail-section {
  margin-top: 16px;
}
.detail-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.detail-content {
  padding: 12px 16px;
  background: var(--bg-page);
  border-radius: var(--radius-small);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-regular);
}
.quick-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 8px;
}
.quick-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.reply-desc {
  margin-bottom: 16px;
}
.reply-form {
  margin-top: 4px;
}
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.feedback-card {
  margin-bottom: 0;
}
.feedback-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.feedback-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  flex-shrink: 0;
}
.feedback-meta {
  flex: 1;
}
.feedback-user {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.feedback-time {
  font-size: 12px;
  color: var(--text-placeholder);
}
.feedback-content {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-regular);
  margin-bottom: 10px;
}
.feedback-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
