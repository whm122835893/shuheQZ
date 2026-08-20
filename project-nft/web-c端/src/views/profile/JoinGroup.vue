<template>
  <div class="join-group-page">
    <NavBar title="加入群聊" />

    <!-- Group info card -->
    <div class="group-card">
      <div class="group-card__avatar">
        <van-icon name="chat-o" size="40" color="#3B82F6" />
      </div>
      <div class="group-card__name">数和文创藏品交流群</div>
      <div class="group-card__desc">一起交流藏品心得，获取最新发售资讯</div>
      <div class="group-card__members">
        <van-icon name="friends-o" size="14" color="#9CA3AF" />
        <span>1286 位群友</span>
      </div>
    </div>

    <!-- QR code area -->
    <div class="qr-section">
      <div class="qr-card">
        <div class="qr-card__title">扫码加入群聊</div>
        <div class="qr-card__img-wrap">
          <img :src="qrCodeUrl" alt="群聊二维码" class="qr-card__img" v-if="qrCodeUrl" />
          <div class="qr-card__placeholder" v-else>
            <van-icon name="qr" size="120" color="#D1D5DB" />
          </div>
        </div>
        <div class="qr-card__hint">打开微信扫一扫，加入官方交流群</div>
      </div>
    </div>

    <!-- Group benefits -->
    <div class="benefits-section">
      <div class="benefits-title">群聊福利</div>
      <div class="benefits-list">
        <div class="benefit-item">
          <van-icon name="gift-o" size="20" color="#3B82F6" />
          <span>群内专属空投福利</span>
        </div>
        <div class="benefit-item">
          <van-icon name="volume-o" size="20" color="#3B82F6" />
          <span>第一时间获取发售预告</span>
        </div>
        <div class="benefit-item">
          <van-icon name="medal-o" size="20" color="#3B82F6" />
          <span>藏品鉴赏与交流分享</span>
        </div>
        <div class="benefit-item">
          <van-icon name="service-o" size="20" color="#3B82F6" />
          <span>官方客服在线答疑</span>
        </div>
      </div>
    </div>

    <!-- Tips -->
    <div class="tips-section">
      <van-icon name="info-o" size="14" color="#9CA3AF" />
      <span>二维码7天内有效，若过期请联系客服获取最新二维码</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'

const qrCodeUrl = ref('')

onMounted(() => {
  // Generate a QR code for the group chat using a QR code API
  const groupContent = 'https://weixin.qq.com/g/huanting-collectible-group'
  qrCodeUrl.value = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(groupContent)}&bgcolor=ffffff&color=1F2937&margin=10`
})
</script>

<style scoped>
.join-group-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-bottom: 32px;
}

/* Group info card */
.group-card {
  background: #fff;
  margin: 12px;
  border-radius: 16px;
  padding: 32px 16px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--ht-shadow-card);
}
.group-card__avatar {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: #EFF6FF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.group-card__name {
  font-size: 18px;
  font-weight: 700;
  color: var(--ht-text-primary);
}
.group-card__desc {
  font-size: 13px;
  color: var(--ht-text-tertiary);
  margin-top: 8px;
}
.group-card__members {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--ht-text-tertiary);
}

/* QR code section */
.qr-section {
  padding: 0 12px;
  margin-bottom: 12px;
}
.qr-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--ht-shadow-card);
}
.qr-card__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
  margin-bottom: 16px;
}
.qr-card__img-wrap {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--ht-border-light);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.qr-card__img {
  width: 180px;
  height: 180px;
  object-fit: contain;
}
.qr-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.qr-card__hint {
  font-size: 13px;
  color: var(--ht-text-tertiary);
}

/* Benefits section */
.benefits-section {
  background: #fff;
  margin: 0 12px 12px;
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: var(--ht-shadow-card);
}
.benefits-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ht-text-primary);
  margin-bottom: 16px;
}
.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--ht-text-secondary);
}

/* Tips */
.tips-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 24px;
  margin-top: 8px;
}
.tips-section span {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  line-height: 1.5;
}
</style>
