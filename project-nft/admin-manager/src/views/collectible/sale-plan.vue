<template>
  <div class="sale-plan-page">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">发售计划总数</div>
            <div class="stat-value">{{ tableData.total }}</div>
          </div>
          <div class="stat-icon"><el-icon><Calendar /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">发售中</div>
            <div class="stat-value">{{ tableData.list.filter(p => p.status === 2).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Sell /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">资格购计划</div>
            <div class="stat-value">{{ tableData.list.filter(p => p.sale_mode === 2).length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Key /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-cyan">
          <div class="stat-info">
            <div class="stat-label">公售计划</div>
            <div class="stat-value">{{ tableData.list.filter(p => p.sale_mode === 1).length }}</div>
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
        <el-form-item label="名称">
          <el-input v-model="searchForm.keyword" placeholder="请输入发售计划名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="发售模式">
          <el-select v-model="searchForm.sale_mode" placeholder="全部模式" clearable style="width: 200px">
            <el-option label="公售" :value="1" />
            <el-option label="资格购" :value="2" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="草稿" :value="0" />
            <el-option label="待开售" :value="1" />
            <el-option label="发售中" :value="2" />
            <el-option label="已结束" :value="3" />
            <el-option label="已售罄" :value="4" />
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

      <el-table :data="tableData.list" v-loading="loading" border>
        <el-table-column prop="id" label="计划ID" width="80" align="center" />
        <el-table-column label="藏品" min-width="200">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.collectible_image" class="collectible-img" fit="cover" />
              <div>
                <div class="collectible-name">{{ row.collectible_name || row.name }}</div>
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
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="限购" width="80" align="center">
          <template #default="{ row }">
            {{ row.per_user_limit > 0 ? row.per_user_limit + '份' : '不限' }}
          </template>
        </el-table-column>
        <el-table-column label="已售" width="80" align="center">
          <template #default="{ row }">{{ row.sold_count || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开售时间" width="170">
          <template #default="{ row }">{{ formatTime(row.start_time) }}</template>
        </el-table-column>
        <el-table-column label="结束时间" width="170">
          <template #default="{ row }">{{ formatTime(row.end_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 0" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status === 0"
              link
              type="success"
              size="small"
              @click="handlePublish(row)"
            >上架开售</el-button>
            <el-button
              v-if="row.status === 1 || row.status === 2"
              link
              type="warning"
              size="small"
              @click="handleUnpublish(row)"
            >下架</el-button>
            <el-button
              v-if="row.sale_mode === 2"
              link
              type="primary"
              size="small"
              @click="goToQualification(row)"
            >资格购配置</el-button>
            <el-button
              v-if="row.status === 0 || row.status === 3 || row.status === 4"
              link
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="tableData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadList"
        @size-change="loadList"
      />
    </el-card>

    <!-- 创建/编辑发售计划 Dialog -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑发售计划' : '创建发售计划'" width="600px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-divider content-position="left">选择藏品</el-divider>
        <el-form-item label="藏品类型" prop="collectible_type">
          <el-radio-group v-model="form.collectible_type" :disabled="!!editingId" @change="handleTypeChange">
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
            :disabled="!!editingId"
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
        <el-form-item label="计划名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入发售计划名称" style="width: 100%" />
        </el-form-item>
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
              title="资格购模式下，仅白名单用户可在发售时间内购买。保存后可在「资格购配置」中管理白名单。"
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
          <span class="form-tip">份/人（0=不限购）</span>
        </el-form-item>
        <el-form-item label="分配库存" prop="stock_allocation">
          <el-input-number v-model="form.stock_allocation" :min="0" style="width: 200px" />
          <span class="form-tip">份（0=使用全部可用库存）</span>
        </el-form-item>
        <el-form-item label="开售时间" prop="start_time">
          <el-date-picker
            v-model="form.start_time"
            type="datetime"
            placeholder="选择开售时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker
            v-model="form.end_time"
            type="datetime"
            placeholder="选择结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">确认</el-button>
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
import {
  salePlanApi,
  statusText,
  statusTagType,
  getAvailableCollectibles,
  getAvailableBlindboxes,
  type SalePlan,
} from '../../api/salePlan'

const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const page = ref(1)
const pageSize = ref(10)

// 表格数据
const tableData = reactive<{ list: SalePlan[]; total: number }>({
  list: [],
  total: 0,
})

// 搜索
const searchForm = reactive({
  keyword: '',
  sale_mode: '' as '' | number,
  status: '' as '' | number,
})

// 可选藏品列表
const collectibleList = ref<any[]>([])
const blindboxList = ref<any[]>([])

function formatTime(t: string): string {
  if (!t) return '-'
  try {
    const d = new Date(t)
    return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  } catch {
    return t
  }
}

// ========== 加载列表 ==========
async function loadList() {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
    }
    if (searchForm.keyword) params.keyword = searchForm.keyword
    if (searchForm.sale_mode !== '') params.sale_mode = searchForm.sale_mode
    if (searchForm.status !== '') params.status = searchForm.status

    const res = await salePlanApi.list(params)
    tableData.list = res?.list || []
    tableData.total = res?.total || 0
  } catch (e: any) {
    ElMessage.error('加载发售计划列表失败: ' + (e.message || ''))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  loadList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.sale_mode = ''
  searchForm.status = ''
  page.value = 1
  loadList()
}

// ========== 创建/编辑 ==========
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const editingId = ref<number | null>(null)

const form = reactive({
  collectible_type: 'collectible' as 'collectible' | 'blindbox',
  collectible_id: null as number | null,
  name: '',
  price: 0,
  per_user_limit: 0,
  stock_allocation: 0,
  sale_mode: 1 as 1 | 2,
  start_time: '',
  end_time: '',
})

const rules: FormRules = {
  collectible_type: [{ required: true, message: '请选择藏品类型', trigger: 'change' }],
  collectible_id: [{ required: true, message: '请选择藏品', trigger: 'change' }],
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  sale_mode: [{ required: true, message: '请选择发售模式', trigger: 'change' }],
  price: [{ required: true, message: '请输入发售价格', trigger: 'blur' }],
  start_time: [{ required: true, message: '请选择开售时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
}

const availableOptions = computed(() => {
  if (form.collectible_type === 'blindbox') {
    return blindboxList.value
  }
  return collectibleList.value
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
    if (!form.name) {
      form.name = item.name + ' 发售计划'
    }
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, {
    collectible_type: 'collectible',
    collectible_id: null,
    name: '',
    price: 0,
    per_user_limit: 0,
    stock_allocation: 0,
    sale_mode: 1,
    start_time: '',
    end_time: '',
  })
  dialogVisible.value = true
}

function openEdit(row: SalePlan) {
  editingId.value = row.id
  Object.assign(form, {
    collectible_type: row.collectible_type as 'collectible' | 'blindbox',
    collectible_id: row.collectible_id,
    name: row.name,
    price: Number(row.price),
    per_user_limit: row.per_user_limit,
    stock_allocation: row.stock_allocation,
    sale_mode: row.sale_mode,
    start_time: formatTime(row.start_time),
    end_time: formatTime(row.end_time),
  })
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    if (!form.start_time || !form.end_time) {
      ElMessage.warning('请选择开售时间和结束时间')
      return
    }
    if (form.end_time <= form.start_time) {
      ElMessage.warning('结束时间必须晚于开售时间')
      return
    }

    submitting.value = true
    try {
      if (editingId.value) {
        // 编辑
        await salePlanApi.update(editingId.value, {
          name: form.name,
          saleMode: form.sale_mode,
          price: form.price,
          perUserLimit: form.per_user_limit,
          stockAllocation: form.stock_allocation,
          startTime: form.start_time,
          endTime: form.end_time,
        })
        ElMessage.success('发售计划已更新')
      } else {
        // 创建
        const collectible = selectedCollectible.value
        if (!collectible) {
          ElMessage.warning('请选择有效的藏品')
          submitting.value = false
          return
        }
        await salePlanApi.create({
          collectibleId: collectible.id,
          collectibleType: form.collectible_type,
          name: form.name,
          saleMode: form.sale_mode,
          price: form.price,
          perUserLimit: form.per_user_limit,
          stockAllocation: form.stock_allocation,
          startTime: form.start_time,
          endTime: form.end_time,
        })
        ElMessage.success('发售计划已创建')
      }
      dialogVisible.value = false
      await loadList()
    } catch (e: any) {
      ElMessage.error(e.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

// ========== 上架开售 ==========
async function handlePublish(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认上架开售「${row.collectible_name || row.name}」吗？\n\n发售模式：${row.sale_mode === 1 ? '公售' : '资格购'}\n发售价格：¥${Number(row.price).toFixed(2)}\n开售时间：${formatTime(row.start_time)}\n结束时间：${formatTime(row.end_time)}\n\n上架后藏品将显示在用户端，到开售时间后用户可购买。`,
      '上架开售',
      { type: 'warning', confirmButtonText: '确认上架', cancelButtonText: '取消' }
    )
    await salePlanApi.publish(row.id)
    ElMessage.success('已上架开售')
    await loadList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message)
    }
  }
}

// ========== 下架 ==========
async function handleUnpublish(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认下架「${row.collectible_name || row.name}」吗？\n\n下架后藏品将不再显示在用户端，用户无法继续购买。`,
      '下架确认',
      { type: 'warning', confirmButtonText: '确认下架', cancelButtonText: '取消' }
    )
    await salePlanApi.unpublish(row.id)
    ElMessage.success('已下架')
    await loadList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message)
    }
  }
}

// ========== 跳转资格购配置 ==========
function goToQualification(_row: SalePlan) {
  router.push('/collectible/qualification')
}

// ========== 删除 ==========
async function handleDelete(row: SalePlan) {
  try {
    await ElMessageBox.confirm(
      `确认删除发售计划「${row.collectible_name || row.name}」吗？此操作不可恢复。`,
      '删除确认',
      { type: 'error', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await salePlanApi.delete(row.id)
    ElMessage.success('删除成功')
    await loadList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message)
    }
  }
}

// ========== 初始化 ==========
onMounted(async () => {
  await Promise.all([
    loadList(),
    getAvailableCollectibles().then(list => { collectibleList.value = list }),
    getAvailableBlindboxes().then(list => { blindboxList.value = list }),
  ])
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
