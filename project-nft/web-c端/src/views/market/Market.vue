<template>
  <div class="market-page">
    <!-- Top tabs: 藏品 / 盲盒 -->
    <div class="top-tabs">
      <div
        v-for="(tab, idx) in topTabs"
        :key="tab"
        class="top-tab"
        :class="{ active: activeTab === idx }"
        @click="switchTopTab(idx)"
      >
        {{ tab }}
      </div>
    </div>

    <!-- Search bar -->
    <div class="search-bar">
      <div class="search-input">
        <van-icon name="search" size="18" color="#9CA3AF" class="search-icon" />
        <input type="text" v-model="searchKeyword" placeholder="搜索关键词" class="search-field" />
      </div>
    </div>

    <!-- Category tabs (horizontal scroll) -->
    <div class="category-tabs hide-scrollbar">
      <div
        v-for="(cat, idx) in categories"
        :key="cat"
        class="category-tab"
        :class="{ active: activeCategory === idx }"
        @click="activeCategory = idx"
      >
        {{ cat }}
      </div>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar">
      <span class="filter-item" @click="togglePriceSort">
        价格
        <van-icon :name="priceSortIcon" size="16" color="#1F2937" class="filter-arrow" />
      </span>
      <span class="filter-item" @click="toggleVolSort">
        热度排行
        <van-icon :name="volSortIcon" size="16" color="#1F2937" class="filter-arrow" />
      </span>
      <span class="filter-item filter-right" @click="toggleNotDelisted">
        <span class="radio-dot" :class="{ 'radio-dot--active': notDelisted }"></span>
        未退市
        <van-icon name="apps-o" size="16" color="#1F2937" />
      </span>
    </div>

    <!-- Product grid -->
    <div class="product-grid" v-if="filteredProducts.length > 0">
      <div
        v-for="item in filteredProducts"
        :key="item.id"
        class="product-card"
        @click="goDetail(item.id)"
      >
        <div class="product-image" :style="{ background: item.gradient }">
          <img v-if="item.image" :src="item.image" :alt="item.name" class="product-img" />
          <van-icon
            v-else
            :name="item.icon"
            size="48"
            color="rgba(255,255,255,0.85)"
            class="product-icon"
          />
          <div class="heart-circle" @click.stop="toggleFavorite(item)">
            <van-icon :name="isFavorited(item.id) ? 'like' : 'like-o'" size="14" :color="isFavorited(item.id) ? '#B30A03' : '#FFFFFF'" />
          </div>
        </div>
        <div class="product-info">
          <div class="product-name">{{ item.name }}</div>
          <div class="product-edition">
            <div class="product-tag-fused">
              <span class="product-tag product-tag--red">发行</span>
              <span class="product-tag product-tag--gray">{{ item.edition }}</span>
            </div>
            <div class="product-tag-fused">
              <span class="product-tag product-tag--red">流通</span>
              <span class="product-tag product-tag--gray">{{ item.circulate }}</span>
            </div>
          </div>
          <div class="product-bottom">
            <span class="product-vol">成交量:{{ item.vol }}</span>
            <span class="product-price">¥{{ item.price }}</span>
          </div>
        </div>
      </div>
    </div>

    <EmptyState v-else :text="emptyText" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import { useFavorites } from '@/composables/useFavorites'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const { isLoggedIn } = useUser()
const { favoriteIds, isFavorited, toggleFavorite: toggleFav } = useFavorites()

// Top-level tabs: 藏品 / 盲盒
const topTabs = ['藏品', '盲盒']
const activeTab = ref(0)

const activeCategory = ref(0)
const categories = ['精选', '全部', '我的关注', '文博', '漫画', '传奇', '山海', '国风']

// Search keyword bound to the search input
const searchKeyword = ref('')

// ===== 藏品列表（API 数据）=====
const marketProducts = ref([])

