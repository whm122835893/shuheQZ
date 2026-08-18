<template>
  <div class="invite-page">
    <NavBar title="邀请好友" />

    <!-- Header banner -->
    <div class="header-banner">
      <div class="header-banner__logo">数和文创</div>
      <div class="header-banner__title">
        邀请好友 <span class="header-banner__brand">数和文创</span>
      </div>
      <div class="header-banner__desc">一起探索幻听世界 解锁更多音乐惊喜</div>
      <van-icon name="music-o" class="header-banner__note" />
    </div>

    <!-- Info card -->
    <div class="info-card">
      <!-- Left: QR code -->
      <div class="info-card__left">
        <div class="qr-box">
          <img v-if="qrDataUrl" :src="qrDataUrl" class="qr-img" alt="邀请二维码" />
          <div v-else class="qr-placeholder">
            <van-icon name="qr" size="48" color="#D1D5DB" />
          </div>
        </div>
        <div class="qr-tip">扫一扫二维码，邀请好友</div>
      </div>

      <!-- Right: invite code -->
      <div class="info-card__right">
        <div class="code-label">◆ 我的邀请码 ◆</div>
        <div class="code-value mono">{{ inviteCode }}</div>
        <button class="copy-btn" @click="copyCode">
          <van-icon name="description" size="14" color="#3B82F6" />
          <span>复制邀请码</span>
        </button>
      </div>
    </div>

    <!-- Invite records -->
    <div class="records">
      <div class="records__title">邀请记录</div>
      <div class="records__header">
        <div class="records__col">用户</div>
        <div class="records__col">时间</div>
        <div class="records__col">奖励</div>
      </div>
      <div class="records__row" v-for="record in inviteRecords" :key="record.id">
        <div class="records__col">{{ record.name }}</div>
        <div class="records__col">{{ record.time }}</div>
        <div class="records__col">¥{{ record.reward }}</div>
      </div>
      <EmptyState v-if="inviteRecords.length === 0" text="暂无邀请记录" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import QRCode from 'qrcode'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUser } from '@/composables/useUser'
import request from '@/api/request'

const { uid } = useUser()

// 邀请码使用 UID（后端注册时通过 inviter_uid 关联）
const inviteCode = computed(() => {
  if (!uid.value) return '--------'
  return uid.value
})

// 真实二维码
const qrDataUrl = ref('')

// 邀请记录（API 数据）
const inviteRecords = ref([])

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(/-/g, '/'))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

async function fetchInviteRecords() {
  try {
    const res = await request.get('/user/invites', { params: { page: 1, page_size: 50 } })
    const list = res.data?.list || []
    inviteRecords.value = list.map(item => ({
      id: item.id,
      name: item.invitee_name || '用户' + (item.invitee_uid || item.id),
      time: formatTime(item.registered_at || item.created_at),
      reward: item.rewarded_at ? '5.00' : '0.00',
      status: item.status_text,
    }))
  } catch (e) {
    inviteRecords.value = []
  }
}

onMounted(async () => {
  if (uid.value) {
    const inviteUrl = `${window.location.origin}/#/auth/register?invite=${uid.value}`
    try {
      qrDataUrl.value = await QRCode.toDataURL(inviteUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#1F2937', light: '#ffffff' }
      })
    } catch (e) {
      console.error('QR generation failed', e)
    }
  }
  fetchInviteRecords()
})

// Fallback copy using a hidden textarea + execCommand
function fallbackCopy(text) {
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch (e) {
    return false
  }
}

async function copyCode() {
  const code = inviteCode.value
  let success = false
  try {
    await navigator.clipboard.writeText(code)
    success = true
  } catch (e) {
    success = fallbackCopy(code)
  }
  if (success) {
    showToast('复制成功')
  } else {
    showToast('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* Header banner */
.header-banner {
  position: relative;
  height: 200px;
  padding: 24px;
  overflow: hidden;
  background: var(--ht-gradient-blue-white);
}
.header-banner__logo {
  font-size: 16px;
  font-weight: 700;
  color: var(--ht-blue);
  margin-bottom: 16px;
}
.header-banner__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--ht-text-primary);
  margin-bottom: 8px;
  line-height: 1.3;
}
.header-banner__brand {
  color: var(--ht-blue);
}
.header-banner__desc {
  font-size: 14px;
  color: var(--ht-text-secondary);
}
.header-banner__note {
  position: absolute;
  right: -16px;
  top: 28px;
  font-size: 150px;
  color: rgba(139, 92, 246, 0.22);
  transform: rotate(15deg);
  pointer-events: none;
}

/* Info card */
.info-card {
  position: relative;
  z-index: 1;
  margin: 0 12px;
  margin-top: -30px;
  background: var(--ht-bg-card);
  border-radius: 16px;
  box-shadow: var(--ht-shadow-card);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* QR code */
.info-card__left {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.qr-box {
  width: 120px;
  height: 120px;
  background: #fff;
  padding: 8px;
  border: 1px solid var(--ht-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}
.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.qr-tip {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  text-align: center;
  margin-top: 8px;
  width: 120px;
}

/* Invite code */
.info-card__right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.code-label {
  font-size: 14px;
  color: var(--ht-blue);
  margin-bottom: 10px;
}
.code-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--ht-blue);
  background: var(--ht-blue-light);
  border-radius: 8px;
  padding: 8px 16px;
  text-align: center;
  margin-bottom: 14px;
}
.copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  align-self: flex-start;
  background: #fff;
  border: 1px solid var(--ht-blue);
  color: var(--ht-blue);
  border-radius: 20px;
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
  cursor: pointer;
}

/* Invite records */
.records {
  margin-top: 24px;
}
.records__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-blue);
  text-align: center;
  margin-bottom: 16px;
}
.records__header {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 0 16px 12px;
}
.records__col {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  text-align: center;
}
.records__row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 12px 16px;
  border-top: 1px solid var(--ht-border-light);
}
.records__row .records__col {
  font-size: 13px;
  color: var(--ht-text-primary);
}
</style>
