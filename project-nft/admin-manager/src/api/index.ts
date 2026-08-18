// Admin API 服务模块 - 对接后端 NestJS Admin API
//
// 所有方法返回 Promise，错误时 throw Error(message)
// 分页接口统一返回 { list, total, page, pageSize }

import { get, post, put, del, patch } from './request'
import type { PaginatedData } from './request'
import type {
  Order, OrderListItem, OrderDetail,
  BlindBox, BlindBoxListItem, BlindBoxDetail, BlindBoxItem, BlindBoxOpenRecord,
  Collectible, InventoryQuota, AirdropRecord, DestroyRecord,
  ResaleListingListItem, MarketTrade,
  Transfer,
  PrioritySale, PriorityWhitelistItem,
  InviteActivity, LuckyDrawActivity, SynthesisActivity, AirdropActivity, RewardConfigItem,
  WalletTransaction,
  Announcement, Banner,
  AdminUser, AdminUserListItem, AdminRoleListItem, PermissionTreeNode, OperationLog, AuditLog,
  Blacklist, RiskAlert, SecurityEvent, Approval,
  SupportTicket, Feedback,
  Refund,
  ActivityReward,
  ChainChannel, OnchainTask,
  PlatformCleanupLog,
  OperationResult, ImportResult, ExecuteResult,
  PaginationQuery,
} from './types'

// 重新导出常用类型，方便 view 层引用
export type {
  Order, OrderListItem, OrderDetail,
  BlindBox, BlindBoxListItem, BlindBoxDetail, BlindBoxItem, BlindBoxOpenRecord,
  Collectible, InventoryQuota, AirdropRecord, DestroyRecord,
  ResaleListingListItem, MarketTrade,
  Transfer,
  PrioritySale, PriorityWhitelistItem,
  InviteActivity, LuckyDrawActivity, SynthesisActivity, AirdropActivity, RewardConfigItem,
  WalletTransaction,
  Announcement, Banner,
  AdminUser, AdminUserListItem, AdminRoleListItem, PermissionTreeNode, OperationLog, AuditLog,
  Blacklist, RiskAlert, SecurityEvent, Approval,
  SupportTicket, Feedback,
  Refund,
  ActivityReward,
  ChainChannel, OnchainTask,
  PlatformCleanupLog,
  OperationResult, ImportResult, ExecuteResult,
  PaginationQuery,
}

// ============================================================
// 认证模块
// ============================================================
export interface LoginResult {
  token: string
  refreshToken: string
  admin: {
    id: string
    username: string
    realName: string
    role: number
    requires2fa: boolean
  }
}

export const authApi = {
  login: (username: string, password: string) =>
    post<LoginResult>('/auth/login', { username, password }),

  logout: () => post('/auth/logout'),

  profile: () => get<AdminUser>('/auth/profile'),
}

// ============================================================
// 仪表盘
// ============================================================
export interface DashboardMetrics {
  totalUsers: number
  totalCollectibles: number
  totalOrders: number
  totalGMV: number
  todayNewUsers: number
  todayOrders: number
  todayRevenue: number
}

export const dashboardApi = {
  metrics: () => get<DashboardMetrics>('/dashboard/metrics'),
}

// ============================================================
// 藏品管理
// ============================================================
export const collectibleApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<Collectible>>('/collectibles', params),
  detail: (id: number | string) =>
    get<Collectible>(`/collectibles/${id}`),
  create: (data: Partial<Collectible>) =>
    post<Collectible>('/collectibles', data),
  update: (id: number | string, data: Partial<Collectible>) =>
    put<Collectible>(`/collectibles/${id}`, data),
  delete: (id: number | string) =>
    del(`/collectibles/${id}`),
  toggleStatus: (id: number | string) =>
    patch(`/collectibles/${id}/toggle-status`),
  quotas: (id: number | string) =>
    get<InventoryQuota[]>(`/collectibles/${id}/quotas`),
  airdropRecords: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<AirdropRecord>>(`/collectibles/${id}/airdrop-records`, params),
  destroyRecords: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<DestroyRecord>>(`/collectibles/${id}/destroy-records`, params),
}

