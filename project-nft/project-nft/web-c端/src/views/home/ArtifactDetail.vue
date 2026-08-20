<template>
  <div class="artifact-detail-page">
    <template v-if="artifact">
    <!-- Custom transparent navbar -->
    <div class="ad-nav">
      <div class="ad-nav__back" @click="goBack">
        <van-icon name="arrow-left" size="22" color="#FFFFFF" />
      </div>
    </div>

    <!-- Hero: artifact image with HD background -->
    <div class="ad-hero">
      <!-- HD background image -->
      <div class="ad-hero__bg"></div>

      <div class="ad-hero-card">
        <img :src="artifact.image" :alt="artifact.name" class="ad-hero-img" />
        <div class="ad-hero-tag">{{ artifact.dynasty }}</div>
      </div>
      <!-- 3D platform base -->
      <div class="ad-platform"></div>
      <div class="ad-platform-shadow"></div>
    </div>

    <!-- Info section -->
    <div class="ad-info">
      <div class="ad-info-header">
        <div class="ad-info-titles">
          <h1 class="ad-info-name">{{ artifact.name }}</h1>
          <p class="ad-info-subtitle">{{ artifact.material }}</p>
        </div>
      </div>

      <!-- Tags -->
      <div class="ad-info-tags">
        <span v-for="tag in artifact.tags" :key="tag" class="ad-tag ad-tag--gray">{{ tag }}</span>
      </div>
    </div>

    <!-- Issuer info card -->
    <div class="ad-issuer">
      <div class="ad-issuer__avatar">
        <span class="ad-issuer__avatar-text">数和</span>
      </div>
      <div class="ad-issuer__info">
        <div class="ad-issuer__name">数和文创</div>
        <div class="ad-issuer__desc">官方馆藏</div>
      </div>
      <van-icon name="arrow" size="16" color="#9CA3AF" />
    </div>

    <!-- Detail info list -->
    <div class="ad-detail-list">
      <div class="ad-detail-item">
        <span class="ad-detail-label">材质</span>
        <span class="ad-detail-value">{{ artifact.material }}</span>
      </div>
      <div class="ad-detail-item">
        <span class="ad-detail-label">年代</span>
        <span class="ad-detail-value">{{ artifact.period }}</span>
      </div>
      <div class="ad-detail-item">
        <span class="ad-detail-label">尺寸</span>
        <span class="ad-detail-value">{{ artifact.size }}</span>
      </div>
      <div class="ad-detail-item">
        <span class="ad-detail-label">来源</span>
        <span class="ad-detail-value">{{ artifact.origin }}</span>
      </div>
    </div>

    <!-- Story section -->
    <div class="ad-story">
      <div class="ad-story__title">文物故事</div>
      <div class="ad-story__content">{{ artifact.story }}</div>
    </div>

    <!-- Spacer for bottom bar -->
    <div class="ad-bottom-spacer"></div>

    <!-- Bottom fixed action bar -->
    <div class="ad-bottom-bar">
      <button class="ad-action-btn ad-action-btn--primary" @click="goBack">
        返回展馆
      </button>
    </div>
    </template>
    <div v-else class="ad-empty">文物不存在</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()

const artifact = ref(null)

async function loadArtifact() {
  try {
    const res = await request.get(`/artifacts/${route.params.id}`)
    const d = res.data
    if (!d) {
      artifact.value = null
      return
    }
    // 将后端字段映射为前端模板所需字段
    artifact.value = {
      id: d.id,
      name: d.name,
      image: d.image,
      dynasty: d.dynasty,
      material: d.category,
      description: d.description,
      tags: d.tags || [],
      period: d.dynasty,          // 后端无 period，用 dynasty 代替
      size: d.size || '—',        // 文物尺寸
      origin: d.origin || '—',    // 出土/产地
      story: d.description || '暂无介绍'  // 后端无 story，用 description 代替，空值兜底
    }
  } catch (e) {
    // 获取失败，显示"文物不存在"
    artifact.value = null
  }
}

