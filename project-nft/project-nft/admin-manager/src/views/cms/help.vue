<template>
  <div class="news-page">
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="openCreate">发布新闻</el-button>
    </div>
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="标题">
          <el-input v-model="searchForm.title" placeholder="请输入标题" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部" clearable style="width: 200px">
            <el-option v-for="c in allCategories" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 200px">
            <el-option label="已发布" value="published" />
            <el-option label="草稿" value="draft" />
            <el-option label="定时发布" value="scheduled" />
            <el-option label="已下线" value="offline" />
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
        <span class="toolbar-title">新闻列表（共 {{ pageData.total }} 条）</span>
      </div>

      <el-table v-loading="loading" :data="pageData.list" border stripe>
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="图片" width="80" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.image"
              :src="row.image"
              :preview-src-list="[row.image]"
              preview-teleported
              fit="cover"
              style="width: 50px; height: 30px; border-radius: 4px"
            />
            <span v-else class="sub-text">无</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="分类" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.category }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small" effect="dark">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publish_time" label="发布时间" width="170" />
        <el-table-column label="置顶" width="90" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_top"
              @change="(val: any) => handleTopChange(row, val as boolean)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              :type="row.status === 'offline' ? 'success' : 'warning'"
              link
              size="small"
              @click="handleToggleOnline(row)"
            >
              {{ row.status === 'offline' ? '上线' : '下线' }}
            </el-button>
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑新闻' : '发布新闻'"
      width="860px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入标题" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <div class="category-row">
            <el-select v-model="form.category" placeholder="请选择分类" style="width: 220px" filterable>
              <el-option v-for="c in enabledCategories" :key="c.id" :label="c.name" :value="c.name" />
            </el-select>
            <el-button :icon="Plus" @click="openCategoryDialog">新建分类</el-button>
          </div>
        </el-form-item>
        <el-form-item label="新闻图片">
          <el-upload
            class="news-image-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleImageBeforeUpload"
            :http-request="handleImageUpload"
          >
            <img v-if="form.image" :src="form.image" class="news-upload-preview" />
            <div v-else class="news-upload-placeholder">
              <el-icon class="news-upload-icon"><Plus /></el-icon>
              <span>上传新闻图片</span>
            </div>
          </el-upload>
          <div class="form-tip" style="margin-top:4px">可选，支持 JPG/PNG，不超过 2MB</div>
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <RichTextEditor
            v-model="form.content"
            :height="320"
            placeholder="请输入新闻内容..."
          />
        </el-form-item>
        <el-form-item label="发布时间">
          <el-radio-group v-model="form.publish_mode">
            <el-radio value="immediate">立即发布</el-radio>
            <el-radio value="scheduled">定时发布</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.publish_mode === 'scheduled'" label="定时时间" required>
          <el-date-picker
            v-model="form.scheduled_time"
            type="datetime"
            placeholder="请选择定时发布时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 320px"
          />
          <span class="form-tip">到达指定时间后自动发布</span>
        </el-form-item>
        <el-form-item label="置顶">
          <el-switch v-model="form.is_top" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button @click="handleSubmit('draft')" :loading="submitting">存为草稿</el-button>
        <el-button type="primary" @click="handleSubmit('publish')" :loading="submitting">保存并发布</el-button>
      </template>
    </el-dialog>

    <!-- 新建分类弹窗 -->
    <el-dialog v-model="categoryDialogVisible" title="新建新闻分类" width="440px" :close-on-click-modal="false" append-to-body>
      <el-form label-width="90px">
        <el-form-item label="分类名称" required>
          <el-input
            v-model="newCategoryName"
            placeholder="请输入分类名称"
            maxlength="20"
            show-word-limit
            clearable
            @keyup.enter="confirmAddCategory"
          />
        </el-form-item>
      </el-form>
      <div v-if="allCategories.length > 0" class="existing-cats">
        <div class="existing-header">
          <span class="existing-label">当前分类（点击 × 删除）</span>
          <el-tag size="small" type="info" effect="plain">共 {{ allCategories.length }} 个</el-tag>
        </div>
        <div class="tag-list">
          <el-tag
            v-for="c in allCategories"
            :key="c.id"
            size="default"
            :type="c.enabled ? '' : 'info'"
            closable
            @close="handleDeleteCategory(c)"
            style="margin: 3px 4px"
          >
            {{ c.name }}
            <el-icon v-if="!c.enabled" style="vertical-align:-1px;margin-left:2px"><Hide /></el-icon>
          </el-tag>
        </div>
      </div>
      <template #footer>
        <el-button @click="categoryDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddCategory">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, RefreshLeft, Hide } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { cmsApi } from '../../api'