// ============================================================
// 用户管理
// ============================================================
export interface User {
  id: string
  username: string | null
  nickname: string | null
  phone: string | null
  avatar: string | null
  status: number
  walletBalance: string
  collectibleCount: number
  createdAt: string
  updatedAt: string
}

export const userApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<User>>('/users', params),
  detail: (id: number | string) =>
    get<User>(`/users/${id}`),
  update: (id: number | string, data: Partial<User>) =>
    put<User>(`/users/${id}`, data),
  freeze: (id: number | string) =>
    patch(`/users/${id}/freeze`),
  unfreeze: (id: number | string) =>
    patch(`/users/${id}/unfreeze`),
}

// ============================================================
// 订单管理
// ============================================================
export const orderApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<OrderListItem>>('/orders', params),
  detail: (id: number | string) =>
    get<OrderDetail>(`/orders/${id}`),
}

// ============================================================
// 盲盒管理
// ============================================================
export const blindBoxApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<BlindBoxListItem>>('/blindboxes', params),
  detail: (id: number | string) =>
    get<BlindBoxDetail>(`/blindboxes/${id}`),
  create: (data: { collectibleId: number }) =>
    post<BlindBox>('/blindboxes', data),
  update: (id: number | string, data: Partial<BlindBox>) =>
    put<BlindBox>(`/blindboxes/${id}`, data),
  delete: (id: number | string) =>
    del(`/blindboxes/${id}`),
  openRecords: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<BlindBoxOpenRecord>>(`/blindboxes/${id}/open-records`, params),
  destroyRecords: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<DestroyRecord>>(`/blindboxes/${id}/destroy-records`, params),
}

// ============================================================
// 市场管理
// ============================================================
export const marketApi = {
  listings: (params: PaginationQuery = {}) =>
    get<PaginatedData<ResaleListingListItem>>('/market/listings', params),
  trades: (params: PaginationQuery = {}) =>
    get<PaginatedData<MarketTrade>>('/market/trades', params),
  delist: (id: number | string) =>
    put(`/market/listings/${id}/delist`),
}

// ============================================================
// 转赠管理
// ============================================================
export const transferApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<Transfer>>('/transfers', params),
}

// ============================================================
// 营销活动
// ============================================================
export const marketingApi = {
  priority: {
    list: (params: PaginationQuery = {}) =>
      get<PaginatedData<PrioritySale>>('/marketing/priority', params),
    create: (data: Partial<PrioritySale>) =>
      post<PrioritySale>('/marketing/priority', data),
    update: (id: number | string, data: Partial<PrioritySale>) =>
      put<PrioritySale>(`/marketing/priority/${id}`, data),
    delete: (id: number | string) =>
      del(`/marketing/priority/${id}`),
    start: (id: number | string) =>
      put<PrioritySale>(`/marketing/priority/${id}/start`),
    end: (id: number | string) =>
      put<PrioritySale>(`/marketing/priority/${id}/end`),
    whitelist: (id: number | string, params: PaginationQuery = {}) =>
      get<PaginatedData<PriorityWhitelistItem>>(`/marketing/priority/${id}/whitelist`, params),
    importWhitelist: (id: number | string, data: Array<{ userId: number; maxQuantity?: number }>) =>
      post<ImportResult>(`/marketing/priority/${id}/whitelist/import`, { data }),
    deleteWhitelist: (id: number | string, wid: number | string) =>
      del(`/marketing/priority/${id}/whitelist/${wid}`),
  },
  checkinConfig: () =>
    get<RewardConfigItem[]>('/marketing/checkin/config'),
  inviteActivities: (params: PaginationQuery = {}) =>
    get<PaginatedData<InviteActivity>>('/marketing/invite/activities', params),
  luckyDraw: (params: PaginationQuery = {}) =>
    get<PaginatedData<LuckyDrawActivity>>('/marketing/lucky-draw', params),
  synthesis: (params: PaginationQuery = {}) =>
    get<PaginatedData<SynthesisActivity>>('/marketing/synthesis', params),
  airdrop: (params: PaginationQuery = {}) =>
    get<PaginatedData<AirdropActivity>>('/marketing/airdrop', params),
}

