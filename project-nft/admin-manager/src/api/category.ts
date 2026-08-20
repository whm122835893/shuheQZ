import { ref } from 'vue'
import { getPublic } from './request'
import { categoryApi } from './index'

// ========== 藏品分类共享状态 ==========
//
// 改造说明：
//   分类数据从后端公开端点 GET /categories 拉取，CRUD 操作通过管理后台
//   API 端点（POST/PUT/DELETE /admin/api/v1/categories）执行，操作成功后
//   同步更新本地状态，无需整页刷新。

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
      categories.value = DEFAULT_CATEGORIES.map(c => ({ ...c }))
    } else {
      categories.value = list.map(c => ({
        id: Number(c.id),
        name: c.name,
        sort: Number(c.sort_order ?? 0),
        enabled: true,
        created_at: ''
      }))
    }
    categoriesLoaded = true
  } catch (e) {
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

// 添加分类（调用后端API）
export async function addCategory(name: string): Promise<{ success: boolean; message: string }> {
  const trimmed = name.trim()
  if (!trimmed) {
    return { success: false, message: '分类名称不能为空' }
  }
  if (categories.value.some(c => c.name === trimmed)) {
    return { success: false, message: '分类名称已存在' }
  }
  try {
    const maxSort = Math.max(0, ...categories.value.map(c => c.sort))
    const res = await categoryApi.create({ name: trimmed, sortOrder: maxSort + 1 }) as any
    categories.value.push({
      id: Number(res?.id || 0),
      name: trimmed,
      sort: maxSort + 1,
      enabled: true,
      created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    })
    return { success: true, message: '分类已添加' }
  } catch (e: any) {
    return { success: false, message: e?.message || '添加失败' }
  }
}

// 修改分类名称（调用后端API）
export async function updateCategoryName(id: number, name: string): Promise<{ success: boolean; message: string }> {
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
  try {
    await categoryApi.update(id, { name: trimmed })
    cat.name = trimmed
    return { success: true, message: '分类名称已修改' }
  } catch (e: any) {
    return { success: false, message: e?.message || '修改失败' }
  }
}

// 切换分类启用状态（调用后端API）
export async function toggleCategoryEnabled(id: number, enabled: boolean): Promise<void> {
  try {
    await categoryApi.toggle(id)
    const cat = categories.value.find(c => c.id === id)
    if (cat) cat.enabled = enabled
  } catch (e) {
    // 失败时不更新本地状态
  }
}

// 删除分类（调用后端API）
export async function deleteCategory(id: number): Promise<void> {
  await categoryApi.delete(id)
  categories.value = categories.value.filter(c => c.id !== id)
}

// 调整排序（调用后端API）
export async function moveCategory(id: number, direction: 'up' | 'down'): Promise<void> {
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
  } else {
    return
  }
  // 调用后端批量重排序
  try {
    await categoryApi.reorder(sorted.map(c => ({ id: c.id, sortOrder: c.sort })))
    // 同步回原数组
    sorted.forEach(s => {
      const cat = categories.value.find(c => c.id === s.id)
      if (cat) cat.sort = s.sort
    })
  } catch (e) {
    // 失败时不更新本地状态
  }
}

// 批量排序设置
export async function setCategorySort(id: number, sort: number): Promise<void> {
  try {
    await categoryApi.update(id, { sortOrder: sort })
    const cat = categories.value.find(c => c.id === id)
    if (cat) cat.sort = sort
  } catch (e) {
    // 失败时不更新
  }
}
