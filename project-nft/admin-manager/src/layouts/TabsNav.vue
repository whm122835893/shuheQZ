<template>
  <div class="tabs-nav">
    <el-scrollbar>
      <div class="tabs-container">
        <div
          v-for="tab in appStore.activeTabs"
          :key="tab.path"
          class="tab-item"
          :class="{ active: appStore.currentTab === tab.path }"
          @click="switchTab(tab)"
          @contextmenu.prevent="openContextMenu($event, tab)"
        >
          <span class="tab-title">{{ tab.title }}</span>
          <el-icon
            v-if="tab.path !== '/dashboard'"
            class="tab-close"
            @click.stop="appStore.removeTab(tab.path); router.push(appStore.currentTab)"
          >
            <Close />
          </el-icon>
        </div>
      </div>
    </el-scrollbar>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="context-item" @click="closeOther">关闭其他</div>
      <div class="context-item" @click="closeAll">关闭全部</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../store/app'

const router = useRouter()
const appStore = useAppStore()

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  targetPath: ''
})

function switchTab(tab: { path: string }) {
  appStore.currentTab = tab.path
  router.push(tab.path)
}

function openContextMenu(e: MouseEvent, tab: { path: string }) {
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.targetPath = tab.path
}

function closeOther() {
  appStore.removeOtherTabs(contextMenu.targetPath)
  router.push(contextMenu.targetPath)
  contextMenu.visible = false
}

function closeAll() {
  appStore.removeAllTabs()
  router.push('/dashboard')
  contextMenu.visible = false
}

function closeContextMenu() {
  contextMenu.visible = false
}

onMounted(() => document.addEventListener('click', closeContextMenu))
onUnmounted(() => document.removeEventListener('click', closeContextMenu))
</script>

<style scoped>
.tabs-nav {
  height: 40px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  position: relative;
}

.tabs-container {
  display: flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--radius-small);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-regular);
  transition: all 0.2s;
  border: 1px solid transparent;
}
.tab-item:hover {
  background: var(--bg-page);
}
.tab-item.active {
  color: var(--color-primary);
  background: var(--bg-sidebar-active);
  border-color: var(--color-primary);
}
.tab-close {
  font-size: 12px;
  border-radius: 50%;
  padding: 2px;
  transition: all 0.2s;
}
.tab-close:hover {
  background: var(--color-danger);
  color: #fff;
}

.context-menu {
  position: fixed;
  z-index: 3000;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-small);
  box-shadow: var(--shadow-hover);
  padding: 4px 0;
  min-width: 120px;
}
.context-item {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-regular);
  transition: all 0.2s;
}
.context-item:hover {
  background: var(--bg-page);
  color: var(--color-primary);
}
</style>
