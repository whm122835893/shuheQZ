<template>
  <div class="notice-page">
    <NavBar title="官方公告" />

    <template v-if="notice">
      <!-- Breadcrumb -->
      <div class="breadcrumb">公告 &gt; {{ notice.tag }}</div>

      <!-- Related collectibles -->
      <div class="related" v-if="relatedCollectible">
        <div class="related__title">相关藏品</div>
        <div class="related__item">
          <div class="related__card" :style="{ background: relatedCollectible.gradient }">
            <img v-if="relatedCollectible.image" :src="relatedCollectible.image" :alt="relatedCollectible.name" class="related__img" />
            <van-icon v-else :name="relatedCollectible.icon || 'music-o'" size="40" color="rgba(255,255,255,0.85)" />
          </div>
          <div class="related__name">{{ relatedCollectible.name }}</div>
        </div>
      </div>

      <!-- Notice title -->
      <h1 class="notice-title">{{ notice.title }}</h1>

      <!-- Body text -->
      <div class="notice-body">
        <p v-for="(line, idx) in noticeBody" :key="idx">{{ line }}</p>
      </div>

      <!-- Notice time -->
      <div class="notice-time">{{ notice.time }}</div>

      <!-- Tips card -->
      <div class="tips-card">
        <div class="tips-card__title">【数和文创温馨提示】</div>
        <p class="tips-card__body">数和文创风险提示：平台发行的数字藏品仅具备收藏欣赏价值，官方对藏品价格不构成任何指导意义，请谨慎购买，严防炒作。平台坚决反对数字藏品炒作行为，禁止任何形式的虚拟货币交易。数字藏品一经售出，非质量原因不支持退换。</p>
      </div>
    </template>

    <div v-else-if="loading" class="notice-loading" style="display:flex;justify-content:center;align-items:center;padding:60px 0;">
      <van-loading type="spinner" color="#3B82F6" />
    </div>

    <EmptyState v-else text="公告不存在" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'

const route = useRoute()

const notice = ref(null)
const loading = ref(false)
// API 不返回相关藏品信息，固定为 null
const relatedCollectible = null

// 类型映射为标签文案
function mapTag(type) {
  if (type === 'notice') return '公告'
  if (type === 'news') return '新闻'
  return type || '公告'
}

// 公告正文按行分割
const noticeBody = computed(() => {
  if (!notice.value || !notice.value.content) return []
  return notice.value.content.split('\n').filter(line => line.trim())
})

// 获取公告详情
async function fetchNotice() {
  const id = route.params.id
  if (!id) {
    notice.value = null
    return
  }
  loading.value = true
  notice.value = null
  try {
    const res = await request.get(`/announcements/${id}`)
    const data = res.data
    if (data) {
      notice.value = {
        id: data.id,
        title: data.title,
        tag: mapTag(data.type),
        time: data.created_at,
        content: data.content
      }
    }
  } catch (e) {
    // 错误提示已由拦截器处理，获取失败显示“公告不存在”
    notice.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchNotice()
})

// 路由 id 变化时重新获取
watch(() => route.params.id, (newId) => {
  if (newId) fetchNotice()
})
</script>

<style scoped>
.notice-page {
  min-height: 100vh;
  background: var(--ht-bg-card);
}

/* Breadcrumb */
.breadcrumb {
  font-size: 14px;
  color: var(--ht-text-tertiary);
  padding: 12px 24px 0;
}

/* Related collectibles */
.related {
  padding: 16px 24px;
}
.related__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
  margin-bottom: 12px;
}
.related__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 80px;
}
.related__card {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #FFE4E6;
  overflow: hidden;
}
.related__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.related__name {
  font-size: 14px;
  color: var(--ht-text-primary);
  text-align: center;
  margin-top: 8px;
}

/* Notice title */
.notice-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--ht-text-primary);
  padding: 20px 24px 0;
  line-height: 1.4;
}

/* Body text */
.notice-body {
  padding: 0 24px;
}
.notice-body p {
  font-size: 14px;
  color: #374151;
  line-height: 1.8;
  text-indent: 2em;
  margin-bottom: 12px;
}

/* Notice time */
.notice-time {
  font-size: 13px;
  color: var(--ht-text-tertiary);
  padding: 0 24px;
}

/* Tips card */
.tips-card {
  margin: 20px 24px;
  background: var(--ht-blue-light);
  border: 1px solid #BFDBFE;
  border-radius: 12px;
  padding: 16px;
}
.tips-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ht-text-primary);
  text-align: center;
  margin-bottom: 10px;
}
.tips-card__body {
  font-size: 12px;
  color: var(--ht-text-secondary);
  line-height: 1.6;
}
</style>
