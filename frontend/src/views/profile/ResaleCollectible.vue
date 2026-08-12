<template>
  <div class="resale-collectible-page">
    <!-- Custom transparent navbar with back arrow only -->
    <div class="rc-nav">
      <div class="rc-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#1F2937" />
      </div>
    </div>

    <!-- Hero section: collectible image card on platform -->
    <div class="rc-hero">
      <!-- Image card -->
      <div class="rc-hero-card">
        <img v-if="item?.collectible_image" :src="item.collectible_image" :alt="item?.collectible_name" class="rc-hero-img" />
        <div v-else class="rc-hero-img rc-hero-img--gradient" :style="{ background: collectible?.gradient || null }">
          <van-icon :name="'music-o'" size="80" color="rgba(255,255,255,0.85)" />
        </div>
      </div>
      <!-- 3D platform base -->
      <div class="rc-platform"></div>
      <div class="rc-platform-shadow"></div>
    </div>

    <!-- Title with laurel wreaths -->
    <div class="rc-title-section">
      <div class="rc-title-row">
        <van-icon name="award-o" size="20" color="#3B82F6" />
        <span class="rc-name">{{ item?.collectible_name }}</span>
        <van-icon name="award-o" size="20" color="#3B82F6" />
      </div>
      <div class="rc-badge-row">
        <div class="rc-badge-fused">
          <span class="rc-badge rc-badge--red">编号</span>
          <span class="rc-badge rc-badge--gray">{{ item?.serial_no }}</span>
        </div>
        <div class="rc-badge-fused">
          <span class="rc-badge rc-badge--red">持仓</span>
          <span class="rc-badge rc-badge--gray">{{ daysHeld }}天</span>
        </div>
      </div>
    </div>

    <!-- Metadata info cards -->
    <div class="rc-info-cards">
      <div class="rc-info-card">
        <span class="rc-info-label">所属专辑</span>
        <span class="rc-info-value">{{ collectible?.category?.name || '经典文化' }}</span>
      </div>
      <div class="rc-info-card">
        <span class="rc-info-label">合约地址</span>
        <span class="rc-info-value mono">{{ collectible?.contract_address_masked || '—' }}</span>
      </div>
      <div class="rc-info-card">
        <span class="rc-info-label">认证标识</span>
        <span class="rc-info-value">{{ collectible?.cert_id || '—' }}</span>
      </div>
      <div class="rc-info-card">
        <span class="rc-info-label">购入价格</span>
        <span class="rc-info-value">¥{{ Number(item?.acquired_price || 0).toFixed(2) }}</span>
      </div>
    </div>

    <!-- Detailed information sections -->
    <div class="rc-sections">
      <div class="rc-section">
        <div class="rc-section-label">创作者</div>
        <div class="rc-section-value">{{ collectible?.creator || '数和文创' }}</div>
      </div>
      <div class="rc-section">
        <div class="rc-section-label">品牌方</div>
        <div class="rc-section-value">{{ collectible?.brand || '数和文创' }}</div>
      </div>
      <div class="rc-section">
        <div class="rc-section-label">寄售须知</div>
        <div class="rc-section-text">
          数字藏品为虚拟数字商品，而非实物，仅限实名认证为年满18周岁，并小于60周岁的中国大陆用户寄售。数字藏品的版权由发行方或原创者拥有，除另行取得版权拥有者书面同意外，用户不得将数字藏品用于任何商业用途。寄售成功后，平台将收取成交价格的5%作为服务费。请勿对数字藏品进行炒作、场外交易、欺诈，或以任何其他非法方式进行使用。
        </div>
      </div>
    </div>

    <!-- Bottom fixed resale bar (no price, just button) -->
    <div class="rc-bottom-bar">
      <button class="rc-resale-btn" @click="goResaleDetail">立即寄售</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import request from '@/api/request'

const router = useRouter()
const route = useRoute()

// ===== 用户藏品详情（API 数据）=====
const item = ref(null)
const collectible = ref(null)

