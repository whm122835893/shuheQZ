<template>
  <div class="agreement-page">
    <div class="page-header">
      <span class="page-title">协议管理</span>
    </div>

    <!-- 搜索区 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="协议名称">
          <el-input v-model="searchForm.name" placeholder="请输入协议名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="已启用" value="enabled" />
            <el-option label="已停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never">
      <div class="table-toolbar">
        <span class="toolbar-title">协议列表（共 {{ pageData.total }} 条）</span>
      </div>
      <el-table v-loading="loading" :data="pageData.list" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="协议名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="agreement_key" label="协议Key" width="200">
          <template #default="{ row }">
            <code class="key-text">{{ row.agreement_key }}</code>
          </template>
        </el-table-column>
        <el-table-column label="版本号" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small" effect="dark">
              {{ row.status === 'enabled' ? '已启用' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="180" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑协议</el-button>
            <el-button type="info" link size="small" @click="openPreview(row)">预览</el-button>
            <el-button
              :type="row.status === 'enabled' ? 'warning' : 'success'"
              link
              size="small"
              @click="handleToggle(row)"
            >
              {{ row.status === 'enabled' ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 编辑协议弹窗 -->
    <el-dialog
      v-model="editVisible"
      title="编辑协议"
      width="820px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="协议名称">
          <el-input v-model="editForm.name" disabled />
        </el-form-item>
        <el-form-item label="协议Key">
          <el-input v-model="editForm.agreementKey" disabled />
        </el-form-item>
        <el-form-item label="当前版本">
          <el-tag type="info" size="default">v{{ editForm.currentVersion }}</el-tag>
          <el-icon class="version-arrow"><ArrowRight /></el-icon>
          <el-tag type="success" size="default">v{{ editForm.nextVersion }}</el-tag>
          <span class="form-tip">保存后版本号自动 +0.1</span>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="editForm.content"
            type="textarea"
            :rows="15"
            placeholder="请输入协议内容（支持富文本/Markdown）"
          />
        </el-form-item>
        <el-form-item label="修改备注">
          <el-input
            v-model="editForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入本次修改备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="操作密码" prop="password">
          <el-input v-model="editForm.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 预览弹窗 -->
    <el-dialog v-model="previewVisible" :title="`预览：${previewData.name}`" width="820px">
      <div class="preview-meta">
        <el-tag size="small">Key：{{ previewData.agreementKey }}</el-tag>
        <el-tag type="success" size="small">版本 v{{ previewData.version }}</el-tag>
        <el-tag :type="previewData.status === 'enabled' ? 'success' : 'info'" size="small">
          {{ previewData.status === 'enabled' ? '已启用' : '已停用' }}
        </el-tag>
        <span class="form-tip">更新时间：{{ previewData.updatedAt }}</span>
      </div>
      <el-divider />
      <pre class="preview-content">{{ previewData.content }}</pre>
      <template #footer>
        <el-button type="primary" @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft, ArrowRight } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { systemApi } from '../../api'
import { paginate } from '../../utils/pagination'

interface AgreementItem {
  id: number
  name: string
  agreement_key: string
  version: string
  status: string
  content: string
  updated_at: string
}

const agreementList = ref<AgreementItem[]>([
  {
    id: 1,
    name: '用户协议',
    agreement_key: 'user_agreement',
    version: '2.1',
    status: 'enabled',
    content: '欢迎使用本平台。在使用本平台服务前，请您仔细阅读并同意本用户协议。\n本协议明确了您与平台之间的权利义务关系。\n一、服务内容\n二、用户义务\n三、知识产权\n四、免责声明\n五、争议解决',
    updated_at: '2026-08-05 09:00:00'
  },
  {
    id: 2,
    name: '隐私政策',
    agreement_key: 'privacy_policy',
    version: '1.3',
    status: 'enabled',
    content: '本隐私政策说明我们如何收集、使用、存储和保护您的个人信息。\n一、信息收集\n二、信息使用\n三、信息共享\n四、信息安全\n五、您的权利',
    updated_at: '2026-08-08 16:45:00'
  },
  {
    id: 3,
    name: '充值协议',
    agreement_key: 'recharge_agreement',
    version: '1.2',
    status: 'enabled',
    content: '充值协议\n请您在充值前仔细阅读本协议。\n一、充值方式与到账时间\n二、充值金额与限额\n三、充值优惠与活动规则\n四、退款政策\n五、禁止行为',
    updated_at: '2026-07-20 11:30:00'
  },
  {
    id: 4,
    name: '寄售协议',
    agreement_key: 'consignment_agreement',
    version: '1.1',
    status: 'enabled',
    content: '寄售协议\n本协议适用于您在平台寄售数字藏品的场景。\n一、寄售资格\n二、寄售定价规则\n三、手续费标准\n四、交易流程\n五、违规处理',
    updated_at: '2026-07-25 14:00:00'
  },
  {
    id: 5,
    name: '提现协议',
    agreement_key: 'withdraw_agreement',
    version: '1.4',
    status: 'enabled',
    content: '提现协议\n本协议适用于您在平台发起提现的场景。\n一、提现条件\n二、提现到账时间\n三、提现手续费\n四、银行卡绑定要求\n五、风险提示',
    updated_at: '2026-08-10 10:15:00'
  },
  {
    id: 6,
    name: '实名认证协议',
    agreement_key: 'realname_agreement',
    version: '1.0',
    status: 'enabled',
    content: '实名认证协议\n为保障账户安全与合规要求，使用平台部分功能需完成实名认证。\n一、认证所需信息\n二、信息使用范围\n三、信息保护措施\n四、认证审核流程\n五、认证失败处理',
    updated_at: '2026-06-15 09:30:00'
  },
  {
    id: 7,
    name: '未成年人保护协议',
    agreement_key: 'minor_protection',
    version: '1.2',
    status: 'disabled',
    content: '未成年人保护协议\n本协议旨在保护未成年人权益，防范未成年人沉迷与不当消费。\n一、年龄限制说明\n二、监护人责任\n三、消费限制措施\n四、退款保障\n五、投诉与举报渠道',
    updated_at: '2026-07-01 16:00:00'
  },
  {
    id: 8,
    name: '免责声明',
    agreement_key: 'disclaimer',
    version: '1.1',
    status: 'enabled',
    content: '免责声明\n本声明适用于平台提供的全部服务。\n一、服务变更与中断\n二、数字藏品价值波动风险\n三、技术风险\n四、法律合规风险\n五、投资有风险，入市需谨慎',
    updated_at: '2026-07-28 13:45:00'
  }
])

const searchForm = reactive({ name: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: AgreementItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): AgreementItem[] {
  let list = [...agreementList.value]
  if (searchForm.name) list = list.filter(a => a.name.includes(searchForm.name.trim()))
  if (searchForm.status) list = list.filter(a => a.status === searchForm.status)
  return list
}

// 注意：目前后端暂无协议专用列表接口，暂用 systemApi.global 中的 agreements 字段
async function loadData() {
  try {
    const res: any = await systemApi.global()
    if (res?.agreements && Array.isArray(res.agreements) && res.agreements.length) {
      agreementList.value = res.agreements.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        agreement_key: item.agreementKey || item.agreement_key || '',
        version: item.version || '1.0',
        status: item.status || 'enabled',
        content: item.content || '',
        updated_at: item.updatedAt || item.updated_at || ''
      }))
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

async function fetchData() {
  loading.value = true
  const res = paginate(getFiltered(), page.value, pageSize.value)
  pageData.value = { list: res.list as AgreementItem[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}
function handleReset() {
  searchForm.name = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 编辑协议
const editVisible = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editForm = reactive({
  id: 0,
  name: '',
  agreementKey: '',
  currentVersion: '',
  nextVersion: '',
  content: '',
  remark: '',
  password: ''
})

const editRules: FormRules = {
  content: [{ required: true, message: '请输入协议内容', trigger: 'blur' }],
  password: [{ required: true, message: '请输入操作密码', trigger: 'blur' }]
}

function openEdit(row: AgreementItem) {
  editForm.id = row.id
  editForm.name = row.name
  editForm.agreementKey = row.agreement_key
  editForm.currentVersion = row.version
  editForm.nextVersion = (parseFloat(row.version) + 0.1).toFixed(1)
  editForm.content = row.content
  editForm.remark = ''
  editForm.password = ''
  editVisible.value = true
  formRef.value?.resetFields()
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    const target = agreementList.value.find(a => a.id === editForm.id)
    if (target) {
      target.version = editForm.nextVersion
      target.content = editForm.content
      target.updated_at = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    }
    submitting.value = false
    editVisible.value = false
    ElMessage.success(`协议「${editForm.name}」已更新，版本号 v${editForm.nextVersion}`)
    fetchData()
  })
}

// 预览
const previewVisible = ref(false)
const previewData = reactive({
  name: '',
  agreementKey: '',
  version: '',
  status: '',
  content: '',
  updatedAt: ''
})
function openPreview(row: AgreementItem) {
  previewData.name = row.name
  previewData.agreementKey = row.agreement_key
  previewData.version = row.version
  previewData.status = row.status
  previewData.content = row.content
  previewData.updatedAt = row.updated_at
  previewVisible.value = true
}

// 启用/停用切换
function handleToggle(row: AgreementItem) {
  const enabling = row.status === 'disabled'
  ElMessageBox.confirm(
    `确定要${enabling ? '启用' : '停用'}协议「${row.name}」吗？`,
    `${enabling ? '启用' : '停用'}确认`,
    { type: 'warning', confirmButtonText: `确定${enabling ? '启用' : '停用'}`, cancelButtonText: '取消' }
  )
    .then(() => {
      row.status = enabling ? 'enabled' : 'disabled'
      row.updated_at = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      ElMessage.success(`协议「${row.name}」已${enabling ? '启用' : '停用'}`)
      fetchData()
    })
    .catch(() => {})
}

onMounted(async () => {
  await loadData()
  fetchData()
})
</script>

<style scoped>
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
.key-text {
  font-family: 'Menlo', 'Monaco', monospace;
  font-size: 12px;
  color: var(--color-primary);
  background: var(--bg-page);
  padding: 2px 6px;
  border-radius: 4px;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.version-arrow {
  margin: 0 8px;
  color: var(--text-secondary);
  vertical-align: -2px;
}
.preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.preview-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-regular);
  max-height: 50vh;
  overflow-y: auto;
  margin: 0;
}
</style>
