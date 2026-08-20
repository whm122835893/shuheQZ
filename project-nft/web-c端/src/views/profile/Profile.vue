<template>
  <div class="profile-page">
    <!-- Header -->
    <div class="profile-header">
      <div class="profile-header__menu" @click="showSidebar = true">
        <van-icon name="wap-nav" size="22" color="#1F2937" />
      </div>

      <div class="profile-user" @click="onUserClick">
        <img class="profile-user__avatar" :src="userAvatar" alt="头像" />
        <div class="profile-user__info">
          <div class="profile-user__name-row">
            <span class="profile-user__name">{{ displayName }}</span>
            <span v-if="!isRealname" class="profile-user__realname" @click="goRealname">
              去实名
              <van-icon name="arrow" size="10" color="#fff" />
            </span>
          </div>
          <div class="profile-user__uid" v-if="isLoggedIn" @click="onCopyUid">
            <span>UID: {{ uid }}</span>
            <van-icon name="description" size="14" color="#6B7280" />
          </div>
        </div>
      </div>
    </div>

    <!-- Function grid card -->
    <div class="profile-grid">
      <div class="profile-grid__row">
        <div class="profile-grid__item" @click="onOrders">
          <van-icon name="orders-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">我的订单</span>
        </div>
        <div class="profile-grid__item" @click="goWallet">
          <van-icon name="balance-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">我的钱包</span>
        </div>
        <div class="profile-grid__item" @click="goInvite">
          <van-icon name="share-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">邀请好友</span>
        </div>
        <div class="profile-grid__item" @click="onService">
          <van-icon name="service-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">在线客服</span>
        </div>
      </div>

      <div class="profile-grid__row profile-grid__row--five">
        <div class="profile-grid__item" @click="goConsignments">
          <van-icon name="diamond-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">寄售记录</span>
        </div>
        <div class="profile-grid__item" @click="onComing('/profile/community')">
          <van-icon name="fire-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">社区共创</span>
        </div>
        <div class="profile-grid__item" @click="goTransfer">
          <van-icon name="exchange" size="24" color="#1F2937" />
          <span class="profile-grid__label">转赠</span>
        </div>
        <div class="profile-grid__item" @click="goJoinGroup">
          <van-icon name="chat-o" size="24" color="#1F2937" />
          <span class="profile-grid__label">加入群聊</span>
        </div>
      </div>
    </div>

    <!-- Collection tab bar -->
    <div class="profile-tabs">
      <div
        v-for="(tab, index) in tabs"
        :key="tab"
        class="profile-tabs__item"
        :class="{ 'profile-tabs__item--active': activeTab === index }"
        @click="activeTab = index"
      >
        {{ tab }}
      </div>
    </div>

    <!-- Content -->
    <div v-if="currentTabGroups.length > 0" class="profile-collection">
      <div v-for="group in currentTabGroups" :key="group.collectibleId" class="collection-card" @click="openPopup(group)">
        <div class="collection-card__img" :style="{ background: group.gradient }">
          <img v-if="group.image" :src="group.image" :alt="group.name" class="collection-card__img-tag" />
          <van-icon v-else :name="group.icon" size="48" color="rgba(255,255,255,0.9)" />
          <div class="collection-card__heart" @click.stop="toggleFavState(group.collectibleId)">
            <van-icon :name="isFavorited(group.collectibleId) ? 'like' : 'like-o'" size="14" :color="isFavorited(group.collectibleId) ? '#B30A03' : '#FFFFFF'" />
          </div>
        </div>
        <div class="collection-card__info">
          <div class="collection-card__name">{{ group.name }}</div>
          <div class="collection-card__hold">持有 {{ group.items.length }}</div>
        </div>
      </div>
    </div>
    <EmptyState v-else :text="emptyCollectionText" />

    <!-- Collection detail popup -->
    <van-popup v-model:show="showPopup" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="collectible-popup">
        <!-- Header -->
        <div class="collectible-popup__header">
          <span class="collectible-popup__title">{{ popupGroup?.name }}</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="showPopup = false" />
        </div>
        <div class="collectible-popup__count">持有: {{ popupGroup?.items?.length || 0 }}个</div>

        <!-- Item list -->
        <div class="collectible-popup__list">
          <div
            v-for="item in popupGroup?.items"
            :key="item.id"
            class="collectible-popup__item"
            :class="{ 'collectible-popup__item--selling': item.isConsigned }"
            @click="!item.isConsigned && goResale(item)"
          >
            <div class="collectible-popup__thumb" :style="{ background: item.gradient }">
              <img v-if="item.image" :src="item.image" :alt="item.name" class="collectible-popup__thumb-img" />
              <van-icon v-else :name="item.icon" size="20" color="rgba(255,255,255,0.9)" />
            </div>
            <div class="collectible-popup__meta">
              <div class="collectible-popup__serial">{{ item.serial }}</div>
              <div class="collectible-popup__detail">
                <span>持仓天数 {{ getDaysHeld(item.acquiredAt) }}</span>
                <span class="collectible-popup__sep">·</span>
                <span>购入价 {{ item.price }}</span>
              </div>
            </div>
            <div class="collectible-popup__actions">
              <template v-if="popupGroup?.isBlindBox">
                <button class="collectible-popup__btn" @click.stop="openBlindBox(item)">开启盲盒</button>
              </template>
              <template v-else>
                <button v-if="item.isConsigned" class="collectible-popup__btn collectible-popup__btn--selling" disabled>寄售中</button>
                <button v-else class="collectible-popup__btn" @click.stop="goResale(item)">去寄售</button>
                <button v-if="item.isConsigned" class="collectible-popup__cancel" @click.stop="cancelConsignment(item)">取消寄售</button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- Settings sidebar popup -->
    <van-popup
      v-model:show="showSidebar"
      position="left"
      :style="{ width: '80%', height: '100%' }"
    >
      <div class="settings-panel">
        <!-- Header -->
        <div class="settings-panel__header">
          <div class="settings-panel__topbar">
            <span class="settings-panel__title">设置</span>
            <span class="settings-panel__logout" @click="onAuthAction">
              {{ isLoggedIn ? '退出登录' : '去登录' }} <van-icon name="arrow" size="12" color="#6B7280" />
            </span>
          </div>
          <div class="settings-panel__user">
            <img class="settings-panel__avatar" :src="userAvatar" alt="头像" />
            <div class="settings-panel__userinfo">
              <div class="settings-panel__name">{{ displayName }}</div>
              <div v-if="isLoggedIn" class="settings-panel__phone">{{ maskedPhone() }}</div>
            </div>
          </div>
        </div>

        <!-- Service group -->
        <div class="settings-panel__group">
          <div class="settings-panel__item" @click="goInfo">
            <van-icon name="manager-o" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">个人资料</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item" @click="goAddress">
            <van-icon name="location-o" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">收货地址</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item" @click="goCertification">
            <van-icon name="certificate" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">我的认证</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item" @click="onComing('/profile/privacy')">
            <van-icon name="shield-o" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">隐私设置</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item settings-panel__item--last" @click="goTransactionPassword">
            <van-icon name="lock" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">交易密码</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
        </div>

        <!-- Other group -->
        <div class="settings-panel__group">
          <div class="settings-panel__item" @click="onComing('/profile/invoice')">
            <van-icon name="balance-list-o" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">我的发票</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item" @click="onComing('/profile/terms')">
            <van-icon name="description" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">使用条款</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
          <div class="settings-panel__item settings-panel__item--last" @click="onComing('/profile/privacy')">
            <van-icon name="shield-o" size="20" color="#6B7280" />
            <span class="settings-panel__item-label">隐私协议</span>
            <van-icon name="arrow" size="16" color="#9CA3AF" class="settings-panel__arrow" />
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'
import { useFavorites } from '@/composables/useFavorites'

