import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(false)
  const platformName = ref(localStorage.getItem('platformName') || '数和文创')
  const platformLogo = ref(localStorage.getItem('platformLogo') || '')
  const activeTabs = ref<Array<{ name: string; path: string; title: string }>>([
    { name: 'Dashboard', path: '/dashboard', title: '数据仪表盘' }
  ])
  const currentTab = ref('/dashboard')

  // 平台名称变化时同步浏览器标题
  watch(platformName, (name) => {
    document.title = `${name} · 运营管理后台`
  }, { immediate: true })

  // 默认 Logo：根据平台名称首字生成 SVG（未上传自定义 Logo 时使用）
  const logoSrc = computed(() => {
    if (platformLogo.value) return platformLogo.value
    const firstChar = platformName.value.charAt(0) || '数'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#409EFF"/><text x="32" y="44" font-size="36" fill="white" text-anchor="middle" font-family="sans-serif">${firstChar}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setPlatformName(name: string) {
    platformName.value = name
    localStorage.setItem('platformName', name)
  }

  function setPlatformLogo(logo: string) {
    platformLogo.value = logo
    if (logo) {
      localStorage.setItem('platformLogo', logo)
    } else {
      localStorage.removeItem('platformLogo')
    }
  }

  function addTab(tab: { name: string; path: string; title: string }) {
    const exists = activeTabs.value.find(t => t.path === tab.path)
    if (!exists) {
      activeTabs.value.push(tab)
    }
    currentTab.value = tab.path
  }

  function removeTab(path: string) {
    const idx = activeTabs.value.findIndex(t => t.path === path)
    if (idx > -1) {
      activeTabs.value.splice(idx, 1)
      if (currentTab.value === path) {
        const next = activeTabs.value[idx] || activeTabs.value[idx - 1]
        currentTab.value = next ? next.path : '/dashboard'
      }
    }
  }

  function removeOtherTabs(path: string) {
    activeTabs.value = activeTabs.value.filter(t => t.path === path || t.path === '/dashboard')
    currentTab.value = path
  }

  function removeAllTabs() {
    activeTabs.value = [{ name: 'Dashboard', path: '/dashboard', title: '数据仪表盘' }]
    currentTab.value = '/dashboard'
  }

  return {
    sidebarCollapsed,
    platformName,
    platformLogo,
    logoSrc,
    activeTabs,
    currentTab,
    toggleSidebar,
    setPlatformName,
    setPlatformLogo,
    addTab,
    removeTab,
    removeOtherTabs,
    removeAllTabs
  }
})
