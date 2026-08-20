<template>
  <div class="app-container">
    <router-view :key="route.fullPath" />
    <TabBar v-if="showTab" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()
const showTab = computed(() => route.meta.showTab === true)
</script>

<style>
.app-container {
  min-height: 100vh;
}
</style>
