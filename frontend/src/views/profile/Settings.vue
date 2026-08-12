<template>
  <div class="settings-page">
    <NavBar title="设置" />

    <!-- Header -->
    <div class="settings-header">
      <div class="settings-header__logout" @click="onLogout">
        退出登录 <van-icon name="arrow" size="12" color="#6B7280" />
      </div>
      <div class="settings-header__user">
        <img class="settings-header__avatar" :src="userAvatar" alt="头像" />
        <div class="settings-header__info">
          <div class="settings-header__name">{{ displayName }}</div>
          <div v-if="isLoggedIn" class="settings-header__phone">{{ maskedPhone() }}</div>
        </div>
      </div>
    </div>

    <!-- Service group -->
    <div class="settings-group">
      <div class="settings-item" @click="goInfo">
        <van-icon name="manager-o" size="20" color="#6B7280" />
        <span class="settings-item__label">个人资料</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item" @click="goAddress">
        <van-icon name="location-o" size="20" color="#6B7280" />
        <span class="settings-item__label">收货地址</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item" @click="goCertification">
        <van-icon name="certificate" size="20" color="#6B7280" />
        <span class="settings-item__label">我的认证</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item" @click="onComing">
        <van-icon name="shield-o" size="20" color="#6B7280" />
        <span class="settings-item__label">隐私设置</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item settings-item--last" @click="goTransactionPassword">
        <van-icon name="lock" size="20" color="#6B7280" />
        <span class="settings-item__label">交易密码</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
    </div>

    <!-- Other group -->
    <div class="settings-group">
      <div class="settings-item" @click="onComing">
        <van-icon name="balance-list-o" size="20" color="#6B7280" />
        <span class="settings-item__label">我的发票</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item" @click="onComing">
        <van-icon name="description" size="20" color="#6B7280" />
        <span class="settings-item__label">使用条款</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
      <div class="settings-item settings-item--last" @click="onComing">
        <van-icon name="shield-o" size="20" color="#6B7280" />
        <span class="settings-item__label">隐私协议</span>
        <van-icon name="arrow" size="16" color="#9CA3AF" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { isLoggedIn, username, avatar, maskedPhone, logout } = useUser()
const userAvatar = computed(() => avatar.value)
const displayName = computed(() => isLoggedIn.value ? username.value : '未登录')

function goInfo() {
  router.push('/profile/info')
}
function goAddress() {
  router.push('/profile/address')
}
function goTransactionPassword() {
  router.push('/profile/transaction-password')
}
function goCertification() {
  router.push('/profile/certification')
}
function onComing() {
  showToast('功能开发中')
}
function onLogout() {
  logout()
  showToast('已退出')
  router.replace('/auth/login')
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* Header */
.settings-header {
  min-height: 140px;
  padding: 16px;
  background: var(--ht-gradient-blue-white);
  position: relative;
  overflow: hidden;
}
.settings-header__logout {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 14px;
  color: var(--ht-text-secondary);
  cursor: pointer;
}
.settings-header__user {
  display: flex;
  align-items: center;
  margin-top: 16px;
}
.settings-header__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.settings-header__info {
  margin-left: 12px;
}
.settings-header__name {
  font-size: 18px;
  color: var(--ht-text-primary);
  font-weight: 600;
}
.settings-header__phone {
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-top: 4px;
}

/* Groups */
.settings-group {
  background: var(--ht-bg-card);
  border-radius: 16px;
  margin: 12px;
  overflow: hidden;
}
.settings-item {
  height: 52px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--ht-border-light);
  cursor: pointer;
}
.settings-item--last {
  border-bottom: none;
}
.settings-item__label {
  flex: 1;
  margin-left: 12px;
  font-size: 16px;
  color: var(--ht-text-primary);
}
</style>
