<template>
  <div class="album-page">
    <template v-if="collectible">
    <NavBar title="专辑列表">
      <template #right>
        <van-icon :name="isFavorited ? 'like' : 'like-o'" size="20" :color="isFavorited ? '#B30A03' : '#1F2937'" @click="toggleFavorite" />
      </template>
    </NavBar>

    <!-- Hero image with floating buttons -->
    <div class="album-hero">
      <div class="album-hero-img" :style="{ background: collectible.gradient }">
        <img v-if="collectible.image" :src="collectible.image" :alt="collectible.name" class="album-hero-photo" />
        <van-icon v-else :name="collectible.icon" size="80" color="rgba(255,255,255,0.92)" />
      </div>
      <div class="album-float-btns">
        <div class="album-float-btn" @click.stop="router.push('/activity')">相关公告 →</div>
        <div class="album-float-btn" @click.stop="checkHasCollectible">我有吗 →</div>
      </div>
    </div>

    <!-- Info section -->
    <div class="album-info">
      <div class="album-title">{{ collectible.name }}</div>
      <div class="album-tag-row">
        <div class="album-tag-fused">
          <span class="album-tag tag-red-solid">发行</span>
          <span class="album-tag tag-gray-solid">{{ collectible.edition }}份</span>
        </div>
        <div class="album-tag-fused">
          <span class="album-tag tag-red-solid">流通</span>
          <span class="album-tag tag-gray-solid">{{ collectible.circulate }}份</span>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="album-tabs">
      <div
        v-for="(tab, idx) in tabs"
        :key="tab"
        class="album-tab"
        :class="{ active: activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ tab }}
      </div>
    </div>

    <!-- List items -->
    <div class="album-list" v-if="listItems.length > 0">
      <div
        v-for="item in listItems"
        :key="item.serial"
        class="album-item"
        @click="goDetail(item)"
      >
        <span class="album-item-name">{{ collectible.name }}</span>
        <div class="album-item-tags">
          <span class="tag-red-light">寄售中</span>
          <span class="tag-blue">汇</span>
        </div>
        <div class="album-item-right">
          <span class="album-item-serial">{{ item.serial }}</span>
          <span class="album-item-price">¥{{ Number(item.price).toFixed(2) }}</span>
        </div>
      </div>
    </div>
    <EmptyState v-else :text="emptyText" />

    <!-- Bottom fixed button (仅寄售购买) -->
    <div class="album-bottom">
      <button
        class="album-order-btn"
        :class="{ 'album-order-btn--disabled': resaleListings.length === 0 }"
        :disabled="resaleListings.length === 0"
        @click="goOrder"
      >
        {{ resaleListings.length > 0 ? '快捷下单' : '暂无在售' }}
      </button>
    </div>
    </template>
    <div v-else class="album-empty">藏品不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const route = useRoute()
const activeTab = ref(0)
const tabs = ['当前寄售', '当前求购', '当前委托', '当前成交']