onMounted(() => {
  loadArtifact()
})

function goBack() {
  router.back()
}
</script>

<style scoped>
.artifact-detail-page {
  min-height: 100vh;
  background: #F8F9FA;
  padding-bottom: calc(72px + env(safe-area-inset-bottom));
}

/* Navbar (transparent, overlays dark hero) */
.ad-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  z-index: 100;
  background: linear-gradient(180deg, rgba(13, 10, 8, 0.6) 0%, rgba(13, 10, 8, 0) 100%);
}
.ad-nav__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* Hero: HD background image */
.ad-hero {
  position: relative;
  padding-top: calc(44px + env(safe-area-inset-top));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 20px;
  overflow: hidden;
  background: #1A1410;
}

/* HD background image */
.ad-hero__bg {
  position: absolute;
  inset: 0;
  background-image: url('/artifact-hero-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Artifact image card */
.ad-hero-card {
  position: relative;
  width: 72%;
  aspect-ratio: 3 / 4;
  border-radius: 12px;
  overflow: hidden;
  box-shadow:
    0 0 40px rgba(200, 140, 80, 0.15),
    0 12px 40px rgba(0, 0, 0, 0.6);
  z-index: 2;
}
.ad-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ad-hero-tag {
  position: absolute;
  top: 12px;
  left: 12px;
  background: #B30A03;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(179, 10, 3, 0.4);
  z-index: 1;
}

/* 3D platform (semi-transparent, blending into shadow) */
.ad-platform {
  width: 85%;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(60, 45, 35, 0.8) 0%, rgba(30, 22, 18, 0.6) 100%);
  margin-top: -6px;
  z-index: 1;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
.ad-platform-shadow {
  width: 60%;
  height: 6px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(0, 0, 0, 0.4) 0%, transparent 70%);
  margin-top: 2px;
}

/* Info section */
.ad-info {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.ad-info-header {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.ad-info-titles {
  text-align: center;
}
.ad-info-name {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  margin: 0;
  line-height: 1.3;
}
.ad-info-subtitle {
  font-size: 13px;
  color: #9CA3AF;
  margin: 4px 0 0;
}
.ad-info-tags {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: center;
  flex-wrap: wrap;
}
.ad-tag {
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  white-space: nowrap;
}
.ad-tag--gray {
  background: #F3F4F6;
  color: #6B7280;
}

/* Issuer */
.ad-issuer {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
.ad-issuer__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
}
.ad-issuer__avatar-text {
  line-height: 1;
}
.ad-issuer__info {
  flex: 1;
  min-width: 0;
}
.ad-issuer__name {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
}
.ad-issuer__desc {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}

/* Detail list */
.ad-detail-list {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 8px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.ad-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #F3F4F6;
}
.ad-detail-item:last-child {
  border-bottom: none;
}
.ad-detail-label {
  font-size: 14px;
  color: #6B7280;
}
.ad-detail-value {
  font-size: 14px;
  color: #1F2937;
  font-weight: 500;
}

/* Story */
.ad-story {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}
.ad-story__title {
  font-size: 15px;
  font-weight: 600;
  color: #1F2937;
  margin-bottom: 10px;
}
.ad-story__content {
  font-size: 13px;
  color: #6B7280;
  line-height: 1.9;
  text-indent: 2em;
  text-align: justify;
}

.ad-bottom-spacer {
  height: 20px;
}

/* Bottom bar */
.ad-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(64px + env(safe-area-inset-bottom));
  padding: 0 16px;
  padding-bottom: env(safe-area-inset-bottom);
  background: #fff;
  border-top: 1px solid #F3F4F6;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 100;
}
.ad-action-btn {
  flex: 1;
  height: 46px;
  border-radius: 23px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  transition: opacity 0.15s;
}
.ad-action-btn--primary {
  background: #3B82F6;
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.ad-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  font-size: 14px;
  color: #9CA3AF;
}
</style>
