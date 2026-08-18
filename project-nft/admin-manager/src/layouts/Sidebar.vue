<template>
  <div class="sidebar">
    <!-- Logo -->
    <div class="sidebar-logo">
      <img :src="appStore.logoSrc" alt="logo" class="logo-img" />
      <span v-show="!appStore.sidebarCollapsed" class="logo-text">{{ appStore.platformName }}</span>
    </div>

    <!-- 菜单 -->
    <el-scrollbar class="sidebar-menu-scroll">
      <el-menu
        :default-active="route.path"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        class="sidebar-menu"
        background-color="#FFFFFF"
        text-color="#606266"
        active-text-color="#409EFF"
      >
        <template v-for="item in menuItems" :key="item.path">
          <!-- 仅一个可见子菜单 → 渲染为单菜单项 -->
          <el-menu-item
            v-if="item.visibleChildren.length <= 1"
            :index="item.fullPath"
            @click="handleMenuClick(item.fullPath, item.visibleChildren[0] || item)"
          >
            <el-icon><component :is="item.meta?.icon || item.visibleChildren[0]?.meta?.icon" /></el-icon>
            <template #title>{{ item.visibleChildren[0]?.meta?.title || item.meta?.title }}</template>
          </el-menu-item>

          <!-- 多个可见子菜单 → 渲染为折叠子菜单 -->
          <el-sub-menu v-else :index="item.path">
            <template #title>
              <el-icon><component :is="item.meta?.icon" /></el-icon>
              <span>{{ item.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in item.visibleChildren"
              :key="child.path"
              :index="child.fullPath"
              @click="handleMenuClick(child.fullPath, child)"
            >
              <template #title>{{ child.meta?.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-scrollbar>

    <!-- 折叠按钮 -->
    <div class="sidebar-footer" @click="appStore.toggleSidebar()">
      <el-icon>
        <Fold v-if="!appStore.sidebarCollapsed" />
        <Expand v-else />
      </el-icon>
      <span v-show="!appStore.sidebarCollapsed" class="footer-text">收起菜单</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../store/app'
import { routes } from '../router'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 计算每个路由项的完整路径和可见子菜单
const menuItems = computed(() => {
  return routes
    .filter(r => r.path !== '/login' && !r.meta?.hidden)
    .map(r => {
      const children = (r.children || []).filter((c: any) => !c.meta?.hidden)
      // 计算每个子路由的完整路径
      const visibleChildren = children.map(c => ({
        ...c,
        fullPath: c.path ? `${r.path}/${c.path}`.replace(/\/+/g, '/') : r.path
      }))
      return {
        ...r,
        fullPath: r.path,
        visibleChildren
      }
    })
})

function handleMenuClick(fullPath: string, item: any) {
  // 添加标签页
  appStore.addTab({
    name: item.name || '',
    path: fullPath,
    title: item.meta?.title || ''
  })
  // 导航
  router.push(fullPath)
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.logo-img {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}
.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
}

.sidebar-menu-scroll {
  flex: 1;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  border-radius: 0;
}
.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--bg-sidebar-active) !important;
  position: relative;
}
.sidebar-menu :deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--sidebar-text-active);
}

.sidebar-footer {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  border-top: 1px solid var(--border-color);
  color: var(--text-regular);
  flex-shrink: 0;
  transition: all 0.2s;
}
.sidebar-footer:hover {
  background: var(--bg-page);
}
.footer-text {
  font-size: 13px;
  white-space: nowrap;
}
</style>
