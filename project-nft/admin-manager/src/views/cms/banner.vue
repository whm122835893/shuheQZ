<template>
  <div class="banner-page">
    <el-card shadow="never" class="search-card">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="searchForm.title" placeholder="Banner名称" clearable style="width: 200px" />
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px; margin-left: 8px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
          <el-button type="primary" :icon="Search" @click="handleSearch" style="margin-left: 8px">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </div>
        <div>
          <el-button type="warning" :icon="Sort" plain @click="handleSort">排序</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新增Banner</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="pageData.list" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="图片预览" width="180" align="center">
          <template #default="{ row }">
            <el-image
              :src="row.image"
              :preview-src-list="[row.image]"
              preview-teleported
              fit="cover"
              style="width: 140px; height: 60px; border-radius: 4px"
            />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="跳转链接" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" :underline="false">{{ row.link }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="展示时间" width="280">
          <template #default="{ row }">
            <div class="time-range">{{ row.start_time }}</div>
            <div class="time-range">至 {{ row.end_time }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              @change="(val: any) => handleStatusChange(row, val as number)"
            />
          </template>
        </el-table-column>
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
      :title="isEdit ? '编辑Banner' : '新增Banner'"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="Banner图片" prop="image">
          <el-upload
            class="banner-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleBeforeUpload"
            :http-request="handleUpload"
          >
            <img v-if="form.image" :src="form.image" class="banner-preview" />
            <div v-else class="upload-placeholder">
              <el-icon class="upload-icon"><Plus /></el-icon>
              <span>点击上传 (建议 750x320)</span>
            </div>
          </el-upload>
        </el-form-item>
        <el-form-item label="名称" prop="title">
          <el-input v-model="form.title" placeholder="请输入Banner名称" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="跳转链接" prop="link">
          <el-input v-model="form.link" placeholder="https:// 或 /path" />
        </el-form-item>
        <el-form-item label="展示时间" prop="dateRange">
          <el-date-picker
            v-model="form.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="form.priority" :min="1" :max="999" />
          <span class="form-tip">数字越小优先级越高</span>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
          <span class="form-tip">数值越小越靠前</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
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
import { Search, RefreshLeft, Plus, Sort } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { cmsApi } from '../../api'
import { paginate } from '../../utils/pagination'

interface BannerItem {
  id: number
  title: string
  image: string
  link: string
  start_time: string
  end_time: string
  priority: number
  sort: number
  status: number
}

let idSeq = 100
const banners = ref<BannerItem[]>([])

const searchForm = reactive({ title: '', status: '' as number | '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: BannerItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): BannerItem[] {
  let list = [...banners.value]
  if (searchForm.title) list = list.filter(b => b.title.includes(searchForm.title.trim()))
  if (searchForm.status !== '') list = list.filter(b => b.status === searchForm.status)
  return list
}

async function loadData() {
  try {
    const res = await cmsApi.banners({ page: 1, pageSize: 100 })
    const resList = Array.isArray(res) ? res : (res?.list || [])
    if (resList.length) {
      banners.value = resList.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        image: item.image || '',
        link: item.link || '',
        start_time: item.startTime || item.start_time || '',
        end_time: item.endTime || item.end_time || '',
        priority: item.priority ?? 1,
        sort: item.sort ?? 0,
        status: item.status ?? 1
      }))
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

async function fetchData() {
  loading.value = true
  const res = paginate(getFiltered(), page.value, pageSize.value)
  pageData.value = { list: res.list as BannerItem[], total: res.total }
  loading.value = false
}

function handleSearch() { page.value = 1; fetchData() }
function handleReset() {
  searchForm.title = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

// 排序
function handleSort() {
  ElMessageBox.confirm(
    '将按「排序」字段升序重新排列 Banner 展示顺序，是否继续？',
    'Banner 排序',
    { type: 'warning', confirmButtonText: '确定排序', cancelButtonText: '取消' }
  )
    .then(() => {
      banners.value.sort((a, b) => a.sort - b.sort)
      fetchData()
      ElMessage.success('Banner 排序已更新')
    })
    .catch(() => {})
}

// 状态切换
function handleStatusChange(row: BannerItem, val: number) {
  ElMessage.success(`Banner「${row.title}」已${val === 1 ? '启用' : '禁用'}`)
}

// 新增/编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const defaultForm = () => ({
  id: 0,
  title: '',
  image: '',
  link: '',
  dateRange: [] as string[],
  priority: 1,
  sort: 0,
  status: 1
})
const form = reactive(defaultForm())

const rules: FormRules = {
  title: [{ required: true, message: '请输入Banner名称', trigger: 'blur' }],
  image: [{ required: true, message: '请上传Banner图片', trigger: 'change' }],
  link: [{ required: true, message: '请输入跳转链接', trigger: 'blur' }],
  dateRange: [{ required: true, message: '请选择展示时间', trigger: 'change' }],
  priority: [{ required: true, message: '请输入优先级', trigger: 'blur' }]
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, defaultForm())
  dialogVisible.value = true
  formRef.value?.resetFields()
}

function openEdit(row: BannerItem) {
  isEdit.value = true
  Object.assign(form, defaultForm())
  form.id = row.id
  form.title = row.title
  form.image = row.image
  form.link = row.link
  form.dateRange = [row.start_time, row.end_time]
  form.priority = row.priority
  form.sort = row.sort
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
      const target = banners.value.find(b => b.id === form.id)
      if (target) {
        target.title = form.title
        target.image = form.image
        target.link = form.link
        target.start_time = form.dateRange[0]
        target.end_time = form.dateRange[1]
        target.priority = form.priority
        target.sort = form.sort
        target.status = form.status
      }
      ElMessage.success('Banner 已更新')
    } else {
      banners.value.unshift({
        id: idSeq++,
        title: form.title,
        image: form.image,
        link: form.link,
        start_time: form.dateRange[0],
        end_time: form.dateRange[1],
        priority: form.priority,
        sort: form.sort,
        status: form.status
      })
      ElMessage.success('Banner 已创建')
    }
    submitting.value = false
    dialogVisible.value = false
    fetchData()
  })
}

function handleDelete(row: BannerItem) {
  ElMessageBox.confirm(
    `确定要删除 Banner「${row.title}」吗？删除后不可恢复。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
  )
    .then(() => {
      const idx = banners.value.findIndex(b => b.id === row.id)
      if (idx > -1) banners.value.splice(idx, 1)
      ElMessage.success('Banner 已删除')
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
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.time-range {
  font-size: 12px;
  color: var(--text-regular);
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.banner-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.banner-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.banner-preview {
  width: 320px;
  height: 120px;
  object-fit: cover;
  display: block;
}
.upload-placeholder {
  width: 320px;
  height: 120px;
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
