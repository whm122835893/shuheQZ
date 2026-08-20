<template>
  <div class="blindbox-detail" v-loading="loading">
    <template v-if="info">
      <!-- 顶部数据卡片 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="6">
          <div class="stat-card grad-blue">
            <div class="stat-info">
              <div class="stat-label">盲盒发行总量</div>
              <div class="stat-value">{{ info.edition.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Files /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card grad-green">
            <div class="stat-info">
              <div class="stat-label">盲盒已售出发售</div>
              <div class="stat-value">{{ info.sold.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><SoldOut /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card grad-cyan">
            <div class="stat-info">
              <div class="stat-label">盲盒库存池</div>
              <div class="stat-value">{{ info.pool.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Box /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="stat-card grad-pink">
            <div class="stat-info">
              <div class="stat-label">盲盒流通量</div>
              <div class="stat-value">{{ info.circulation.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Promotion /></el-icon></div>
          </div>
        </el-col>
      </el-row>

      <el-card>
        <div class="page-header">
          <div class="header-left">
            <el-image :src="info.image" class="detail-img" fit="cover" />
            <div>
              <span class="page-title">{{ info.name }}</span>
              <div class="header-sub">
                <el-tag size="small" :type="statusTagType(info.status)">{{ statusText(info.status) }}</el-tag>
                <el-tag size="small" style="margin-left: 8px">¥{{ info.price.toFixed(2) }}</el-tag>
              </div>
            </div>
          </div>
          <el-button @click="router.back()">返回</el-button>
        </div>

        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="盲盒名称">{{ info.name }}</el-descriptions-item>
              <el-descriptions-item label="盲盒ID">{{ info.id }}</el-descriptions-item>
              <el-descriptions-item label="发行总量">{{ info.edition.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="子藏品数">{{ info.item_count }}</el-descriptions-item>
              <el-descriptions-item label="描述" :span="2">{{ info.description || '-' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ info.created_at }}</el-descriptions-item>
              <el-descriptions-item label="发售时间">{{ info.onsale_at }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 子藏品配置（进度条展示概率） -->
          <el-tab-pane label="子藏品配置" name="items">
            <div class="items-section">
              <div class="items-summary">
                <span>子藏品总数：{{ info.items.length }}</span>
                <span>概率总和：{{ itemsProbabilitySum.toFixed(4) }}%</span>
                <el-tag :type="itemsProbabilitySum <= 100 ? 'success' : 'danger'" size="small">
                  {{ itemsProbabilitySum <= 100 ? '概率正常' : '概率异常' }}
                </el-tag>
              </div>

              <div class="items-viz">
                <div class="viz-title">概率分布可视化</div>
                <div v-for="(item, index) in info.items" :key="item.id" class="viz-item">
                  <el-image :src="item.collectible_image" class="viz-img" fit="cover" />
                  <div class="viz-content">
                    <div class="viz-row">
                      <span class="viz-name">{{ item.collectible_name }}</span>
                      <span class="viz-prob">{{ item.probability.toFixed(4) }}%</span>
                    </div>
                    <el-progress
                      :percentage="Math.min(parseFloat(item.probability.toFixed(2)), 100)"
                      :color="progressColors[index % progressColors.length]"
                      :stroke-width="14"
                    />
                    <div class="viz-meta">计划数量：{{ item.planned_quantity.toLocaleString() }}</div>
                  </div>
                </div>
              </div>

              <el-table :data="info.items" border style="margin-top: 16px">
                <el-table-column type="index" label="#" width="60" />
                <el-table-column label="子藏品" min-width="200">
                  <template #default="{ row }">
                    <div class="item-cell">
                      <el-image :src="row.collectible_image" class="item-img" fit="cover" />
                      <span>{{ row.collectible_name }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="中奖概率" width="160">
                  <template #default="{ row }">
                    <strong>{{ row.probability.toFixed(4) }}%</strong>
                  </template>
                </el-table-column>
                <el-table-column prop="planned_quantity" label="计划数量" width="120" />
              </el-table>
            </div>
          </el-tab-pane>

          <!-- 发售信息 -->
          <el-tab-pane label="发售信息" name="sale">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="发售价格">¥{{ info.price.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="每人限购">{{ info.per_user_limit === 0 ? '不限购' : info.per_user_limit + ' 个' }}</el-descriptions-item>
              <el-descriptions-item label="发售时间">{{ info.onsale_at }}</el-descriptions-item>
              <el-descriptions-item label="发售状态">
                <el-tag :type="statusTagType(info.status)">{{ statusText(info.status) }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="已售出">{{ info.sold.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="空投量">{{ info.airdropped_count.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="销毁量">{{ info.destroyed_count.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="库存池">{{ info.pool.toLocaleString() }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 开启记录 -->
          <el-tab-pane label="开启记录" name="records">
            <el-table :data="openRecords" border>
              <el-table-column prop="order_no" label="订单号" width="160" />
              <el-table-column prop="user" label="用户" width="120" />
              <el-table-column label="开出藏品" min-width="200">
                <template #default="{ row }">
                  <div class="item-cell">
                    <el-image :src="row.item_image" class="item-img" fit="cover" />
                    <span>{{ row.item_name }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="probability" label="概率" width="120">
                <template #default="{ row }">{{ row.probability.toFixed(4) }}%</template>
              </el-table-column>
              <el-table-column prop="time" label="开启时间" width="180" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
    <el-empty v-else-if="!loading" description="未找到盲盒信息" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Files, SoldOut, Box, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { blindBoxApi } from '../../api'

interface BlindboxSubItem {
  id: number
  collectible_id: number
  collectible_name: string
  collectible_image: string
  probability: number
  planned_quantity: number
}
interface BlindboxInfo {
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
  items: BlindboxSubItem[]
}

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const info = ref<BlindboxInfo | null>(null)
const activeTab = ref('info')

const progressColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#a18cd1']

const itemsProbabilitySum = computed(() => {
  if (!info.value) return 0
  return info.value.items.reduce((sum, item) => sum + (item.probability || 0), 0)
})

const statusText = (status: string) =>
  ({ draft: '草稿', on_sale: '发售中', sold_out: '已售罄', off_shelf: '已下架' }[status] || status)
const statusTagType = (status: string) =>
  ({ draft: 'info', on_sale: 'success', sold_out: 'danger', off_shelf: 'warning' }[status] || 'info')

// 开启记录
const openRecords = ref<any[]>([])

async function loadData() {
  loading.value = true
  const id = Number(route.params.id)
  try {
    const detail = await blindBoxApi.detail(id)
    const item: BlindboxInfo = {
      id: Number(detail.id),
      name: detail.name || '',
      image: detail.image || '',
      description: detail.description || '',
      edition: detail.edition || 0,
      sold: detail.sold || 0,
      airdropped_count: detail.airdroppedCount || 0,
      destroyed_count: detail.destroyedCount || 0,
      pool: detail.pool || 0,
      circulation: detail.circulate || detail.circulation || 0,
      price: parseFloat(String(detail.price)) || 0,
      status: detail.status === 2 ? 'on_sale' : detail.status === 3 ? 'sold_out' : detail.status === 0 ? 'draft' : 'off_shelf',
      per_user_limit: detail.perUserLimit || 0,
      onsale_at: detail.onsaleAt || '',
      item_count: detail.itemCount || (detail.items || []).length,
      created_at: detail.createdAt || '',
      items: (detail.items || []).map((it: any) => ({
        id: Number(it.id) || 0,
        collectible_id: Number(it.collectible_id || it.collectibleId) || 0,
        collectible_name: it.collectible_name || it.collectibleName || '',
        collectible_image: it.collectible_image || it.collectibleImage || '',
        probability: it.probability || 0,
        planned_quantity: it.planned_quantity || it.plannedQuantity || 0
      }))
    }
    info.value = item
    // 加载真实开盒记录
    try {
      const recordsResult = await blindBoxApi.openRecords(id, { page: 1, pageSize: 20 })
      openRecords.value = (recordsResult.list || []).map((r: any) => ({
        order_no: r.orderNo || r.order_no || '-',
        user: r.user || r.nickname || '-',
        item_name: r.itemName || r.item_name || r.collectibleName || '-',
        item_image: r.itemImage || r.item_image || r.collectibleImage || '',
        probability: r.probability || 0,
        time: r.createdAt || r.time || '-'
      }))
    } catch {
      openRecords.value = []
    }
  } catch (e) {
    ElMessage.error('数据加载失败')
    info.value = null
    openRecords.value = []
  }
  loading.value = false
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
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.detail-img {
  width: 72px;
  height: 72px;
  border-radius: 8px;
}
.header-sub {
  margin-top: 6px;
}
.items-section {
  padding: 4px 0;
}
.items-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--bg-page);
  border-radius: 8px;
  font-size: 14px;
}
.items-viz {
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
  margin-bottom: 16px;
}
.viz-img {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  flex-shrink: 0;
}
.viz-content {
  flex: 1;
}
.viz-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}
.viz-name {
  font-weight: 500;
  color: var(--text-primary);
}
.viz-prob {
  font-weight: 600;
  color: var(--color-primary);
}
.viz-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}
.item-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.item-img {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}
</style>
