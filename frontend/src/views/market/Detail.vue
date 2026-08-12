<template>
  <div class="detail-page">
    <template v-if="collectible">
    <!-- Custom transparent navbar with back arrow and favorite -->
    <div class="detail-nav">
      <div class="detail-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#1F2937" />
      </div>
      <div class="detail-nav__right">
        <van-icon
          :name="isFavorited ? 'like' : 'like-o'"
          size="22"
          :color="isFavorited ? '#B30A03' : '#1F2937'"
          @click="onToggleFavorite"
        />
      </div>
    </div>

    <!-- Hero section: collectible image card on platform -->
    <div class="detail-hero">
      <!-- Image card -->
      <div class="detail-hero-card">
        <img v-if="collectible.image" :src="collectible.image" :alt="collectible.name" class="detail-hero-img" />
        <div v-else class="detail-hero-img detail-hero-img--gradient" :style="{ background: collectible.gradient }">
          <van-icon :name="collectible.icon" size="80" color="rgba(255,255,255,0.85)" />
        </div>
      </div>
      <!-- 3D platform base -->
      <div class="detail-platform"></div>
      <div class="detail-platform-shadow"></div>
    </div>

    <!-- Title with laurel wreaths -->
    <div class="detail-title-section">
      <div class="detail-title-row">
        <van-icon name="award-o" size="20" color="#3B82F6" />
        <span class="detail-name">{{ collectible.name }}</span>
        <van-icon name="award-o" size="20" color="#3B82F6" />
      </div>
      <div class="detail-badge-row">
        <div class="detail-badge-fused">
          <span class="detail-badge detail-badge--red">发行</span>
          <span class="detail-badge detail-badge--gray">{{ collectible.edition }}份</span>
        </div>
        <div class="detail-badge-fused">
          <span class="detail-badge detail-badge--red">流通</span>
          <span class="detail-badge detail-badge--gray">{{ collectible.circulate }}份</span>
        </div>
      </div>
    </div>

    <!-- Metadata info cards -->
    <div class="detail-info-cards">
      <div class="detail-info-card">
        <span class="detail-info-label">所属专辑</span>
        <span class="detail-info-value">{{ collectible.album }}</span>
      </div>
      <div class="detail-info-card">
        <span class="detail-info-label">合约地址</span>
        <span class="detail-info-value mono">{{ collectible.contract }}</span>
      </div>
      <div class="detail-info-card">
        <span class="detail-info-label">认证标识</span>
        <span class="detail-info-value">{{ collectible.certId }}</span>
      </div>
    </div>

    <!-- Detailed information sections -->
    <div class="detail-sections">
      <div class="detail-section">
        <div class="detail-section-label">创作者</div>
        <div class="detail-section-value">{{ collectible.creator }}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">品牌方</div>
        <div class="detail-section-value">{{ collectible.brand }}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">购买须知</div>
        <div class="detail-section-text">
          数字藏品为虚拟数字商品，而非实物，仅限实名认证为年满18周岁，并小于60周岁的中国大陆用户购买。数字藏品的版权由发行方或原创者拥有，除另行取得版权拥有者书面同意外，用户不得将数字藏品用于任何商业用途。本商品一经售出，不支持退换请勿对数字藏品进行炒作、场外交易、欺诈，或以任何其他非法方式进行使用。
        </div>
      </div>
    </div>

    <!-- Bottom fixed bar: 市场藏品详情 → 引导去寄售列表 -->
    <div class="detail-bottom-bar">
      <span class="detail-bottom-price">¥{{ collectible.price }}</span>
      <button
        class="detail-buy-btn"
        @click="goAlbum"
      >
        查看寄售
      </button>
    </div>
    </template>
    <div v-else class="detail-empty">藏品不存在</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '@/api/request'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const route = useRoute()
const { isFavorited: checkFavorited, toggleFavorite: toggleFav } = useFavorites()

// ===== 藏品详情（API 数据）=====
const collectible = ref(null)

async function fetchCollectibleDetail() {
  try {
    const res = await request.get(`/collectibles/${route.params.id}`)
    const d = res.data
    collectible.value = {
      id: d.id,
      name: d.name,
      image: d.image,
      gradient: d.gradient,
      icon: 'music-o',
      edition: d.edition || 0,
      circulate: d.circulate || 0,
      album: d.category?.name || '经典文化',
      contract: d.contract_address_masked || '—',
      certId: d.cert_id || '—',
      creator: d.creator || '—',
      brand: d.brand || '—',
      price: Number(d.price) || 0,
    }
  } catch (err) {
    // 错误提示已由拦截器处理
    collectible.value = null
    setTimeout(() => router.replace('/market'), 1500)
  }
}

onMounted(fetchCollectibleDetail)

// Reactive favorite state
const isFavorited = computed(() => checkFavorited(route.params.id))
// Toggle favorite with toast feedback
function onToggleFavorite() {
  const favorited = toggleFav(route.params.id)
  showToast(favorited ? '已收藏' : '取消收藏')
}

function goBack() {
  router.back()
}
function goAlbum() {
  // 市场藏品详情 → 跳转到寄售列表页（Album.vue）
  router.push(`/market/album/${route.params.id}`)
}
</script>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: calc(64px + env(safe-area-inset-bottom) + 16px);
}

/* Custom transparent navbar */
.detail-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.8) 0%, rgba(255, 255, 255, 0) 100%);
}
.detail-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.detail-nav__right {
  margin-left: auto;
  margin-right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Hero section */
.detail-hero {
  position: relative;
  padding-top: calc(44px + env(safe-area-inset-top));
  background: var(--ht-gradient-blue-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 16px;
}
.detail-hero-card {
  position: relative;
  width: 78%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 2;
}
.detail-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-hero-img--gradient {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 3D platform */
.detail-platform {
  width: 90%;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #E5E7EB 100%);
  margin-top: -8px;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.detail-platform-shadow {
  width: 70%;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
  margin-top: 2px;
}

/* Title section */
.detail-title-section {
  text-align: center;
  padding: 8px 24px 16px;
}
.detail-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: #1F2937;
}
.detail-badge-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.detail-badge-fused {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}
.detail-badge-fused .detail-badge {
  border-radius: 0;
}
.detail-badge {
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.detail-badge--red {
  background: #B30A03;
  color: #fff;
  padding-left: 7px;
  padding-right: 7px;
}
.detail-badge--gray {
  background: #F3F4F6;
  color: #1F2937;
}

/* Metadata info cards */
.detail-info-cards {
  padding: 0 16px;
}
.detail-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.detail-info-label {
  font-size: 14px;
  color: #6B7280;
}
.detail-info-value {
  font-size: 14px;
  color: #1F2937;
  font-weight: 500;
}

/* Detailed information sections */
.detail-sections {
  padding: 8px 16px 16px;
}
.detail-section {
  margin-bottom: 16px;
}
.detail-section-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 6px;
}
.detail-section-value {
  font-size: 15px;
  color: #1F2937;
  font-weight: 500;
}
.detail-section-text {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.7;
}

/* Bottom fixed purchase bar */
.detail-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding: 0 16px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid #F3F4F6;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
}
.detail-bottom-price {
  font-size: 24px;
  color: #1F2937;
  font-weight: 700;
  flex-shrink: 0;
}
.detail-buy-btn {
  flex: 1;
  height: 46px;
  border-radius: 23px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}
.detail-buy-btn--disabled {
  background: #9CA3AF;
  color: #fff;
  box-shadow: none;
  cursor: not-allowed;
}
.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  font-size: 14px;
  color: #9CA3AF;
}
</style>
