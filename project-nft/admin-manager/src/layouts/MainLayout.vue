<template>
  <div class="main-layout">
    <!-- 侧边栏 -->
    <div class="sidebar-wrapper" :class="{ collapsed: appStore.sidebarCollapsed }">
      <Sidebar />
    </div>

    <!-- 主区域 -->
    <div class="main-area">
      <!-- Header -->
      <Header />

      <!-- 标签页导航 -->
      <TabsNav />

      <!-- 内容区 -->
      <div class="content-area">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>

    <!-- 手机端遮罩 -->
    <div
      v-if="isMobile && !appStore.sidebarCollapsed"
      class="mobile-mask"
      @click="appStore.toggleSidebar()"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../store/app'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'
import TabsNav from './TabsNav.vue'

const appStore = useAppStore()
const isMobile = ref(window.innerWidth < 768)

const onResize = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    appStore.sidebarCollapsed = true
  }
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar-wrapper {
  width: 220px;
  flex-shrink: 0;
  transition: width 0.3s;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}
.sidebar-wrapper.collapsed {
  width: 64px;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-page);
}

.mobile-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 998;
}

@media (max-width: 768px) {
  .sidebar-wrapper {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 999;
    width: 220px !important;
  }
  .sidebar-wrapper.collapsed {
    transform: translateX(-100%);
    width: 220px !important;
  }
}
</style>
