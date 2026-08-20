<template>
  <div class="market-page">
    <div class="page-header">
      <span class="page-title">市场寄售</span>
    </div>

    <el-card shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 寄售监控 -->
        <el-tab-pane label="寄售监控" name="listing">
          <div class="tab-toolbar">
            <div>
              <span class="sub-text">二级市场总开关：</span>
              <el-switch
                v-model="globalResaleEnabled"
                active-text="开启"
                inactive-text="关闭"
                @change="handleGlobalResaleChange"
              />
            </div>
            <div>
              <el-input v-model="listingSearch.seller" placeholder="卖家" clearable style="width:160px;margin-right:8px" />
              <el-select v-model="listingSearch.status" placeholder="状态" clearable style="width:120px;margin-right:8px">
                <el-option v-for="item in listingStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="primary" @click="searchListing">搜索</el-button>
            </div>
          </div>

          <!-- 藏品/盲盒寄售管理列表 -->
          <el-card shadow="never" style="margin-bottom:12px">
            <div class="table-toolbar">
              <span class="toolbar-title">藏品 / 盲盒寄售管理（每个藏品或盲盒单品独立控制寄售开关、价格管控和挂单记录）</span>
              <el-select v-model="collectibleTypeFilter" placeholder="全部类型" clearable size="small" style="width:120px;margin-right:8px">
                <el-option label="藏品" value="collectible" />
                <el-option label="盲盒" value="blindbox" />
              </el-select>
              <el-input v-model="collectibleSearch" placeholder="搜索名称" clearable style="width:200px" />
            </div>
            <el-table :data="filteredCollectibleList" border stripe size="small">
              <el-table-column label="类型" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.item_type === 'blindbox' ? 'danger' : ''" size="small" effect="plain">
                    {{ row.item_type === 'blindbox' ? '盲盒' : '藏品' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="名称" min-width="200">
                <template #default="{ row }">
                  <div class="collectible-cell">
                    <el-image :src="row.image" class="collectible-thumb" fit="cover" />
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="发行量" width="90" align="center">
                <template #default="{ row }">{{ row.edition }}</template>
              </el-table-column>
              <el-table-column label="寄售开关" width="110" align="center">
                <template #default="{ row }">
                  <el-switch
                    v-model="row.resale_enabled"
                    :disabled="!globalResaleEnabled"
                    @change="(val: boolean) => handleCollectibleResaleSwitch(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="限价模式" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.price_mode === 'limited' ? 'warning' : 'info'" size="small">
                    {{ row.price_mode === 'limited' ? '限价' : '不限价' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="价格区间" width="140" align="center">
                <template #default="{ row }">
                  <span v-if="row.price_mode === 'limited'" class="sub-text">
                    ¥{{ Number(row.price_min).toFixed(0) }} ~ ¥{{ Number(row.price_max).toFixed(0) }}
                  </span>
                  <span v-else class="sub-text">-</span>
                </template>
              </el-table-column>
              <el-table-column label="在售挂单" width="90" align="center">
                <template #default="{ row }">
                  <el-badge :value="row.on_sale_count" :max="999" :type="row.on_sale_count > 0 ? 'primary' : 'info'" />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openPriceControlDialog(row)">价格管控</el-button>
                  <el-button link type="primary" size="small" @click="openListingRecordsDialog(row)">寄售记录</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <el-table :data="listingPage.list" v-loading="loading" border stripe>
            <el-table-column label="卖家" width="170">
              <template #default="{ row }">
                <div>{{ row.seller }}</div>
                <div class="sub-text">{{ row.seller_phone }}</div>
              </template>
            </el-table-column>
            <el-table-column label="藏品" min-width="150">
              <template #default="{ row }">
                <div class="collectible-cell">
                  <el-image :src="row.collectible_image" class="collectible-thumb" fit="cover" />
                  <span>{{ row.collectible_name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="挂单价格" width="120" align="right">
              <template #default="{ row }">
                <span class="amount-text" :class="{ 'price-alert-text': row.is_price_alert }">¥{{ Number(row.price).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="原价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ Number(row.original_price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="listingStatusTag(row.status)" effect="dark">{{ row.status_text }}</el-tag>
                <el-tag v-if="row.is_price_alert" type="danger" effect="plain" size="small" style="margin-left:4px">超价</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="listed_at" label="挂单时间" width="170" />
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'on_sale'"
                  link
                  type="danger"
                  size="small"
                  @click="handleForceDelist(row)"
                >强制下架</el-button>
                <span v-else class="sub-text">-</span>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="listingPage_num"
            v-model:page-size="listingPageSize"
            :total="listingPage.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchListing"
            @current-change="fetchListing"
          />
        </el-tab-pane>

        <!-- 成交记录 -->
        <el-tab-pane label="成交记录" name="sold">
          <el-table :data="soldPage.list" v-loading="loading" border stripe>
            <el-table-column label="卖家" width="170">
              <template #default="{ row }">
                <div>{{ row.seller }}</div>
                <div class="sub-text">{{ row.seller_phone }}</div>
              </template>
            </el-table-column>
            <el-table-column label="藏品" min-width="150">
              <template #default="{ row }">
                {{ row.collectible_name }}
              </template>
            </el-table-column>
            <el-table-column label="成交价格" width="120" align="right">
              <template #default="{ row }">
                <span class="amount-text">¥{{ Number(row.price).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="原价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ Number(row.original_price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="溢价率" width="100" align="right">
              <template #default="{ row }">
                <span :class="row.price > row.original_price ? 'profit-text' : 'loss-text'">
                  {{ row.price > row.original_price ? '+' : '' }}{{ (((row.price - row.original_price) / row.original_price) * 100).toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="sold_at" label="成交时间" width="170" />
          </el-table>
          <el-pagination
            v-model:current-page="soldPage_num"
            v-model:page-size="soldPageSize"
            :total="soldPage.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchSold"
            @current-change="fetchSold"
          />
        </el-tab-pane>

        <!-- 价格预警 -->
        <el-tab-pane label="价格预警" name="alert">
          <el-alert type="warning" :closable="false" show-icon style="margin-bottom:12px">
            <template #title>
              以下挂单价格超出对应藏品的价格上限配置，已标红展示，建议及时处理。
            </template>
          </el-alert>
          <el-table :data="alertPage.list" v-loading="loading" border stripe :row-class-name="alertRowClass">
            <el-table-column label="卖家" width="170">
              <template #default="{ row }">
                <div>{{ row.seller }}</div>
                <div class="sub-text">{{ row.seller_phone }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="collectible_name" label="藏品名" min-width="150" />
            <el-table-column label="挂单价格" width="120" align="right">
              <template #default="{ row }">
                <span class="price-alert-text amount-text">¥{{ Number(row.price).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="原价" width="100" align="right">
              <template #default="{ row }">
                ¥{{ Number(row.original_price).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="价格上限" width="120" align="right">
              <template #default="{ row }">
                <span class="sub-text">¥{{ Number(getCollectibleByName(row.collectible_name)?.price_max || 0).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="超出幅度" width="120" align="right">
              <template #default="{ row }">
                <span class="price-alert-text">+{{ calcExceedPct(row) }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="listed_at" label="挂单时间" width="170" />
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" size="small" @click="handleForceDelist(row)">强制下架</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            v-model:current-page="alertPage_num"
            v-model:page-size="alertPageSize"
            :total="alertPage.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchAlert"
            @current-change="fetchAlert"
          />
        </el-tab-pane>

        <!-- 手续费配置 -->
        <el-tab-pane label="手续费配置" name="fee">
          <el-form :model="feeForm" label-width="140px" style="max-width:600px;margin-top:20px">
            <el-form-item label="手续费比例" required>
              <el-input-number v-model="feeForm.rate" :min="0" :max="20" :precision="2" :step="0.5" />
              <span style="margin-left:8px">%</span>
            </el-form-item>
            <el-form-item label="最低手续费" required>
              <el-input-number v-model="feeForm.min" :min="0" :precision="2" :step="1" />
              <span style="margin-left:8px">元</span>
            </el-form-item>
            <el-form-item label="最高手续费" required>
              <el-input-number v-model="feeForm.max" :min="feeForm.min" :precision="2" :step="10" />
              <span style="margin-left:8px">元</span>
            </el-form-item>
            <el-form-item label="结算周期">
              <el-select v-model="feeForm.cycle" style="width:200px">
                <el-option label="T+1" value="T+1" />
                <el-option label="T+3" value="T+3" />
                <el-option label="周结" value="weekly" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveFeeConfig">保存配置</el-button>
              <el-button @click="resetFeeConfig">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 单藏品价格管控 Dialog -->
    <el-dialog v-model="priceControlDialog.visible" title="藏品价格管控" width="480px" :close-on-click-modal="false">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
        <template #title>
          为藏品《{{ priceControlDialog.name }}》设置限价，限价对该藏品的所有编号生效。
        </template>
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="priceControlDialog.name" disabled />
        </el-form-item>
        <el-form-item label="发行量">
          <el-input :model-value="priceControlDialog.edition + ' 份'" disabled />
        </el-form-item>
        <el-form-item label="限价模式">
          <el-radio-group v-model="priceControlDialog.price_mode">
            <el-radio value="unlimited">不限价</el-radio>
            <el-radio value="limited">限价模式</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="priceControlDialog.price_mode === 'limited'">
          <el-form-item label="价格下限">
            <el-input-number v-model="priceControlDialog.price_min" :min="0" :precision="2" :step="10" style="width:200px" />
            <span style="margin-left:8px">元</span>
          </el-form-item>
          <el-form-item label="价格上限">
            <el-input-number v-model="priceControlDialog.price_max" :min="priceControlDialog.price_min" :precision="2" :step="50" style="width:200px" />
            <span style="margin-left:8px">元</span>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="priceControlDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="savePriceControlForCollectible">保存配置</el-button>
      </template>
    </el-dialog>

    <!-- 寄售记录 Dialog -->
    <el-dialog v-model="listingRecordsDialog.visible" :title="`寄售记录 - ${listingRecordsDialog.name}`" width="850px" :close-on-click-modal="false">
      <div class="records-header">
        <div class="records-stats">
          <el-tag type="info">发行量：{{ listingRecordsDialog.edition }}</el-tag>
          <el-tag :type="listingRecordsDialog.resale_enabled ? 'success' : 'danger'">
            寄售：{{ listingRecordsDialog.resale_enabled ? '已开启' : '已关闭' }}
          </el-tag>
          <el-tag type="warning">在售挂单：{{ listingRecordsDialog.on_sale_count }}</el-tag>
          <el-tag type="success">已成交：{{ listingRecordsDialog.sold_count }}</el-tag>
          <el-tag type="danger">已下架：{{ listingRecordsDialog.delisted_count }}</el-tag>
        </div>
      </div>
      <el-table :data="listingRecordsPage.list" border stripe size="small" style="margin-top:12px">
        <el-table-column label="卖家" width="150">
          <template #default="{ row }">
            <div>{{ row.seller }}</div>
            <div class="sub-text">{{ row.seller_phone }}</div>
          </template>
        </el-table-column>
        <el-table-column label="编号" width="80" align="center">
          <template #default="{ row }">#{{ row.edition_no || '-' }}</template>
        </el-table-column>
        <el-table-column label="挂单价格" width="110" align="right">
          <template #default="{ row }">¥{{ Number(row.price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="原价" width="90" align="right">
          <template #default="{ row }">¥{{ Number(row.original_price).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="listingStatusTag(row.status)" size="small">{{ row.status_text }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="listed_at" label="挂单时间" width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'on_sale'"
              link
              type="danger"
              size="small"
              @click="handleForceDelistFromDialog(row)"
            >下架</el-button>
            <span v-else class="sub-text">-</span>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="listingRecordsPage_num"
        v-model:page-size="listingRecordsPageSize"
        :total="listingRecordsPage.total"
        :page-sizes="[5, 10, 20]"
        layout="total, prev, pager, next"
        style="margin-top:12px"
        @size-change="fetchListingRecords"
        @current-change="fetchListingRecords"
      />
    </el-dialog>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marketApi } from '../../api'
import { paginate } from '../../utils/pagination'

interface ListingItem {
  id: number
  seller: string
  seller_phone: string
  collectible_name: string
  collectible_image: string
  price: number
  original_price: number
  status: string
  status_text: string
  listed_at: string
  sold_at: string | null
  is_price_alert: boolean
  edition_no: number
}

interface CollectibleItem {
  id: number
  name: string
  image: string
  edition: number
  item_type: 'collectible' | 'blindbox'
  resale_enabled: boolean
  price_mode: 'limited' | 'unlimited'
  price_min: number
  price_max: number
  on_sale_count: number
  sold_count: number
  delisted_count: number
}

const activeTab = ref('listing')
const loading = ref(false)

const listingStatusOptions = [
  { label: '在售', value: 'on_sale' },
  { label: '已成交', value: 'sold' },
  { label: '已下架', value: 'delisted' },
  { label: '系统下架', value: 'system_delisted' }
]

// 全局二级市场开关
const globalResaleEnabled = ref(true)

// ===================== 藏品/盲盒寄售管理 =====================
const collectibleSearch = ref('')
const collectibleTypeFilter = ref('')

const collectibleList = ref<CollectibleItem[]>([])

function initCollectibleList() {
  collectibleList.value = []
  updateCollectibleCounts()
}

function updateCollectibleCounts() {
  collectibleList.value.forEach(c => {
    const items = localListings.value.filter(l => l.collectible_name === c.name)
    c.on_sale_count = items.filter(l => l.status === 'on_sale').length
    c.sold_count = items.filter(l => l.status === 'sold').length
    c.delisted_count = items.filter(l => l.status === 'delisted' || l.status === 'system_delisted').length
  })
}

const filteredCollectibleList = computed(() => {
  let list = collectibleList.value
  if (collectibleTypeFilter.value) {
    list = list.filter(c => c.item_type === collectibleTypeFilter.value)
  }
  if (collectibleSearch.value) {
    list = list.filter(c => c.name.includes(collectibleSearch.value.trim()))
  }
  return list
})

function getCollectibleByName(name: string): CollectibleItem | undefined {
  return collectibleList.value.find(c => c.name === name)
}

// 单个藏品寄售开关
async function handleCollectibleResaleSwitch(row: CollectibleItem, val: boolean) {
  if (!val) {
    try {
      await ElMessageBox.confirm(
        `确认关闭藏品《${row.name}》的寄售功能吗？\n\n关闭后：\n• 该藏品的所有编号将无法继续上架寄售\n• 已有在售挂单将被系统自动下架\n• 用户仓库中该藏品仍可持有，但无法进入二级市场\n\n此操作需密码确认。`,
        `关闭寄售 - ${row.name}`,
        { type: 'warning', confirmButtonText: '确认关闭', cancelButtonText: '取消' }
      )
      const ok = await requirePassword(`关闭藏品《${row.name}》寄售`)
      if (!ok) {
        row.resale_enabled = true
        return
      }
      // 系统自动下架该藏品所有在售挂单
      localListings.value.forEach(l => {
        if (l.collectible_name === row.name && l.status === 'on_sale') {
          l.status = 'system_delisted'
          l.status_text = '系统下架'
        }
      })
      updateCollectibleCounts()
      ElMessage.success(`藏品《${row.name}》寄售已关闭，在售挂单已自动下架`)
      fetchListing()
    } catch {
      row.resale_enabled = true
    }
  } else {
    ElMessage.success(`藏品《${row.name}》寄售已开启`)
  }
}

// ===================== 价格管控 =====================
const priceControlDialog = reactive({
  visible: false,
  id: 0,
  name: '',
  image: '',
  edition: 0,
  price_mode: 'unlimited' as 'limited' | 'unlimited',
  price_min: 0,
  price_max: 0
})

function openPriceControlDialog(row: CollectibleItem) {
  priceControlDialog.id = row.id
  priceControlDialog.name = row.name
  priceControlDialog.image = row.image
  priceControlDialog.edition = row.edition
  priceControlDialog.price_mode = row.price_mode
  priceControlDialog.price_min = row.price_min
  priceControlDialog.price_max = row.price_max
  priceControlDialog.visible = true
}

function savePriceControlForCollectible() {
  if (priceControlDialog.price_mode === 'limited') {
    if (priceControlDialog.price_min >= priceControlDialog.price_max) {
      ElMessage.warning('限价下限必须小于上限')
      return
    }
  }
  const target = collectibleList.value.find(c => c.id === priceControlDialog.id)
  if (target) {
    target.price_mode = priceControlDialog.price_mode
    target.price_min = priceControlDialog.price_min
    target.price_max = priceControlDialog.price_max
  }
  ElMessage.success(`藏品《${priceControlDialog.name}》价格管控已保存`)
  priceControlDialog.visible = false
  fetchListing()
}

// ===================== 寄售记录 =====================
const listingRecordsDialog = reactive({
  visible: false,
  id: 0,
  name: '',
  edition: 0,
  resale_enabled: true,
  on_sale_count: 0,
  sold_count: 0,
  delisted_count: 0
})

const listingRecordsPage_num = ref(1)
const listingRecordsPageSize = ref(10)
const listingRecordsPage = ref<{ list: ListingItem[]; total: number }>({ list: [], total: 0 })

function openListingRecordsDialog(row: CollectibleItem) {
  listingRecordsDialog.id = row.id
  listingRecordsDialog.name = row.name
  listingRecordsDialog.edition = row.edition
  listingRecordsDialog.resale_enabled = row.resale_enabled
  listingRecordsDialog.on_sale_count = row.on_sale_count
  listingRecordsDialog.sold_count = row.sold_count
  listingRecordsDialog.delisted_count = row.delisted_count
  listingRecordsPage_num.value = 1
  listingRecordsDialog.visible = true
  fetchListingRecords()
}

function fetchListingRecords() {
  const list = localListings.value.filter(l => l.collectible_name === listingRecordsDialog.name)
  const res = paginate(list, listingRecordsPage_num.value, listingRecordsPageSize.value)
  listingRecordsPage.value = { list: res.list as ListingItem[], total: res.total }
}

// 从寄售记录弹窗中单个下架
async function handleForceDelistFromDialog(row: ListingItem) {
  try {
    await ElMessageBox.confirm(
      `确认下架卖家 ${row.seller} 对《${row.collectible_name}》的挂单吗？`,
      '下架挂单',
      { type: 'warning', confirmButtonText: '确认下架', cancelButtonText: '取消' }
    )
    row.status = 'system_delisted'
    row.status_text = '系统下架'
    updateCollectibleCounts()
    listingRecordsDialog.on_sale_count--
    listingRecordsDialog.delisted_count++
    ElMessage.success('已下架')
    fetchListingRecords()
    fetchListing()
  } catch {
    // 取消
  }
}

// ===================== 手续费配置 =====================
const feeForm = reactive({ rate: 5, min: 1, max: 200, cycle: 'T+1' })
const defaultFee = { rate: 5, min: 1, max: 200, cycle: 'T+1' }
function saveFeeConfig() {
  ElMessage.success('手续费配置已保存')
}
function resetFeeConfig() {
  feeForm.rate = defaultFee.rate
  feeForm.min = defaultFee.min
  feeForm.max = defaultFee.max
  feeForm.cycle = defaultFee.cycle
  ElMessage.info('已重置')
}

// ===================== 挂单列表数据 =====================
const localListings = ref<ListingItem[]>([])

const listingSearch = reactive({ seller: '', status: '' })
const listingPage_num = ref(1)
const listingPageSize = ref(10)
const listingPage = ref<{ list: ListingItem[]; total: number }>({ list: [], total: 0 })

const soldPage_num = ref(1)
const soldPageSize = ref(10)
const soldPage = ref<{ list: ListingItem[]; total: number }>({ list: [], total: 0 })

const alertPage_num = ref(1)
const alertPageSize = ref(10)
const alertPage = ref<{ list: ListingItem[]; total: number }>({ list: [], total: 0 })

function listingStatusTag(status: string) {
  const map: Record<string, string> = {
    on_sale: 'success',
    sold: 'info',
    delisted: 'warning',
    system_delisted: 'danger'
  }
  return map[status] || 'info'
}

function getListingFilteredList(): ListingItem[] {
  let list = [...localListings.value]
  if (listingSearch.seller) {
    list = list.filter(l => l.seller.includes(listingSearch.seller.trim()))
  }
  if (listingSearch.status) {
    list = list.filter(l => l.status === listingSearch.status)
  }
  return list
}

async function fetchListing() {
  loading.value = true
  const res = paginate(getListingFilteredList(), listingPage_num.value, listingPageSize.value)
  listingPage.value = { list: res.list as ListingItem[], total: res.total }
  loading.value = false
}

function searchListing() {
  listingPage_num.value = 1
  fetchListing()
}

async function fetchSold() {
  loading.value = true
  const list = localListings.value.filter(l => l.status === 'sold')
  const res = paginate(list, soldPage_num.value, soldPageSize.value)
  soldPage.value = { list: res.list as ListingItem[], total: res.total }
  loading.value = false
}

function calcExceedPct(row: ListingItem): string {
  const ctrl = getCollectibleByName(row.collectible_name)
  const max = ctrl?.price_max || row.price
  if (!max) return '0.0'
  return (((row.price - max) / max) * 100).toFixed(1)
}

async function fetchAlert() {
  loading.value = true
  const list = localListings.value.filter(l => {
    if (l.status !== 'on_sale') return false
    const ctrl = getCollectibleByName(l.collectible_name)
    if (ctrl && ctrl.price_mode === 'limited' && l.price > ctrl.price_max) {
      return true
    }
    return l.is_price_alert
  })
  const res = paginate(list, alertPage_num.value, alertPageSize.value)
  alertPage.value = { list: res.list as ListingItem[], total: res.total }
  loading.value = false
}

function alertRowClass({ row }: { row: ListingItem }) {
  return row.is_price_alert ? 'alert-row' : ''
}

function handleTabChange(tab: string) {
  if (tab === 'listing') fetchListing()
  else if (tab === 'sold') fetchSold()
  else if (tab === 'alert') fetchAlert()
}

// 全局二级市场开关
async function handleGlobalResaleChange(val: boolean) {
  if (!val) {
    try {
      await ElMessageBox.confirm(
        '关闭二级市场后，所有藏品将无法继续寄售交易，确认关闭吗？',
        '关闭二级市场',
        { type: 'warning' }
      )
      const ok = await requirePassword('关闭二级市场总开关')
      if (!ok) {
        globalResaleEnabled.value = true
        return
      }
      ElMessage.success('二级市场已关闭')
    } catch {
      globalResaleEnabled.value = true
    }
  } else {
    ElMessage.success('二级市场已开启')
  }
}

// 强制下架（列表中）
async function handleForceDelist(row: ListingItem) {
  try {
    await ElMessageBox.confirm(
      `确认强制下架《${row.collectible_name}》（卖家：${row.seller}）的挂单吗？`,
      '强制下架',
      { type: 'error' }
    )
    const ok = await requirePassword('强制下架挂单')
    if (!ok) return
    row.status = 'system_delisted'
    row.status_text = '系统下架'
    updateCollectibleCounts()
    ElMessage.success('已强制下架')
    fetchListing()
  } catch {
    // 取消
  }
}

// 密码验证
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

async function loadData() {
  loading.value = true
  try {
    const result = await marketApi.trades({ page: 1, pageSize: 100 })
    localListings.value = result.list.map((item: any) => ({
      id: Number(item.id),
      seller: item.seller || '',
      seller_phone: item.sellerPhone || item.seller_phone || '',
      collectible_name: item.collectibleName || item.collectible_name || '',
      collectible_image: item.collectibleImage || item.collectible_image || '',
      price: Number(item.price) || 0,
      original_price: Number(item.originalPrice || item.original_price) || 0,
      status: item.status || 'sold',
      status_text: item.statusText || item.status_text || '',
      listed_at: item.listedAt || item.listed_at || '',
      sold_at: item.soldAt || item.sold_at || null,
      is_price_alert: item.isPriceAlert || item.is_price_alert || false,
      edition_no: item.editionNo || item.edition_no || 0
    })) as ListingItem[]
  } catch (e) {
    ElMessage.error('数据加载失败')
    localListings.value = []
  }
  loading.value = false
}

onMounted(async () => {
  await loadData()
  initCollectibleList()
  fetchListing()
})
</script>

<style scoped>
.amount-text {
  color: var(--color-danger);
  font-weight: 600;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.collectible-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.collectible-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.price-alert-text {
  color: var(--color-danger) !important;
  font-weight: 700;
}
.profit-text {
  color: var(--color-success);
  font-weight: 600;
}
.loss-text {
  color: var(--color-danger);
  font-weight: 600;
}
:deep(.alert-row) {
  background-color: #fef0f0 !important;
}
.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.records-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
