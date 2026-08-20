<template>
  <div class="info-page">
    <NavBar title="个人信息" />

    <div class="info-list">
      <div class="info-row info-row--avatar" @click="onChangeAvatar">
        <span class="info-row__label">头像</span>
        <div class="info-row__right">
          <img class="info-avatar" :src="userAvatar" alt="头像" />
          <van-icon name="arrow" size="16" color="#9CA3AF" />
        </div>
      </div>
      <div class="info-row" @click="onChangeName">
        <span class="info-row__label">昵称</span>
        <div class="info-row__right">
          <span class="info-row__value">{{ displayName }}</span>
          <van-icon name="arrow" size="16" color="#9CA3AF" />
        </div>
      </div>
      <div class="info-row">
        <span class="info-row__label">手机号</span>
        <div class="info-row__right">
          <span class="info-row__value">{{ isLoggedIn ? maskedPhone() : '未绑定' }}</span>
        </div>
      </div>
    </div>

    <!-- Avatar picker popup -->
    <van-action-sheet v-model:show="showAvatarPicker" :actions="avatarActions" @select="onSelectAvatar" cancel-text="取消" close-on-click-action />

    <!-- Nickname edit popup -->
    <van-dialog
      v-model:show="showNameEditor"
      title="修改昵称"
      show-cancel-button
      confirm-button-text="保存"
      confirm-button-color="#EF4444"
      @confirm="onSaveName"
    >
      <div class="dialog-body">
        <input
          v-model="tempName"
          class="dialog-input"
          type="text"
          maxlength="20"
          placeholder="请输入昵称"
        />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { isLoggedIn, username, avatar, maskedPhone, updateProfile } = useUser()
const userAvatar = computed(() => avatar.value)
const displayName = computed(() => isLoggedIn.value ? username.value : '未登录')

const showAvatarPicker = ref(false)
const showNameEditor = ref(false)
const tempName = ref('')
const loading = ref(false)

// Predefined avatar options
const avatarSeeds = ['music1', 'music2', 'music3', 'music4', 'music5', 'music6']
const avatarActions = avatarSeeds.map(seed => ({
  name: '头像 ' + seed.replace('music', '#'),
  seed: seed
}))

// 进入页面时拉取最新用户信息，同步本地状态
onMounted(async () => {
  try {
    const res = await request.get('/user/info')
    const data = res.data
    if (data) {
      updateProfile(data.username || null, data.avatar || null)
    }
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  }
})

function onChangeAvatar() {
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
  showAvatarPicker.value = true
}

async function onSelectAvatar(item) {
  if (loading.value) return
  const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.seed}`
  loading.value = true
  try {
    await request.patch('/user/profile', { avatar: newAvatar })
    updateProfile(null, newAvatar)
    showToast('头像已更新')
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false
  }
}

function onChangeName() {
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
  tempName.value = username.value
  showNameEditor.value = true
}

async function onSaveName() {
  const name = tempName.value.trim()
  if (!name) {
    showToast('昵称不能为空')
    return
  }
  if (loading.value) return
  loading.value = true
  try {
    await request.patch('/user/profile', { username: name })
    updateProfile(name, null)
    showToast('昵称已更新')
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.info-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}
.info-list {
  background: var(--ht-bg-card);
  padding: 0 24px;
  margin-top: 12px;
}
.info-row {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ht-border-light);
  cursor: pointer;
}
.info-row--avatar {
  height: 80px;
}
.info-row__label {
  font-size: 16px;
  color: var(--ht-text-primary);
}
.info-row__right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-row__value {
  font-size: 16px;
  color: var(--ht-text-secondary);
}
.info-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}

.dialog-body {
  padding: 16px 24px;
}
.dialog-input {
  width: 100%;
  height: 44px;
  font-size: 16px;
  border: 1px solid var(--ht-border);
  border-radius: 8px;
  padding: 0 12px;
  color: var(--ht-text-primary);
  background: var(--ht-bg-page);
}
.dialog-input::placeholder {
  color: var(--ht-text-tertiary);
}
</style>
