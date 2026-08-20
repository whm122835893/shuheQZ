<template>
  <div class="sale-plan-page">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">发售计划总数</div>
            <div class="stat-value">{{ planList.length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Calendar /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">发售中</div>
            <div class="stat-value">{{ planList.filter(p => p.status === 'on_sale').length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Sell /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">资格购计划</div>
            <div class="stat-value">{{ planList.filter(p => p.sale_mode === 2).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Key /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-cyan">
          <div class="stat-info">
            <div class="stat-label">公售计划</div>
            <div class="stat-value">{{ planList.filter(p => p.sale_mode === 1).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Shop /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 创建发售计划按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="openCreate">创建发售计划</el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="藏品名称">
          <el-input v-model="searchForm.name" placeholder="请输入藏品名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="发售模式">
          <el-select v-model="searchForm.saleMode" placeholder="全部模式" clearable style="width: 200px">
            <el-option label="公售" :value="1" />
            <el-option label="资格购" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="待发布" value="draft" />
            <el-option label="已排期" value="scheduled" />
            <el-option label="发售中" value="on_sale" />
            <el-option label="已结束" value="ended" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card>
      <div class="page-header">
        <span class="page-title">发售计划</span>
      </div>

      <el-table :data="pageData.list" v-loading="loading" border>
        <el-table-column prop="id" label="计划ID" width="80" align="center" />
        <el-table-column label="藏品" min-width="200">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.collectible_image" class="collectible-img" fit="cover" />
              <div>
                <div class="collectible-name">{{ row.collectible_name }}</div>
                <el-tag size="small" type="info" effect="plain">{{ row.collectible_type === 'blindbox' ? '盲盒' : '藏品' }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="发售模式" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.sale_mode === 1 ? '' : 'warning'" effect="dark">
              {{ row.sale_mode === 1 ? '公售' : '资格购' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="100" align="right">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="限购" width="80" align="center">
          <template #default="{ row }">
            {{ row.per_user_limit > 0 ? row.per_user_limit + '份' : '不限' }}
          </template>
        </el-table-column>
        <el-table-column label="发行量" width="90" align="center">
          <template #default="{ row }">{{ row.edition.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="已售" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'sold-out-text': row.sold >= row.edition }">{{ row.sold.toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发售时间" width="170">
          <template #default="{ row }">{{ row.onsale_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === 'draft' || row.status === 'scheduled'"
              link
              type="success"
              size="small"
              @click="handleStartSale(row)"
            >开始发售</el-button>
            <el-button
              v-if="row.status === 'on_sale'"
              link
              type="warning"
              size="small"
              @click="handleEndSale(row)"
            >结束发售</el-button>
            <el-button
              v-if="row.sale_mode === 2"
              link
              type="primary"
              size="small"
              @click="goToQualification(row)"
            >资格购配置</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </el-card>

    <!-- 创建/编辑发售计划 Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingRow ? '编辑发售计划' : '创建发售计划'" width="600px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-divider content-position="left">选择藏品</el-divider>
        <el-form-item label="藏品类型" prop="collectible_type">
          <el-radio-group v-model="form.collectible_type" :disabled="!!editingRow" @change="handleTypeChange">
            <el-radio value="collectible">藏品</el-radio>
            <el-radio value="blindbox">盲盒</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="选择藏品" prop="collectible_id">
          <el-select
            v-model="form.collectible_id"
            placeholder="请选择已创建的藏品"
            filterable
            style="width: 100%"
            :disabled="!!editingRow"
            @change="handleCollectibleChange"
          >
            <el-option
              v-for="c in availableOptions"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            >
              <div style="display:flex;align-items:center;gap:8px">
                <el-image :src="c.image" style="width:24px;height:24px;border-radius:4px" fit="cover" />
                <span>{{ c.name }}</span>
                <el-tag size="small" type="info">发行量 {{ c.edition }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item v-if="selectedCollectible" label="藏品信息">
          <div class="collectible-info-preview">
            <el-image :src="selectedCollectible.image" class="preview-img" fit="cover" />
            <div class="preview-info">
              <div class="preview-name">{{ selectedCollectible.name }}</div>
              <div class="preview-meta">
                <span>发行量：{{ selectedCollectible.edition }}</span>
                <span>原价：¥{{ selectedCollectible.price.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">发售设置</el-divider>
        <el-form-item label="发售模式" prop="sale_mode">
          <el-radio-group v-model="form.sale_mode">
            <el-radio :value="1">
              <div style="display:inline-flex;align-items:center;gap:4px">
                <el-icon><Shop /></el-icon>
                <span>公售</span>
              </div>
            </el-radio>
            <el-radio :value="2">
              <div style="display:inline-flex;align-items:center;gap:4px">
                <el-icon><Key /></el-icon>
                <span>资格购</span>
              </div>
            </el-radio>
          </el-radio-group>
          <div class="mode-tip">
            <el-alert
              v-if="form.sale_mode === 2"
              type="warning"
              :closable="false"
              show-icon
              title="资格购模式下，仅白名单用户可在发售时间内购买。保存后可在「资格购管理」中配置白名单和购买条件。"
            />
            <el-alert
              v-else
              type="info"
              :closable="false"
              show-icon
              title="公售模式下，所有用户均可在发售时间内购买。"
            />
          </div>
        </el-form-item>
        <el-form-item label="发售价格" prop="price">
          <el-input-number v-model="form.price" :min="0.01" :precision="2" :step="10" style="width: 200px" />
          <span class="form-tip">元</span>
        </el-form-item>
        <el-form-item label="每人限购" prop="per_user_limit">
          <el-input-number v-model="form.per_user_limit" :min="0" :max="100" style="width: 200px" />
          <span class="form-tip">{{ form.per_user_limit > 0 ? '份/人（0=不限购）' : '份/人（0=不限购）' }}</span>
        </el-form-item>
        <el-form-item label="发售时间" prop="onsale_at">
          <el-date-picker
            v-model="form.onsale_at"
            type="datetime"
            placeholder="选择发售开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_at">
          <el-date-picker
            v-model="form.end_at"
            type="datetime"
            placeholder="选择发售结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="计划状态" prop="status">
          <el-select v-model="form.status" style="width: 200px">
            <el-option label="待发布" value="draft" />
            <el-option label="已排期" value="scheduled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Calendar, Key, Shop, Sell } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { collectibleApi } from '../../api'
import type { Collectible } from '../../api'
import { paginate } from '../../utils/pagination'
import {
  salePlans,
  addSalePlan,
  updateSalePlan,
  deleteSalePlan,
  getAvailableBlindboxes,
  availableBlindboxes,
  type SalePlan
} from '../../api/salePlan'

const router = useRouter()
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)

// 可选藏品列表（来自后端）
const collectibleList = ref<any[]>([])

const searchForm = reactive({
  name: '',
  saleMode: '' as '' | 1 | 2,
  status: ''
})

const planList = computed(() => salePlans.value)

const filteredList = computed(() => {
  return planList.value.filter((item) => {
    if (searchForm.name && !item.collectible_name.includes(searchForm.name)) return false
    if (searchForm.saleMode !== '' && item.sale_mode !== searchForm.saleMode) return false
    if (searchForm.status && item.status !== searchForm.status) return false
    return true
  })
})

const pageData = computed(() => paginate(filteredList.value, page.value, pageSize.value))

function statusTagType(status: string) {
  return ({ draft: 'info', scheduled: 'warning', on_sale: 'success', ended: 'danger' } as Record<string, string>)[status] || 'info'
}

function handleSearch() {
  page.value = 1
}

function handleReset() {
  searchForm.name = ''
  searchForm.saleMode = ''
  searchForm.status = ''
  page.value = 1
}

// ========== 创建/编辑 ==========
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const editingRow = ref<SalePlan | null>(null)

const form = reactive({
  collectible_type: 'collectible' as 'collectible' | 'blindbox',
  collectible_id: null as number | null,
  price: 0,
  per_user_limit: 0,
  sale_mode: 1 as 1 | 2,
  status: 'draft' as 'draft' | 'scheduled',
  onsale_at: '',
  end_at: ''
})

const rules: FormRules = {
  collectible_type: [{ required: true, message: '请选择藏品类型', trigger: 'change' }],
  collectible_id: [{ required: true, message: '请选择藏品', trigger: 'change' }],
  sale_mode: [{ required: true, message: '请选择发售模式', trigger: 'change' }],
  price: [{ required: true, message: '请输入发售价格', trigger: 'blur' }],
  onsale_at: [{ required: true, message: '请选择发售时间', trigger: 'change' }],
  end_at: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}

const availableOptions = computed(() => {
  if (form.collectible_type === 'blindbox') {
    return availableBlindboxes.value
  }
  const usedIds = salePlans.value
    .filter(p => p.collectible_type === 'collectible')
    .map(p => p.collectible_id)
  return collectibleList.value.filter(c => !usedIds.includes(c.id))
})

const selectedCollectible = computed(() => {
  if (!form.collectible_id) return null
  return availableOptions.value.find(c => c.id === form.collectible_id) || null
})

function handleTypeChange() {
  form.collectible_id = null
}

function handleCollectibleChange(id: number) {
  const item = availableOptions.value.find(c => c.id === id)
  if (item) {
    form.price = item.price
  }
}

function openCreate() {
  editingRow.value = null
  Object.assign(form, {
    collectible_type: 'collectible',
    collectible_id: null,
    price: 0,
    per_user_limit: 0,
    sale_mode: 1,
    status: 'draft',
    onsale_at: '',
    end_at: ''
  })
  dialogVisible.value = true
}

function openEdit(row: SalePlan) {
  editingRow.value = row
  Object.assign(form, {
    collectible_type: row.collectible_type,
    collectible_id: row.collectible_id,
    price: row.price,
    per_user_limit: row.per_user_limit,
    sale_mode: row.sale_mode,
    status: row.status === 'on_sale' || row.status === 'ended' ? row.status : 'draft',
    onsale_at: row.onsale_at,
    end_at: row.end_at
  })
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) return
    if (!form.onsale_at || !form.end_at) {
      ElMessage.warning('请选择发售时间和结束时间')
      return
    }
    if (form.end_at <= form.onsale_at) {
      ElMessage.warning('结束时间必须晚于发售时间')
      return
    }

    const collectible = selectedCollectible.value
    if (!collectible) {
      ElMessage.warning('请选择有效的藏品')
      return
    }

    if (editingRow.value) {
      updateSalePlan(editingRow.value.id, {
        price: form.price,
        per_user_limit: form.per_user_limit,
        sale_mode: form.sale_mode,
        status: form.status,
        onsale_at: form.onsale_at,
        end_at: form.end_at
      })
      ElMessage.success('发售计划已更新')
    } else {
      addSalePlan({
        collectible_id: collectible.id,
        collectible_name: collectible.name,
        collectible_image: collectible.image,
        collectible_type: form.collectible_type,
        price: form.price,
        per_user_limit: form.per_user_limit,
        sale_mode: form.sale_mode,
        status: form.status,
        onsale_at: form.onsale_at,
        end_at: form.end_at,
        edition: collectible.edition,
        sold: 0
      })
      ElMessage.success('发售计划已创建')
    }
    dialogVisible.value = false
  })
}

// 开始发售
async function handleStartSale(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认开始发售「${row.collectible_name}」吗？\n\n发售模式：${row.sale_mode === 1 ? '公售' : '资格购'}\n发售价格：¥${row.price.toFixed(2)}\n限购：${row.per_user_limit > 0 ? row.per_user_limit + '份/人' : '不限'}`,
      '开始发售',
      { type: 'warning', confirmButtonText: '确认发售', cancelButtonText: '取消' }
    )
    updateSalePlan(row.id, { status: 'on_sale' })
    ElMessage.success('发售已开始')
  } catch {
    // 取消
  }
}

// 结束发售
async function handleEndSale(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认结束「${row.collectible_name}」的发售吗？结束后将无法继续购买。`,
      '结束发售',
      { type: 'warning' }
    )
    updateSalePlan(row.id, { status: 'ended' })
    ElMessage.success('发售已结束')
  } catch {
    // 取消
  }
}

// 跳转资格购配置
function goToQualification(_row: SalePlan) {
  router.push('/collectible/qualification')
}

// 删除
async function handleDelete(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认删除发售计划「${row.collectible_name}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'error', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    deleteSalePlan(row.id)
    ElMessage.success('删除成功')
  } catch {
    // 取消
  }
}

async function loadData() {
  loading.value = true
  try {
    const result = await collectibleApi.list({ page: 1, pageSize: 100 })
    collectibleList.value = result.list.map((c: Collectible) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      edition: c.edition || 0,
      price: parseFloat(c.price) || 0
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    collectibleList.value = []
  }
  loading.value = false
}

onMounted(async () => {
  await loadData()
  await getAvailableBlindboxes()
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
.grad-cyan { background: linear-gradient(135deg, #00C9A7, #4eddd9); }

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
.collectible-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.collectible-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  flex-shrink: 0;
}
.collectible-name {
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 4px;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.mode-tip {
  margin-top: 8px;
  width: 100%;
}
.mode-tip .el-alert {
  margin-bottom: 0;
}
.sold-out-text {
  color: var(--color-danger);
  font-weight: 600;
}
.collectible-info-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}
.preview-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
}
.preview-name {
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.preview-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
