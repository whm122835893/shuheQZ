<template>
  <div class="artifact-page">
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="文物名称">
          <el-input v-model="searchForm.name" placeholder="请输入文物名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="展览状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <div class="table-toolbar">
        <span class="toolbar-title">藏品展览列表（共 {{ pageData.total }} 件）</span>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增藏品</el-button>
      </div>

      <el-table v-loading="loading" :data="pageData.list" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="文物名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="图片" width="110" align="center">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              :preview-src-list="[row.image]"
              preview-teleported
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 6px"
            />
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="展览状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="dark">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑 dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑藏品' : '新增藏品'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="文物名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入文物名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="图片" prop="image">
          <el-upload
            class="artifact-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleUpload"
          >
            <img v-if="form.image" :src="form.image" class="upload-preview" />
            <div v-else class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <span>点击上传图片</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 220px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入文物描述"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="展览状态" prop="status">
          <el-select v-model="form.status" placeholder="请选择展览状态" style="width: 220px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshLeft, Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { cmsApi } from '../../api'
import { paginate } from '../../utils/pagination'

const categories = ['青铜器', '陶瓷', '书画', '玉器', '金银器', '古籍']
const statusOptions = [
  { label: '展览中', value: 'exhibiting' },
  { label: '未上架', value: 'unlisted' },
  { label: '已下架', value: 'offline' }
]

function statusLabel(val: string) {
  return statusOptions.find(s => s.value === val)?.label || '未知'
}
function statusTagType(val: string) {
  const map: Record<string, string> = { exhibiting: 'success', unlisted: 'info', offline: 'danger' }
  return map[val] || 'info'
}

interface ArtifactItem {
  id: number
  name: string
  image: string
  category: string
  description: string
  status: string
  created_at: string
}

let idSeq = 100
const artifacts = ref<ArtifactItem[]>([])

const searchForm = reactive({ name: '', category: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: ArtifactItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): ArtifactItem[] {
  let list = [...artifacts.value]
  if (searchForm.name) list = list.filter(a => a.name.includes(searchForm.name.trim()))
  if (searchForm.category) list = list.filter(a => a.category === searchForm.category)
  if (searchForm.status) list = list.filter(a => a.status === searchForm.status)
  return list
}

// 注意：目前后端暂无藏品展览专用接口，暂用 cmsApi.announcements 作为最近匹配
async function loadData() {
  try {
    const res = await cmsApi.announcements({ page: 1, pageSize: 1000, type: 'artifact' })
    if (res?.list?.length) {
      artifacts.value = res.list.map((item: any) => ({
        id: item.id,
        name: item.title || item.name || '',
        image: item.image || '',
        category: item.category || '其他',
        description: item.content || item.description || '',
        status: item.status || 'unlisted',
        created_at: item.createdAt || item.created_at || ''
      }))
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

async function fetchData() {
  loading.value = true
  const res = paginate(getFiltered(), page.value, pageSize.value)
  pageData.value = { list: res.list as ArtifactItem[], total: res.total }
  loading.value = false
}

function handleSearch() { page.value = 1; fetchData() }
function handleReset() {
  searchForm.name = ''
  searchForm.category = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 新增/编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const defaultForm = () => ({
  id: 0,
  name: '',
  image: '',
  category: '',
  description: '',
  status: 'unlisted'
})
const form = reactive(defaultForm())

const rules: FormRules = {
  name: [{ required: true, message: '请输入文物名称', trigger: 'blur' }],
  image: [{ required: true, message: '请上传图片', trigger: 'change' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述', trigger: 'blur' }],
  status: [{ required: true, message: '请选择展览状态', trigger: 'change' }]
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, defaultForm())
  dialogVisible.value = true
  formRef.value?.resetFields()
}

function openEdit(row: ArtifactItem) {
  isEdit.value = true
  Object.assign(form, defaultForm())
  form.id = row.id
  form.name = row.name
  form.image = row.image
  form.category = row.category
  form.description = row.description
  form.status = row.status
  dialogVisible.value = true
}

function handleBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

function handleUpload(options: UploadRequestOptions) {
  const reader = new FileReader()
  reader.onload = (e) => {
    form.image = e.target?.result as string
  }
  reader.readAsDataURL(options.file as Blob)
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    if (isEdit.value) {
      const target = artifacts.value.find(a => a.id === form.id)
      if (target) {
        target.name = form.name
        target.image = form.image
        target.category = form.category
        target.description = form.description
        target.status = form.status
      }
      ElMessage.success('藏品已更新')
    } else {
      artifacts.value.unshift({
        id: idSeq++,
        name: form.name,
        image: form.image,
        category: form.category,
        description: form.description,
        status: form.status,
        created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      })
      ElMessage.success('藏品已创建')
    }
    submitting.value = false
    dialogVisible.value = false
    fetchData()
  })
}

function handleDelete(row: ArtifactItem) {
  ElMessageBox.confirm(
    `确定要删除藏品「${row.name}」吗？删除后不可恢复。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
  )
    .then(() => {
      const idx = artifacts.value.findIndex(a => a.id === row.id)
      if (idx > -1) artifacts.value.splice(idx, 1)
      ElMessage.success('藏品已删除')
      fetchData()
    })
    .catch(() => {})
}

onMounted(async () => { await loadData(); fetchData() })
</script>

<style scoped>
.search-card {
  margin-bottom: 16px;
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
.artifact-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.artifact-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.upload-preview {
  width: 160px;
  height: 160px;
  object-fit: cover;
  display: block;
}
.upload-placeholder {
  width: 160px;
  height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.upload-icon {
  font-size: 28px;
  color: var(--text-placeholder);
}
</style>
