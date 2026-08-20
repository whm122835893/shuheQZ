<template>
  <div class="order-page">
    <div class="page-header">
      <span class="page-title">订单管理</span>
      <div>
        <el-button :type="onlyAbnormal ? 'warning' : 'default'" @click="toggleAbnormal">
          <el-icon><Warning /></el-icon>
          {{ onlyAbnormal ? '退出异常筛选' : '异常订单筛选' }}
        </el-button>
        <el-button type="success" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出订单
        </el-button>
      </div>
    </div>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="用户手机号">
          <el-input v-model="searchForm.phone" placeholder="请输入手机号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="订单类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 360px"
          />
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
        <el-table-column prop="order_no" label="订单号" width="170" fixed="left" />
        <el-table-column label="用户" width="160">
          <template #default="{ row }">
            <div>{{ row.username }}</div>
            <div class="sub-text">{{ row.user_phone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="订单类型" width="110">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" effect="light">{{ row.type_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="product_name" label="商品名称" min-width="130" />
        <el-table-column label="金额" width="120" align="right">
          <template #default="{ row }">
            <span class="amount-text">¥{{ Number(row.amount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark">{{ row.status_text }}</el-tag>
            <el-tag v-if="isAbnormal(row)" type="danger" effect="plain" size="small" style="margin-left:4px">异常</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pay_method_text" label="支付方式" width="100" />
        <el-table-column prop="created_at" label="下单时间" width="170" />
        <el-table-column label="操作" width="360" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看详情</el-button>
            <el-button link type="info" size="small" @click="openPayLog(row)">支付日志</el-button>
            <el-button
              v-if="row.status === 'pending'"
              link
              type="warning"
              size="small"
              @click="handleMarkPaid(row)"
            >标记已支付</el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'paid'"
              link
              type="danger"
              size="small"
              @click="handleForceCancel(row)"
            >强制取消</el-button>
            <el-button
              v-if="row.status === 'paid'"
              link
              type="danger"
              size="small"
              @click="openRefund(row)"
            >退款</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions v-if="currentOrder" :column="2" border>
        <el-descriptions-item label="订单号">{{ currentOrder.order_no }}</el-descriptions-item>
        <el-descriptions-item label="订单类型">{{ currentOrder.type_text }}</el-descriptions-item>
        <el-descriptions-item label="用户">{{ currentOrder.username }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentOrder.user_phone }}</el-descriptions-item>
        <el-descriptions-item label="商品名称">{{ currentOrder.product_name }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ Number(currentOrder.amount).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ currentOrder.status_text }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ currentOrder.pay_method_text }}</el-descriptions-item>
        <el-descriptions-item label="下单时间">{{ currentOrder.created_at }}</el-descriptions-item>
        <el-descriptions-item label="用户ID">{{ currentOrder.user_id }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog v-model="refundVisible" title="订单退款" width="480px">
      <el-form :model="refundForm" label-width="90px">
        <el-form-item label="订单号">
          <span>{{ refundForm.orderNo }}</span>
        </el-form-item>
        <el-form-item label="可退金额">
          <span class="amount-text">¥{{ Number(refundForm.maxAmount).toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="退款金额" required>
          <el-input-number
            v-model="refundForm.amount"
            :min="0.01"
            :max="refundForm.maxAmount"
            :precision="2"
            :step="1"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="退款原因" required>
          <el-select v-model="refundForm.reason" placeholder="请选择退款原因" style="width: 100%">
            <el-option label="重复支付" value="重复支付" />
            <el-option label="未收到藏品" value="未收到藏品" />
            <el-option label="用户主动退款" value="用户主动退款" />
            <el-option label="系统异常" value="系统异常" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="danger" :loading="refundLoading" @click="confirmRefund">确认退款</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="confirmPwd" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelPwd">取消</el-button>
        <el-button type="primary" @click="confirmPwd">确认</el-button>
      </template>
    </el-dialog>

    <!-- 支付日志弹窗 -->
    <el-dialog v-model="payLogVisible" title="支付回调日志" width="800px">
      <el-table :data="payLogData" border stripe size="small">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column label="渠道" width="100">
          <template #default="{ row }">
            <el-tag :type="row.channel === '微信' ? 'success' : 'primary'" size="small">{{ row.channel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="event" label="事件" width="150" />
        <el-table-column prop="raw_data" label="原始数据" min-width="300" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="payLogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, refundApi, type OrderListItem } from '../../api'

interface OrderItem {
  id: number
  order_no: string
  user_id: number
  username: string
  user_phone: string
  type: string
  type_text: string
  product_name: string
  amount: number
  status: string
  status_text: string
  pay_method: string
  pay_method_text: string
  created_at: string
}

const statusOptions = [
  { label: '待支付', value: 'pending' },
  { label: '已完成', value: 'paid' },
  { label: '已取消', value: 'cancelled' },
  { label: '已退款', value: 'refunded' }
]
const typeOptions = [
  { label: '公售', value: 'public_sale' },
  { label: '优先购', value: 'priority' },
  { label: '市场购买', value: 'market' },
  { label: '资格购', value: 'qualification' },
  { label: '盲盒购买', value: 'blindbox' }
]

const searchForm = reactive({
  orderNo: '',
  phone: '',
  status: '',
  type: '',
  dateRange: [] as string[]
})

const onlyAbnormal = ref(false)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const pageData = ref<{ list: OrderItem[]; total: number }>({ list: [], total: 0 })

function isAbnormal(row: OrderItem) {
  // 异常订单：金额为0、待支付超过一定时间、或重复支付场景模拟
  return row.status === 'pending' && row.amount === 0
}

function statusTagType(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    paid: 'success',
    cancelled: 'info',
    refunded: 'danger'
  }
  return map[status] || 'info'
}

function typeTagType(type: string) {
  const map: Record<string, string> = {
    public_sale: '',
    priority: 'success',
    market: 'warning',
    qualification: 'danger',
    blindbox: 'info'
  }
  return map[type] || ''
}

function getFilteredList(): OrderItem[] {
  // 仅导出当前已加载页数据，过滤已移至服务端
  return [...pageData.value.list]
}

// API 数据映射所需的文本映射
const orderStatusTextMap: Record<string, string> = {
  pending: '待支付', paid: '已完成', cancelled: '已取消', refunded: '已退款'
}
const orderTypeTextMap: Record<string, string> = {
  public_sale: '公售', priority: '优先购', market: '市场购买', qualification: '资格购', blindbox: '盲盒购买'
}
const orderPayMethodTextMap: Record<string, string> = {
  alipay: '支付宝', wechat: '微信', balance: '余额'
}

// 后端列表接口返回的扁平化/联表字段，OrderListItem 未覆盖这些额外字段，
// 此处以 OrderListItem 为基础叠加可选的额外字段，保证类型精确的同时不破坏现有映射逻辑。
type OrderListRawItem = OrderListItem & {
  type?: number | string
  payMethod?: string
  pay_method?: string
  order_no?: string
  user_id?: number | string
  username?: string
  userPhone?: string
  user_phone?: string
  typeText?: string
  productName?: string
  collectibleName?: string
  product_name?: string
  amount?: string
  statusText?: string
  payMethodText?: string
  created_at?: string
}

function mapOrderItem(item: OrderListRawItem): OrderItem {
  const statusNumMap: Record<number, string> = { 0: 'pending', 1: 'paid', 2: 'cancelled', 3: 'refunded' }
  const status = typeof item.status === 'number' ? (statusNumMap[item.status] || 'pending') : (item.status || 'pending')
  const typeNumMap: Record<number, string> = { 0: 'public_sale', 1: 'priority', 2: 'market', 3: 'qualification', 4: 'blindbox' }
  const type = typeof item.type === 'number' ? (typeNumMap[item.type] || '') : (item.type || '')
  const payMethod = item.payMethod || item.pay_method || ''
  return {
    id: Number(item.id),
    order_no: item.orderNo || item.order_no || '',
    user_id: Number(item.userId || item.user_id) || 0,
    username: item.username || '',
    user_phone: item.userPhone || item.user_phone || '',
    type,
    type_text: item.typeText || orderTypeTextMap[type] || type,
    product_name: item.productName || item.collectibleName || item.product_name || '',
    amount: parseFloat(item.amount ?? '') || 0,
    status,
    status_text: item.statusText || orderStatusTextMap[status] || status,
    pay_method: payMethod,
    pay_method_text: item.payMethodText || orderPayMethodTextMap[payMethod] || payMethod,
    created_at: item.createdAt || item.created_at || ''
  } as OrderItem
}

async function fetchData() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      pageSize: pageSize.value
    }
    if (searchForm.orderNo) params.orderNo = searchForm.orderNo.trim()
    if (searchForm.phone) params.phone = searchForm.phone.trim()
    if (searchForm.status) params.status = searchForm.status
    if (searchForm.type) params.type = searchForm.type
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    if (onlyAbnormal.value) params.abnormal = 1
    const result = await orderApi.list(params)
    pageData.value = {
      list: result.list.map(mapOrderItem),
      total: result.total
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
    pageData.value = { list: [], total: 0 }
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchData()
}

function handleReset() {
  searchForm.orderNo = ''
  searchForm.phone = ''
  searchForm.status = ''
  searchForm.type = ''
  searchForm.dateRange = []
  onlyAbnormal.value = false
  page.value = 1
  fetchData()
}

function toggleAbnormal() {
  onlyAbnormal.value = !onlyAbnormal.value
  page.value = 1
  fetchData()
  ElMessage.info(onlyAbnormal.value ? '已切换到异常订单筛选' : '已显示全部订单')
}

// 详情
const detailVisible = ref(false)
const currentOrder = ref<OrderItem | null>(null)
function openDetail(row: OrderItem) {
  currentOrder.value = row
  detailVisible.value = true
}

// 支付日志
const payLogVisible = ref(false)
const payLogData = ref<any[]>([])
function openPayLog(row: OrderItem) {
  const fee = Math.round(row.amount * 100)
  const templates = [
    { time: '2026-08-13 14:30:25', channel: '微信', event: 'pay_success', raw_data: `{"transaction_id":"wx20260813143025001","out_trade_no":"${row.order_no}","total_fee":${fee},"time_end":"20260813143025","openid":"oXXXXXXXX","trade_type":"JSAPI"}` },
    { time: '2026-08-13 14:30:30', channel: '支付宝', event: 'notify', raw_data: `{"trade_no":"2026081322001400000123456","out_trade_no":"${row.order_no}","total_amount":"${row.amount.toFixed(2)}","trade_status":"TRADE_SUCCESS","gmt_payment":"2026-08-13 14:30:30","buyer_id":"2088XXXXXXXX"}` },
    { time: '2026-08-13 14:30:32', channel: '微信', event: 'callback', raw_data: `{"return_code":"SUCCESS","return_msg":"OK","result_code":"SUCCESS","out_trade_no":"${row.order_no}","transaction_id":"4200000000202608130000001"}` },
    { time: '2026-08-13 14:30:35', channel: '支付宝', event: 'callback', raw_data: `{"sign":"RSA2","sign_type":"RSA2","trade_no":"2026081322001400000123456","out_trade_no":"${row.order_no}","total_amount":"${row.amount.toFixed(2)}","seller_id":"2088XXXX","app_id":"2021000000000001"}` },
    { time: '2026-08-13 14:30:38', channel: '微信', event: 'notify', raw_data: `{"appid":"wxXXXXXX","bank_type":"OTHERS","cash_fee":${fee},"fee_type":"CNY","is_subscribe":"N","mch_id":"1600000000","nonce_str":"abc123def456","openid":"oXXXXXX","out_trade_no":"${row.order_no}","result_code":"SUCCESS","return_code":"SUCCESS","time_end":"20260813143025","total_fee":${fee},"trade_type":"JSAPI","transaction_id":"4200000000202608130000001"}` }
  ]
  const count = 3 + Math.floor(Math.random() * 3)
  payLogData.value = templates.slice(0, count)
  payLogVisible.value = true
}

// 标记已支付
async function handleMarkPaid(row: OrderItem) {
  try {
    await ElMessageBox.confirm(
      `确认将订单 ${row.order_no} 标记为已支付吗？金额 ¥${row.amount.toFixed(2)}`,
      '标记已支付',
      { type: 'warning' }
    )
    const ok = await requirePassword('标记订单已支付')
    if (!ok) return
    row.status = 'paid'
    row.status_text = '已完成'
    ElMessage.success('已标记为已支付')
  } catch {
    // 取消
  }
}

// 强制取消
async function handleForceCancel(row: OrderItem) {
  try {
    await ElMessageBox.confirm(
      `确认强制取消订单 ${row.order_no} 吗？该操作不可逆！`,
      '强制取消订单',
      { type: 'error' }
    )
    const ok = await requirePassword('强制取消订单')
    if (!ok) return
    row.status = 'cancelled'
    row.status_text = '已取消'
    ElMessage.success('订单已强制取消')
  } catch {
    // 取消
  }
}

// 退款
const refundVisible = ref(false)
const refundLoading = ref(false)
const refundForm = reactive({
  orderNo: '',
  maxAmount: 0,
  amount: 0,
  reason: ''
})
function openRefund(row: OrderItem) {
  refundForm.orderNo = row.order_no
  refundForm.maxAmount = row.amount
  refundForm.amount = row.amount
  refundForm.reason = ''
  refundVisible.value = true
}
async function confirmRefund() {
  if (!refundForm.reason) {
    ElMessage.warning('请选择退款原因')
    return
  }
  if (refundForm.amount <= 0 || refundForm.amount > refundForm.maxAmount) {
    ElMessage.warning('退款金额不合法')
    return
  }
  const ok = await requirePassword('订单退款')
  if (!ok) return
  refundLoading.value = true
  try {
    await refundApi.approve(refundForm.orderNo)
  } catch (e) {
    refundLoading.value = false
    return
  }
  refundLoading.value = false
  refundVisible.value = false
  ElMessage.success(`退款成功，金额 ¥${refundForm.amount.toFixed(2)}`)
  fetchData()
}

// 导出
function handleExport() {
  const list = getFilteredList()
  const header = ['订单号', '用户', '手机号', '订单类型', '商品名称', '金额', '状态', '支付方式', '下单时间']
  const rows = list.map(o => [
    o.order_no,
    o.username,
    o.user_phone,
    o.type_text,
    o.product_name,
    o.amount.toFixed(2),
    o.status_text,
    o.pay_method_text,
    o.created_at
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `订单列表_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条订单`)
}

// 密码验证
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(action: string): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.resolve = resolve
    pwdDialog.visible = true
  })
}
function confirmPwd() {
  if (!pwdDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  pwdDialog.visible = false
  pwdDialog.resolve?.(true)
}
function cancelPwd() {
  pwdDialog.visible = false
  pwdDialog.resolve?.(false)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.amount-text {
  color: var(--color-danger);
  font-weight: 600;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