const router = useRouter()
const showSidebar = ref(false)
const activeTab = ref(0)
const tabs = ['绘画', '盲盒', '已售', '卡券']

const { isLoggedIn, username, avatar, maskedPhone, isRealname, uid, login, logout } = useUser()
const { isFavorited, toggleFavorite: toggleFav } = useFavorites()

// 计算持仓天数（从获取时间到当前的天数）
function getDaysHeld(acquiredAt) {
  if (!acquiredAt) return 0
  const now = new Date()
  const acquired = new Date(String(acquiredAt).replace(/-/g, '/'))
  const diff = now - acquired
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const userAvatar = computed(() => avatar.value)
const displayName = computed(() => isLoggedIn.value ? username.value : '未登录')

// ===== API 数据 =====
const apiCollectibles = ref([])
const soldCollectibles = ref([])
const blindBoxMap = ref({})
const loading = ref(false)

async function fetchCollectibles() {
  if (!isLoggedIn.value) return
  loading.value = true
  try {
    const [holdingRes, bbRes] = await Promise.all([
      request.get('/user/collectibles', { params: { page: 1, page_size: 100, holding_status: 1 } }),
      request.get('/blind-boxes', { params: { page: 1, page_size: 100 } }),
    ])
    apiCollectibles.value = holdingRes.data?.list || []

    // 构建 collectible_id -> blind_box_id 的映射
    const bbMap = {}
    for (const bb of (bbRes.data?.list || [])) {
      bbMap[bb.collectible_id] = bb.id
    }
    blindBoxMap.value = bbMap

    // 获取已售藏品（tab 2）
    try {
      const soldRes = await request.get('/user/collectibles', { params: { page: 1, page_size: 100, holding_status: 2 } })
      soldCollectibles.value = soldRes.data?.list || []
    } catch (e) {
      soldCollectibles.value = []
    }
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}

onMounted(fetchCollectibles)

// 按藏品 ID 分组
const groupedHolding = computed(() => {
  const groups = {}
  for (const item of apiCollectibles.value) {
    if (!groups[item.collectible_id]) {
      groups[item.collectible_id] = {
        collectibleId: item.collectible_id,
        name: item.collectible_name,
        image: item.collectible_image,
        gradient: null,
        icon: 'music-o',
        isBlindBox: blindBoxMap.value[item.collectible_id] !== undefined,
        blindBoxId: blindBoxMap.value[item.collectible_id] || null,
        items: [],
      }
    }
    groups[item.collectible_id].items.push({
      id: item.id,
      serial: item.serial_no,
      acquiredAt: item.acquired_at,
      price: Number(item.acquired_price) || 0,
      image: item.collectible_image,
      gradient: null,
      icon: 'music-o',
      isConsigned: item.status === 2,
      source: item.source,
      status: item.status,
    })
  }
  return Object.values(groups)
})

const groupedSold = computed(() => {
  const groups = {}
  for (const item of soldCollectibles.value) {
    if (!groups[item.collectible_id]) {
      groups[item.collectible_id] = {
        collectibleId: item.collectible_id,
        name: item.collectible_name,
        image: item.collectible_image,
        gradient: null,
        icon: 'music-o',
        isBlindBox: false,
        blindBoxId: null,
        items: [],
      }
    }
    groups[item.collectible_id].items.push({
      id: item.id,
      serial: item.serial_no,
      acquiredAt: item.acquired_at,
      price: Number(item.acquired_price) || 0,
      image: item.collectible_image,
      gradient: null,
      icon: 'music-o',
      isConsigned: item.status === 2,
      source: item.source,
      status: item.status,
    })
  }
  return Object.values(groups)
})

const currentTabGroups = computed(() => {
  if (!isLoggedIn.value) return []
  if (activeTab.value === 0) return groupedHolding.value.filter(g => !g.isBlindBox)
  if (activeTab.value === 1) return groupedHolding.value.filter(g => g.isBlindBox)
  if (activeTab.value === 2) return groupedSold.value
  return []
})

// Popup state
const showPopup = ref(false)
const popupGroup = ref(null)
const openingBlindBox = ref(false)

function openPopup(group) {
  if (!requireLogin()) return
  popupGroup.value = group
  showPopup.value = true
}

async function openBlindBox(item) {
  const group = popupGroup.value
  if (!group || !group.blindBoxId) {
    showToast('无法确定盲盒类型')
    return
  }
  if (openingBlindBox.value) return

  showPopup.value = false
  openingBlindBox.value = true

  try {
    const res = await request.post(`/blind-boxes/${group.blindBoxId}/open`, {
      user_collectible_id: item.id,
    })

    const prize = res.data?.prize
    const msg = res.message || '开启成功'
    const prizeInfo = prize ? `\n获得：${prize.name}` : ''

    showDialog({
      title: '开启成功',
      message: `${msg}${prizeInfo}`,
      confirmButtonText: '查看藏品',
    }).then(() => {
      fetchCollectibles()
    }).catch(() => {
      fetchCollectibles()
    })
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    openingBlindBox.value = false
  }
}

function goResale(item) {
  showPopup.value = false
  router.push(`/profile/resale-collectible/${item.id}`)
}

async function cancelConsignment(item) {
  try {
    // 查找该藏品对应的在售挂单
    const res = await request.get('/market/my-listings', { params: { page: 1, page_size: 100, status: 1 } })
    const listing = (res.data?.list || []).find(l => String(l.user_collectible_id) === String(item.id))
    if (!listing) {
      showToast('未找到对应的寄售记录')
      return
    }
    await request.put(`/market/listings/${listing.listing_id}/cancel`)
    item.isConsigned = false
    showToast('已取消寄售')
    fetchCollectibles()
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

// Toggle favorite state for a collectible
function toggleFavState(collectibleId) {
  const favorited = toggleFav(collectibleId)
  showToast(favorited ? '已收藏' : '取消收藏')
}

const emptyCollectionText = computed(() => {
  const map = ['暂无绘画藏品', '暂无盲盒藏品', '暂无已售记录', '暂无卡券']
  return map[activeTab.value] || '暂无内容'
})

// Check login before accessing sub-pages
function requireLogin() {
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
  return true
}

function goRealname() {
  if (!requireLogin()) return
  router.push('/profile/certification')
}

function onUserClick() {
  if (!isLoggedIn.value) {
    router.push('/auth/login')
  }
}
function goWallet() {
  if (!requireLogin()) return
  router.push('/profile/wallet')
}
function goInvite() {
  if (!requireLogin()) return
  router.push('/activity/invite')
}
function goInfo() {
  showSidebar.value = false
  if (!requireLogin()) return
  router.push('/profile/info')
}
function onOrders() {
  if (!requireLogin()) return
  router.push('/profile/orders')
}
function goConsignments() {
  if (!requireLogin()) return
  router.push('/profile/consignments')
}
function goTransfer() {
  if (!requireLogin()) return
  router.push('/profile/transfer')
}
function goJoinGroup() {
  if (!requireLogin()) return
  router.push('/profile/join-group')
}
function onService() {
  if (!requireLogin()) return
  showToast('功能开发中')
}
function onComing(path) {
  if (!requireLogin()) return
  router.push(path)
}
async function onCopyUid() {
  const text = String(uid.value || '')
  if (!text) {
    showToast('复制失败')
    return
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      showToast('已复制')
      return
    }
    // Fallback using a temporary textarea + execCommand
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    showToast(ok ? '已复制' : '复制失败')
  } catch (e) {
    showToast('复制失败')
  }
}
function onAuthAction() {
  if (isLoggedIn.value) {
    apiCollectibles.value = []
    soldCollectibles.value = []
    logout()
    showToast('已退出')
    router.replace('/auth/login')
  } else {
    showSidebar.value = false
    router.push('/auth/login')
  }
}
function onLogout() {
  apiCollectibles.value = []
  soldCollectibles.value = []
  logout()
  showToast('已退出')
  router.replace('/auth/login')
}
function goAddress() {
  showSidebar.value = false
  if (!requireLogin()) return
  router.push('/profile/address')
}
function goTransactionPassword() {
  showSidebar.value = false
  if (!requireLogin()) return
  router.push('/profile/transaction-password')
}
function goCertification() {
  showSidebar.value = false
  if (!requireLogin()) return
  router.push('/profile/certification')
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--ht-bg-card);
  padding-bottom: calc(58px + env(safe-area-inset-bottom) + 16px);
}

/* Header */
.profile-header {
  position: relative;
  height: 180px;
  background: var(--ht-gradient-blue-white);
}
.profile-header__menu {
  position: absolute;
  top: 16px;
  left: 16px;
  padding-top: env(safe-area-inset-top);
  display: flex;
  align-items: center;
  cursor: pointer;
}
.profile-user {
  display: flex;
  align-items: center;
  padding: 53px 16px 0;
}
.profile-user__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.profile-user__info {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}
.profile-user__name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.profile-user__name {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.profile-user__realname {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #3B82F6;
  color: #fff;
  border-radius: 10px;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.profile-user__uid {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--ht-text-secondary);
  cursor: pointer;
}

/* Function grid */
.profile-grid {
  position: relative;
  z-index: 1;
  background: var(--ht-bg-card);
  border-radius: 16px;
  margin: 0 12px;
  margin-top: -20px;
  box-shadow: var(--ht-shadow-card);
  padding: 20px;
}
.profile-grid__row {
  display: flex;
  justify-content: space-around;
  align-items: flex-start;
}
.profile-grid__row--five {
  margin-top: 20px;
}
.profile-grid__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}
.profile-grid__label {
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
}

/* Tabs */
.profile-tabs {
  display: flex;
  gap: 20px;
  padding: 40px 24px 0;
}
.profile-tabs__item {
  font-size: 16px;
  color: var(--ht-text-tertiary);
  cursor: pointer;
  position: relative;
  padding-bottom: 6px;
}
.profile-tabs__item--active {
  color: var(--ht-text-primary);
  font-weight: 600;
  font-size: 18px;
}
.profile-tabs__item--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: #3B82F6;
  border-radius: 2px;
}

/* Settings sidebar */
.settings-panel {
  height: 100%;
  background: var(--ht-bg-page);
  overflow-y: auto;
}
.settings-panel__header {
  min-height: 140px;
  padding: 16px;
  background: var(--ht-gradient-blue-white);
  position: relative;
  overflow: hidden;
}
.settings-panel__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: env(safe-area-inset-top);
}
.settings-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.settings-panel__logout {
  font-size: 14px;
  color: var(--ht-text-secondary);
  display: flex;
  align-items: center;
  cursor: pointer;
}
.settings-panel__user {
  display: flex;
  align-items: center;
  margin-top: 16px;
}
.settings-panel__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.settings-panel__userinfo {
  margin-left: 12px;
}
.settings-panel__name {
  font-size: 18px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.settings-panel__phone {
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-top: 4px;
}
.settings-panel__group {
  background: var(--ht-bg-card);
  border-radius: 16px;
  margin: 12px;
  overflow: hidden;
}
.settings-panel__item {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--ht-border-light);
  cursor: pointer;
}
.settings-panel__item--last {
  border-bottom: none;
}
.settings-panel__item-label {
  flex: 1;
  margin-left: 12px;
  font-size: 16px;
  color: var(--ht-text-primary);
}
.settings-panel__item-value {
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-right: 8px;
}
.settings-panel__arrow {
  flex-shrink: 0;
}

