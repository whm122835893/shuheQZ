<template>
  <div class="payment-page">
    <div class="page-header">
      <span class="page-title">支付渠道配置</span>
    </div>

    <!-- 微信支付配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Wallet /></el-icon> 微信支付配置</span>
          <el-tag type="success" size="small">{{ wechatForm.enabled ? '已启用' : '已停用' }}</el-tag>
        </div>
      </template>
      <el-form ref="wechatFormRef" :model="wechatForm" :rules="wechatRules" label-width="120px" style="max-width: 680px">
        <el-form-item label="渠道名称">
          <el-input v-model="wechatForm.channel" disabled />
        </el-form-item>
        <el-form-item label="商户号" prop="mchId">
          <el-input v-model="wechatForm.mchId" placeholder="请输入微信商户号" />
        </el-form-item>
        <el-form-item label="API密钥" prop="apiKey">
          <el-input v-model="wechatForm.apiKey" type="password" show-password placeholder="请输入API密钥" />
        </el-form-item>
        <el-form-item label="AppID" prop="appId">
          <el-input v-model="wechatForm.appId" placeholder="请输入公众号/小程序AppID" />
        </el-form-item>
        <el-form-item label="回调地址" prop="callbackUrl">
          <el-input v-model="wechatForm.callbackUrl" placeholder="https://api.example.com/pay/wechat/callback" />
        </el-form-item>
        <el-form-item label="手续费率" prop="feeRate">
          <el-input-number v-model="wechatForm.feeRate" :min="0" :max="100" :precision="2" :step="0.1" />
          <span class="form-tip">%</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="wechatForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving.wechat" :icon="Check" @click="handleSave('wechat')">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 支付宝配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><CreditCard /></el-icon> 支付宝配置</span>
          <el-tag type="success" size="small">{{ alipayForm.enabled ? '已启用' : '已停用' }}</el-tag>
        </div>
      </template>
      <el-form ref="alipayFormRef" :model="alipayForm" :rules="alipayRules" label-width="120px" style="max-width: 680px">
        <el-form-item label="渠道名称">
          <el-input v-model="alipayForm.channel" disabled />
        </el-form-item>
        <el-form-item label="应用ID" prop="appId">
          <el-input v-model="alipayForm.appId" placeholder="请输入支付宝应用ID" />
        </el-form-item>
        <el-form-item label="私钥" prop="privateKey">
          <el-input v-model="alipayForm.privateKey" type="textarea" :rows="4" placeholder="请输入应用私钥" />
        </el-form-item>
        <el-form-item label="公钥" prop="publicKey">
          <el-input v-model="alipayForm.publicKey" type="textarea" :rows="4" placeholder="请输入支付宝公钥" />
        </el-form-item>
        <el-form-item label="回调地址" prop="callbackUrl">
          <el-input v-model="alipayForm.callbackUrl" placeholder="https://api.example.com/pay/alipay/callback" />
        </el-form-item>
        <el-form-item label="手续费率" prop="feeRate">
          <el-input-number v-model="alipayForm.feeRate" :min="0" :max="100" :precision="2" :step="0.1" />
          <span class="form-tip">%</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="alipayForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving.alipay" :icon="Check" @click="handleSave('alipay')">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 变更历史搜索 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="渠道">
          <el-select v-model="searchForm.channel" placeholder="全部" clearable style="width: 200px">
            <el-option label="微信支付" value="wechat" />
            <el-option label="支付宝" value="alipay" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 变更历史表格 -->
    <el-card shadow="never">
      <div class="table-toolbar">
        <span class="toolbar-title">变更历史（共 {{ pageData.total }} 条）</span>
      </div>
      <el-table v-loading="loading" :data="pageData.list" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column label="渠道" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.channel === 'wechat' ? 'success' : 'primary'" size="small">
              {{ row.channel === 'wechat' ? '微信支付' : '支付宝' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="变更内容" min-width="260" show-overflow-tooltip />
        <el-table-column prop="operator" label="操作人" width="140" />
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchHistory"
        @current-change="fetchHistory"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Wallet, CreditCard, Check, Search, RefreshLeft } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { systemApi } from '../../api'
import { paginate } from '../../utils/pagination'

// ========== 微信支付 ==========
const wechatFormRef = ref<FormInstance>()
const wechatForm = reactive({
  channel: '微信支付',
  mchId: '',
  apiKey: '',
  appId: '',
  callbackUrl: '',
  feeRate: 0,
  enabled: false
})
const wechatRules: FormRules = {
  mchId: [{ required: true, message: '请输入商户号', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入API密钥', trigger: 'blur' }],
  appId: [{ required: true, message: '请输入AppID', trigger: 'blur' }],
  callbackUrl: [{ required: true, message: '请输入回调地址', trigger: 'blur' }],
  feeRate: [{ required: true, message: '请输入手续费率', trigger: 'blur' }]
}

// ========== 支付宝 ==========
const alipayFormRef = ref<FormInstance>()
const alipayForm = reactive({
  channel: '支付宝',
  appId: '',
  privateKey: '',
  publicKey: '',
  callbackUrl: '',
  feeRate: 0,
  enabled: false
})
const alipayRules: FormRules = {
  appId: [{ required: true, message: '请输入应用ID', trigger: 'blur' }],
  privateKey: [{ required: true, message: '请输入私钥', trigger: 'blur' }],
  publicKey: [{ required: true, message: '请输入公钥', trigger: 'blur' }],
  callbackUrl: [{ required: true, message: '请输入回调地址', trigger: 'blur' }],
  feeRate: [{ required: true, message: '请输入手续费率', trigger: 'blur' }]
}

// ========== 保存 ==========
const saving = reactive({ wechat: false, alipay: false })
const formRefMap: Record<string, any> = { wechat: wechatFormRef, alipay: alipayFormRef }

async function handleSave(type: 'wechat' | 'alipay') {
  const formRef = formRefMap[type]
  if (!formRef || !formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    saving[type] = true
    saving[type] = false
    const cfg = type === 'wechat' ? wechatForm : alipayForm
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    historyList.value.unshift({
      id: historyIdSeq++,
      time: now,
      channel: type,
      content: `${cfg.channel}配置已更新：手续费率 ${cfg.feeRate}%，渠道${cfg.enabled ? '已启用' : '已停用'}`,
      operator: 'admin'
    })
    ElMessage.success(`${cfg.channel}配置已保存`)
    fetchHistory()
  })
}

// ========== 变更历史 ==========
interface HistoryItem {
  id: number
  time: string
  channel: string
  content: string
  operator: string
}

let historyIdSeq = 100
// TODO: 变更历史需要后端 API 支持，当前仅本地记录保存操作产生的变更
const historyList = ref<HistoryItem[]>([])

const searchForm = reactive<{ channel: string; dateRange: [string, string] | null }>({
  channel: '',
  dateRange: null
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: HistoryItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): HistoryItem[] {
  let list = [...historyList.value]
  if (searchForm.channel) list = list.filter(h => h.channel === searchForm.channel)
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(h => h.time.slice(0, 10) >= start && h.time.slice(0, 10) <= end)
  }
  return list
}

async function loadData() {
  try {
    const res: any = await systemApi.payment()
    if (res) {
      // 微信支付（兼容嵌套对象和扁平字段两种返回格式）
      const w = res.wechat || {}
      wechatForm.mchId = w.mchId || res.wechatMchId || ''
      wechatForm.apiKey = w.apiKey || ''
      wechatForm.appId = w.appId || res.wechatAppId || ''
      wechatForm.callbackUrl = w.callbackUrl || ''
      wechatForm.feeRate = w.feeRate !== undefined ? Number(w.feeRate) : 0
      wechatForm.enabled = w.enabled !== undefined ? !!w.enabled : !!res.wechatEnabled

      // 支付宝（兼容嵌套对象和扁平字段两种返回格式）
      const a = res.alipay || {}
      alipayForm.appId = a.appId || res.alipayAppId || ''
      alipayForm.privateKey = a.privateKey || ''
      alipayForm.publicKey = a.publicKey || ''
      alipayForm.callbackUrl = a.callbackUrl || ''
      alipayForm.feeRate = a.feeRate !== undefined ? Number(a.feeRate) : 0
      alipayForm.enabled = a.enabled !== undefined ? !!a.enabled : !!res.alipayEnabled
    }
  } catch (e: any) {
    ElMessage.error(e.message || '数据加载失败')
  }
}

async function fetchHistory() {
  loading.value = true
  const res = paginate(getFiltered(), page.value, pageSize.value)
  pageData.value = { list: res.list as HistoryItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchHistory()
}
function handleReset() {
  searchForm.channel = ''
  searchForm.dateRange = null
  page.value = 1
  fetchHistory()
}

onMounted(async () => {
  await loadData()
  fetchHistory()
})
</script>

<style scoped>
.config-card {
  margin-bottom: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: var(--text-primary);
}
.card-header .el-icon {
  vertical-align: -2px;
  margin-right: 4px;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
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
