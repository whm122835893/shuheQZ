import { ref, watch } from 'vue'

// ========== 新闻分类共享状态 ==========

export interface NewsCategory {
  id: number
  name: string
  sort: number
  enabled: boolean
  created_at: string
}

const STORAGE_KEY = 'newsCategories'

function initNewsCategories(): NewsCategory[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // 解析失败则用默认值
    }
  }
  return [
    { id: 1, name: '平台动态', sort: 1, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 2, name: '行业资讯', sort: 2, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 3, name: '活动公告', sort: 3, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 4, name: '藏品故事', sort: 4, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 5, name: '新手指南', sort: 5, enabled: true, created_at: '2026-01-01 00:00:00' }
  ]
}

export const newsCategories = ref<NewsCategory[]>(initNewsCategories())

watch(newsCategories, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

// 获取启用的分类列表
export function getEnabledNewsCategories(): NewsCategory[] {
  return newsCategories.value.filter(c => c.enabled).sort((a, b) => a.sort - b.sort)
}

// 获取所有分类（含禁用）
export function getAllNewsCategories(): NewsCategory[] {
  return [...newsCategories.value].sort((a, b) => a.sort - b.sort)
}

// 添加分类
export function addNewsCategory(name: string): { success: boolean; message: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, message: '分类名称不能为空' }
  }
  if (newsCategories.value.some(c => c.name === trimmed)) {
    return { success: false, message: '分类名称已存在' }
  }
  const maxId = Math.max(0, ...newsCategories.value.map(c => c.id))
  const maxSort = Math.max(0, ...newsCategories.value.map(c => c.sort))
  newsCategories.value.push({
    id: maxId + 1,
    name: trimmed,
    sort: maxSort + 1,
    enabled: true,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
  return { success: true, message: '分类已添加' }
}

// 修改分类名称
export function updateNewsCategoryName(id: number, name: string): { success: boolean; message: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, message: '分类名称不能为空' }
  }
  if (newsCategories.value.some(c => c.id !== id && c.name === trimmed)) {
    return { success: false, message: '分类名称已存在' }
  }
  const cat = newsCategories.value.find(c => c.id === id)
  if (!cat) {
    return { success: false, message: '分类不存在' }
  }
  cat.name = trimmed
  return { success: true, message: '分类名称已修改' }
}

// 切换启用状态
export function toggleNewsCategoryEnabled(id: number, enabled: boolean) {
  const cat = newsCategories.value.find(c => c.id === id)
  if (cat) cat.enabled = enabled
}

// 删除分类
export function deleteNewsCategory(id: number) {
  newsCategories.value = newsCategories.value.filter(c => c.id !== id)
}

// 调整排序
export function moveNewsCategory(id: number, direction: 'up' | 'down') {
  const sorted = [...newsCategories.value].sort((a, b) => a.sort - b.sort)
  const idx = sorted.findIndex(c => c.id === id)
  if (idx === -1) return
  if (direction === 'up' && idx > 0) {
    const temp = sorted[idx].sort
    sorted[idx].sort = sorted[idx - 1].sort
    sorted[idx - 1].sort = temp
  } else if (direction === 'down' && idx < sorted.length - 1) {
    const temp = sorted[idx].sort
    sorted[idx].sort = sorted[idx + 1].sort
    sorted[idx + 1].sort = temp
  }
  sorted.forEach(s => {
    const cat = newsCategories.value.find(c => c.id === s.id)
    if (cat) cat.sort = s.sort
  })
}
