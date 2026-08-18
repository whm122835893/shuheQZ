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
import { cmsApi } from '../../api'
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

const agreementList = ref<AgreementItem[]>([])

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

// 通过 cmsApi.agreements 获取协议列表
async function loadData() {
  try {
    const res: any = await cmsApi.agreements()
    const list = Array.isArray(res) ? res : (res?.list ?? [])
    if (list.length) {
      agreementList.value = list.map((item: any) => ({
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
    try {
      await cmsApi.updateAgreement(editForm.id, {
        content: editForm.content,
        version: editForm.nextVersion,
        remark: editForm.remark,
        password: editForm.password
      })
      ElMessage.success(`协议「${editForm.name}」已更新，版本号 v${editForm.nextVersion}`)
      editVisible.value = false
      await loadData()
      fetchData()
    } catch (e: any) {
      ElMessage.error(e.message || '保存失败')
    } finally {
      submitting.value = false
    }
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
    .then(async () => {
      try {
        await cmsApi.updateAgreement(row.id, { status: enabling ? 'enabled' : 'disabled' })
        ElMessage.success(`协议「${row.name}」已${enabling ? '启用' : '停用'}`)
        await loadData()
        fetchData()
      } catch (e: any) {
        ElMessage.error(e.message || '操作失败')
      }
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
