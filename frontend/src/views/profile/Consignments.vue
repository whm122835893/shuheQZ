<template>
  <div class="consignments-page">
    <NavBar title="寄售记录" />

    <!-- Tabs -->
    <div class="consignments-tabs">
      <div
        v-for="(tab, idx) in tabs"
        :key="tab.key"
        class="consignments-tab"
        :class="{ 'consignments-tab--active': activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- Consignment list -->
    <div class="consignments-list">
      <div v-for="item in filteredListings" :key="item.id" class="consignment-card">
        <div class="consignment-body">
          <div class="consignment-image">
            <img v-if="item.image" :src="item.image" :alt="item.name" class="consignment-image__img" />
            <van-icon v-else name="music-o" size="32" color="rgba(255,255,255,0.9)" />
          </div>
          <div class="consignment-info">
            <div class="consignment-name">{{ item.name }}</div>
            <div class="consignment-time">寄售时间：{{ item.listedAt }}</div>
            <div class="consignment-meta">
              <span class="consignment-serial">{{ item.serial }}</span>
              <span class="consignment-price">¥{{ Number(item.price).toFixed(2) }}</span>
            </div>
          </div>
          <div class="consignment-action">
            <span v-if="item.status === 'selling'" class="consignment-status consignment-status--selling">在售</span>
            <span v-else-if="item.status === 'sold'" class="consignment-status consignment-status--sold">已售出</span>
            <span v-else-if="item.status === 'cancelled'" class="consignment-status consignment-status--cancelled">已取消</span>
            <button
              v-if="item.status === 'selling'"
              class="consignment-cancel-btn"
              @click="onCancel(item)"
            >
              取消寄售
            </button>
          </div>
        </div>
      </div>

      <EmptyState v-if="filteredListings.length === 0" :text="emptyText" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'

const activeTab = ref(0)
const tabs = [
  { key: 'all', label: '全部' },
  { key: 'selling', label: '在售' },
  { key: 'sold', label: '已售出' },
  { key: 'cancelled', label: '已取消' }
]

// 状态映射：1=寄售中 2=已售出 3=已取消
const statusMap = { 1: 'selling', 2: 'sold', 3: 'cancelled' }

// ===== 寄售记录（API 数据）=====
const resaleListings = ref([])
const loading = ref(false)

async function fetchConsignments() {
  loading.value = true
  try {
    const res = await request.get('/market/my-listings', { params: { page: 1, page_size: 100 } })
    resaleListings.value = (res.data?.list || []).map(item => ({
      id: item.listing_id,
      collectibleId: item.collectible_id,
      name: item.collectible_name,
      image: item.collectible_image,
      gradient: null,
      icon: 'music-o',
      serial: item.serial_no,
      price: Number(item.price) || 0,
      listedAt: item.listed_at,
      status: statusMap[item.status] || 'unknown',
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}

onMounted(fetchConsignments)

const filteredListings = computed(() => {
  const key = tabs[activeTab.value].key
  if (key === 'all') return resaleListings.value
  return resaleListings.value.filter(l => l.status === key)
})

const emptyText = computed(() => {
  const map = {
    all: '暂无寄售记录',
    selling: '暂无在售藏品',
    sold: '暂无已售出藏品',
    cancelled: '暂无已取消寄售'
  }
  return map[tabs[activeTab.value].key]
})

async function onCancel(item) {
  showConfirmDialog({
    title: '取消寄售',
    message: '确定要取消该寄售吗？取消后藏品将从市场挂单中撤销。'
  }).then(async () => {
    try {
      await request.put(`/market/listings/${item.id}/cancel`)
      showToast('已取消寄售')
      fetchConsignments()
    } catch (err) {
      // 错误提示已由拦截器处理
    }
  }).catch(() => {})
}
</script>

<style scoped>
.consignments-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* Tabs */
.consignments-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid var(--ht-border-light);
}
.consignments-tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: var(--ht-text-secondary);
  position: relative;
  cursor: pointer;
}
.consignments-tab--active {
  color: var(--ht-text-primary);
  font-weight: 600;
}
.consignments-tab--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--ht-text-primary);
  border-radius: 2px;
}

/* List */
.consignments-list {
  padding: 12px;
}
.consignment-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  box-shadow: var(--ht-shadow-card);
}
.consignment-body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.consignment-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.consignment-image__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.consignment-info {
  flex: 1;
  min-width: 0;
}
.consignment-name {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.consignment-time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.consignment-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.consignment-serial {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
.consignment-price {
  font-size: 14px;
  color: var(--ht-red);
  font-weight: 700;
}
.consignment-action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.consignment-status {
  font-size: 12px;
  font-weight: 500;
}
.consignment-status--selling {
  color: var(--ht-red);
}
.consignment-status--sold {
  color: #10B981;
}
.consignment-status--cancelled {
  color: var(--ht-text-tertiary);
}
.consignment-cancel-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 15px;
  border: 1px solid var(--ht-border);
  background: #fff;
  font-size: 12px;
  color: var(--ht-text-primary);
  white-space: nowrap;
}
</style>