// ============================================================
// 钱包管理
// ============================================================
export const walletApi = {
  transactions: (params: PaginationQuery = {}) =>
    get<PaginatedData<WalletTransaction>>('/wallet/transactions', params),
}

// ============================================================
// 内容管理
// ============================================================
export const cmsApi = {
  announcements: (params: PaginationQuery = {}) =>
    get<PaginatedData<Announcement>>('/cms/announcements', params),
  banners: (params: PaginationQuery = {}) =>
    get<PaginatedData<Banner>>('/cms/banners', params),
}

// ============================================================
// 系统配置
// ============================================================
export interface SystemGlobalConfig {
  siteName: string
  siteUrl: string
  icp: string
  contactEmail: string
  customerServiceUrl: string
}

export interface SystemPaymentConfig {
  alipayEnabled: boolean
  wechatEnabled: boolean
  alipayAppId: string
  wechatMchId: string
}

export interface SystemSecurityConfig {
  rateLimitPerMinute: number
  loginAttemptLimit: number
  sessionTimeout: number
  captchaEnabled: boolean
}

export const systemApi = {
  global: () => get<SystemGlobalConfig>('/system/global'),
  payment: () => get<SystemPaymentConfig>('/system/payment'),
  security: () => get<SystemSecurityConfig>('/system/security'),
}

// ============================================================
// 权限管理
// ============================================================
export const permissionApi = {
  admins: (params: PaginationQuery = {}) =>
    get<PaginatedData<AdminUserListItem>>('/permission/admins', params),
  adminDetail: (id: number | string) =>
    get<AdminUser>(`/permission/admins/${id}`),
  createAdmin: (data: { username: string; password: string; realName: string; role: number; phone?: string }) =>
    post<AdminUser>('/permission/admins', data),
  updateAdmin: (id: number | string, data: Partial<AdminUser>) =>
    put<AdminUser>(`/permission/admins/${id}`, data),
  deleteAdmin: (id: number | string) =>
    del(`/permission/admins/${id}`),
  resetAdminPassword: (id: number | string, data: { password?: string }) =>
    put<null>(`/permission/admins/${id}/reset-password`, data),
  roles: (params: PaginationQuery = {}) =>
    get<AdminRoleListItem[]>('/permission/roles', params),
  permissionTree: () =>
    get<PermissionTreeNode[]>('/permission/permissions/tree'),
  operationLogs: (params: PaginationQuery = {}) =>
    get<PaginatedData<OperationLog>>('/permission/operation-logs', params),
  loginLogs: (params: PaginationQuery = {}) =>
    get<PaginatedData<AuditLog>>('/permission/login-logs', params),
}

// ============================================================
// 安全管理
// ============================================================
export const securityApi = {
  blacklist: (params: PaginationQuery = {}) =>
    get<PaginatedData<Blacklist>>('/security/blacklist', params),
  riskAlerts: (params: PaginationQuery = {}) =>
    get<PaginatedData<RiskAlert>>('/security/risk-alerts', params),
  events: (params: PaginationQuery = {}) =>
    get<PaginatedData<SecurityEvent>>('/security/events', params),
  approvals: (params: PaginationQuery = {}) =>
    get<PaginatedData<Approval>>('/security/approvals', params),
}

