<template>
  <div class="blindbox-create">
    <el-card>
      <div class="page-header">
        <span class="page-title">{{ isEdit ? '编辑盲盒' : '创建盲盒' }}</span>
        <el-button @click="router.back()">返回</el-button>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="max-width: 760px">
        <el-form-item label="盲盒名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入盲盒名称" maxlength="30" show-word-limit />
        </el-form-item>

        <el-form-item label="盲盒图片" prop="image">
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

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入盲盒描述"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="盲盒发行总量" prop="edition">
          <el-input-number v-model="form.edition" :min="1" :max="100000" style="width: 200px" :disabled="isEdit" />
          <span class="form-tip">发行总量创建后不可变更</span>
        </el-form-item>
      </el-form>

      <el-divider content-position="left">子藏品配置</el-divider>

      <div class="items-config">
        <div class="items-header">
          <span class="items-title">子藏品列表（至少 2 个，概率总和必须等于 100%）</span>
          <el-button type="primary" :icon="Plus" @click="addItem">添加子藏品</el-button>
        </div>

        <el-alert
          :type="probabilityValid ? 'success' : 'error'"
          :closable="false"
          show-icon
          style="margin: 12px 0"
        >
          <template #title>
            概率总和：{{ probabilitySum.toFixed(4) }}%
            <span v-if="probabilityValid" style="margin-left: 12px">概率总和 = 100%，可以保存</span>
            <span v-else style="margin-left: 12px; color: var(--color-danger)">
              概率总和 {{ probabilitySum.toFixed(4) }}% ≠ 100%，{{ probabilitySum < 100 ? '还差 ' + (100 - probabilitySum).toFixed(4) + '%' : '超出 ' + (probabilitySum - 100).toFixed(4) + '%' }}，已拦截保存
            </span>
          </template>
        </el-alert>

        <!-- 概率可视化进度条 -->
        <div class="probability-viz">
          <div class="viz-title">概率分布可视化</div>
          <div v-for="(item, index) in form.items" :key="index" class="viz-item">
            <span class="viz-label">{{ item.name || `子藏品${index + 1}` }}</span>
            <el-progress
              :percentage="Math.min(parseFloat(item.probability.toFixed(2)), 100)"
              :color="progressColors[index % progressColors.length]"
              :stroke-width="14"
              style="flex: 1"
            />
            <span class="viz-value">{{ item.probability.toFixed(4) }}%</span>
          </div>
        </div>

        <!-- 子藏品卡片列表 -->
        <div class="sub-items-list">
          <el-card
            v-for="(item, index) in form.items"
            :key="index"
            class="sub-item-card"
            shadow="hover"
          >
            <div class="sub-item-header">
              <span class="sub-item-title">子藏品 {{ index + 1 }}</span>
              <el-button
                link
                type="danger"
                size="small"
                :disabled="form.items.length <= 2"
                @click="removeItem(index)"
              >
                删除
              </el-button>
            </div>

            <el-form label-width="100px" class="sub-item-form">
              <div class="sub-item-row">
                <div class="sub-item-left">
                  <el-form-item label="藏品图片" required>
                    <el-upload
                      class="sub-image-uploader"
                      action="#"
                      :show-file-list="false"
                      :before-upload="handleBeforeUpload"
                      :http-request="(opts: any) => handleSubUpload(opts, index)"
                    >
                      <img v-if="item.image" :src="item.image" class="sub-upload-preview" />
                      <div v-else class="sub-upload-placeholder">
                        <el-icon><Plus /></el-icon>
                        <span>上传</span>
                      </div>
                    </el-upload>
                  </el-form-item>
                </div>
                <div class="sub-item-right">
                  <el-form-item label="藏品名称" required>
                    <el-input v-model="item.name" placeholder="请输入藏品名称" maxlength="20" />
                  </el-form-item>
                  <el-form-item label="发行量" required>
                    <el-input-number v-model="item.edition" :min="1" :max="100000" style="width: 180px" />
                    <span class="form-tip">该子藏品计划发行数量</span>
                  </el-form-item>
                  <el-form-item label="中奖概率" required>
                    <el-input-number
                      v-model="item.probability"
                      :min="0.0001"
                      :max="100"
                      :precision="4"
                      :step="0.0001"
                      style="width: 180px"
                    />
                    <span class="form-tip">%</span>
                  </el-form-item>
                </div>
              </div>
              <el-form-item label="描述">
                <el-input
                  v-model="item.description"
                  type="textarea"
                  :rows="2"
                  placeholder="请输入藏品描述"
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item label="藏品故事">
                <el-input
                  v-model="item.story"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入藏品故事（选填）"
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-form>
          </el-card>
        </div>

        <div class="items-tip" v-if="form.items.length < 2">至少需要配置 2 个子藏品</div>
      </div>

      <div class="form-footer">
        <el-button @click="handleSubmit('draft')" :loading="saving" :disabled="!canSave">保存草稿</el-button>
        <el-button type="primary" @click="handleSubmit('sale')" :loading="saving" :disabled="!canSave">保存并上架</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { blindBoxApi } from '../../api'

