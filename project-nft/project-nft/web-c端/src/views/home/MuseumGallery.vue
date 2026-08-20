<template>
  <div class="museum-page">
    <NavBar title="文物展馆" />

    <!-- Intro banner -->
    <div class="museum-intro">
      <div class="museum-intro__bg"></div>
      <div class="museum-intro__overlay"></div>
      <div class="museum-intro__content">
        <div class="museum-intro__title">千年瑰宝 · 文明印记</div>
        <div class="museum-intro__desc">馆藏珍品，穿越时空对话</div>
      </div>
    </div>

    <!-- Artifact masonry -->
    <div class="artifact-grid">
      <div
        v-for="item in artifacts"
        :key="item.id"
        class="artifact-card"
        @click="goDetail(item.id)"
      >
        <div class="artifact-card__image">
          <img :src="item.image" :alt="item.name" class="artifact-card__img" />
          <div class="artifact-card__overlay"></div>
          <div class="artifact-card__dynasty">{{ item.dynasty }}</div>
        </div>
        <div class="artifact-card__info">
          <div class="artifact-card__name">{{ item.name }}</div>
          <div class="artifact-card__material">{{ item.material }}</div>
        </div>
      </div>
    </div>

    <div class="museum-footer">
      <van-icon name="medal-o" size="16" color="#9CA3AF" />
      <span>更多珍品持续更新中</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const artifacts = ref([])

async function loadArtifacts() {
  try {
    const res = await request.get('/artifacts', {
      params: { page: 1, page_size: 20 }
    })
    const list = res.data?.list || []
    // 将后端 category 字段映射为前端模板使用的 material 字段
    artifacts.value = list.map(item => ({
      ...item,
      material: item.category
    }))
  } catch (e) {
    // 错误提示已由拦截器处理
  }
}

onMounted(() => {
  loadArtifacts()
})

function goDetail(id) {
  router.push(`/home/museum/${id}`)
}
</script>

<style scoped>
.museum-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #DBEAFE 0%, #FFFFFF 180px);
  padding-bottom: 40px;
}

/* Intro banner */
.museum-intro {
  position: relative;
  margin: 12px;
  border-radius: 16px;
  overflow: hidden;
  height: 140px;
}
.museum-intro__bg {
  position: absolute;
  inset: 0;
  background-image: url('/qianli-jiangshan.jpg');
  background-size: cover;
  background-position: center;
}
.museum-intro__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(13, 10, 8, 0.35) 0%, rgba(13, 10, 8, 0.55) 100%);
}
.museum-intro__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 0 20px;
}
.museum-intro__title {
  font-size: 22px;
  font-weight: 700;
  color: #E8D5B7;
  letter-spacing: 2px;
}
.museum-intro__desc {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(232, 213, 183, 0.6);
  letter-spacing: 1px;
}

/* Artifact grid */
.artifact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 0 12px;
}
.artifact-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease;
}
.artifact-card:active {
  transform: scale(0.97);
}
.artifact-card__image {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
}
.artifact-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.artifact-card__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
}
.artifact-card__dynasty {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(179, 10, 3, 0.85);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  z-index: 1;
}
.artifact-card__info {
  padding: 12px;
}
.artifact-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.artifact-card__material {
  margin-top: 6px;
  font-size: 12px;
  color: #9CA3AF;
}

/* Footer */
.museum-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 30px;
  font-size: 13px;
  color: #9CA3AF;
}
</style>