// ============================================================
// 工单管理
// ============================================================
export const ticketApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<SupportTicket>>('/tickets', params),
  feedbacks: (params: PaginationQuery = {}) =>
    get<PaginatedData<Feedback>>('/tickets/feedbacks', params),
}

// ============================================================
// 退款管理
// ============================================================
export const refundApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<Refund>>('/refunds', params),
  approve: (id: number | string) =>
    put<Refund>(`/refunds/${id}/approve`),
  reject: (id: number | string, reason: string) =>
    put<Refund>(`/refunds/${id}/reject`, { reason }),
}

// ============================================================
// 报表
// ============================================================
export interface SalesReport {
  totalOrders: number
  totalGMV: number
  dailyData: Array<{ date: string; orders: number; revenue: number }>
}

export interface UsersReport {
  totalUsers: number
  dailyData: Array<{ date: string; newUsers: number }>
}

export interface CollectiblesReport {
  totalCollectibles: number
  topCollectibles: Array<{ id: number; name: string; sold: number; revenue: number }>
}

export interface FinanceReport {
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  dailyData: Array<{ date: string; revenue: number; refunds: number }>
}

export const reportApi = {
  sales: (params: PaginationQuery = {}) =>
    get<SalesReport>('/reports/sales', params),
  users: (params: PaginationQuery = {}) =>
    get<UsersReport>('/reports/users', params),
  collectibles: (params: PaginationQuery = {}) =>
    get<CollectiblesReport>('/reports/collectibles', params),
  finance: (params: PaginationQuery = {}) =>
    get<FinanceReport>('/reports/finance', params),
}

// ============================================================
// 奖励管理
// ============================================================
export const rewardApi = {
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<ActivityReward>>('/rewards', params),
  detail: (id: number | string) =>
    get<ActivityReward>(`/rewards/${id}`),
}

// ============================================================
// 链上管理（藏品上链）
// ============================================================
export const chainApi = {
  channels: (params: PaginationQuery = {}) =>
    get<PaginatedData<ChainChannel>>('/chain/channels', params),
  createChannel: (data: Partial<ChainChannel>) =>
    post<ChainChannel>('/chain/channels', data),
  updateChannel: (id: number | string, data: Partial<ChainChannel>) =>
    put<ChainChannel>(`/chain/channels/${id}`, data),
  deleteChannel: (id: number | string) =>
    del(`/chain/channels/${id}`),
  toggleChannel: (id: number | string) =>
    patch(`/chain/channels/${id}/toggle`),
  collectibles: (params: PaginationQuery = {}) =>
    get<PaginatedData<Collectible>>('/chain/collectibles', params),
  batchMint: (data: { collectibleId: number; quantity: number; channelId?: number }) =>
    post<OnchainTask[]>('/chain/mint', data),
  retroactiveMint: (data: { collectibleId: number; userIds: number[]; channelId?: number }) =>
    post<OnchainTask[]>('/chain/mint/retroactive', data),
  generateOffchain: (data: { collectibleId: number; quantity: number }) =>
    post<OperationResult>('/chain/offchain/random', data),
  tasks: (params: PaginationQuery = {}) =>
    get<PaginatedData<OnchainTask>>('/chain/tasks', params),
  taskDetail: (id: number | string) =>
    get<OnchainTask>(`/chain/tasks/${id}`),
  retryTask: (id: number | string) =>
    post<OnchainTask>(`/chain/tasks/${id}/retry`),
}

// ============================================================
// 平台管理
// ============================================================
export const platformApi = {
  cleanupLogs: (params: PaginationQuery = {}) =>
    get<PaginatedData<PlatformCleanupLog>>('/platform/cleanup-logs', params),
  cleanupPreview: (data: { targetTable: string; olderThanDays: number }) =>
    post<{ affectedCount: number }>('/platform/cleanup-preview', data),
  cleanupExecute: (data: { targetTable: string; olderThanDays: number }) =>
    post<ExecuteResult>('/platform/cleanup-execute', data),
}
