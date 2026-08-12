<template>
  <div class="empty-state">
    <img src="@/assets/empty-box.png" :alt="text" class="empty-state__img" />
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
  width: 160px;
  height: 160px;
  object-fit: contain;
}
.empty-state__text {
  margin-top: 16px;
  font-size: 14px;
  color: var(--ht-text-tertiary);
}
</style>
