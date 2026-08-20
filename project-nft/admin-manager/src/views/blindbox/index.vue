<template>
  <div class="blindbox-list">
    <!-- 顶部数据卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">盲盒发行总量</div>
            <div class="stat-value">{{ totalEdition.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Files /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">盲盒已售出发售</div>
            <div class="stat-value">{{ totalSold.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><SoldOut /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-cyan">
          <div class="stat-info">
            <div class="stat-label">盲盒库存池</div>
            <div class="stat-value">{{ totalPool.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Box /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-pink">
          <div class="stat-info">
            <div class="stat-label">盲盒流通量</div>
            <div class="stat-value">{{ totalCirculation.toLocaleString() }}</div>
          </div>
          <div class="stat-icon"><el-icon><Promotion /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 创建盲盒按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="router.push('/blindbox/create')">创建盲盒</el-button>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="盲盒名称">
          <el-input v-model="searchForm.name" placeholder="请输入盲盒名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="发售状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="草稿" value="draft" />
            <el-option label="发售中" value="on_sale" />
            <el-option label="已售罄" value="sold_out" />
            <el-option label="已下架" value="off_shelf" />
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
        <span class="page-title">盲盒列表</span>
      </div>

      <el-table :data="pageData.list" v-loading="loading" border>
        <el-table-column label="盲盒" min-width="200">
          <template #default="{ row }">
            <div class="blindbox-cell">
              <el-image :src="row.image" class="blindbox-img" fit="cover" />
              <span class="blindbox-name">{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="edition" label="盲盒发行量" width="110" />
        <el-table-column prop="circulation" label="盲盒流通量" width="110" />
        <el-table-column prop="pool" label="盲盒库存池" width="110" />
        <el-table-column label="发售状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="item_count" label="子藏品数" width="100" />
        <el-table-column label="发售价格" width="110">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="openSaleConfig(row)">发售配置</el-button>
            <el-button link type="primary" size="small" @click="openReshelf(row)">重新上架</el-button>
            <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)" trigger="click">
              <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="soldout">强制售罄</el-dropdown-item>
                  <el-dropdown-item command="destroy">销毁</el-dropdown-item>
                  <el-dropdown-item command="airdrop">独立空投</el-dropdown-item>
                  <el-dropdown-item command="recall">强制回收</el-dropdown-item>
                  <el-dropdown-item command="records">开启记录</el-dropdown-item>
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
    <el-dialog v-model="saleConfigVisible" title="盲盒发售配置" width="520px">
      <el-form :model="saleConfigForm" label-width="100px">
        <el-form-item label="盲盒名称">
          <el-input :model-value="currentRow?.name" disabled />
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

    <!-- 重新上架 Dialog -->
    <el-dialog v-model="reshelfVisible" title="重新上架" width="460px">
      <el-form :model="reshelfForm" label-width="100px">
        <el-form-item label="盲盒名称">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="上架份数">
          <el-input-number v-model="reshelfForm.count" :min="1" :max="currentRow?.pool || 0" />
          <span class="form-tip">可用库存：{{ currentRow?.pool }}</span>
        </el-form-item>
        <el-form-item label="上架价格">
          <el-input-number v-model="reshelfForm.price" :min="0" :precision="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reshelfVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReshelf">确认上架</el-button>
      </template>
    </el-dialog>

    <!-- 销毁 Dialog -->
    <el-dialog v-model="destroyVisible" title="销毁盲盒" width="460px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        销毁操作不可逆，将从指定用户持有的盲盒中销毁对应记录。
      </el-alert>
      <el-form :model="destroyForm" label-width="100px">
        <el-form-item label="盲盒名称">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input-number v-model="destroyForm.userId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="用户藏品ID">
          <el-input-number v-model="destroyForm.userCollectibleId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="销毁原因">
          <el-input v-model="destroyForm.reason" type="textarea" :rows="3" placeholder="请输入销毁原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destroyVisible = false">取消</el-button>
        <el-button type="danger" :loading="destroyLoading" @click="submitDestroy">确认销毁</el-button>
      </template>
    </el-dialog>

    <!-- 独立空投 Dialog -->
    <el-dialog v-model="airdropVisible" title="独立空投" width="560px">
      <el-form :model="airdropForm" label-width="100px">
        <el-form-item label="选择盲盒">
          <el-input :model-value="currentRow?.name" disabled />
        </el-form-item>
        <el-form-item label="活动ID">
          <el-input-number v-model="airdropForm.activityId" :min="0" controls-position="right" />
          <span class="form-tip">0表示独立空投（无关联活动）</span>
        </el-form-item>
        <el-form-item label="每用户数量">
          <el-input-number v-model="airdropForm.quantity" :min="1" />
        </el-form-item>
        <el-form-item label="用户ID列表">
          <el-input
            v-model="airdropForm.userIds"
            type="textarea"
            :rows="5"
            placeholder="多个用户ID用换行分隔，例如：&#10;1001&#10;1002&#10;1003"
          />
          <span class="form-tip">已识别 {{ airdropUserIdCount }} 个用户ID</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="airdropVisible = false">取消</el-button>
        <el-button type="primary" :loading="airdropLoading" @click="submitAirdrop">确认空投</el-button>
      </template>
    </el-dialog>

    <!-- 开启记录 Dialog -->
    <el-dialog v-model="recordsVisible" title="开启记录" width="760px">
      <div class="records-header">
        <span>盲盒：{{ currentRow?.name }}</span>
      </div>
      <el-table :data="recordList" border max-height="420">
        <el-table-column prop="order_no" label="订单号" width="160" />
        <el-table-column prop="user" label="用户" width="120" />
        <el-table-column label="开出藏品" min-width="180">
          <template #default="{ row }">
            <div class="record-item">
              <el-image :src="row.item_image" class="record-img" fit="cover" />
              <span>{{ row.item_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="time" label="开启时间" width="180" />
      </el-table>
      <template #footer>
        <el-button @click="recordsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown, Files, SoldOut, Box, Promotion } from '@element-plus/icons-vue'
import { blindBoxApi } from '../../api'
import { paginate } from '../../utils/pagination'

const router = useRouter()

interface Blindbox {
  id: number
  name: string
  image: string
  description: string
  edition: number
  sold: number
  airdropped_count: number
  destroyed_count: number
  pool: number
  circulation: number
  price: number
  status: string
  per_user_limit: number
  onsale_at: string
  item_count: number
  created_at: string
}

const loading = ref(false)
const list = ref<Blindbox[]>([])
const page = ref(1)
const pageSize = ref(10)

const searchForm = reactive({ name: '', status: '' })

const filteredList = computed(() => {
  return list.value.filter((item) => {
    if (searchForm.name && !item.name.includes(searchForm.name)) return false
    if (searchForm.status && item.status !== searchForm.status) return false
    return true
  })
})

const pageData = computed(() => paginate(filteredList.value, page.value, pageSize.value))

// 顶部统计
const totalEdition = computed(() => list.value.reduce((s, i) => s + i.edition, 0))
const totalSold = computed(() => list.value.reduce((s, i) => s + i.sold, 0))
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
    const result = await blindBoxApi.list({ page: 1, pageSize: 100 })
    // 映射 API 数据到视图格式
    list.value = result.list.map((b: any) => ({
      id: Number(b.id),
      name: b.name || '',
      image: b.image || '',
      description: b.description || '',
      edition: b.edition || 0,
      sold: b.sold || 0,
      airdropped_count: b.airdroppedCount || 0,
      destroyed_count: b.destroyedCount || 0,
      pool: b.pool || 0,
      circulation: b.circulate || b.circulation || 0,
      price: parseFloat(b.price) || 0,
      status: b.status === 2 ? 'on_sale' : b.status === 3 ? 'sold_out' : b.status === 0 ? 'draft' : 'off_shelf',
      per_user_limit: b.perUserLimit || 0,
      onsale_at: b.onsaleAt || '',
      item_count: b.itemCount || 0,
      created_at: b.createdAt || ''
    })) as Blindbox[]
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
  searchForm.status = ''
  page.value = 1
}

const currentRow = ref<Blindbox | null>(null)

function handleEdit(row: Blindbox) {
  if (row.status !== 'draft' && row.status !== 'off_shelf') {
    ElMessage.warning('仅草稿或已下架状态的盲盒可编辑')
    return
  }
  router.push(`/blindbox/create?id=${row.id}`)
}

function handleCommand(cmd: string, row: Blindbox) {
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
    case 'records':
      openRecords(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 发售配置
const saleConfigVisible = ref(false)
const saleConfigForm = reactive({ price: 0, per_user_limit: 0, onsale_at: '' })
function openSaleConfig(row: Blindbox) {
  currentRow.value = row
  saleConfigForm.price = row.price
  saleConfigForm.per_user_limit = row.per_user_limit
  saleConfigForm.onsale_at = row.onsale_at
  saleConfigVisible.value = true
}
async function submitSaleConfig() {
  if (!saleConfigForm.price || saleConfigForm.price <= 0) {
    ElMessage.warning('请输入有效的发售价格')
    return
  }
  try {
    if (currentRow.value) {
      await blindBoxApi.update(currentRow.value.id, {
        price: saleConfigForm.price,
        perUserLimit: saleConfigForm.per_user_limit,
        onsaleAt: saleConfigForm.onsale_at,
      } as any)
      currentRow.value.price = saleConfigForm.price
      currentRow.value.per_user_limit = saleConfigForm.per_user_limit
    }
    ElMessage.success('发售配置已保存')
    saleConfigVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  }
}

// 重新上架
const reshelfVisible = ref(false)
const reshelfForm = reactive({ count: 1, price: 0 })
function openReshelf(row: Blindbox) {
  currentRow.value = row
  reshelfForm.count = 1
  reshelfForm.price = row.price
  reshelfVisible.value = true
}
async function submitReshelf() {
  try {
    if (currentRow.value) {
      await blindBoxApi.relist(currentRow.value.id)
      currentRow.value.status = 'on_sale'
    }
    ElMessage.success('已重新上架')
    reshelfVisible.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '上架失败')
  }
}

// 强制售罄
async function handleSoldout(row: Blindbox) {
  try {
    await ElMessageBox.confirm(
      `确认将盲盒「${row.name}」强制设为售罄吗？此操作将立即停止发售，不可撤销。`,
      '强制售罄',
      { type: 'warning', confirmButtonText: '确认售罄', cancelButtonText: '取消' }
    )
    await blindBoxApi.forceSoldout(row.id)
    row.status = 'sold_out'
    ElMessage.success('已强制售罄')
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
  }
}

// 销毁
const destroyVisible = ref(false)
const destroyLoading = ref(false)
const destroyForm = reactive({ userId: 1, userCollectibleId: 1, reason: '' })
function openDestroy(row: Blindbox) {
  currentRow.value = row
  destroyForm.userId = 1
  destroyForm.userCollectibleId = 1
  destroyForm.reason = ''
  destroyVisible.value = true
}
async function submitDestroy() {
  if (!destroyForm.userId || !destroyForm.userCollectibleId) {
    ElMessage.warning('请填写用户ID和用户藏品ID')
    return
  }
  if (!destroyForm.reason.trim()) {
    ElMessage.warning('请输入销毁原因')
    return
  }
  destroyLoading.value = true
  try {
    if (currentRow.value) {
      await blindBoxApi.destroy(currentRow.value.id, {
        userCollectibleId: destroyForm.userCollectibleId,
        userId: destroyForm.userId,
        reason: destroyForm.reason,
      })
    }
    ElMessage.success('销毁成功')
    destroyVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '销毁失败')
  } finally {
    destroyLoading.value = false
  }
}

// 独立空投
const airdropVisible = ref(false)
const airdropLoading = ref(false)
const airdropForm = reactive({ activityId: 0, quantity: 1, userIds: '' })
const airdropUserIdCount = computed(() =>
  airdropForm.userIds.split('\n').map((p) => p.trim()).filter((p) => /^\d+$/.test(p)).length
)
function openAirdrop(row: Blindbox) {
  currentRow.value = row
  airdropForm.activityId = 0
  airdropForm.quantity = 1
  airdropForm.userIds = ''
  airdropVisible.value = true
}
async function submitAirdrop() {
  const ids = airdropForm.userIds.split('\n').map((p) => p.trim()).filter((p) => /^\d+$/.test(p)).map(Number)
  if (ids.length === 0) {
    ElMessage.warning('请输入有效的用户ID')
    return
  }
  airdropLoading.value = true
  try {
    if (currentRow.value) {
      await blindBoxApi.airdrop(currentRow.value.id, {
        activityId: airdropForm.activityId,
        userIds: ids,
        quantity: airdropForm.quantity,
      })
    }
    ElMessage.success(`已向 ${ids.length} 个用户空投`)
    airdropVisible.value = false
    await loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '空投失败')
  } finally {
    airdropLoading.value = false
  }
}

// 强制回收（复用销毁接口，从用户持有中回收）
function handleRecall(row: Blindbox) {
  if (row.status === 'draft') {
    ElMessage.warning('该盲盒尚未开启，无法执行强制回收')
    return
  }
  if (row.circulation === 0) {
    ElMessage.warning('该盲盒无流通量，无法执行强制回收')
    return
  }
  currentRow.value = row
  ElMessage.info('强制回收将通过销毁接口执行，请填写用户藏品信息')
  destroyForm.userId = 1
  destroyForm.userCollectibleId = 1
  destroyForm.reason = '管理员强制回收'
  destroyVisible.value = true
}

// 开启记录
const recordsVisible = ref(false)
const recordList = ref<any[]>([])
const recordsLoading = ref(false)
async function openRecords(row: Blindbox) {
  currentRow.value = row
  recordsVisible.value = true
  recordsLoading.value = true
  try {
    const result = await blindBoxApi.openRecords(row.id, { page: 1, pageSize: 20 })
    recordList.value = result.list || []
  } catch (e: any) {
    ElMessage.error(e?.message || '开启记录加载失败')
    recordList.value = []
  } finally {
    recordsLoading.value = false
  }
}

// 删除
async function handleDelete(row: Blindbox) {
  try {
    await ElMessageBox.confirm(`确认删除盲盒「${row.name}」吗？此操作不可恢复。`, '删除确认', {
      type: 'error',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await blindBoxApi.delete(row.id)
    ElMessage.success('删除成功')
    await loadData()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

onMounted(loadData)
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
.blindbox-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.blindbox-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  flex-shrink: 0;
}
.blindbox-name {
  color: var(--text-primary);
  font-weight: 500;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.records-header {
  margin-bottom: 12px;
  font-weight: 500;
}
.record-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.record-img {
  width: 32px;
  height: 32px;
  border-radius: 4px;
}
</style>