async function fetchMarketListings() {
  try {
    const res = await request.get('/market/listings', { params: { page: 1, page_size: 100 } })
    marketProducts.value = (res.data?.list || []).map(item => ({
      id: item.collectible_id,
      listingId: item.listing_id,
      name: item.collectible_name,
      image: item.collectible_image,
      gradient: null,
      icon: 'music-o',
      edition: 0,
      circulate: 0,
      vol: 0,
      price: Number(item.price) || 0,
      featured: false,
      marketTag: null,
      soldOut: false,
      subtitle: null,
      serialNo: item.serial_no,
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

// ===== 盲盒列表（API 数据）=====
const blindBoxList = ref([])

async function fetchBlindBoxes() {
  try {
    const res = await request.get('/blind-boxes', { params: { page: 1, page_size: 100 } })
    blindBoxList.value = (res.data?.list || []).map(item => ({
      id: item.collectible_id,
      blindBoxId: item.id,
      name: item.name,
      image: item.image,
      gradient: null,
      icon: 'gift-o',
      edition: item.edition || 0,
      circulate: item.sold || 0,
      vol: item.sold || 0,
      price: Number(item.price) || 0,
      featured: false,
      marketTag: null,
      soldOut: (item.sold || 0) >= (item.edition || 1),
      subtitle: null,
      prizePreview: item.prize_preview || [],
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

onMounted(() => {
  fetchMarketListings()
  fetchBlindBoxes()
})

// Products for the current top tab
const allProducts = computed(() => {
  if (activeTab.value === 1) {
    // 盲盒: 使用后端 API 数据
    return blindBoxList.value
  }
  // 藏品: 使用后端 API 数据
  return marketProducts.value
})

// Filter state: price sort (null = default, 'asc' = low to high, 'desc' = high to low)
const priceSort = ref(null)
// Volume sort: null = default, 'desc' = most first, 'asc' = least first
const volSort = ref(null)
// Not delisted toggle
const notDelisted = ref(false)

const priceSortIcon = computed(() => {
  if (priceSort.value === 'asc') return 'arrow-up'
  if (priceSort.value === 'desc') return 'arrow-down'
  return 'apps-o'
})

const volSortIcon = computed(() => {
  if (volSort.value === 'desc') return 'arrow-down'
  if (volSort.value === 'asc') return 'arrow-up'
  return 'apps-o'
})

function togglePriceSort() {
  if (priceSort.value === null) priceSort.value = 'asc'
  else if (priceSort.value === 'asc') priceSort.value = 'desc'
  else priceSort.value = null
  // Reset vol sort when price sort is active
  if (priceSort.value) volSort.value = null
}

function toggleVolSort() {
  if (volSort.value === null) volSort.value = 'desc'
  else if (volSort.value === 'desc') volSort.value = 'asc'
  else volSort.value = null
  // Reset price sort when vol sort is active
  if (volSort.value) priceSort.value = null
}

function toggleNotDelisted() {
  notDelisted.value = !notDelisted.value
}

function switchTopTab(idx) {
  if (activeTab.value === idx) return
  activeTab.value = idx
  // Reset all filters when switching top tab
  activeCategory.value = 0
  priceSort.value = null
  volSort.value = null
  notDelisted.value = false
}

const filteredProducts = computed(() => {
  const key = categories[activeCategory.value]
  let result = [...allProducts.value]

  // Search keyword filter (match against name and subtitle)
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    result = result.filter(p =>
      (p.name && p.name.toLowerCase().includes(kw)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(kw))
    )
  }

  // Category filter
  if (key === '精选') result = result.filter(p => p.featured)
  else if (key === '我的关注') result = result.filter(p => favoriteIds.value.has(p.id))
  else if (key !== '全部') result = result.filter(p => p.marketTag === key)

  // Not delisted filter: only show items where soldOut is false
  if (notDelisted.value) {
    result = result.filter(p => !p.soldOut)
  }

  // Price sort
  if (priceSort.value === 'asc') {
    result.sort((a, b) => a.price - b.price)
  } else if (priceSort.value === 'desc') {
    result.sort((a, b) => b.price - a.price)
  }

  // Volume sort
  if (volSort.value === 'desc') {
    result.sort((a, b) => b.vol - a.vol)
  } else if (volSort.value === 'asc') {
    result.sort((a, b) => a.vol - b.vol)
  }

  return result
})

const emptyText = computed(() => {
  const key = categories[activeCategory.value]
  if (key === '全部') return '暂无藏品'
  return `暂无${key}藏品`
})

function goDetail(id) {
  if (!isLoggedIn.value) {
    showDialog({
      title: '提示',
      message: '还未登录，请先登录后再操作！',
      showCancelButton: true,
      confirmButtonText: '去登录'
    }).then(() => {
      router.push('/auth/login')
    }).catch(() => {})
    return
  }
  // 盲盒 tab: 跳转发售详情页（可购买）
  if (activeTab.value === 1) {
    router.push(`/home/release/${id}`)
    return
  }
  router.push(`/market/album/${id}`)
}

// Toggle favorite state for a product card
function toggleFavorite(item) {
  const favorited = toggleFav(item.id)
  showToast(favorited ? '已收藏' : '取消收藏')
}
</script>

<style scoped>
.market-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 180px);
  padding-bottom: calc(58px + env(safe-area-inset-bottom) + 16px);
}

/* Top tabs (藏品 / 盲盒) */
.top-tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 16px 12px 8px;
}
.top-tab {
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-secondary);
  line-height: 1.2;
  position: relative;
  cursor: pointer;
}
.top-tab.active {
  font-size: 24px;
  font-weight: 700;
  color: var(--ht-text-primary);
}
.top-tab.active::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--ht-red);
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}
.search-input {
  flex: 1;
  display: flex;
  align-items: center;
  height: 40px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 24px;
  padding: 0 14px;
  gap: 8px;
}
.search-icon {
  flex-shrink: 0;
}
.search-field {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 14px;
  color: var(--ht-text-primary);
  min-width: 0;
}
.search-field::placeholder {
  color: var(--ht-text-tertiary);
}

/* Category tabs */
.category-tabs {
  display: flex;
  gap: 20px;
  padding: 0 12px;
  overflow-x: auto;
  white-space: nowrap;
}
.category-tab {
  font-size: 14px;
  color: var(--ht-text-secondary);
  padding: 8px 0;
  position: relative;
  flex-shrink: 0;
}
.category-tab.active {
  color: var(--ht-text-primary);
  font-weight: 600;
  font-size: 16px;
  border-bottom: 2px solid var(--ht-blue);
}

/* Filter bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 14px;
  color: var(--ht-text-primary);
}
.filter-item {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.filter-arrow {
  margin-left: 2px;
}
.filter-right {
  gap: 4px;
}
.radio-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #D1D5DB;
  position: relative;
  margin-right: 2px;
  transition: all 0.2s ease;
}
.radio-dot--active {
  border-color: #3B82F6;
}
.radio-dot--active::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3B82F6;
}

/* Product grid */
.product-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 12px;
}
.product-card {
  background: var(--ht-bg-card);
  border-radius: 12px;
  box-shadow: var(--ht-shadow-card);
  overflow: hidden;
}
.product-image {
  aspect-ratio: 1 / 1;
  border-radius: 12px 12px 0 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.heart-circle {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.product-info {
  padding: 8px 10px 10px;
}
.product-name {
  font-size: 14px;
  color: var(--ht-text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.product-edition {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
  display: flex;
  gap: 4px;
}
.product-tag-fused {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
}
.product-tag {
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 10px;
  white-space: nowrap;
}
.product-tag-fused .product-tag {
  border-radius: 0;
}
.product-tag--red {
  background: #B30A03;
  color: #fff;
  padding-left: 5px;
  padding-right: 5px;
}
.product-tag--gray {
  background: #F3F4F6;
  color: #1F2937;
}
.product-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.product-vol {
  font-size: 12px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.product-price {
  font-size: 14px;
  color: var(--ht-text-primary);
  font-weight: 700;
}
</style>
