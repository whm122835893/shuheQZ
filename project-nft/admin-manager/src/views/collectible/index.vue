<template>
  <div class="collectible-list">
    <!-- 顶部数据卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">发行总量</div>
            <div class="stat-value">{{ totalEdition.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Files /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">已售出发售</div>
            <div class="stat-value">{{ totalSold.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><SoldOut /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">已配置配额</div>
            <div class="stat-value">{{ totalReserved.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Tickets /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
        <div class="stat-card grad-cyan">
          <div class="stat-info">
            <div class="stat-label">库存池</div>
            <div class="stat-value">{{ totalPool.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Box /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
        <div class="stat-card grad-pink">
          <div class="stat-info">
            <div class="stat-label">流通量</div>
            <div class="stat-value">{{ totalCirculation.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Promotion /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 创建藏品按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="router.push('/collectible/create')">创建藏品</el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="藏品名称">
          <el-input v-model="searchForm.name" placeholder="请输入藏品名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="全部分类" clearable style="width: 200px">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="发售状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="草稿" value="draft" />
            <el-option label="发售中" value="on_sale" />
            <el-option label="已售罄" value="sold_out" />
            <el-option label="已下架" value="off_shelf" />
          </el-select>
        </el-form-item>
        <el-form-item label="发售模式">
          <el-select v-model="searchForm.saleMode" placeholder="全部模式" clearable style="width: 200px">
            <el-option label="未配置" value="0" />
            <el-option label="公售" value="1" />
            <el-option label="资格购" value="2" />
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
        <span class="page-title">藏品列表</span>
      </div>

      <el-table :data="pageData.list" v-loading="loading" border>
        <el-table-column label="藏品" min-width="200">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.image" class="collectible-img" fit="cover" />
              <span class="collectible-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="90" />
        <el-table-column prop="edition" label="发行量" width="90" />
        <el-table-column prop="circulation" label="流通量" width="90" />
        <el-table-column prop="pool" label="库存池" width="90" />
        <el-table-column label="发售状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发售模式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.sale_mode === 0 ? 'info' : row.sale_mode === 1 ? '' : 'warning'" effect="plain">
              {{ row.sale_mode_text }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="寄售开关" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_resaleable === 1"
              @change="(val: boolean) => handleSwitch(row, 'is_resaleable', val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="转赠开关" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.is_transferable === 1"
              @change="(val: boolean) => handleSwitch(row, 'is_transferable', val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openSaleConfig(row)">发售配置</el-button>
            <el-button link type="primary" size="small" @click="openQuotaConfig(row)">配额配置</el-button>
            <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)" trigger="click">
              <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="soldout">强制售罄</el-dropdown-item>
                  <el-dropdown-item command="destroy">销毁</el-dropdown-item>
                  <el-dropdown-item command="airdrop">独立空投</el-dropdown-item>
                  <el-dropdown-item command="recall">强制回收</el-dropdown-item>
                  <el-dropdown-item command="audit">库存审计</el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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

    <!-- 发售配置 Dialog -->
    <el-dialog v-model="saleConfigVisible" title="发售配置" width="520px">
      <el-form :model="saleConfigForm" label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="发售模式">
          <el-radio-group v-model="saleConfigForm.sale_mode">
            <el-radio :value="1">公售</el-radio>
            <el-radio :value="2">资格购</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="发售价格">
          <el-input-number v-model="saleConfigForm.price" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item label="每人限购">
          <el-input-number v-model="saleConfigForm.per_user_limit" :min="0" />
          <span class="form-tip">0 表示不限购</span>
        </el-form-item>
        <el-form-item label="发售时间">
          <el-date-picker v-model="saleConfigForm.onsale_at" type="datetime" placeholder="选择发售时间" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saleConfigVisible = false">取消</el-button>
        <el-button type="primary" @click="submitSaleConfig">确认</el-button>
      </template>
    </el-dialog>

    <!-- 配额配置 Dialog -->
    <el-dialog v-model="quotaConfigVisible" title="配额配置" width="520px">
      <el-form :model="quotaForm" label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="发行总量">
          <el-input :model-value="String(currentRow?.edition)" disabled />
        </el-form-item>
        <el-form-item label="已售出">
          <el-input :model-value="String(currentRow?.sold)" disabled />
        </el-form-item>
        <el-form-item label="配额预留">
          <el-input-number v-model="quotaForm.reserved" :min="0" :max="currentRow?.pool || 0" />
          <span class="form-tip">可配额上限：库存池 {{ currentRow?.pool }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaConfigVisible = false">取消</el-button>
        <el-button type="primary" @click="submitQuota">确认</el-button>
      </template>
    </el-dialog>

    <!-- 销毁 Dialog -->
    <el-dialog v-model="destroyVisible" title="销毁藏品" width="460px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        销毁操作不可逆，将从库存池中扣除对应数量。
      </el-alert>
      <el-form :model="destroyForm" label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="可用库存">
          <el-input :model-value="String(currentRow?.pool)" disabled />
        </el-form-item>
        <el-form-item label="销毁数量">
          <el-input-number v-model="destroyForm.count" :min="1" :max="currentRow?.pool || 0" />
        </el-form-item>
        <el-form-item label="操作密码">
          <el-input v-model="destroyForm.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destroyVisible = false">取消</el-button>
        <el-button type="danger" @click="submitDestroy">确认销毁</el-button>
      </template>
    </el-dialog>

    <!-- 独立空投 Dialog -->
    <el-dialog v-model="airdropVisible" title="独立空投" width="560px">
      <el-form :model="airdropForm" label-width="100px">
        <el-form-item label="选择藏品">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="可用库存">
          <el-input :model-value="String(currentRow?.pool)" disabled />
        </el-form-item>
        <el-form-item label="空投数量">
          <el-input-number v-model="airdropForm.count" :min="1" :max="currentRow?.pool || 0" />
        </el-form-item>
        <el-form-item label="接收手机号">
          <el-input
            v-model="airdropForm.phones"
            type="textarea"
            :rows="5"
            placeholder="多个手机号用换行分隔，例如：&#10;13800000001&#10;13800000002"
          />
          <span class="form-tip">已识别 {{ airdropPhoneCount }} 个手机号</span>
        </el-form-item>
        <el-form-item label="操作密码">
          <el-input v-model="airdropForm.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="airdropVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAirdrop">确认空投</el-button>
      </template>
    </el-dialog>

    <!-- 库存审计 Dialog -->
    <el-dialog v-model="auditVisible" title="库存审计" width="640px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        库存校验公式：发行总量 = 库存池 + 已配置配额(reserved_count) + 已售出(sold) + 空投量(airdropped_count) + 销毁量(destroyed_count)
      </el-alert>
      <el-table :data="auditData" border>
        <el-table-column prop="label" label="校验项" />
        <el-table-column prop="value" label="数值" width="120" />
      </el-table>
      <div class="audit-result">
        <span>公式计算总和：</span>
        <strong>{{ auditSum.toLocaleString() }}</strong>
        <span>发行总量：</span>
        <strong>{{ currentRow?.edition?.toLocaleString() }}</strong>
        <el-tag :type="auditPass ? 'success' : 'danger'" style="margin-left: 12px">
          {{ auditPass ? '校验通过' : '校验异常' }}
        </el-tag>
      </div>
      <template #footer>
        <el-button @click="auditVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Files, SoldOut, Tickets, Box, Promotion } from '@element-plus/icons-vue'
import { collectibleApi } from '../../api'
import { paginate } from '../../utils/pagination'
import { getEnabledCategoryNames, fetchCategories } from '../../api/category'

const router = useRouter()

interface Collectible {
  id: number
  name: string
  image: string
  category: string
  edition: number
  sold: number
  airdropped_count: number
  destroyed_count: number
  reserved_count: number
  pool: number
  circulation: number
  price: number
  status: string
  sale_mode: number
  sale_mode_text: string
  is_resaleable: number
  is_transferable: number
  per_user_limit: number
  creator: string
  onsale_at: string
}

const loading = ref(false)
const list = ref<Collectible[]>([])
const page = ref(1)
const pageSize = ref(10)

// 分类筛选项来自后端公开端点 GET /categories（替代 localStorage）；
// 使用 computed 以便 fetchCategories 完成后下拉选项自动更新
const categories = computed(() => getEnabledCategoryNames())

const searchForm = reactive({
  name: '',
  category: '',
  status: '',
  saleMode: ''
})

const filteredList = computed(() => {
  return list.value.filter((item) => {
    if (searchForm.name && !item.name.includes(searchForm.name)) return false
    if (searchForm.category && item.category !== searchForm.category) return false
    if (searchForm.status && item.status !== searchForm.status) return false
    if (searchForm.saleMode !== '' && String(item.sale_mode) !== searchForm.saleMode) return false
    return true
  })
})

const pageData = computed(() => paginate(filteredList.value, page.value, pageSize.value))

// 顶部统计
const totalEdition = computed(() => list.value.reduce((s, i) => s + i.edition, 0))
const totalSold = computed(() => list.value.reduce((s, i) => s + i.sold, 0))
const totalReserved = computed(() => list.value.reduce((s, i) => s + i.reserved_count, 0))
const totalPool = computed(() => list.value.reduce((s, i) => s + i.pool, 0))
const totalCirculation = computed(() => list.value.reduce((s, i) => s + i.circulation, 0))

function statusText(status: string) {
  return { draft: '草稿', on_sale: '发售中', sold_out: '已售罄', off_shelf: '已下架' }[status] || status
}
function statusTagType(status: string) {
  return ({ draft: 'info', on_sale: 'success', sold_out: 'danger', off_shelf: 'warning' } as Record<string, string>)[status] || 'info'
}

async function loadData() {
  loading.value = true
  try {
    const result = await collectibleApi.list({ page: 1, pageSize: 100 })
    // 映射 API 数据到视图格式
    list.value = result.list.map((c: any) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      category: '',
      edition: c.edition || 0,
      sold: c.sold || 0,
      airdropped_count: 0,
      destroyed_count: 0,
      reserved_count: c.lockedQuantity || 0,
      pool: (c.edition || 0) - (c.sold || 0) - (c.lockedQuantity || 0),
      circulation: c.circulate || 0,
      price: parseFloat(c.price) || 0,
      status: c.status === 2 ? 'on_sale' : c.status === 3 ? 'sold_out' : c.status === 0 ? 'draft' : 'off_shelf',
      sale_mode: c.isRelease === 1 ? 1 : 0,
      sale_mode_text: c.isRelease === 1 ? '公售' : '未配置',
      is_resaleable: c.isTransferable,
      is_transferable: c.isTransferable,
      per_user_limit: 0,
      creator: c.creator || c.issuer || '',
      onsale_at: c.onsaleAt || ''
    })) as Collectible[]
  } catch (e) {
    ElMessage.error('数据加载失败')
    list.value = []
  }
  loading.value = false
}

function handleSearch() {
  page.value = 1
}
function handleReset() {
  searchForm.name = ''
  searchForm.category = ''
  searchForm.status = ''
  searchForm.saleMode = ''
  page.value = 1
}

// 当前操作行
const currentRow = ref<Collectible | null>(null)

// 开关切换
async function handleSwitch(row: Collectible, field: 'is_resaleable' | 'is_transferable', val: boolean) {
  const label = field === 'is_resaleable' ? '寄售' : '转赠'
  try {
    await ElMessageBox.confirm(`确认${val ? '开启' : '关闭'}「${row.name}」的${label}开关吗？`, '提示', {
      type: 'warning'
    })
    ;(row as any)[field] = val ? 1 : 0
    ElMessage.success(`${label}开关已${val ? '开启' : '关闭'}`)
  } catch {
    // 取消则不变
  }
}

// 编辑
function handleEdit(row: Collectible) {
  if (row.status !== 'draft') {
    ElMessage.warning('仅草稿状态的藏品可编辑')
    return
  }
  router.push(`/collectible/create?id=${row.id}`)
}

// 更多操作命令
function handleCommand(cmd: string, row: Collectible) {
  currentRow.value = row
  switch (cmd) {
    case 'soldout':
      handleSoldout(row)
      break
    case 'destroy':
      openDestroy(row)
      break
    case 'airdrop':
      openAirdrop(row)
      break
    case 'recall':
      handleRecall(row)
      break
    case 'audit':
      openAudit(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 发售配置
const saleConfigVisible = ref(false)
const saleConfigForm = reactive({
  sale_mode: 1,
  price: 0,
  per_user_limit: 0,
  onsale_at: ''
})
function openSaleConfig(row: Collectible) {
  currentRow.value = row
  saleConfigForm.sale_mode = row.sale_mode || 1
  saleConfigForm.price = row.price
  saleConfigForm.per_user_limit = row.per_user_limit
  saleConfigForm.onsale_at = row.onsale_at
  saleConfigVisible.value = true
}
function submitSaleConfig() {
  if (!saleConfigForm.price || saleConfigForm.price <= 0) {
    ElMessage.warning('请输入有效的发售价格')
    return
  }
  if (currentRow.value) {
    currentRow.value.sale_mode = saleConfigForm.sale_mode
    currentRow.value.sale_mode_text = saleConfigForm.sale_mode === 1 ? '公售' : '资格购'
    currentRow.value.price = saleConfigForm.price
    currentRow.value.per_user_limit = saleConfigForm.per_user_limit
  }
  ElMessage.success('发售配置已保存')
  saleConfigVisible.value = false
}

// 配额配置
const quotaConfigVisible = ref(false)
const quotaForm = reactive({ reserved: 0 })
function openQuotaConfig(row: Collectible) {
  currentRow.value = row
  quotaForm.reserved = row.reserved_count
  quotaConfigVisible.value = true
}
function submitQuota() {
  if (currentRow.value && quotaForm.reserved > currentRow.value.pool) {
    ElMessage.warning('配额预留不能超过库存池')
    return
  }
  if (currentRow.value) {
    currentRow.value.reserved_count = quotaForm.reserved
    currentRow.value.pool = currentRow.value.edition - currentRow.value.sold - currentRow.value.airdropped_count - currentRow.value.destroyed_count - quotaForm.reserved
  }
  ElMessage.success('配额配置已保存')
  quotaConfigVisible.value = false
}

// 强制售罄
async function handleSoldout(row: Collectible) {
  try {
    const { value } = await ElMessageBox.prompt(
      `确认将「${row.name}」强制设为售罄吗？此操作将停止发售。`,
      '强制售罄',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPlaceholder: '请输入操作密码',
        type: 'warning'
      }
    )
    if (!value) {
      ElMessage.warning('请输入操作密码')
      return
    }
    row.status = 'sold_out'
    ElMessage.success('已强制售罄')
  } catch {
    // 取消
  }
}

// 销毁
const destroyVisible = ref(false)
const destroyForm = reactive({ count: 1, password: '' })
function openDestroy(row: Collectible) {
  currentRow.value = row
  destroyForm.count = 1
  destroyForm.password = ''
  destroyVisible.value = true
}
function submitDestroy() {
  if (!destroyForm.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  if (currentRow.value && destroyForm.count > currentRow.value.pool) {
    ElMessage.warning('销毁数量不能超过库存池')
    return
  }
  if (currentRow.value) {
    currentRow.value.destroyed_count += destroyForm.count
    currentRow.value.pool -= destroyForm.count
  }
  ElMessage.success('销毁成功')
  destroyVisible.value = false
}

// 独立空投
const airdropVisible = ref(false)
const airdropForm = reactive({ count: 1, phones: '', password: '' })
const airdropPhoneCount = computed(() =>
  airdropForm.phones.split('\n').map((p) => p.trim()).filter((p) => /^1\d{10}$/.test(p)).length
)
function openAirdrop(row: Collectible) {
  currentRow.value = row
  airdropForm.count = 1
  airdropForm.phones = ''
  airdropForm.password = ''
  airdropVisible.value = true
}
function submitAirdrop() {
  if (!airdropForm.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  if (airdropPhoneCount.value === 0) {
    ElMessage.warning('请输入有效的手机号')
    return
  }
  if (airdropForm.count > (currentRow.value?.pool || 0)) {
    ElMessage.warning('空投数量不能超过库存池')
    return
  }
  if (currentRow.value) {
    currentRow.value.airdropped_count += airdropForm.count
    currentRow.value.pool -= airdropForm.count
    currentRow.value.circulation = currentRow.value.sold + currentRow.value.airdropped_count
  }
  ElMessage.success(`已向 ${airdropPhoneCount.value} 个用户空投`)
  airdropVisible.value = false
}

// 强制回收
async function handleRecall(row: Collectible) {
  const boundary = Math.floor(row.circulation * 0.3)
  try {
    await ElMessageBox.confirm(
      `确认对「${row.name}」执行强制回收吗？\n\n边界校验提示：当前流通量 ${row.circulation}，单次最多可回收流通量的 30%（约 ${boundary} 份）。回收后藏品将从用户账户扣除，不可恢复。`,
      '强制回收',
      {
        confirmButtonText: '确认回收',
        cancelButtonText: '取消',
        type: 'error',
        inputType: 'password',
        inputPlaceholder: '请输入操作密码',
        showInput: true
      }
    )
    ElMessage.success('强制回收请求已提交')
  } catch {
    // 取消
  }
}

// 库存审计
const auditVisible = ref(false)
const auditData = computed(() => {
  if (!currentRow.value) return []
  const r = currentRow.value
  return [
    { label: '发行总量 (edition)', value: r.edition },
    { label: '库存池 (pool)', value: r.pool },
    { label: '已配置配额 (reserved_count)', value: r.reserved_count },
    { label: '已售出 (sold)', value: r.sold },
    { label: '空投量 (airdropped_count)', value: r.airdropped_count },
    { label: '销毁量 (destroyed_count)', value: r.destroyed_count }
  ]
})
const auditSum = computed(() => {
  if (!currentRow.value) return 0
  const r = currentRow.value
  return r.pool + r.reserved_count + r.sold + r.airdropped_count + r.destroyed_count
})
const auditPass = computed(() => !!currentRow.value && auditSum.value === currentRow.value.edition)
function openAudit(row: Collectible) {
  currentRow.value = row
  auditVisible.value = true
}

// 删除
async function handleDelete(row: Collectible) {
  try {
    await ElMessageBox.confirm(`确认删除藏品「${row.name}」吗？此操作不可恢复。`, '删除确认', {
      type: 'error',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await collectibleApi.delete(row.id)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

onMounted(async () => {
  // 分类筛选项来自后端公开端点 GET /categories（替代 localStorage）
  await fetchCategories()
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
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.audit-result {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--bg-page);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
</style>
