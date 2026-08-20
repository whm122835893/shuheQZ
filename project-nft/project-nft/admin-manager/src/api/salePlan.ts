import { ref } from 'vue'
import { collectibleApi, blindBoxApi } from './index'
import type { Collectible } from './types'

// ========== 发售计划共享状态 ==========

export interface SalePlan {
  id: number
  collectible_id: number
  collectible_name: string
  collectible_image: string
  collectible_type: 'collectible' | 'blindbox'
  price: number
  per_user_limit: number
  sale_mode: 1 | 2  // 1=公售 2=资格购
  status: 'draft' | 'scheduled' | 'on_sale' | 'ended'
  status_text: string
  onsale_at: string
  end_at: string
  edition: number
  sold: number
  created_at: string
}

// 本地发售计划状态管理（无专用后端 API，使用 collectibleApi 数据映射）
function initSalePlans(): SalePlan[] {
  return []
}

export const salePlans = ref<SalePlan[]>(initSalePlans())

// 可选藏品/盲盒的响应式缓存（供 computed 直接使用）
export const availableCollectibles = ref<any[]>([])
export const availableBlindboxes = ref<any[]>([])

// 异步加载发售计划：从 collectibleApi.list 获取已发布藏品并映射为 SalePlan
export async function loadSalePlans() {
  try {
    const res = await collectibleApi.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as Collectible[]
    salePlans.value = list
      .filter((c) => c.isRelease === 1)
      .map((c) => ({
        id: Number(c.id),
        collectible_id: Number(c.id),
        collectible_name: c.name || '',
        collectible_image: c.image || '',
        collectible_type: 'collectible' as const,
        price: parseFloat(c.price) || 0,
        per_user_limit: 0,
        sale_mode: 1 as 1 | 2,
        status: c.status === 1 ? 'on_sale' as const : 'draft' as const,
        status_text: c.status === 1 ? '发售中' : '待发布',
        onsale_at: c.createdAt || '',
        end_at: '',
        edition: c.edition || 0,
        sold: c.sold || 0,
        created_at: c.createdAt || ''
      }))
  } catch (e) {
    console.error('加载发售计划失败', e)
  }
}

// 获取所有可选藏品（排除已创建发售计划的）
export async function getAvailableCollectibles() {
  try {
    const res = await collectibleApi.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as Collectible[]
    const usedIds = salePlans.value
      .filter((p) => p.collectible_type === 'collectible')
      .map((p) => p.collectible_id)
    availableCollectibles.value = list
      .map((c) => ({
        id: Number(c.id),
        name: c.name || '',
        image: c.image || '',
        edition: c.edition || 0,
        price: parseFloat(c.price) || 0
      }))
      .filter((c) => !usedIds.includes(c.id))
    return availableCollectibles.value
  } catch (e) {
    console.error('加载可选藏品失败', e)
    return []
  }
}

// 获取所有可选盲盒（排除已创建发售计划的）
export async function getAvailableBlindboxes() {
  try {
    const res = await blindBoxApi.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as any[]
    const usedIds = salePlans.value
      .filter((p) => p.collectible_type === 'blindbox')
      .map((p) => p.collectible_id)
    availableBlindboxes.value = list
      .map((b) => ({
        id: Number(b.id),
        name: b.collectible?.name || `盲盒 #${b.id}`,
        image: b.collectible?.image || '',
        edition: b.collectible?.edition || 0,
        price: parseFloat(b.collectible?.price || '0') || 0
      }))
      .filter((b) => !usedIds.includes(b.id))
    return availableBlindboxes.value
  } catch (e) {
    console.error('加载可选盲盒失败', e)
    return []
  }
}

// 获取所有已设置为资格购的藏品（供资格购管理页面使用）
export function getQualificationCollectibles() {
  return salePlans.value.filter(p => p.sale_mode === 2 && p.collectible_type === 'collectible')
}

// 添加发售计划
export function addSalePlan(plan: Omit<SalePlan, 'id' | 'created_at' | 'status_text'>) {
  const id = Math.max(0, ...salePlans.value.map(p => p.id)) + 1
  const statusText = { draft: '待发布', scheduled: '已排期', on_sale: '发售中', ended: '已结束' }[plan.status]
  salePlans.value.unshift({
    ...plan,
    id,
    created_at: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
    status_text: statusText
  })
}

// 更新发售计划
export function updateSalePlan(id: number, updates: Partial<SalePlan>) {
  const plan = salePlans.value.find(p => p.id === id)
  if (plan) {
    Object.assign(plan, updates)
    if (updates.status) {
      plan.status_text = { draft: '待发布', scheduled: '已排期', on_sale: '发售中', ended: '已结束' }[updates.status]
    }
  }
}

// 删除发售计划
export function deleteSalePlan(id: number) {
  salePlans.value = salePlans.value.filter(p => p.id !== id)
}

// ========== 挂单锁定状态管理 ==========

export interface ListingLock {
  listingId: number
  lockedAt: number  // timestamp
  lockedBy: string
  expireAt: number  // 5 分钟后
}

const LOCK_DURATION = 5 * 60 * 1000  // 5 分钟
export const listingLocks = ref<ListingLock[]>([])

// 锁定挂单
export function lockListing(listingId: number, operator: string = '管理员'): { success: boolean; message: string } {
  // 检查是否已被锁定
  const existing = listingLocks.value.find(l => l.listingId === listingId)
  if (existing && existing.expireAt > Date.now()) {
    const remainSec = Math.ceil((existing.expireAt - Date.now()) / 1000)
    return { success: false, message: `挂单已被 ${existing.lockedBy} 锁定，剩余 ${remainSec} 秒` }
  }
  // 清除过期锁
  if (existing) {
    listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
  }
  // 添加新锁
  const now = Date.now()
  listingLocks.value.push({
    listingId,
    lockedAt: now,
    lockedBy: operator,
    expireAt: now + LOCK_DURATION
  })
  return { success: true, message: '挂单已锁定，5 分钟内有效' }
}

// 解锁挂单
export function unlockListing(listingId: number) {
  listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
}

// 检查挂单是否被锁定
export function isListingLocked(listingId: number): boolean {
  const lock = listingLocks.value.find(l => l.listingId === listingId)
  if (!lock) return false
  if (lock.expireAt <= Date.now()) {
    listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
    return false
  }
  return true
}

// 获取挂单锁定信息
export function getListingLockInfo(listingId: number): ListingLock | null {
  const lock = listingLocks.value.find(l => l.listingId === listingId)
  if (!lock || lock.expireAt <= Date.now()) {
    if (lock) listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
    return null
  }
  return lock
}

// 获取剩余锁定秒数
export function getLockRemainSeconds(listingId: number): number {
  const lock = getListingLockInfo(listingId)
  if (!lock) return 0
  return Math.ceil((lock.expireAt - Date.now()) / 1000)
}