import { paginate } from '../../utils/pagination'
import RichTextEditor from '../../components/RichTextEditor.vue'
import {
  getEnabledNewsCategories,
  getAllNewsCategories,
  addNewsCategory,
  deleteNewsCategory,
  type NewsCategory
} from '../../api/newsCategory'

const enabledCategories = computed(() => getEnabledNewsCategories())
const allCategories = computed(() => getAllNewsCategories())

function statusLabel(val: string) {
  const map: Record<string, string> = { published: '已发布', draft: '草稿', scheduled: '定时发布', offline: '已下线' }
  return map[val] || '未知'
}
function statusTagType(val: string) {
  const map: Record<string, string> = { published: 'success', draft: 'info', scheduled: 'warning', offline: 'danger' }
  return map[val] || 'info'
}

interface NewsItem {
  id: number
  title: string
  category: string
  content: string
  image: string
  status: string
  publish_time: string
  is_top: boolean
}

let idSeq = 1000
const newsList = ref<NewsItem[]>([])

const searchForm = reactive({ title: '', category: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: NewsItem[]; total: number }>({ list: [], total: 0 })

function getFiltered(): NewsItem[] {
  let list = [...newsList.value]
  if (searchForm.title) list = list.filter(n => n.title.includes(searchForm.title.trim()))
  if (searchForm.category) list = list.filter(n => n.category === searchForm.category)
  if (searchForm.status) list = list.filter(n => n.status === searchForm.status)
  return list
}

// 通过 cmsApi.announcements 获取新闻/公告列表
async function loadData() {
  try {
    const res = await cmsApi.announcements({ page: 1, pageSize: 1000, type: 'news' })
    if (res?.list?.length) {
      newsList.value = res.list.map((item: any) => ({
        id: item.id,
        title: item.title || '',
        category: item.category || '默认',
        content: item.content || '',
        image: item.image || '',
        status: item.status || 'draft',
        publish_time: item.publishTime || item.publish_time || '',
        is_top: !!(item.isTop ?? item.is_top)
      }))
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

async function fetchData() {
  loading.value = true
  const res = paginate(getFiltered(), page.value, pageSize.value)
  pageData.value = { list: res.list as NewsItem[], total: res.total }
  loading.value = false
}

function handleSearch() { page.value = 1; fetchData() }
function handleReset() {
  searchForm.title = ''
  searchForm.category = ''
  searchForm.status = ''
  page.value = 1
  fetchData()
}

function handleTopChange(row: NewsItem, val: boolean) {
  ElMessage.success(`新闻「${row.title}」已${val ? '置顶' : '取消置顶'}`)
}

function handleToggleOnline(row: NewsItem) {
  const online = row.status === 'offline'
  ElMessageBox.confirm(
    `确定要${online ? '上线' : '下线'}新闻「${row.title}」吗？`,
    `${online ? '上线' : '下线'}确认`,
    { type: 'warning' }
  )
    .then(() => {
      row.status = online ? 'published' : 'offline'
      ElMessage.success(`新闻已${online ? '上线' : '下线'}`)
    })
    .catch(() => { row.status = online ? 'offline' : 'published' })
}

// 新增/编辑
const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const defaultForm = () => ({
  id: 0,
  title: '',
  category: '',
  content: '',
  image: '',
  publish_mode: 'immediate' as 'immediate' | 'scheduled',
  scheduled_time: '',
  is_top: false
})
const form = reactive(defaultForm())

function validateContent(_rule: any, value: string, callback: (err?: Error) => void) {
  if (!value || value.replace(/<[^>]+>/g, '').trim() === '') {
    callback(new Error('请输入内容'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, validator: validateContent, trigger: 'blur' }]
}

function openCreate() {
  isEdit.value = false
  Object.assign(form, defaultForm())
  dialogVisible.value = true
  formRef.value?.resetFields()
}

function openEdit(row: NewsItem) {
  isEdit.value = true
  Object.assign(form, defaultForm())
  form.id = row.id
  form.title = row.title
  form.category = row.category
  form.content = row.content
  form.image = row.image || ''
  form.is_top = row.is_top
  form.publish_mode = row.status === 'scheduled' ? 'scheduled' : 'immediate'
  form.scheduled_time = row.status === 'scheduled' ? row.publish_time : ''
  dialogVisible.value = true
}

async function handleSubmit(mode: 'draft' | 'publish') {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (mode === 'publish' && form.publish_mode === 'scheduled' && !form.scheduled_time) {
      ElMessage.warning('请选择定时发布时间')
      return
    }
    submitting.value = true
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    let status: string
    let publishTime: string
    if (mode === 'draft') {
      status = 'draft'
      publishTime = now
    } else if (form.publish_mode === 'scheduled') {
      status = 'scheduled'
      publishTime = form.scheduled_time
    } else {
      status = 'published'
      publishTime = now
    }
    if (isEdit.value) {
      const target = newsList.value.find(n => n.id === form.id)
      if (target) {
        target.title = form.title
        target.category = form.category
        target.content = form.content
        target.image = form.image
        target.is_top = form.is_top
        target.status = status
        target.publish_time = publishTime
      }
      ElMessage.success('新闻已更新')
    } else {
      newsList.value.unshift({
        id: idSeq++,
        title: form.title,
        category: form.category,
        content: form.content,
        image: form.image,
        status,
        publish_time: publishTime,
        is_top: form.is_top
      })
      ElMessage.success(status === 'scheduled' ? `新闻已设置定时发布，将于 ${form.scheduled_time} 自动发布` : '新闻已发布')
    }
    submitting.value = false
    dialogVisible.value = false
    fetchData()
  })
}

function handleDelete(row: NewsItem) {
  ElMessageBox.confirm(
    `确定要删除新闻「${row.title}」吗？删除后不可恢复。`,
    '删除确认',
    { type: 'warning', confirmButtonText: '确定删除', cancelButtonText: '取消' }
  )
    .then(() => {
      const idx = newsList.value.findIndex(n => n.id === row.id)
      if (idx > -1) newsList.value.splice(idx, 1)
      ElMessage.success('新闻已删除')
      fetchData()
    })
    .catch(() => {})
}

// 图片上传
function handleImageBeforeUpload(file: File) {
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

function handleImageUpload(options: UploadRequestOptions) {
  const reader = new FileReader()
  reader.onload = (e) => {
    form.image = e.target?.result as string
  }
  reader.readAsDataURL(options.file as Blob)
}

// ========== 新建分类 ==========
const categoryDialogVisible = ref(false)
const newCategoryName = ref('')

function openCategoryDialog() {
  newCategoryName.value = ''
  categoryDialogVisible.value = true
}

function confirmAddCategory() {
  const result = addNewsCategory(newCategoryName.value)
  if (result.success) {
    // 自动选中新创建的分类
    form.category = newCategoryName.value.trim()
    ElMessage.success(result.message)
    categoryDialogVisible.value = false
  } else {
    ElMessage.warning(result.message)
  }
}

async function handleDeleteCategory(cat: NewsCategory) {
  try {
    await ElMessageBox.confirm(
      `确认删除分类「${cat.name}」吗？\n\n删除后：\n• 发布新闻时将不再显示该分类\n• 已使用该分类的新闻不受影响\n• 此操作不可恢复`,
      '删除分类',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    deleteNewsCategory(cat.id)
    // 如果当前表单选中的是被删除的分类，清空选择
    if (form.category === cat.name) {
      form.category = ''
    }
    ElMessage.success('分类已删除')
  } catch {
    // 取消
  }
}

onMounted(async () => { await loadData(); fetchData() })
</script>

<style scoped>
.search-card {
  margin-bottom: 16px;
}
.create-btn-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.create-btn {
  width: 320px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
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
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.category-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.news-image-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.news-image-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.news-upload-preview {
  width: 200px;
  height: 100px;
  object-fit: cover;
  display: block;
}
.news-upload-placeholder {
  width: 200px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}
.news-upload-icon {
  font-size: 24px;
  color: var(--text-placeholder);
}
.existing-cats {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 6px;
}
.existing-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.existing-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
}
</style>
