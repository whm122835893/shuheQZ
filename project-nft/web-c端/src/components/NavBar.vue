<template>
  <div class="ht-navbar">
    <div class="ht-navbar__left" @click="onBack" v-if="back">
      <van-icon name="arrow-left" size="20" color="#1F2937" />
    </div>
    <div class="ht-navbar__left ht-navbar__slot-left" v-else>
      <slot name="left" />
    </div>
    <div class="ht-navbar__title">{{ title }}</div>
    <div class="ht-navbar__right">
      <span v-if="rightText" class="ht-navbar__right-text" @click="emit('right-click')">{{ rightText }}</span>
      <slot v-else name="right" />
    </div>
  </div>
  <div class="ht-navbar__placeholder"></div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const props = defineProps({
  title: { type: String, default: '' },
  back: { type: Boolean, default: true },
  rightText: { type: String, default: '' }
})
const emit = defineEmits(['right-click'])
const router = useRouter()
function onBack() {
  router.back()
}
</script>

<style scoped>
.ht-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--ht-border-light);
  z-index: 100;
  padding: 0 12px;
  padding-top: env(safe-area-inset-top);
  height: calc(44px + env(safe-area-inset-top));
}
.ht-navbar__left {
  width: 40px;
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
  height: 44px;
}
.ht-navbar__slot-left {
  cursor: default;
}
.ht-navbar__title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 17px;
  font-weight: 600;
  color: var(--ht-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}
.ht-navbar__right {
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}
.ht-navbar__right-text {
  font-size: 14px;
  color: var(--ht-text-primary);
}
.ht-navbar__placeholder {
  height: calc(44px + env(safe-area-inset-top));
}
</style>