/* Collection cards - 2-column grid */
.profile-collection {
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.collection-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}
.collection-card__img {
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
.collection-card__img-tag {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.collection-card__heart {
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
.collection-card__info {
  padding: 10px 12px 12px;
}
.collection-card__name {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.collection-card__hold {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
}

/* Collectible popup */
.collectible-popup {
  padding: 16px;
  background: #fff;
}
.collectible-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.collectible-popup__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.collectible-popup__count {
  font-size: 13px;
  color: var(--ht-text-secondary);
  margin-bottom: 16px;
}
.collectible-popup__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.collectible-popup__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #F9FAFB;
  border-radius: 12px;
  cursor: pointer;
}
.collectible-popup__thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.collectible-popup__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.collectible-popup__meta {
  flex: 1;
  min-width: 0;
}
.collectible-popup__serial {
  font-size: 15px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.collectible-popup__detail {
  font-size: 12px;
  color: var(--ht-text-secondary);
  margin-top: 4px;
}
.collectible-popup__sep {
  margin: 0 6px;
  color: var(--ht-text-tertiary);
}
.collectible-popup__btn {
  flex-shrink: 0;
  height: 32px;
  padding: 0 16px;
  background: #3B82F6;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 16px;
  cursor: pointer;
}
.collectible-popup__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.collectible-popup__btn--selling {
  background: #E5E7EB;
  color: #9CA3AF;
  cursor: not-allowed;
}
.collectible-popup__cancel {
  flex-shrink: 0;
  height: 32px;
  padding: 0 12px;
  background: #fff;
  color: #EF4444;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid #EF4444;
  border-radius: 16px;
  cursor: pointer;
}
.collectible-popup__item--selling {
  background: #F3F4F6;
  opacity: 0.85;
}
</style>
