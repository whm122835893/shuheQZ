<template>
  <div class="category-page">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">分类总数</div>
            <div class="stat-value">{{ categories.length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Files /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">已启用</div>
            <div class="stat-value">{{ categories.filter(c => c.enabled).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><CircleCheck /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">已禁用</div>
            <div class="stat-value">{{ categories.filter(c => !c.enabled).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 添加分类按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="openCreate">添加分类</el-button>
    </div>

    <el-card>
      <div class="page-header">
        <span class="page-title">藏品分类</span>
      </div>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      >
        <template #title>
          分类管理说明：添加或修改分类名称后，<strong>创建藏品</strong>时的分类选择和<strong>藏品列表</strong>的分类筛选将自动同步。C端市场将按此处的分类和排序生成 Tab 页签。
        </template>
      </el-alert>

      <el-table :data="sortedCategories" border row-key="id">
        <el-table-column label="排序" width="100" align="center">
          <template #default="{ row, $index }">
            <div class="sort-cell">
              <span class="sort-num">{{ $index + 1 }}</span>
              <div class="sort-btns">
                <el-button
                  link
                  size="small"
                  :disabled="$index === 0"
                  @click="handleMoveUp(row.id)"
                >
                  <el-icon><Top /></el-icon>
                </el-button>
                <el-button
                  link
                  size="small"
                  :disabled="$index === sortedCategories.length - 1"
                  @click="handleMoveDown(row.id)"
                >
                  <el-icon><Bottom /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类名称" min-width="200">
          <template #default="{ row }">
            <div class="name-cell">
              <el-icon class="cat-icon"><Files /></el-icon>
              <span class="cat-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="C端展示" width="200">
          <template #default="{ row }">
            <el-tag v-if="row.enabled" type="success" effect="plain" size="small">
              <el-icon style="vertical-align: -1px"><View /></el-icon>
              市场可见
            </el-tag>
            <el-tag v-else type="info" effect="plain" size="small">
              <el-icon style="vertical-align: -1px"><Hide /></el-icon>
              已隐藏
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="(val: boolean) => handleToggle(row.id, val)"
              active-text="启用"
              inactive-text="禁用"
              inline-prompt
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ row.created_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingRow ? '编辑分类' : '添加分类'" width="440px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="分类名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入分类名称，如：文学博物"
            maxlength="20"
            show-word-limit
            clearable
            @keyup.enter="submitForm"
          />
        </el-form-item>
        <el-form-item v-if="!editingRow" label="启用状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="禁用" inline-prompt />
        </el-form-item>
      </el-form>
      <div class="dialog-tip">
        <el-alert
          v-if="editingRow"
          type="warning"
          :closable="false"
          show-icon
          title="修改分类名称后，已有该分类的藏品将自动更新为新名称。"
        />
        <el-alert
          v-else
          type="info"
          :closable="false"
          show-icon
          title="新分类默认排在最后，可在列表中上移/下移调整C端展示顺序。"
        />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Files, CircleCheck, CircleClose, Top, Bottom, View, Hide } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { collectibleApi } from '../../api'
import type { Collectible } from '../../api'
import {
  categories,
  addCategory,
  updateCategoryName,
  toggleCategoryEnabled,
  deleteCategory,
  moveCategory,
  type Category
} from '../../api/category'

// 父资源藏品列表（来自后端），供分类使用情况校验
const collectibleList = ref<any[]>([])

// 按排序字段排序
const sortedCategories = computed(() => {
  return [...categories.value].sort((a, b) => a.sort - b.sort)
})

// ========== 添加/编辑 ==========
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const editingRow = ref<Category | null>(null)

const form = reactive({
  name: '',
  enabled: true
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 20, message: '分类名称长度为 1~20 个字符', trigger: 'blur' }
  ]
}

function openCreate() {
  editingRow.value = null
  form.name = ''
  form.enabled = true
  dialogVisible.value = true
}

function openEdit(row: Category) {
  editingRow.value = row
  form.name = row.name
  form.enabled = row.enabled
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (editingRow.value) {
      const result = updateCategoryName(editingRow.value.id, form.name)
      if (result.success) {
        ElMessage.success(result.message)
        dialogVisible.value = false
      } else {
        ElMessage.warning(result.message)
      }
    } else {
      const result = addCategory(form.name)
      if (result.success) {
        // 新增的分类设置启用状态
        const newCat = categories.value[categories.value.length - 1]
        if (newCat && !form.enabled) {
          toggleCategoryEnabled(newCat.id, false)
        }
        ElMessage.success(result.message)
        dialogVisible.value = false
      } else {
        ElMessage.warning(result.message)
      }
    }
  })
}

// ========== 启用/禁用 ==========
async function handleToggle(id: number, enabled: boolean) {
  toggleCategoryEnabled(id, enabled)
  ElMessage.success(enabled ? '分类已启用' : '分类已禁用')
}

// ========== 排序 ==========
function handleMoveUp(id: number) {
  moveCategory(id, 'up')
}

function handleMoveDown(id: number) {
  moveCategory(id, 'down')
}

// ========== 删除 ==========
async function handleDelete(row: Category) {
  try {
    await ElMessageBox.confirm(
      `确认删除分类「${row.name}」吗？\n\n删除后：\n• 创建藏品时将不再显示该分类选项\n• 已使用该分类的藏品不受影响，但无法再选此分类\n• 此操作不可恢复`,
      '删除确认',
      { type: 'error', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    deleteCategory(row.id)
    ElMessage.success('分类已删除')
  } catch {
    // 取消
  }
}

// ========== 加载父资源藏品（来自后端） ==========
async function loadData() {
  try {
    const result = await collectibleApi.list({ page: 1, pageSize: 100 })
    collectibleList.value = result.list.map((c: Collectible) => ({
      id: Number(c.id),
      name: c.name || '',
      category: (c as any).category || ''
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    collectibleList.value = []
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.stat-row .el-col {
  margin-bottom: 12px;
}
.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-radius: 8px;
  color: #fff;
}
.stat-info {
  flex: 1;
}
.stat-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 4px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
}
.stat-icon {
  font-size: 36px;
  opacity: 0.6;
}
.grad-blue { background: linear-gradient(135deg, #409EFF, #66b1ff); }
.grad-green { background: linear-gradient(135deg, #67C23A, #85ce61); }
.grad-orange { background: linear-gradient(135deg, #E6A23C, #f0c78a); }

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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}
.sort-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.sort-num {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 14px;
  min-width: 20px;
}
.sort-btns {
  display: flex;
  flex-direction: column;
}
.sort-btns .el-button {
  padding: 0;
  margin: 0;
  height: 18px;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cat-icon {
  color: var(--color-primary);
  font-size: 16px;
}
.cat-name {
  font-weight: 500;
  color: var(--text-primary);
}
.dialog-tip {
  margin-top: 8px;
}
</style>
