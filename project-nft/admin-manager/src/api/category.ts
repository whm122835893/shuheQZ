import { ref, watch } from 'vue'

// ========== 藏品分类共享状态 ==========

export interface Category {
  id: number
  name: string
  sort: number
  enabled: boolean
  created_at: string
}

const STORAGE_KEY = 'collectibleCategories'

function initCategories(): Category[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // 解析失败则用默认值
    }
  }
  // 默认分类
  return [
    { id: 1, name: '国画', sort: 1, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 2, name: '书法', sort: 2, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 3, name: '文物', sort: 3, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 4, name: '数字艺术', sort: 4, enabled: true, created_at: '2026-01-01 00:00:00' },
    { id: 5, name: '非遗', sort: 5, enabled: true, created_at: '2026-01-01 00:00:00' }
  ]
}

export const categories = ref<Category[]>(initCategories())

// 持久化到 localStorage
watch(categories, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

// 获取启用的分类名称列表（供创建藏品、列表筛选使用）
export function getEnabledCategoryNames(): string[] {
  return categories.value
    .filter(c => c.enabled)
    .sort((a, b) => a.sort - b.sort)
    .map(c => c.name)
}

// 获取所有分类名称（含禁用）
export function getAllCategoryNames(): string[] {
  return categories.value.map(c => c.name)
}

// 添加分类
export function addCategory(name: string): { success: boolean; message: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, message: '分类名称不能为空' }
  }
  if (categories.value.some(c => c.name === trimmed)) {
    return { success: false, message: '分类名称已存在' }
  }
  const maxId = Math.max(0, ...categories.value.map(c => c.id))
  const maxSort = Math.max(0, ...categories.value.map(c => c.sort))
  categories.value.push({
    id: maxId + 1,
    name: trimmed,
    sort: maxSort + 1,
    enabled: true,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
  return { success: true, message: '分类已添加' }
}

// 修改分类名称
export function updateCategoryName(id: number, name: string): { success: boolean; message: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, message: '分类名称不能为空' }
  }
  if (categories.value.some(c => c.id !== id && c.name === trimmed)) {
    return { success: false, message: '分类名称已存在' }
  }
  const cat = categories.value.find(c => c.id === id)
  if (!cat) {
    return { success: false, message: '分类不存在' }
  }
  cat.name = trimmed
  return { success: true, message: '分类名称已修改' }
}

// 切换分类启用状态
export function toggleCategoryEnabled(id: number, enabled: boolean) {
  const cat = categories.value.find(c => c.id === id)
  if (cat) {
    cat.enabled = enabled
  }
}

// 删除分类
export function deleteCategory(id: number) {
  categories.value = categories.value.filter(c => c.id !== id)
}

// 调整排序
export function moveCategory(id: number, direction: 'up' | 'down') {
  const sorted = [...categories.value].sort((a, b) => a.sort - b.sort)
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
  // 同步回原数组
  sorted.forEach(s => {
    const cat = categories.value.find(c => c.id === s.id)
    if (cat) cat.sort = s.sort
  })
}

// 批量排序设置
export function setCategorySort(id: number, sort: number) {
  const cat = categories.value.find(c => c.id === id)
  if (cat) {
    cat.sort = sort
  }
}