async function fetchUserCollectible() {
  try {
    const res = await request.get('/user/collectibles', { params: { page: 1, page_size: 200, holding_status: 1 } })
    const found = (res.data?.list || []).find(i => String(i.id) === String(route.params.id))
    if (!found) {
      // 也可能在寄售中(holding_status=2)
      const res2 = await request.get('/user/collectibles', { params: { page: 1, page_size: 200, holding_status: 2 } })
      const found2 = (res2.data?.list || []).find(i => String(i.id) === String(route.params.id))
      if (found2) {
        item.value = found2
      } else {
        showToast('藏品不存在')
        setTimeout(() => router.back(), 1500)
        return
      }
    } else {
      item.value = found
    }

    // 获取藏品详情
    if (item.value.collectible_id) {
      try {
        const detailRes = await request.get(`/collectibles/${item.value.collectible_id}`)
        collectible.value = detailRes.data
      } catch (e) {
        // 藏品详情获取失败不影响基本展示
      }
    }
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

onMounted(fetchUserCollectible)

const daysHeld = computed(() => {
  if (!item.value?.acquired_at) return 0
  const acquired = new Date(item.value.acquired_at.replace(/-/g, '/'))
  const now = new Date()
  return Math.max(0, Math.floor((now - acquired) / (1000 * 60 * 60 * 24)))
})

function goBack() {
  router.back()
}

function goResaleDetail() {
  if (item.value?.status === 2) {
    showToast('该藏品已在寄售中')
    router.back()
    return
  }
  router.push(`/profile/resale/${route.params.id}`)
}
</script>

<style scoped>
.resale-collectible-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: calc(64px + env(safe-area-inset-bottom) + 16px);
}

/* Custom transparent navbar */
.rc-nav {
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
.rc-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Hero section */
.rc-hero {
  position: relative;
  padding-top: calc(44px + env(safe-area-inset-top));
  background: var(--ht-gradient-blue-white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 16px;
}
.rc-hero-card {
  position: relative;
  width: 78%;
  aspect-ratio: 3 / 4;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 2;
}
.rc-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.rc-hero-img--gradient {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 3D platform */
.rc-platform {
  width: 90%;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff 0%, #E5E7EB 100%);
  margin-top: -8px;
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.rc-platform-shadow {
  width: 70%;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.1) 0%, transparent 70%);
  margin-top: 2px;
}

/* Title section */
.rc-title-section {
  text-align: center;
  padding: 8px 24px 16px;
}
.rc-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.rc-name {
  font-size: 22px;
  font-weight: 700;
  color: #1F2937;
}
.rc-badge-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.rc-badge-fused {
  display: inline-flex;
  border-radius: 4px;
  overflow: hidden;
}
.rc-badge-fused .rc-badge {
  border-radius: 0;
}
.rc-badge {
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.rc-badge--red {
  background: #B30A03;
  color: #fff;
  padding-left: 7px;
  padding-right: 7px;
}
.rc-badge--gray {
  background: #F3F4F6;
  color: #1F2937;
}

/* Metadata info cards */
.rc-info-cards {
  padding: 0 16px;
}
.rc-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.rc-info-label {
  font-size: 14px;
  color: #6B7280;
}
.rc-info-value {
  font-size: 14px;
  color: #1F2937;
  font-weight: 500;
}

/* Detailed information sections */
.rc-sections {
  padding: 8px 16px 16px;
}
.rc-section {
  margin-bottom: 16px;
}
.rc-section-label {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 6px;
}
.rc-section-value {
  font-size: 15px;
  color: #1F2937;
  font-weight: 500;
}
.rc-section-text {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.7;
}

/* Bottom fixed resale bar (no price) */
.rc-bottom-bar {
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
  z-index: 100;
}
.rc-resale-btn {
  flex: 1;
  height: 46px;
  border-radius: 23px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  cursor: pointer;
}
</style>
