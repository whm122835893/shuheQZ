<template>
  <div class="empty-state">
    <span class="empty-state__img">📦</span>
    <p class="empty-state__text">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  text: { type: String, default: '空空如也' }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  width: 100%;
  background: transparent;
}
.empty-state__img {
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state__text {
  margin-top: 16px;
  font-size: 14px;
  color: var(--ht-text-tertiary);
}
</style>
