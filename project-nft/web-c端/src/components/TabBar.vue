<template>
  <van-tabbar v-model="active" route active-color="#3B82F6" inactive-color="#9CA3AF" :border="true">
    <van-tabbar-item v-for="item in tabs" :key="item.path" :to="item.path">
      <span>{{ item.label }}</span>
      <template #icon="props">
        <van-icon :name="props.active ? item.iconActive : item.icon" :color="props.active ? '#3B82F6' : '#9CA3AF'" size="26" />
      </template>
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref } from 'vue'

const active = ref(0)
const tabs = [
  { path: '/home', label: '首页', icon: 'home-o', iconActive: 'home-o' },
  { path: '/market', label: '市场', icon: 'shop-o', iconActive: 'shop-o' },
  { path: '/activity', label: '活动', icon: 'fire-o', iconActive: 'fire-o' },
  { path: '/profile', label: '我的', icon: 'user-o', iconActive: 'user-o' }
]
</script>

<style scoped>
:deep(.van-tabbar) {
  height: 58px;
  border-top: 2px solid var(--ht-border-light);
}
:deep(.van-tabbar-item__text) {
  font-size: 10px;
}
:deep(.van-tabbar-item__icon) {
  margin-bottom: 2px;
}
</style>
