<template>
  <div class="listings-page">
    <!-- 顶部统计 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-blue">
          <div class="stat-info">
            <div class="stat-label">挂单总数</div>
            <div class="stat-value">{{ allListings.length }}</div>
          </div>
          <div class="stat-icon"><el-icon><Goods /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-green">
          <div class="stat-info">
            <div class="stat-label">在售挂单</div>
            <div class="stat-value">{{ allListings.filter(l => l.status === 'on_sale').length }}</div>
          </div>
          <div class="stat-icon"><el-icon><ShoppingCart /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-orange">
          <div class="stat-info">
            <div class="stat-label">已锁定</div>
            <div class="stat-value">{{ lockedCount }}</div>
          </div>
          <div class="stat-icon"><el-icon><Lock /></el-icon></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card grad-pink">
          <div class="stat-info">
            <div class="stat-label">已下架</div>
            <div class="stat-value">{{ allListings.filter(l => l.status === 'delisted' || l.status === 'system_delisted').length }}</div>
          </div>
          <div class="stat-icon"><el-icon><CircleClose /></el-icon></div>
        </div>
      </el-col>
    </el-row>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="挂单编号">
          <el-input v-model="searchForm.listingNo" placeholder="输入挂单编号" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="藏品名称">
          <el-input v-model="searchForm.collectibleName" placeholder="输入藏品名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="卖家">
          <el-input v-model="searchForm.seller" placeholder="输入卖家" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 200px">
            <el-option label="在售" value="on_sale" />
            <el-option label="已成交" value="sold" />
            <el-option label="已下架" value="delisted" />
            <el-option label="系统下架" value="system_delisted" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.itemType" placeholder="全部类型" clearable style="width: 200px">
            <el-option label="藏品" value="collectible" />
            <el-option label="盲盒" value="blindbox" />
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
        <span class="page-title">查看挂单</span>
        <div class="header-actions">
          <el-tooltip content="刷新锁定状态" placement="top">
            <el-button :icon="Refresh" circle @click="refreshLocks" />
          </el-tooltip>
          <el-button type="warning" :icon="Unlock" @click="batchUnlock" :disabled="lockedCount === 0">
            批量解锁 ({{ lockedCount }})
          </el-button>
        </div>
      </div>

      <el-table :data="pageData.list" v-loading="loading" border>
        <el-table-column label="挂单编号" width="180">
          <template #default="{ row }">
            <div class="listing-no-cell">
              <span class="listing-no">{{ row.listing_no }}</span>
              <el-tag v-if="isLocked(row.id)" type="warning" size="small" effect="dark">
                <el-icon style="vertical-align: -1px"><Lock /></el-icon>
                {{ getRemainSec(row.id) }}s
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.item_type === 'blindbox' ? 'danger' : ''" size="small" effect="plain">
              {{ row.item_type === 'blindbox' ? '盲盒' : '藏品' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="藏品" min-width="180">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.collectible_image" class="collectible-img" fit="cover" />
              <div>
                <div class="collectible-name">{{ row.collectible_name }}</div>
                <div class="collectible-edition">编号 #{{ row.edition_no }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="卖家" width="150">
          <template #default="{ row }">
            <div>{{ row.seller }}</div>
            <div class="sub-text">{{ row.seller_phone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="挂单价格" width="110" align="right">
          <template #default="{ row }">
            <span class="price-text">¥{{ Number(row.price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="原价" width="90" align="right">
          <template #default="{ row }">¥{{ Number(row.original_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark" size="small">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="挂单时间" width="170">
          <template #default="{ row }">{{ row.listed_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'on_sale'">
              <el-button
                v-if="!isLocked(row.id)"
                link
                type="warning"
                size="small"
                @click="handleLock(row)"
              >
                <el-icon style="vertical-align: -1px"><Lock /></el-icon>
                锁定
              </el-button>
              <el-button
                v-else
                link
                type="success"
                size="small"
                @click="handleUnlock(row)"
              >
                <el-icon style="vertical-align: -1px"><Unlock /></el-icon>
                解锁
              </el-button>
              <el-button
                link
                type="danger"
                size="small"
                @click="handleDelist(row)"
              >
                <el-icon style="vertical-align: -1px"><Bottom /></el-icon>
                下架
              </el-button>
              <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            </template>
            <span v-else>
              <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            </span>
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

    <!-- 挂单详情 Dialog -->
    <el-dialog v-model="detailVisible" title="挂单详情" width="600px">
      <el-descriptions :column="2" border v-if="currentRow">
        <el-descriptions-item label="挂单编号">{{ currentRow.listing_no }}</el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="currentRow.item_type === 'blindbox' ? 'danger' : ''" size="small">
            {{ currentRow.item_type === 'blindbox' ? '盲盒' : '藏品' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="藏品名称">{{ currentRow.collectible_name }}</el-descriptions-item>
        <el-descriptions-item label="藏品编号">#{{ currentRow.edition_no }}</el-descriptions-item>
        <el-descriptions-item label="卖家">{{ currentRow.seller }}</el-descriptions-item>
        <el-descriptions-item label="卖家手机">{{ currentRow.seller_phone }}</el-descriptions-item>
        <el-descriptions-item label="挂单价格">¥{{ Number(currentRow.price).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="原价">¥{{ Number(currentRow.original_price).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType(currentRow.status)" effect="dark" size="small">{{ currentRow.status_text }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="锁定状态">
          <el-tag v-if="isLocked(currentRow.id)" type="warning" size="small">
            已锁定 ({{ getRemainSec(currentRow.id) }}s)
          </el-tag>
          <el-tag v-else type="info" size="small">未锁定</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="挂单时间">{{ currentRow.listed_at }}</el-descriptions-item>
        <el-descriptions-item label="成交时间">{{ currentRow.sold_at || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom: 16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="confirmPwd" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelPwd">取消</el-button>
        <el-button type="primary" @click="confirmPwd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Goods, ShoppingCart, Lock, Unlock, CircleClose, Refresh, Bottom } from '@element-plus/icons-vue'
import { marketApi } from '../../api'
import { paginate } from '../../utils/pagination'
import {
  listingLocks,
  lockListing,
  unlockListing,
  isListingLocked,
  getLockRemainSeconds,
  getListingLockInfo
} from '../../api/salePlan'

interface ListingItem {
  id: number
  listing_no: string
  item_type: 'collectible' | 'blindbox'
  collectible_name: string
  collectible_image: string
  edition_no: number
  seller: string
  seller_phone: string
  price: number
  original_price: number
  status: string
  status_text: string
  listed_at: string
  sold_at: string | null
}

const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const tick = ref(0) // 用于强制刷新锁定倒计时

const searchForm = reactive({
  listingNo: '',
  collectibleName: '',
  seller: '',
  status: '',
  itemType: ''
})

// 生成挂单数据
const allListings = ref<ListingItem[]>([])

async function loadData() {
  loading.value = true
  try {
    const result = await marketApi.listings({ page: 1, pageSize: 100 })
    allListings.value = result.list.map((item: any) => ({
      id: Number(item.id),
      listing_no: item.listingNo || item.listing_no || `LST${String(20260000 + Number(item.id)).padStart(10, '0')}`,
      item_type: (item.itemType || item.item_type || 'collectible') as 'collectible' | 'blindbox',
      collectible_name: item.collectibleName || item.collectible_name || '',
      collectible_image: item.collectibleImage || item.collectible_image || '',
      edition_no: item.editionNo || item.edition_no || 0,
      seller: item.seller || '',
      seller_phone: item.sellerPhone || item.seller_phone || '',
      price: Number(item.price) || 0,
      original_price: Number(item.originalPrice || item.original_price) || 0,
      status: item.status || 'on_sale',
      status_text: item.statusText || item.status_text || '',
      listed_at: item.listedAt || item.listed_at || '',
      sold_at: item.soldAt || item.sold_at || null
    })) as ListingItem[]
  } catch (e) {
    ElMessage.error('数据加载失败')
    allListings.value = []
  }
  loading.value = false
}

const filteredList = computed(() => {
  return allListings.value.filter((item) => {
    if (searchForm.listingNo && !item.listing_no.includes(searchForm.listingNo.toUpperCase())) return false
    if (searchForm.collectibleName && !item.collectible_name.includes(searchForm.collectibleName)) return false
    if (searchForm.seller && !item.seller.includes(searchForm.seller)) return false
    if (searchForm.status && item.status !== searchForm.status) return false
    if (searchForm.itemType && item.item_type !== searchForm.itemType) return false
    return true
  })
})

const pageData = computed(() => paginate(filteredList.value, page.value, pageSize.value))

const lockedCount = computed(() => {
  tick.value // 依赖 tick 触发更新
  return allListings.value.filter(l => isLocked(l.id)).length
})

function statusTagType(status: string) {
  const map: Record<string, string> = {
    on_sale: 'success',
    sold: 'info',
    delisted: 'warning',
    system_delisted: 'danger'
  }
  return map[status] || 'info'
}

function isLocked(id: number): boolean {
  tick.value // 触发响应式更新
  return isListingLocked(id)
}

function getRemainSec(id: number): number {
  tick.value
  return getLockRemainSeconds(id)
}

function handleSearch() {
  page.value = 1
}

function handleReset() {
  searchForm.listingNo = ''
  searchForm.collectibleName = ''
  searchForm.seller = ''
  searchForm.status = ''
  searchForm.itemType = ''
  page.value = 1
}

// 刷新锁定状态
function refreshLocks() {
  tick.value++
  ElMessage.success('锁定状态已刷新')
}

// 定时器：每秒刷新倒计时
let timer: ReturnType<typeof setInterval> | null = null
onMounted(async () => {
  await loadData()
  timer = setInterval(() => {
    tick.value++
  }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ========== 锁定/解锁 ==========
async function handleLock(row: ListingItem) {
  try {
    await ElMessageBox.confirm(
      `确认锁定挂单「${row.listing_no}」吗？\n\n锁定后：\n• 该挂单将被临时冻结 5 分钟\n• 期间无法被购买或修改\n• 5 分钟后自动解锁\n\n适用场景：需要审核挂单信息或处理争议时使用。`,
      '锁定挂单',
      { type: 'warning', confirmButtonText: '确认锁定', cancelButtonText: '取消' }
    )
    const result = lockListing(row.id)
    if (result.success) {
      tick.value++
      ElMessage.success(result.message)
    } else {
      ElMessage.warning(result.message)
    }
  } catch {
    // 取消
  }
}

async function handleUnlock(row: ListingItem) {
  const lockInfo = getListingLockInfo(row.id)
  try {
    await ElMessageBox.confirm(
      `确认解锁挂单「${row.listing_no}」吗？\n\n当前锁定者：${lockInfo?.lockedBy || '-'}\n剩余时间：${getRemainSec(row.id)} 秒`,
      '解锁挂单',
      { type: 'info', confirmButtonText: '确认解锁', cancelButtonText: '取消' }
    )
    unlockListing(row.id)
    tick.value++
    ElMessage.success('挂单已解锁')
  } catch {
    // 取消
  }
}

// ========== 下架 ==========
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  resolve: null as ((v: boolean) => void) | null
})

function requirePassword(action: string): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.resolve = resolve
    pwdDialog.visible = true
  })
}

function confirmPwd() {
  if (!pwdDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  pwdDialog.visible = false
  pwdDialog.resolve?.(true)
}

function cancelPwd() {
  pwdDialog.visible = false
  pwdDialog.resolve?.(false)
}

async function handleDelist(row: ListingItem) {
  // 检查是否被锁定
  if (isLocked(row.id)) {
    ElMessage.warning('该挂单已被锁定，请先解锁后再下架')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认下架挂单「${row.listing_no}」吗？\n\n藏品：${row.collectible_name} #${row.edition_no}\n卖家：${row.seller}\n挂单价格：¥${Number(row.price).toFixed(2)}\n\n下架后藏品将退回至卖家仓库。`,
      '下架挂单',
      { type: 'error', confirmButtonText: '确认下架', cancelButtonText: '取消' }
    )
    const ok = await requirePassword(`下架挂单 ${row.listing_no}`)
    if (!ok) return
    try {
      await marketApi.delist(row.id)
    } catch (e) {
      ElMessage.error('下架失败')
      unlockListing(row.id)
      return
    }
    row.status = 'system_delisted'
    row.status_text = '系统下架'
    // 清除锁定
    unlockListing(row.id)
    tick.value++
    ElMessage.success('挂单已下架')
  } catch {
    // 取消
  }
}

// 批量解锁
async function batchUnlock() {
  try {
    await ElMessageBox.confirm(
      `确认解锁所有已锁定的挂单（共 ${lockedCount.value} 个）吗？`,
      '批量解锁',
      { type: 'warning' }
    )
    listingLocks.value.forEach(l => unlockListing(l.listingId))
    tick.value++
    ElMessage.success('所有挂单已解锁')
  } catch {
    // 取消
  }
}

// ========== 详情 ==========
const detailVisible = ref(false)
const currentRow = ref<ListingItem | null>(null)

function viewDetail(row: ListingItem) {
  currentRow.value = row
  detailVisible.value = true
}
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
.grad-pink { background: linear-gradient(135deg, #F56C6C, #f89898); }

.search-card {
  margin-bottom: 16px;
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
.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.listing-no-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.listing-no {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: var(--color-primary);
  font-size: 13px;
}
.collectible-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.collectible-img {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  flex-shrink: 0;
}
.collectible-name {
  color: var(--text-primary);
  font-weight: 500;
  font-size: 13px;
}
.collectible-edition {
  font-size: 12px;
  color: var(--text-secondary);
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.price-text {
  color: var(--color-danger);
  font-weight: 600;
}
</style>
