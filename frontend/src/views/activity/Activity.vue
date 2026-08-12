<template>
  <div class="activity-page">
    <!-- Pink-to-white gradient top area -->
    <div class="activity-top">
      <!-- Top tabs: 发现 / 新闻 -->
      <div class="activity-toptabs">
        <div
          v-for="(tab, idx) in topTabs"
          :key="tab"
          class="activity-toptab"
          :class="{ 'activity-toptab--active': activeTopTab === idx }"
          @click="switchTopTab(idx)"
        >
          <span class="activity-toptab__text">{{ tab }}</span>
          <div v-if="activeTopTab === idx" class="activity-toptab__underline"></div>
        </div>
      </div>

      <!-- Category tabs (horizontal scroll) -->
      <div class="category-tabs hide-scrollbar">
        <div
          v-for="tab in tabs"
          :key="tab"
          class="category-tabs__item"
          :class="{ 'category-tabs__item--active': selectedTab === tab }"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </div>
      </div>

      <!-- Search bar -->
      <div class="search-wrap">
        <van-search
          v-model="keyword"
          placeholder="搜索你感兴趣的话题"
          shape="round"
          background="transparent"
          :show-action="false"
        />
      </div>
    </div>

    <!-- Notice / News list -->
    <div class="notice-list" v-if="filteredList.length > 0">
      <div
        v-for="item in filteredList"
        :key="item.id"
        class="notice-card"
        @click="goNotice(item)"
      >
        <div class="notice-card__title">{{ item.title }}</div>
        <div class="notice-card__row">
          <span class="notice-card__tag" :style="{ background: item.tagColor }">{{ item.tag }}</span>
          <span class="notice-card__time">{{ item.time }}</span>
        </div>
      </div>
    </div>
    <EmptyState v-else :text="emptyText" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showDialog } from 'vant'
import { useUser } from '@/composables/useUser'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'

const router = useRouter()
const { isLoggedIn } = useUser()

const topTabs = ['发现', '新闻']
const activeTopTab = ref(0)

const noticeTabs = ['全部', '运营公告', '系统公告', '寄售公告', '合成公告', '活动公告']
const newsTabs = ['全部', '辟谣', '行情', '政策']
const tabs = computed(() => activeTopTab.value === 0 ? noticeTabs : newsTabs)
const selectedTab = ref('全部')
const keyword = ref('')

const noticeList = ref([])
const newsList = ref([])

// 根据标题推断公告子分类（API仅返回 notice/news，需前端推断细分类）
function inferNoticeTag(title) {
  if (title.includes('寄售')) return '寄售公告'
  if (title.includes('合成') || title.includes('分解')) return '合成公告'
  if (title.includes('系统')) return '系统公告'
  if (title.includes('活动')) return '活动公告'
  return '运营公告'
}

// 根据标题推断新闻子分类
function inferNewsTag(title) {
  if (title.includes('辟谣') || title.includes('防范') || title.includes('诈骗') || title.includes('警惕')) return '辟谣'
  if (title.includes('行情') || title.includes('交易量') || title.includes('报告')) return '行情'
  if (title.includes('政策')) return '政策'
  return '新闻'
}

// 根据类型生成标签颜色
function getTagColor(type, tag) {
  if (type === 'notice') return '#3B82F6'
  const newsColorMap = { '辟谣': '#EF4444', '行情': '#10B981', '政策': '#3B82F6' }
  return newsColorMap[tag] || '#6366F1'
}

// 将API返回数据映射为前端格式
function mapAnnouncement(item) {
  const tag = item.type === 'notice' ? inferNoticeTag(item.title) : inferNewsTag(item.title)
  return {
    id: item.id,
    title: item.title,
    tag,
    tagColor: getTagColor(item.type, tag),
    time: item.created_at,
    type: item.type
  }
}

// 获取公告/新闻列表
async function fetchAnnouncements(type) {
  try {
    const res = await request.get('/announcements', {
      params: { page: 1, page_size: 20, type }
    })
    const list = res.data?.list || []
    const mapped = list.map(mapAnnouncement)
    if (type === 'notice') {
      noticeList.value = mapped
    } else {
      newsList.value = mapped
    }
  } catch (e) {
    // 错误提示已由拦截器处理
    if (type === 'notice') {
      noticeList.value = []
    } else {
      newsList.value = []
    }
  }
}

// 获取当前tab对应类型的数据
function fetchCurrent() {
  const type = activeTopTab.value === 0 ? 'notice' : 'news'
  return fetchAnnouncements(type)
}

function switchTopTab(idx) {
  if (activeTopTab.value === idx) return
  activeTopTab.value = idx
  selectedTab.value = '全部'
  keyword.value = ''
  fetchCurrent()
}

const filteredList = computed(() => {
  // Use newsList when on the news tab (activeTopTab === 1), otherwise noticeList
  const source = activeTopTab.value === 1 ? newsList.value : noticeList.value
  return source.filter((item) => {
    const matchTab = selectedTab.value === '全部' || item.tag === selectedTab.value
    const matchKeyword = !keyword.value || item.title.includes(keyword.value)
    return matchTab && matchKeyword
  })
})

const emptyText = computed(() => {
  if (selectedTab.value === '全部') {
    return activeTopTab.value === 1 ? '暂无新闻' : '暂无公告'
  }
  return `暂无${selectedTab.value}`
})

function goNotice(item) {
  // News tab has no detail page
  if (activeTopTab.value !== 0) return
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
  router.push('/activity/notice/' + item.id)
}

onMounted(() => {
  fetchCurrent()
})
</script>

<style scoped>
.activity-page {
  min-height: 100vh;
  background: #FFFFFF;
  padding-bottom: 50px;
}

.activity-top {
  background: var(--ht-gradient-blue-white);
}

/* Top tabs (发现 / 新闻) */
.activity-toptabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  padding: 16px 12px 8px;
}
.activity-toptab {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.activity-toptab__text {
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-secondary);
  line-height: 1.2;
}
.activity-toptab--active .activity-toptab__text {
  font-size: 24px;
  font-weight: 700;
  color: var(--ht-text-primary);
}
.activity-toptab__underline {
  width: 32px;
  height: 3px;
  border-radius: 2px;
  background: var(--ht-red);
  margin-top: 6px;
}

/* Category tabs */
.category-tabs {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 12px;
  overflow-x: auto;
  white-space: nowrap;
}
.category-tabs__item {
  font-size: 14px;
  color: var(--ht-text-secondary);
  padding-bottom: 8px;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}
.category-tabs__item--active {
  color: var(--ht-text-primary);
  font-weight: 600;
}
.category-tabs__item--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  height: 2px;
  background: var(--ht-text-primary);
  border-radius: 1px;
}

/* Search bar */
.search-wrap {
  padding: 0 12px;
  margin-top: 12px;
  padding-bottom: 5px;
}
.search-wrap :deep(.van-search) {
  padding: 0;
  background: transparent;
}
.search-wrap :deep(.van-search__content) {
  height: 40px;
  background: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 24px;
}

/* Notice list */
.notice-list {
  padding: 12px 12px 0;
}
.notice-card {
  background: var(--ht-bg-card);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: var(--ht-shadow-card);
  cursor: pointer;
}
.notice-card__title {
  font-size: 16px;
  font-weight: 500;
  color: var(--ht-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
}
.notice-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.notice-card__tag {
  display: inline-block;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: #fff;
}
.notice-card__time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
</style>
