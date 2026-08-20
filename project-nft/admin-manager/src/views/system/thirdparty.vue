<template>
  <div class="thirdparty-page">
    <div class="page-header">
      <span class="page-title">第三方服务配置</span>
    </div>

    <!-- OSS 对象存储配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Files /></el-icon> OSS 对象存储配置</span>
          <el-tag type="success" size="small">阿里云 OSS</el-tag>
        </div>
      </template>
      <el-form ref="ossFormRef" :model="ossForm" :rules="ossRules" label-width="120px" style="max-width: 680px">
        <el-form-item label="AccessKey" prop="accessKey">
          <el-input v-model="ossForm.accessKey" placeholder="请输入 AccessKey ID" />
        </el-form-item>
        <el-form-item label="Bucket" prop="bucket">
          <el-input v-model="ossForm.bucket" placeholder="请输入 Bucket 名称" />
        </el-form-item>
        <el-form-item label="Endpoint" prop="endpoint">
          <el-input v-model="ossForm.endpoint" placeholder="https://oss-cn-hangzhou.aliyuncs.com" />
        </el-form-item>
        <el-form-item label="区域" prop="region">
          <el-select v-model="ossForm.region" placeholder="请选择区域" style="width: 240px">
            <el-option label="华东1（杭州）" value="cn-hangzhou" />
            <el-option label="华东2（上海）" value="cn-shanghai" />
            <el-option label="华北1（青岛）" value="cn-qingdao" />
            <el-option label="华北2（北京）" value="cn-beijing" />
            <el-option label="华南1（深圳）" value="cn-shenzhen" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving.oss" :icon="Check" @click="handleSave('oss', 'OSS对象存储')">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- SMS 短信服务配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Message /></el-icon> SMS 短信服务配置</span>
          <el-tag :type="smsForm.enabled ? 'success' : 'info'" size="small">{{ smsForm.enabled ? '已启用' : '已停用' }}</el-tag>
        </div>
      </template>
      <el-form ref="smsFormRef" :model="smsForm" :rules="smsRules" label-width="120px" style="max-width: 680px">
        <el-form-item label="服务商" prop="provider">
          <el-select v-model="smsForm.provider" placeholder="请选择服务商" style="width: 240px">
            <el-option label="阿里云" value="aliyun" />
            <el-option label="腾讯云" value="tencent" />
            <el-option label="华为云" value="huawei" />
          </el-select>
        </el-form-item>
        <el-form-item label="签名名称" prop="signName">
          <el-input v-model="smsForm.signName" placeholder="请输入短信签名名称" />
        </el-form-item>
        <el-form-item label="AccessKey" prop="accessKey">
          <el-input v-model="smsForm.accessKey" placeholder="请输入 AccessKey" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="smsForm.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving.sms" :icon="Check" @click="handleSave('sms', 'SMS短信服务')">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 地图服务配置 -->
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><LocationInformation /></el-icon> 地图服务配置</span>
          <el-tag type="success" size="small">{{ mapProviderLabel }}</el-tag>
        </div>
      </template>
      <el-form ref="mapFormRef" :model="mapForm" :rules="mapRules" label-width="120px" style="max-width: 680px">
        <el-form-item label="服务商" prop="provider">
          <el-select v-model="mapForm.provider" placeholder="请选择服务商" style="width: 240px">
            <el-option label="高德地图" value="amap" />
            <el-option label="百度地图" value="baidu" />
            <el-option label="腾讯地图" value="tencent" />
          </el-select>
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="mapForm.apiKey" type="password" show-password placeholder="请输入地图服务 API Key" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving.map" :icon="Check" @click="handleSave('map', '地图服务')">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 变更历史搜索 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="服务">
          <el-select v-model="searchForm.service" placeholder="全部" clearable style="width: 200px">
            <el-option label="OSS对象存储" value="oss" />
            <el-option label="SMS短信服务" value="sms" />
            <el-option label="地图服务" value="map" />
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
        <el-table-column label="服务" width="160" align="center">
          <template #default="{ row }">
            <el-tag :type="serviceTagType(row.service)" size="small">{{ serviceLabel(row.service) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="变更内容" min-width="280" show-overflow-tooltip />
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

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：保存${pwdDialog.action}配置`" type="warning" :closable="false" show-icon style="margin-bottom: 16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="confirmPwd" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelPwd">取消</el-button>
        <el-button type="primary" :loading="pwdDialog.loading" @click="confirmPwd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Files, Message, LocationInformation, Check, Search, RefreshLeft } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { systemApi } from '../../api'
import { put } from '../../api/request'
import { paginate } from '../../utils/pagination'

// ========== OSS ==========
const ossFormRef = ref<FormInstance>()
const ossForm = reactive({
  accessKey: '',
  bucket: 'collectible-prod',
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
  region: 'cn-hangzhou'
})
const ossRules: FormRules = {
  accessKey: [{ required: true, message: '请输入 AccessKey', trigger: 'blur' }],
  bucket: [{ required: true, message: '请输入 Bucket', trigger: 'blur' }],
  endpoint: [{ required: true, message: '请输入 Endpoint', trigger: 'blur' }],
  region: [{ required: true, message: '请选择区域', trigger: 'change' }]
}

// ========== SMS ==========
const smsFormRef = ref<FormInstance>()
const smsForm = reactive({
  provider: 'aliyun',
  signName: '数字藏品',
  accessKey: '',
  enabled: true
})
const smsRules: FormRules = {
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  signName: [{ required: true, message: '请输入签名名称', trigger: 'blur' }],
  accessKey: [{ required: true, message: '请输入 AccessKey', trigger: 'blur' }]
}

// ========== 地图 ==========
const mapFormRef = ref<FormInstance>()
const mapForm = reactive({
  provider: 'amap',
  apiKey: ''
})
const mapRules: FormRules = {
  provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
  apiKey: [{ required: true, message: '请输入 API Key', trigger: 'blur' }]
}

const mapProviderLabel = computed(() => {
  const map: Record<string, string> = { amap: '高德地图', baidu: '百度地图', tencent: '腾讯地图' }
  return map[mapForm.provider] || '未选择'
})

// ========== 保存（含密码验证） ==========
const saving = reactive({ oss: false, sms: false, map: false })
const formRefMap: Record<string, any> = { oss: ossFormRef, sms: smsFormRef, map: mapFormRef }

const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  loading: false,
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

type ServiceType = 'oss' | 'sms' | 'map'
function serviceLabel(val: string) {
  const map: Record<string, string> = { oss: 'OSS对象存储', sms: 'SMS短信服务', map: '地图服务' }
  return map[val] || '未知'
}
function serviceTagType(val: string) {
  const map: Record<string, string> = { oss: 'primary', sms: 'success', map: 'warning' }
  return map[val] || 'info'
}

async function handleSave(type: ServiceType, actionLabel: string) {
  const formRef = formRefMap[type]
  if (!formRef || !formRef.value) return
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    const ok = await requirePassword(actionLabel)
    if (!ok) return
    saving[type] = true
    try {
      const configMap: Record<string, any> = { oss: ossForm, sms: smsForm, map: mapForm }
      await put('/system/thirdparty', { type, ...configMap[type] })
      const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      let content = ''
      if (type === 'oss') {
        content = `OSS配置已更新：Bucket「${ossForm.bucket}」，区域 ${ossForm.region}`
      } else if (type === 'sms') {
        const providerMap: Record<string, string> = { aliyun: '阿里云', tencent: '腾讯云', huawei: '华为云' }
        content = `短信服务配置已更新：服务商「${providerMap[smsForm.provider]}」，签名「${smsForm.signName}」，${smsForm.enabled ? '已启用' : '已停用'}`
      } else {
        const providerMap: Record<string, string> = { amap: '高德', baidu: '百度', tencent: '腾讯' }
        content = `地图服务配置已更新：服务商「${providerMap[mapForm.provider]}」，API Key 已更新`
      }
      historyList.value.unshift({
        id: historyIdSeq++,
        time: now,
        service: type,
        content,
        operator: 'admin'
      })
      ElMessage.success(`${actionLabel}配置已保存`)
      fetchHistory()
    } catch (e: any) {
      ElMessage.error(e.message || `${actionLabel}配置保存失败`)
    } finally {
      saving[type] = false
    }
  })
}

// ========== 变更历史 ==========
interface HistoryItem {
  id: number
  time: string
  service: string
  content: string
  operator: string
}

let historyIdSeq = 100
const services: ServiceType[] = ['oss', 'sms', 'map']
const changeContents: Record<string, string[]> = {
  oss: ['更换 Bucket 为 collectible-prod', '迁移 Endpoint 至华东2', '更新 AccessKey（密钥轮换）', '切换区域至华南1（深圳）'],
  sms: ['切换服务商为腾讯云', '更新短信签名为「数字藏品」', '短信服务临时停用', '短信服务重新启用'],
  map: ['切换地图服务商为百度地图', '更新地图 API Key', '切换地图服务商为高德地图', '地图服务限流配置调整']
}

const historyList = ref<HistoryItem[]>(
  Array.from({ length: 12 }, (_, i) => {
    const svc = services[i % 3]
    const contents = changeContents[svc]
    return {
      id: i + 1,
      time: `2026-${String(7 + (i % 2)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')} ${String(10 + (i % 8)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}:00`,
      service: svc,
      content: contents[i % contents.length],
      operator: ['admin', 'dev01', 'operator01'][i % 3]
    }
  })
)

