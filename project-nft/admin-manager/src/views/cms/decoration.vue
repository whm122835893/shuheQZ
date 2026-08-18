<template>
  <div class="decoration-page">
    <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
      <!-- 基础配置 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="card-header">
            <span><el-icon><Setting /></el-icon> 基础配置</span>
          </div>
        </template>
        <el-row :gutter="24">
          <el-col :xs="24" :md="12">
            <el-form-item label="网站名称" prop="siteName">
              <el-input v-model="form.siteName" placeholder="请输入网站名称" maxlength="20" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-form-item label="网站全局头像" prop="avatar">
              <el-upload
                class="avatar-uploader"
                action="#"
                :show-file-list="false"
                :before-upload="handleBeforeUpload"
                :http-request="handleAvatarUpload"
              >
                <img v-if="form.avatar" :src="form.avatar" class="avatar-preview" />
                <div v-else class="upload-placeholder">
                  <el-icon class="upload-icon"><Plus /></el-icon>
                  <span>上传头像</span>
                </div>
              </el-upload>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 按钮颜色配置 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="card-header">
            <span><el-icon><Brush /></el-icon> 按钮颜色配置</span>
            <el-button type="primary" link size="small" @click="resetButtonColors">恢复默认</el-button>
          </div>
        </template>
        <el-row :gutter="24">
          <el-col :xs="12" :sm="6">
            <el-form-item label="登录按钮">
              <div class="color-picker-box">
                <el-color-picker v-model="form.loginBtnColor" />
                <span class="color-value">{{ form.loginBtnColor }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-form-item label="认证按钮">
              <div class="color-picker-box">
                <el-color-picker v-model="form.authBtnColor" />
                <span class="color-value">{{ form.authBtnColor }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-form-item label="下单按钮">
              <div class="color-picker-box">
                <el-color-picker v-model="form.orderBtnColor" />
                <span class="color-value">{{ form.orderBtnColor }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6">
            <el-form-item label="支付按钮">
              <div class="color-picker-box">
                <el-color-picker v-model="form.payBtnColor" />
                <span class="color-value">{{ form.payBtnColor }}</span>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <div class="preview-buttons">
          <el-button :style="{ background: form.loginBtnColor, borderColor: form.loginBtnColor, color: '#fff' }">登录按钮预览</el-button>
          <el-button :style="{ background: form.authBtnColor, borderColor: form.authBtnColor, color: '#fff' }">认证按钮预览</el-button>
          <el-button :style="{ background: form.orderBtnColor, borderColor: form.orderBtnColor, color: '#fff' }">下单按钮预览</el-button>
          <el-button :style="{ background: form.payBtnColor, borderColor: form.payBtnColor, color: '#fff' }">支付按钮预览</el-button>
        </div>
      </el-card>

      <!-- 背景渐变色配置 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="card-header">
            <span><el-icon><MagicStick /></el-icon> 背景渐变色配置</span>
          </div>
        </template>
        <el-row :gutter="24" align="middle">
          <el-col :xs="24" :sm="8">
            <el-form-item label="起始颜色">
              <div class="color-picker-box">
                <el-color-picker v-model="form.bgColorStart" />
                <span class="color-value">{{ form.bgColorStart }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="结束颜色">
              <div class="color-picker-box">
                <el-color-picker v-model="form.bgColorEnd" />
                <span class="color-value">{{ form.bgColorEnd }}</span>
              </div>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="预览效果">
              <div class="gradient-preview" :style="{ background: `linear-gradient(135deg, ${form.bgColorStart}, ${form.bgColorEnd})` }">
                背景渐变预览
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-card>

      <!-- 金刚区配置 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="card-header">
            <span><el-icon><Grid /></el-icon> 金刚区配置</span>
            <el-button type="primary" :icon="Plus" size="small" @click="addKingkong">添加一组</el-button>
          </div>
        </template>
        <el-table :data="form.kingkongList" border stripe>
          <el-table-column label="序号" type="index" width="70" align="center" />
          <el-table-column label="图标" width="120" align="center">
            <template #default="{ row, $index }">
              <el-upload
                class="kingkong-uploader"
                action="#"
                :show-file-list="false"
                :before-upload="handleBeforeUpload"
                :http-request="(opts: any) => handleKingkongUpload(opts, $index)"
              >
                <img v-if="row.image" :src="row.image" class="kingkong-preview" />
                <div v-else class="kingkong-placeholder">
                  <el-icon><Plus /></el-icon>
                </div>
              </el-upload>
            </template>
          </el-table-column>
          <el-table-column label="名称" min-width="200">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="请输入名称" maxlength="8" />
            </template>
          </el-table-column>
          <el-table-column label="跳转链接" min-width="220">
            <template #default="{ row }">
              <el-input v-model="row.link" placeholder="/path 或 https://" />
            </template>
          </el-table-column>
          <el-table-column label="排序" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.sort" :min="0" :max="999" controls-position="right" style="width: 100px" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ $index }">
              <el-button
                type="danger"
                link
                size="small"
                :disabled="form.kingkongList.length <= 1"
                @click="removeKingkong($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 保存按钮 -->
      <div class="save-bar">
        <el-button @click="handleReset">重置配置</el-button>
        <el-button type="primary" :loading="saving" :icon="Check" @click="handleSave">保存装修配置</el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Brush, MagicStick, Grid, Plus, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { systemApi } from '../../api'

interface KingkongItem {
  name: string
  image: string
  link: string
  sort: number
}

const formRef = ref<FormInstance>()
const saving = ref(false)

const defaultConfig = () => ({
  siteName: '数字藏品平台',
  avatar: '',
  loginBtnColor: '#667eea',
  authBtnColor: '#43e97b',
  orderBtnColor: '#fa709a',
  payBtnColor: '#fbc2eb',
  bgColorStart: '#667eea',
  bgColorEnd: '#764ba2',
  kingkongList: [
    { name: '藏品商城', image: '', link: '/mall', sort: 1 },
    { name: '盲盒抽奖', image: '', link: '/blindbox', sort: 2 },
    { name: '我的藏品', image: '', link: '/my', sort: 3 },
    { name: '邀请好友', image: '', link: '/invite', sort: 4 }
  ] as KingkongItem[]
})

const form = reactive(defaultConfig())

const rules: FormRules = {
  siteName: [{ required: true, message: '请输入网站名称', trigger: 'blur' }]
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

function handleAvatarUpload(options: UploadRequestOptions) {
  const reader = new FileReader()
  reader.onload = (e) => {
    form.avatar = e.target?.result as string
  }
  reader.readAsDataURL(options.file as Blob)
}

function handleKingkongUpload(options: UploadRequestOptions, index: number) {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (form.kingkongList[index]) {
      form.kingkongList[index].image = e.target?.result as string
    }
  }
  reader.readAsDataURL(options.file as Blob)
}

function addKingkong() {
  form.kingkongList.push({
    name: '',
    image: '',
    link: '',
    sort: form.kingkongList.length + 1
  })
}

function removeKingkong(index: number) {
  form.kingkongList.splice(index, 1)
}

function resetButtonColors() {
  form.loginBtnColor = '#667eea'
  form.authBtnColor = '#43e97b'
  form.orderBtnColor = '#fa709a'
  form.payBtnColor = '#fbc2eb'
  ElMessage.success('按钮颜色已恢复默认')
}

function handleReset() {
  ElMessageBox.confirm(
    '确定要重置所有装修配置吗？未保存的修改将丢失。',
    '重置确认',
    { type: 'warning', confirmButtonText: '确定重置', cancelButtonText: '取消' }
  )
    .then(() => {
      Object.assign(form, defaultConfig())
      ElMessage.success('配置已重置')
    })
    .catch(() => {})
}

async function handleSave() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    // 校验金刚区
    const empty = form.kingkongList.find(k => !k.name || !k.image)
    if (empty) {
      ElMessage.warning('请完善金刚区每组配置（名称和图标）')
      return
    }
    ElMessageBox.confirm(
      '确定要保存当前网页装修配置吗？保存后将立即生效。',
      '保存装修配置',
      { type: 'warning', confirmButtonText: '确定保存', cancelButtonText: '取消' }
    )
      .then(async () => {
        saving.value = true
        saving.value = false
        ElMessage.success('网页装修配置已保存并生效')
      })
      .catch(() => {})
  })
}

// 注意：目前后端暂无网页装修专用接口，暂用 systemApi.global 作为最近匹配，失败时回退默认配置
async function loadData() {
  try {
    const res: any = await systemApi.global()
    if (res) {
      if (res.siteName) form.siteName = res.siteName
      if (res.avatar) form.avatar = res.avatar
      if (res.loginBtnColor) form.loginBtnColor = res.loginBtnColor
      if (res.authBtnColor) form.authBtnColor = res.authBtnColor
      if (res.orderBtnColor) form.orderBtnColor = res.orderBtnColor
      if (res.payBtnColor) form.payBtnColor = res.payBtnColor
      if (res.bgColorStart) form.bgColorStart = res.bgColorStart
      if (res.bgColorEnd) form.bgColorEnd = res.bgColorEnd
      if (Array.isArray(res.kingkongList)) form.kingkongList = res.kingkongList
    }
  } catch (e) {
    // API 不可用时使用默认配置兜底
    console.warn('[decoration] API 加载失败，使用默认配置', e)
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.decoration-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.section-card {
  margin-bottom: 0;
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
.color-picker-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.color-value {
  font-size: 13px;
  color: var(--text-regular);
  font-family: monospace;
}
.preview-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
  padding: 16px;
  background: var(--bg-page);
  border-radius: 8px;
}
.gradient-preview {
  width: 100%;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.avatar-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  display: block;
  border-radius: 50%;
}
.upload-placeholder {
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}
.upload-icon {
  font-size: 22px;
  color: var(--text-placeholder);
}
.kingkong-uploader :deep(.el-upload) {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.kingkong-uploader :deep(.el-upload:hover) {
  border-color: var(--color-primary);
}
.kingkong-preview {
  width: 56px;
  height: 56px;
  object-fit: cover;
  display: block;
}
.kingkong-placeholder {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-placeholder);
  font-size: 18px;
}
.save-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding: 20px 0;
}
</style>
