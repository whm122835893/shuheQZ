import { ref } from 'vue'

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

// TODO: 待对接后端发售计划 API，当前返回空数组
// 后端接口就绪后，应改为异步从后端拉取发售计划列表
function initSalePlans(): SalePlan[] {
  return []
}

export const salePlans = ref<SalePlan[]>(initSalePlans())

// 获取所有可选藏品（排除已创建发售计划的）
// TODO: 待对接后端藏品 API（collectibleApi.list），获取真实藏品数据后排除已创建发售计划的藏品
export function getAvailableCollectibles() {
  // TODO: 改为调用 collectibleApi.list 获取真实藏品数据后进行过滤
  return []
}

// 获取所有可选盲盒
// TODO: 待对接后端盲盒 API（blindBoxApi.list），获取真实盲盒数据后排除已创建发售计划的盲盒
export function getAvailableBlindboxes() {
  // TODO: 改为调用 blindBoxApi.list 获取真实盲盒数据后进行过滤
  return []
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
