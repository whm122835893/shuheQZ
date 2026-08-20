<template>
  <div class="empty-page">
    <NavBar :title="title" />
    <EmptyState text="空空如也" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const title = computed(() => route.meta.title || '空空如也')
</script>

<style scoped>
.empty-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  display: flex;
  flex-direction: column;
}
.empty-page :deep(.empty-state) {
  flex: 1;
  min-height: 0;
}
</style>
