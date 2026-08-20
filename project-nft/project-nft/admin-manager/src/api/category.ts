import { ref } from 'vue'
import { getPublic } from './request'

// ========== 藏品分类共享状态 ==========
//
// 改造说明（P3-3）：
//   分类数据原本硬编码为默认值并持久化到 localStorage（key: collectibleCategories），
//   与后端 nft_categories 表脱节。现改为：首次使用时由各页面调用 fetchCategories()
//   从后端公开端点 GET /categories 拉取，替代 localStorage 的读/写。
//
//   后端 NftCategory 实体无 enabled 字段（仅 is_delete 软删除），公开端点仅返回
//   is_delete=0 的记录，因此映射时 enabled 恒为 true。
//
//   后端目前没有分类的写接口（新增/编辑/删除/排序），因此下列 CRUD 仍以内存方式
//   操作本地状态（页面内即时生效），不再回写 localStorage；刷新后以后端数据为准。
//   待后端补齐分类写接口后，可将这些方法改为调用 API。

export interface Category {
  id: number
  name: string
  sort: number
  enabled: boolean
  created_at: string
}

/** 后端 GET /categories 返回的单条记录结构 */
interface BackendCategoryItem {
  id: number | string
  name: string
  code?: string
  icon?: string | null
  sort_order?: number
}

/** 后端返回结构 */
interface BackendCategoryResult {
  list: BackendCategoryItem[]
}

// 后端未播种分类（或接口异常）时的兜底默认值，保证管理后台 UI 始终可用。
// 注意：仅作为内存兜底，不再写入 localStorage。
const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: '国画', sort: 1, enabled: true, created_at: '2026-01-01 00:00:00' },
  { id: 2, name: '书法', sort: 2, enabled: true, created_at: '2026-01-01 00:00:00' },
  { id: 3, name: '文物', sort: 3, enabled: true, created_at: '2026-01-01 00:00:00' },
  { id: 4, name: '数字艺术', sort: 4, enabled: true, created_at: '2026-01-01 00:00:00' },
  { id: 5, name: '非遗', sort: 5, enabled: true, created_at: '2026-01-01 00:00:00' }
]

export const categories = ref<Category[]>([])

/** 是否已从后端拉取过分类（避免重复请求） */
let categoriesLoaded = false

/**
 * 从后端拉取藏品分类列表。
 *
 * 调用后端公开端点 GET /categories（经 Vite 代理转发，无需登录态），
 * 并映射为前端 Category 结构。后端返回空（未播种）或请求失败时回退到默认分类。
 *
 * @param force 是否强制重新拉取（忽略缓存）
 */
export async function fetchCategories(force = false): Promise<void> {
  if (categoriesLoaded && !force) return
  try {
    const data = await getPublic<BackendCategoryResult>('/categories')
    const list = data?.list ?? []
    if (list.length === 0) {
      // 后端未播种分类，使用兜底默认值
      categories.value = DEFAULT_CATEGORIES.map(c => ({ ...c }))
    } else {
      categories.value = list.map(c => ({
        id: Number(c.id),
        name: c.name,
        sort: Number(c.sort_order ?? 0),
        // 后端无 enabled 字段：is_delete=0 即视为启用
        enabled: true,
        // 公开端点不返回 created_at
        created_at: ''
      }))
    }
    categoriesLoaded = true
  } catch (e) {
    // 接口异常时回退到默认分类，避免页面不可用
    categories.value = DEFAULT_CATEGORIES.map(c => ({ ...c }))
    categoriesLoaded = true
  }
}

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
