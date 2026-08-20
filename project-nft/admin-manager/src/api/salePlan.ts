import { get, post, put, del } from './request'
import type { PaginatedData } from './request'
import { collectibleApi, blindBoxApi } from './index'
import type { Collectible } from './types'

// ========== 发售计划类型定义 ==========

/** 发售计划状态：0=草稿 1=待开售 2=发售中 3=已结束 4=已售罄 */
export type SalePlanStatus = 0 | 1 | 2 | 3 | 4

/** 售卖模式：1=公售 2=资格购 */
export type SaleMode = 1 | 2

export interface SalePlan {
  id: number
  collectible_id: number
  collectible_type: string
  collectible_name: string
  collectible_image: string
  name: string
  sale_mode: SaleMode
  price: number
  per_user_limit: number
  stock_allocation: number
  start_time: string
  end_time: string
  status: SalePlanStatus
  sold_count: number
  created_at: string
}

export interface SalePlanListQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
  sale_mode?: number
}

export interface CreateSalePlanDto {
  collectibleId: number
  collectibleType?: string
  name: string
  saleMode: SaleMode
  price: number
  perUserLimit?: number
  stockAllocation?: number
  startTime: string
  endTime: string
}

export interface UpdateSalePlanDto {
  name?: string
  saleMode?: SaleMode
  price?: number
  perUserLimit?: number
  stockAllocation?: number
  startTime?: string
  endTime?: string
}

// ========== 状态工具函数 ==========

const STATUS_MAP: Record<SalePlanStatus, { text: string; tag: string }> = {
  0: { text: '草稿', tag: 'info' },
  1: { text: '待开售', tag: 'warning' },
  2: { text: '发售中', tag: 'success' },
  3: { text: '已结束', tag: 'danger' },
  4: { text: '已售罄', tag: 'danger' },
}

export function statusText(status: SalePlanStatus): string {
  return STATUS_MAP[status]?.text || '未知'
}

export function statusTagType(status: SalePlanStatus): string {
  return STATUS_MAP[status]?.tag || 'info'
}

// ========== 发售计划 API ==========

export const salePlanApi = {
  list: (params: SalePlanListQuery = {}) =>
    get<PaginatedData<SalePlan>>('/sale-plans', params),

  detail: (id: number) =>
    get<SalePlan>(`/sale-plans/${id}`),

  create: (data: CreateSalePlanDto) =>
    post<SalePlan>('/sale-plans', data),

  update: (id: number, data: UpdateSalePlanDto) =>
    put<SalePlan>(`/sale-plans/${id}`, data),

  publish: (id: number) =>
    put<{ id: number; status: number }>(`/sale-plans/${id}/publish`),

  unpublish: (id: number) =>
    put<{ id: number; status: number }>(`/sale-plans/${id}/unpublish`),

  delete: (id: number) =>
    del(`/sale-plans/${id}`),
}

// ========== 可选藏品/盲盒加载 ==========

// 兼容旧代码的响应式缓存
import { ref } from 'vue'
export const availableCollectibles = ref<any[]>([])
export const availableBlindboxes = ref<any[]>([])

/**
 * 获取所有已设置为资格购的藏品（供资格购管理页面使用）
 * 从后端查询 sale_mode=2 的发售计划
 */
export async function getQualificationCollectibles(): Promise<any[]> {
  try {
    const res = await salePlanApi.list({ page: 1, pageSize: 9999, sale_mode: 2 })
    return (res?.list || []).map((p) => ({
      id: p.id,
      collectible_id: p.collectible_id,
      collectible_name: p.collectible_name,
      collectible_image: p.collectible_image,
      price: p.price,
    }))
  } catch (e) {
    console.error('加载资格购藏品失败', e)
    return []
  }
}

export async function getAvailableCollectibles(): Promise<any[]> {
  try {
    const res = await collectibleApi.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as Collectible[]
    availableCollectibles.value = list.map((c) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      edition: c.edition || 0,
      price: parseFloat(c.price) || 0,
    }))
    return availableCollectibles.value
  } catch (e) {
    console.error('加载可选藏品失败', e)
    return []
  }
}

export async function getAvailableBlindboxes(): Promise<any[]> {
  try {
    const res = await blindBoxApi.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as any[]
    availableBlindboxes.value = list.map((b) => ({
      id: Number(b.id),
      name: b.collectible?.name || `盲盒 #${b.id}`,
      image: b.collectible?.image || '',
      edition: b.collectible?.edition || 0,
      price: parseFloat(b.collectible?.price || '0') || 0,
    }))
    return availableBlindboxes.value
  } catch (e) {
    console.error('加载可选盲盒失败', e)
    return []
  }
}

// ========== 挂单锁定状态管理（保留原有功能） ==========

export interface ListingLock {
  listingId: number
  lockedAt: number
  lockedBy: string
  expireAt: number
}

const LOCK_DURATION = 5 * 60 * 1000
export const listingLocks = ref<ListingLock[]>([])

export function lockListing(listingId: number, operator: string = '管理员'): { success: boolean; message: string } {
  const existing = listingLocks.value.find(l => l.listingId === listingId)
  if (existing && existing.expireAt > Date.now()) {
    const remainSec = Math.ceil((existing.expireAt - Date.now()) / 1000)
    return { success: false, message: `挂单已被 ${existing.lockedBy} 锁定，剩余 ${remainSec} 秒` }
  }
  if (existing) {
    listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
  }
  const now = Date.now()
  listingLocks.value.push({ listingId, lockedAt: now, lockedBy: operator, expireAt: now + LOCK_DURATION })
  return { success: true, message: '挂单已锁定，5 分钟内有效' }
}

export function unlockListing(listingId: number) {
  listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
}

export function isListingLocked(listingId: number): boolean {
  const lock = listingLocks.value.find(l => l.listingId === listingId)
  if (!lock) return false
  if (lock.expireAt <= Date.now()) {
    listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
    return false
  }
  return true
}

export function getListingLockInfo(listingId: number): ListingLock | null {
  const lock = listingLocks.value.find(l => l.listingId === listingId)
  if (!lock || lock.expireAt <= Date.now()) {
    if (lock) listingLocks.value = listingLocks.value.filter(l => l.listingId !== listingId)
    return null
  }
  return lock
}

export function getLockRemainSeconds(listingId: number): number {
  const lock = getListingLockInfo(listingId)
  if (!lock) return 0
  return Math.ceil((lock.expireAt - Date.now()) / 1000)
}