const router = useRouter()
const route = useRoute()

const isEdit = computed(() => !!route.query.id)

const formRef = ref<FormInstance>()
const saving = ref(false)

const progressColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#a18cd1']

interface SubItem {
  name: string
  image: string
  description: string
  story: string
  edition: number
  probability: number
}

const form = reactive({
  name: '',
  image: '',
  description: '',
  edition: 1000,
  items: [
    { name: '', image: '', description: '', story: '', edition: 100, probability: 50 },
    { name: '', image: '', description: '', story: '', edition: 100, probability: 50 }
  ] as SubItem[]
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入盲盒名称', trigger: 'blur' }],
  image: [{ required: true, message: '请上传盲盒图片', trigger: 'change' }],
  edition: [{ required: true, message: '请输入发行总量', trigger: 'blur' }]
}

const probabilitySum = computed(() =>
  form.items.reduce((sum, item) => sum + (item.probability || 0), 0)
)
// 概率必须等于 100%
const probabilityValid = computed(() => Math.abs(probabilitySum.value - 100) < 0.0001)
const canSave = computed(() => form.items.length >= 2 && probabilityValid.value)

function addItem() {
  form.items.push({
    name: '',
    image: '',
    description: '',
    story: '',
    edition: 100,
    probability: 0
  })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
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

function handleSubUpload(options: UploadRequestOptions, index: number) {
  const reader = new FileReader()
  reader.onload = (e) => {
    form.items[index].image = e.target?.result as string
  }
  reader.readAsDataURL(options.file as Blob)
}

async function handleSubmit(type: 'draft' | 'sale') {
  if (!canSave.value) {
    if (form.items.length < 2) {
      ElMessage.warning('至少需要配置 2 个子藏品')
      return
    }
    if (!probabilityValid.value) {
      ElMessage.warning(`概率总和 ${probabilitySum.value.toFixed(4)}% 不等于 100%，无法保存`)
      return
    }
  }
  // 校验子藏品必填项
  for (let i = 0; i < form.items.length; i++) {
    const item = form.items[i]
    if (!item.name) {
      ElMessage.warning(`请填写第 ${i + 1} 个子藏品的名称`)
      return
    }
    if (!item.image) {
      ElMessage.warning(`请上传第 ${i + 1} 个子藏品的图片`)
      return
    }
    if (!item.edition || item.edition < 1) {
      ElMessage.warning(`请填写第 ${i + 1} 个子藏品的发行量`)
      return
    }
  }
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    saving.value = true
    try {
      await blindBoxApi.create({
        name: form.name,
        image: form.image,
        description: form.description,
        edition: form.edition,
        status: type === 'sale' ? 2 : 0,
        items: form.items.map((item) => ({
          name: item.name,
          image: item.image,
          description: item.description,
          story: item.story,
          edition: item.edition,
          probability: item.probability
        }))
      })
      if (type === 'draft') {
        ElMessage.success('盲盒草稿已保存')
      } else {
        ElMessage.success('盲盒已创建并上架')
      }
      router.push('/blindbox')
    } catch (e) {
      ElMessage.error('保存失败')
      saving.value = false
      return
    }
    saving.value = false
  })
}

onMounted(async () => {
  if (isEdit.value) {
    const id = Number(route.query.id)
    try {
      const detail = await blindBoxApi.detail(id)
      form.name = detail.name || ''
      form.image = detail.image || ''
      form.description = detail.description || ''
      form.edition = detail.edition || 1000
      form.items = (detail.items || []).map((it: any) => ({
        name: it.collectible_name || it.name || '',
        image: it.collectible_image || it.image || '',
        description: it.description || '',
        story: it.story || '',
        edition: it.planned_quantity || it.edition || 100,
        probability: it.probability || 0
      }))
    } catch (e) {
      ElMessage.error('数据加载失败')
    }
  }
})
</script>

<style scoped>
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.items-config {
  margin-top: 12px;
}
.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.items-title {
  font-weight: 600;
  color: var(--text-primary);
}
.items-tip {
  margin-top: 8px;
  color: var(--color-danger);
  font-size: 13px;
}
.probability-viz {
  background: var(--bg-page);
  border-radius: 8px;
  padding: 16px;
}
.viz-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}
.viz-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.viz-label {
  width: 140px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.viz-value {
  width: 90px;
  flex-shrink: 0;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.sub-items-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sub-item-card {
  border-radius: 8px;
}
.sub-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}
.sub-item-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}
.sub-item-row {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.sub-item-left {
  flex-shrink: 0;
}
.sub-item-right {
  flex: 1;
}
.sub-image-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.sub-image-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.sub-upload-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  display: block;
}
.sub-upload-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}
.form-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
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
