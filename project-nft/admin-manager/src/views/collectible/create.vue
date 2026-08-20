<template>
  <div class="collectible-create">
    <el-card>
      <div class="page-header">
        <span class="page-title">{{ isEdit ? '编辑藏品' : '创建藏品' }}</span>
        <el-button @click="router.back()">返回</el-button>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        style="max-width: 720px"
      >
        <el-form-item label="藏品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入藏品名称" maxlength="30" show-word-limit />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%" filterable allow-create>
            <el-option v-for="c in categoryNames" :key="c" :label="c" :value="c" />
          </el-select>
          <div class="form-tip" style="margin-top:4px">可在「藏品管理 > 藏品分类」中添加或修改分类</div>
        </el-form-item>

        <el-form-item label="发行总量" prop="edition">
          <el-input-number v-model="form.edition" :min="1" :max="100000" style="width: 200px" />
          <span class="form-tip">发行总量创建后不可修改</span>
        </el-form-item>

        <el-form-item label="发行方" prop="publisher">
          <el-input v-model="form.publisher" placeholder="请输入发行方" />
        </el-form-item>

        <el-form-item label="创作者" prop="creator">
          <el-input v-model="form.creator" placeholder="请输入创作者" />
        </el-form-item>

        <el-form-item label="版税费率" prop="royaltyRate">
          <el-input-number v-model="form.royaltyRate" :min="0" :max="30" :step="0.5" :precision="2" style="width: 200px" />
          <span class="form-tip">单位 %，范围 0~30</span>
        </el-form-item>

        <el-form-item label="藏品图片" prop="image">
          <el-upload
            class="image-uploader"
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

        <el-form-item label="藏品故事" prop="story">
          <el-input
            v-model="form.story"
            type="textarea"
            :rows="4"
            placeholder="请输入藏品背后的故事"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入藏品描述"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="handleSubmit('draft')" :loading="saving">保存草稿</el-button>
          <el-button type="primary" @click="handleSubmit('sale')" :loading="saving">保存并发售</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { collectibleApi } from '../../api'
import type { Collectible } from '../../api'
import { getEnabledCategoryNames, getAllCategoryNames, fetchCategories } from '../../api/category'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.id)

const formRef = ref<FormInstance>()
const saving = ref(false)

// 动态分类：创建时只显示启用的分类，编辑时也显示已禁用的旧分类
const categoryNames = computed(() => {
  if (isEdit.value) {
    return getAllCategoryNames()
  }
  return getEnabledCategoryNames()
})

const form = reactive({
  name: '',
  category: '',
  edition: 1000,
  publisher: '',
  creator: '',
  royaltyRate: 0,
  image: '',
  story: '',
  description: ''
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入藏品名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  edition: [{ required: true, message: '请输入发行总量', trigger: 'blur' }],
  publisher: [{ required: true, message: '请输入发行方', trigger: 'blur' }],
  creator: [{ required: true, message: '请输入创作者', trigger: 'blur' }],
  royaltyRate: [{ required: true, message: '请输入版税费率', trigger: 'blur' }],
  image: [{ required: true, message: '请上传藏品图片', trigger: 'change' }],
  story: [{ required: true, message: '请输入藏品故事', trigger: 'blur' }]
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
  // 本地预览：用 FileReader 生成 Data URL（提交时应由后端上传接口返回正式 URL）
  const reader = new FileReader()
  reader.onload = (e) => {
    form.image = e.target?.result as string
  }
  reader.readAsDataURL(options.file as Blob)
}

async function handleSubmit(type: 'draft' | 'sale') {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    const payload = {
      name: form.name,
      issuer: form.publisher,
      creator: form.creator,
      edition: form.edition,
      image: form.image,
      description: form.description,
      royaltyRate: form.royaltyRate,
      category: form.category,
      story: form.story,
      isRelease: type === 'sale' ? 1 : 0
    }
    try {
      if (isEdit.value) {
        await collectibleApi.update(route.query.id as string, payload)
      } else {
        await collectibleApi.create(payload)
      }
      ElMessage.success(type === 'draft' ? '草稿已保存' : '藏品已创建并发售')
      router.push('/collectible')
    } catch (e) {
      ElMessage.error('操作失败')
    } finally {
      saving.value = false
    }
  })
}

async function loadData() {
  if (!isEdit.value) return
  const id = route.query.id
  try {
    const c: Collectible = await collectibleApi.detail(id as string)
    form.name = c.name || ''
    form.category = ''
    form.edition = c.edition || 1000
    form.publisher = c.issuer || ''
    form.creator = c.creator || ''
    form.royaltyRate = c.royaltyRate ?? 0
    form.image = c.image || ''
    form.story = ''
    form.description = c.description || ''
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

onMounted(async () => {
  // 分类选项来自后端公开端点 GET /categories（替代 localStorage）
  await fetchCategories()
  await loadData()
})
</script>

<style scoped>
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.image-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.image-uploader :deep(.el-upload:hover) {
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