const searchForm = reactive<{ service: string; dateRange: [string, string] | null }>({
  service: '',
  dateRange: null
})
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: HistoryItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): HistoryItem[] {
  let list = [...historyList.value]
  if (searchForm.service) list = list.filter(h => h.service === searchForm.service)
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [start, end] = searchForm.dateRange
    list = list.filter(h => h.time.slice(0, 10) >= start && h.time.slice(0, 10) <= end)
  }
  return list
}

async function loadData() {
  try {
    const res: any = await systemApi.global()
    if (res) {
      // OSS 对象存储
      if (res.oss) {
        const o = res.oss
        if (o.accessKey) ossForm.accessKey = o.accessKey
        if (o.bucket) ossForm.bucket = o.bucket
        if (o.endpoint) ossForm.endpoint = o.endpoint
        if (o.region) ossForm.region = o.region
      }
      // SMS 短信服务
      if (res.sms) {
        const s = res.sms
        if (s.provider) smsForm.provider = s.provider
        if (s.signName) smsForm.signName = s.signName
        if (s.accessKey) smsForm.accessKey = s.accessKey
        if (s.enabled !== undefined) smsForm.enabled = !!s.enabled
      }
      // 地图服务
      if (res.map) {
        const m = res.map
        if (m.provider) mapForm.provider = m.provider
        if (m.apiKey) mapForm.apiKey = m.apiKey
      }
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
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
  searchForm.service = ''
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