// ===== 藏品详情 + 寄售列表（API 数据）=====
const collectible = ref(null)
const resaleListings = ref([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [detailRes, listingsRes] = await Promise.all([
      request.get(`/collectibles/${route.params.id}`),
      request.get('/market/listings', { params: { collectible_id: route.params.id, page: 1, page_size: 100 } }),
    ])
    const d = detailRes.data
    collectible.value = {
      id: d.id,
      name: d.name,
      image: d.image,
      gradient: d.gradient,
      icon: 'music-o',
      edition: d.edition || 0,
      circulate: d.circulate || 0,
    }
    resaleListings.value = (listingsRes.data?.list || []).map(item => ({
      listingId: item.listing_id,
      serial: item.serial_no,
      price: Number(item.price) || 0,
      collectibleId: item.collectible_id,
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
    collectible.value = null
    setTimeout(() => router.replace('/market'), 1500)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const { isLoggedIn, isRealname } = useUser()
const { isFavorited: checkFavorited, toggleFavorite: toggleFav } = useFavorites()

// Favorite state
const isFavorited = computed(() => checkFavorited(route.params.id))

// Filter list by activeTab:
// 0 (当前寄售): show resale listings from API
// 1/2/3 (求购/委托/成交): no data yet -> empty state
const listItems = computed(() => {
  if (activeTab.value === 0) {
    return resaleListings.value
  }
  return []
})

const emptyText = computed(() => {
  const texts = ['暂无寄售记录', '暂无求购记录', '暂无委托记录', '暂无成交记录']
  return texts[activeTab.value] || '暂无记录'
})

function checkBeforePurchase() {
  if (!isLoggedIn.value) {
    showDialog({
      title: '提示',
      message: '还未登录，请先登录后再操作！',
      showCancelButton: true,
      confirmButtonText: '去登录'
    }).then(() => {
      router.push('/auth/login')
    }).catch(() => {})
    return false
  }
  if (!isRealname.value) {
    showDialog({
      title: '提示',
      message: '购买藏品需要完成实名认证',
      showCancelButton: true,
      confirmButtonText: '去实名'
    }).then(() => {
      router.push('/profile/certification')
    }).catch(() => {})
    return false
  }
  return true
}

function goOrder() {
  if (!checkBeforePurchase()) return
  // 仅市场寄售购买：无挂单时提示并返回，不走发售流程
  if (resaleListings.value.length === 0) {
    showToast('暂无在售挂单')
    return
  }
  // 选取最便宜的挂单
  const cheapest = resaleListings.value.reduce((a, b) => (a.price <= b.price ? a : b))
  router.push(`/market/order/${route.params.id}?listing=${cheapest.listingId}&price=${cheapest.price}`)
}

function goDetail(item) {
  // 点击某条寄售挂单 → 直接进入该挂单的购买流程
  router.push(`/market/order/${route.params.id}?listing=${item.listingId}&price=${item.price}`)
}

// Toggle favorite on the NavBar icon
function toggleFavorite() {
  const favorited = toggleFav(route.params.id)
  showToast(favorited ? '已收藏' : '取消收藏')
}

// Check whether the user holds this collectible
async function checkHasCollectible() {
  if (!isLoggedIn.value) {
    showToast('请先登录')
    return
  }
  try {
    const res = await request.get('/user/collectibles', { params: { page: 1, page_size: 100, holding_status: 1 } })
    const items = (res.data?.list || []).filter(i => String(i.collectible_id) === String(route.params.id))
    if (items.length > 0) {
      showToast(`您持有该藏品${items.length}份`)
    } else {
      showToast('该藏品您暂未持有')
    }
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}
</script>

<style scoped>
.album-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-bottom: calc(50px + env(safe-area-inset-bottom) + 24px);
}

/* Hero image */
.album-hero {
  position: relative;
  margin-top: 12px;
}
.album-hero-img {
  width: 80%;
  margin: 0 auto;
  aspect-ratio: 1 / 1;
  border-radius: 16px;
  background: linear-gradient(135deg, #FFD1DC 0%, #FF8FA3 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--ht-shadow-card);
  overflow: hidden;
}
.album-hero-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.album-float-btns {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.album-float-btn {
  background: #fff;
  border-radius: 8px;
  box-shadow: var(--ht-shadow-card);
  padding: 8px 12px;
  font-size: 12px;
  color: var(--ht-text-primary);
  white-space: nowrap;
}

/* Info section */
.album-info {
  padding: 16px 24px 12px;
}
.album-title {
  font-size: 20px;
  color: var(--ht-text-primary);
  font-weight: 600;
  text-align: left;
}
.album-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
}
.album-tag-fused {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}
.album-tag-fused .album-tag {
  border-radius: 0;
}
.album-tag {
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.tag-red-solid {
  background: var(--ht-red);
  color: #fff;
  padding-left: 7px;
  padding-right: 7px;
}
.tag-gray-solid {
  background: var(--ht-bg-gray);
  color: var(--ht-text-primary);
}

/* Tab bar */
.album-tabs {
  display: flex;
  background: #fff;
  margin-top: 8px;
}
.album-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  color: var(--ht-text-tertiary);
}
.album-tab.active {
  color: var(--ht-text-primary);
  font-weight: 600;
}

/* List items */
.album-list {
  padding-top: 8px;
}
.album-item {
  background: #fff;
  border-radius: 12px;
  margin: 0 12px 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  box-shadow: var(--ht-shadow-card);
  cursor: pointer;
  transition: background 0.15s;
}
.album-item:active {
  background: #F3F4F6;
}
.album-item-name {
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 700;
  flex-shrink: 0;
}
.album-item-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 10px;
}
.tag-red-light {
  background: rgba(255, 0, 0, 0.1);
  color: var(--ht-red);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
}
.tag-blue {
  background: var(--ht-blue);
  color: #fff;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
}
.album-item-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.album-item-serial {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
.album-item-price {
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 700;
}

/* Bottom fixed button */
.album-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: var(--ht-bg-page);
  z-index: 100;
}
.album-order-btn {
  width: 100%;
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
}
.album-order-btn--disabled {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}
.album-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  font-size: 14px;
  color: #9CA3AF;
}
</style>
