<template>
  <div class="header">
    <!-- 左侧：面包屑 -->
    <div class="header-left">
      <el-icon v-if="isMobile" class="menu-toggle" @click="appStore.toggleSidebar()">
        <Menu />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <!-- 右侧：操作区 -->
    <div class="header-right">
      <el-tooltip content="搜索" placement="bottom">
        <el-icon class="header-icon"><Search /></el-icon>
      </el-tooltip>
      <el-tooltip content="全屏" placement="bottom">
        <el-icon class="header-icon" @click="toggleFullscreen"><FullScreen /></el-icon>
      </el-tooltip>
      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-info">
          <el-avatar :size="32" :src="adminStore.userInfo.avatar || undefined">
            {{ adminStore.userInfo.realName?.[0] || 'A' }}
          </el-avatar>
          <span class="user-name">{{ adminStore.userInfo.realName }}</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">个人信息</el-dropdown-item>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item command="rename">平台设置</el-dropdown-item>
            <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>

  <!-- 平台设置弹窗 -->
  <el-dialog v-model="renameDialog.visible" title="平台设置" width="460px" :close-on-click-modal="false">
    <el-form label-width="100px">
      <el-form-item label="平台 Logo">
        <div class="logo-upload-area">
          <el-upload
            :show-file-list="false"
            :before-upload="handleLogoUpload"
            accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
          >
            <div class="logo-preview">
              <img :src="logoPreview" alt="logo" class="logo-preview-img" />
              <div class="logo-preview-mask">
                <el-icon><UploadFilled /></el-icon>
                <span>更换</span>
              </div>
            </div>
          </el-upload>
          <div class="logo-actions">
            <el-button text type="primary" size="small" @click="resetLogo">恢复默认</el-button>
            <span class="logo-tip">支持 PNG/JPG/SVG，建议 64x64</span>
          </div>
        </div>
      </el-form-item>
      <el-form-item label="平台名称" required>
        <el-input v-model="renameDialog.name" placeholder="请输入新的平台名称，如：数和文创" maxlength="30" show-word-limit clearable @keyup.enter="confirmRename" />
      </el-form-item>
    </el-form>
    <div style="margin-left:100px;color:var(--text-secondary);font-size:12px;line-height:1.6">
      修改后将立即生效，侧边栏和登录页将显示新的平台名称和 Logo。
    </div>
    <template #footer>
      <el-button @click="renameDialog.visible = false">取消</el-button>
      <el-button type="primary" @click="confirmRename">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../store/admin'
import { useAppStore } from '../store/app'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Menu, Search, FullScreen, ArrowDown, UploadFilled } from '@element-plus/icons-vue'
import type { UploadRawFile } from 'element-plus'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const appStore = useAppStore()
const isMobile = ref(window.innerWidth < 768)

const currentTitle = computed(() => {
  return (route.meta?.title as string) || '数据仪表盘'
})

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning'
    }).then(() => {
      adminStore.logout()
      router.push('/login')
    }).catch(() => {})
  } else if (cmd === 'profile') {
    ElMessage.info('个人信息功能开发中')
  } else if (cmd === 'password') {
    ElMessage.info('修改密码功能开发中')
  } else if (cmd === 'rename') {
    renameDialog.visible = true
    renameDialog.name = appStore.platformName
    renameDialog.logo = appStore.platformLogo
  }
}

// 平台设置
const renameDialog = reactive({
  visible: false,
  name: '',
  logo: ''
})

// Logo 预览：弹窗中临时编辑的 logo（空则显示默认生成 logo）
const logoPreview = computed(() => {
  if (renameDialog.logo) return renameDialog.logo
  return appStore.logoSrc
})

// 上传 Logo：转为 base64 存储
function handleLogoUpload(file: UploadRawFile): boolean {
  if (file.size > 512 * 1024) {
    ElMessage.warning('Logo 文件不能超过 512KB')
    return false
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    renameDialog.logo = e.target?.result as string
  }
  reader.readAsDataURL(file)
  return false // 阻止自动上传
}

// 恢复默认 Logo
function resetLogo() {
  renameDialog.logo = ''
  ElMessage.info('已恢复默认 Logo，点击确认修改后生效')
}

function confirmRename() {
  const trimmed = renameDialog.name.trim()
  if (!trimmed) {
    ElMessage.warning('请输入平台名称')
    return
  }
  if (trimmed.length > 30) {
    ElMessage.warning('平台名称不能超过30个字符')
    return
  }
  appStore.setPlatformName(trimmed)
  appStore.setPlatformLogo(renameDialog.logo)
  renameDialog.visible = false
  ElMessage.success('平台设置已更新')
}
</script>

<style scoped>
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menu-toggle {
  font-size: 20px;
  cursor: pointer;
  color: var(--text-regular);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.header-icon {
  font-size: 18px;
  cursor: pointer;
  color: var(--text-regular);
  transition: color 0.2s;
}
.header-icon:hover {
  color: var(--color-primary);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-small);
  transition: background 0.2s;
}
.user-info:hover {
  background: var(--bg-page);
}
.user-name {
  font-size: 14px;
  color: var(--text-primary);
}

/* Logo 上传区域 */
.logo-upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-preview {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.logo-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.logo-preview-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}
.logo-preview:hover .logo-preview-mask {
  opacity: 1;
}
.logo-preview-mask .el-icon {
  font-size: 18px;
}
.logo-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.logo-tip {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
