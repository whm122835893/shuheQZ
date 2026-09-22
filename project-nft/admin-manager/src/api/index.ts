import { get, post, put, del, patch } from './request'
import type { PaginatedData, PaginationQuery } from './request'

// ============================================================
// 认证模块
// ============================================================
export const authApi = {
  /** POST /auth/login */
  login: (data?: Record<string, any>) =>
    post(`/auth/login`, data),
  /** POST /auth/logout */
  logout: (data?: Record<string, any>) =>
    post(`/auth/logout`, data),
  /** GET /auth/me */
  me: (params?: Record<string, any>) =>
    get<any>(`/auth/me`, params),
  /** PUT /auth/password */
  password: (data?: Record<string, any>) =>
    put(`/auth/password`, data),
  /** POST /auth/refresh */
  refresh: (data?: Record<string, any>) =>
    post(`/auth/refresh`, data),
  /** POST /auth/2fa/setup */
  setup: (data?: Record<string, any>) =>
    post(`/auth/2fa/setup`, data),
  /** POST /auth/2fa/verify */
  verify: (data?: Record<string, any>) =>
    post(`/auth/2fa/verify`, data),
}

// ============================================================
// 盲盒管理
// ============================================================
export const blindBoxApi = {
  /** GET /blindboxes */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/blindboxes`, params),
  /** POST /blindboxes */
  create: (data?: Record<string, any>) =>
    post(`/blindboxes`, data),
  /** GET /blindboxes/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/blindboxes/${id}`, params),
  /** PUT /blindboxes/{id} */
  update: (id: number | string, data?: Record<string, any>) =>
    put(`/blindboxes/${id}`, data),
  /** DELETE /blindboxes/{id} */
  delete: (id: number | string) =>
    del(`/blindboxes/${id}`),
  /** POST /blindboxes/{id}/airdrop */
  airdrop: (id: number | string, data?: Record<string, any>) =>
    post(`/blindboxes/${id}/airdrop`, data),
  /** POST /blindboxes/{id}/destroy */
  destroy: (id: number | string, data?: Record<string, any>) =>
    post(`/blindboxes/${id}/destroy`, data),
  /** GET /blindboxes/{id}/destroy-records */
  destroyRecords: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/blindboxes/${id}/destroy-records`, params),
  /** PUT /blindboxes/{id}/force-soldout */
  forceSoldout: (id: number | string, data?: Record<string, any>) =>
    put(`/blindboxes/${id}/force-soldout`, data),
  /** GET /blindboxes/{id}/items */
  items: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/blindboxes/${id}/items`, params),
  /** POST /blindboxes/{id}/items */
  items1: (id: number | string, data?: Record<string, any>) =>
    post(`/blindboxes/${id}/items`, data),
  /** GET /blindboxes/{id}/open-records */
  openRecords: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/blindboxes/${id}/open-records`, params),
  /** POST /blindboxes/{id}/recover */
  recover: (id: number | string, data?: Record<string, any>) =>
    post(`/blindboxes/${id}/recover`, data),
  /** PUT /blindboxes/{id}/release */
  release: (id: number | string, data?: Record<string, any>) =>
    put(`/blindboxes/${id}/release`, data),
  /** PUT /blindboxes/{id}/relist */
  relist: (id: number | string, data?: Record<string, any>) =>
    put(`/blindboxes/${id}/relist`, data),
  /** PUT /blindboxes/{id}/items/{itemId} */
  items2: (id: number | string, itemId: number | string, data?: Record<string, any>) =>
    put(`/blindboxes/${id}/items/${itemId}`, data),
  /** DELETE /blindboxes/{id}/items/{itemId} */
  items3: (id: number | string, itemId: number | string) =>
    del(`/blindboxes/${id}/items/${itemId}`),
}

// ============================================================
// 分类管理
// ============================================================
export const categoryApi = {
  /** GET /categories */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/categories`, params),
  /** POST /categories */
  create: (data?: Record<string, any>) =>
    post(`/categories`, data),
  /** PUT /categories/reorder */
  reorder: (data?: Record<string, any>) =>
    put(`/categories/reorder`, data),
  /** PUT /categories/{id} */
  update: (id: number | string, data?: Record<string, any>) =>
    put(`/categories/${id}`, data),
  /** DELETE /categories/{id} */
  delete: (id: number | string) =>
    del(`/categories/${id}`),
  /** PUT /categories/{id}/toggle */
  toggle: (id: number | string, data?: Record<string, any>) =>
    put(`/categories/${id}/toggle`, data),
}

// ============================================================
// 链上管理
// ============================================================
export const chainApi = {
  /** GET /chain/channels */
  channels: (params?: Record<string, any>) =>
    get<any>(`/chain/channels`, params),
  /** POST /chain/channels */
  channels1: (data?: Record<string, any>) =>
    post(`/chain/channels`, data),
  /** GET /chain/collectibles */
  collectibles: (params?: Record<string, any>) =>
    get<any>(`/chain/collectibles`, params),
  /** POST /chain/mint */
  mint: (data?: Record<string, any>) =>
    post(`/chain/mint`, data),
  /** GET /chain/tasks */
  tasks: (params?: Record<string, any>) =>
    get<any>(`/chain/tasks`, params),
  /** PUT /chain/channels/{id} */
  channels2: (id: number | string, data?: Record<string, any>) =>
    put(`/chain/channels/${id}`, data),
  /** DELETE /chain/channels/{id} */
  channels3: (id: number | string) =>
    del(`/chain/channels/${id}`),
  /** POST /chain/mint/retroactive */
  retroactive: (data?: Record<string, any>) =>
    post(`/chain/mint/retroactive`, data),
  /** POST /chain/offchain/random */
  random: (data?: Record<string, any>) =>
    post(`/chain/offchain/random`, data),
  /** GET /chain/tasks/{id} */
  tasks1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/chain/tasks/${id}`, params),
  /** PATCH /chain/channels/{id}/toggle */
  toggle: (id: number | string, data?: Record<string, any>) =>
    patch(`/chain/channels/${id}/toggle`, data),
  /** POST /chain/tasks/{id}/retry */
  retry: (id: number | string, data?: Record<string, any>) =>
    post(`/chain/tasks/${id}/retry`, data),
}

// ============================================================
// 内容管理
// ============================================================
export const cmsApi = {
  /** GET /cms/agreements */
  agreements: (params?: Record<string, any>) =>
    get<any>(`/cms/agreements`, params),
  /** GET /cms/announcements */
  announcements: (params?: Record<string, any>) =>
    get<any>(`/cms/announcements`, params),
  /** POST /cms/announcements */
  announcements1: (data?: Record<string, any>) =>
    post(`/cms/announcements`, data),
  /** GET /cms/artifacts */
  artifacts: (params?: Record<string, any>) =>
    get<any>(`/cms/artifacts`, params),
  /** POST /cms/artifacts */
  artifacts1: (data?: Record<string, any>) =>
    post(`/cms/artifacts`, data),
  /** GET /cms/banners */
  banners: (params?: Record<string, any>) =>
    get<any>(`/cms/banners`, params),
  /** POST /cms/banners */
  banners1: (data?: Record<string, any>) =>
    post(`/cms/banners`, data),
  /** GET /cms/decoration */
  decoration: (params?: Record<string, any>) =>
    get<any>(`/cms/decoration`, params),
  /** PUT /cms/decoration */
  decoration1: (data?: Record<string, any>) =>
    put(`/cms/decoration`, data),
  /** PUT /cms/agreements/{id} */
  agreements1: (id: number | string, data?: Record<string, any>) =>
    put(`/cms/agreements/${id}`, data),
  /** PUT /cms/announcements/{id} */
  announcements2: (id: number | string, data?: Record<string, any>) =>
    put(`/cms/announcements/${id}`, data),
  /** DELETE /cms/announcements/{id} */
  announcements3: (id: number | string) =>
    del(`/cms/announcements/${id}`),
  /** PUT /cms/artifacts/{id} */
  artifacts2: (id: number | string, data?: Record<string, any>) =>
    put(`/cms/artifacts/${id}`, data),
  /** DELETE /cms/artifacts/{id} */
  artifacts3: (id: number | string) =>
    del(`/cms/artifacts/${id}`),
  /** PUT /cms/banners/sort */
  sort: (data?: Record<string, any>) =>
    put(`/cms/banners/sort`, data),
  /** PUT /cms/banners/{id} */
  banners2: (id: number | string, data?: Record<string, any>) =>
    put(`/cms/banners/${id}`, data),
  /** DELETE /cms/banners/{id} */
  banners3: (id: number | string) =>
    del(`/cms/banners/${id}`),
  /** PUT /cms/announcements/{id}/publish */
  publish: (id: number | string, data?: Record<string, any>) =>
    put(`/cms/announcements/${id}/publish`, data),
}

// ============================================================
// 藏品管理
// ============================================================
export const collectibleApi = {
  /** GET /collectibles */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/collectibles`, params),
  /** POST /collectibles */
  create: (data?: Record<string, any>) =>
    post(`/collectibles`, data),
  /** GET /collectibles/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/collectibles/${id}`, params),
  /** PUT /collectibles/{id} */
  update: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}`, data),
  /** DELETE /collectibles/{id} */
  delete: (id: number | string) =>
    del(`/collectibles/${id}`),
  /** POST /collectibles/{id}/airdrop */
  airdrop: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/airdrop`, data),
  /** GET /collectibles/{id}/airdrop-records */
  airdropRecords: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/collectibles/${id}/airdrop-records`, params),
  /** GET /collectibles/{id}/audit */
  audit: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/collectibles/${id}/audit`, params),
  /** POST /collectibles/{id}/destroy */
  destroy: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/destroy`, data),
  /** GET /collectibles/{id}/destroy-records */
  destroyRecords: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/collectibles/${id}/destroy-records`, params),
  /** PUT /collectibles/{id}/force-soldout */
  forceSoldout: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/force-soldout`, data),
  /** PUT /collectibles/{id}/price-control */
  priceControl: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/price-control`, data),
  /** GET /collectibles/{id}/quotas */
  quotas: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/collectibles/${id}/quotas`, params),
  /** PUT /collectibles/{id}/release */
  release: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/release`, data),
  /** PUT /collectibles/{id}/relist */
  relist: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/relist`, data),
  /** PUT /collectibles/{id}/resale-toggle */
  resaleToggle: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/resale-toggle`, data),
  /** PUT /collectibles/{id}/toggle-status */
  toggleStatus: (id: number | string, data?: Record<string, any>) =>
    put(`/collectibles/${id}/toggle-status`, data),
  /** POST /collectibles/{id}/priority-sale/config */
  config: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/priority-sale/config`, data),
  /** POST /collectibles/{id}/priority-sale/whitelist */
  whitelist: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/priority-sale/whitelist`, data),
  /** POST /collectibles/{id}/qualification/config */
  config1: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/qualification/config`, data),
  /** POST /collectibles/{id}/qualification/whitelist */
  whitelist1: (id: number | string, data?: Record<string, any>) =>
    post(`/collectibles/${id}/qualification/whitelist`, data),
}

// ============================================================
// 仪表盘
// ============================================================
export const dashboardApi = {
  /** GET /dashboard/activities */
  activities: (params?: Record<string, any>) =>
    get<any>(`/dashboard/activities`, params),
  /** GET /dashboard/alerts */
  alerts: (params?: Record<string, any>) =>
    get<any>(`/dashboard/alerts`, params),
  /** GET /dashboard/finance */
  finance: (params?: Record<string, any>) =>
    get<any>(`/dashboard/finance`, params),
  /** GET /dashboard/metrics */
  metrics: (params?: Record<string, any>) =>
    get<any>(`/dashboard/metrics`, params),
  /** GET /dashboard/priority-stats */
  priorityStats: (params?: Record<string, any>) =>
    get<any>(`/dashboard/priority-stats`, params),
  /** GET /dashboard/trends */
  trends: (params?: Record<string, any>) =>
    get<any>(`/dashboard/trends`, params),
}

// ============================================================
// 功能开关
// ============================================================
export const featureFlagApi = {
  /** GET /feature-flags */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/feature-flags`, params),
  /** GET /feature-flags/{name} */
  list1: (name: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/feature-flags/${name}`, params),
  /** PUT /feature-flags/{name} */
  update: (name: number | string, data?: Record<string, any>) =>
    put(`/feature-flags/${name}`, data),
  /** DELETE /feature-flags/{name} */
  delete: (name: number | string) =>
    del(`/feature-flags/${name}`),
}

// ============================================================
// 市场管理
// ============================================================
export const marketApi = {
  /** GET /market/fee-config */
  feeConfig: (params?: Record<string, any>) =>
    get<any>(`/market/fee-config`, params),
  /** PUT /market/fee-config */
  feeConfig1: (data?: Record<string, any>) =>
    put(`/market/fee-config`, data),
  /** GET /market/listings */
  listings: (params?: Record<string, any>) =>
    get<any>(`/market/listings`, params),
  /** GET /market/price-alerts */
  priceAlerts: (params?: Record<string, any>) =>
    get<any>(`/market/price-alerts`, params),
  /** GET /market/trades */
  trades: (params?: Record<string, any>) =>
    get<any>(`/market/trades`, params),
  /** GET /market/collectibles/{id}/listings */
  listings1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/market/collectibles/${id}/listings`, params),
  /** PUT /market/listings/{id}/delist */
  delist: (id: number | string, data?: Record<string, any>) =>
    put(`/market/listings/${id}/delist`, data),
}

// ============================================================
// 营销活动
// ============================================================
export const marketingApi = {
  /** GET /marketing/airdrop */
  airdrop: (params?: Record<string, any>) =>
    get<any>(`/marketing/airdrop`, params),
  /** POST /marketing/airdrop */
  airdrop1: (data?: Record<string, any>) =>
    post(`/marketing/airdrop`, data),
  /** GET /marketing/lucky-draw */
  luckyDraw: (params?: Record<string, any>) =>
    get<any>(`/marketing/lucky-draw`, params),
  /** POST /marketing/lucky-draw */
  luckyDraw1: (data?: Record<string, any>) =>
    post(`/marketing/lucky-draw`, data),
  /** GET /marketing/priority */
  priority: (params?: Record<string, any>) =>
    get<any>(`/marketing/priority`, params),
  /** POST /marketing/priority */
  priority1: (data?: Record<string, any>) =>
    post(`/marketing/priority`, data),
  /** GET /marketing/synthesis */
  synthesis: (params?: Record<string, any>) =>
    get<any>(`/marketing/synthesis`, params),
  /** POST /marketing/synthesis */
  synthesis1: (data?: Record<string, any>) =>
    post(`/marketing/synthesis`, data),
  /** GET /marketing/checkin/config */
  config: (params?: Record<string, any>) =>
    get<any>(`/marketing/checkin/config`, params),
  /** PUT /marketing/checkin/config */
  config1: (data?: Record<string, any>) =>
    put(`/marketing/checkin/config`, data),
  /** GET /marketing/checkin/records */
  records: (params?: Record<string, any>) =>
    get<any>(`/marketing/checkin/records`, params),
  /** GET /marketing/invite/activities */
  activities: (params?: Record<string, any>) =>
    get<any>(`/marketing/invite/activities`, params),
  /** POST /marketing/invite/activities */
  activities1: (data?: Record<string, any>) =>
    post(`/marketing/invite/activities`, data),
  /** GET /marketing/invite/records */
  records1: (params?: Record<string, any>) =>
    get<any>(`/marketing/invite/records`, params),
  /** PUT /marketing/lucky-draw/{id} */
  luckyDraw2: (id: number | string, data?: Record<string, any>) =>
    put(`/marketing/lucky-draw/${id}`, data),
  /** PUT /marketing/priority/{id} */
  priority2: (id: number | string, data?: Record<string, any>) =>
    put(`/marketing/priority/${id}`, data),
  /** DELETE /marketing/priority/{id} */
  priority3: (id: number | string) =>
    del(`/marketing/priority/${id}`),
  /** GET /marketing/register/config */
  config2: (params?: Record<string, any>) =>
    get<any>(`/marketing/register/config`, params),
  /** PUT /marketing/register/config */
  config3: (data?: Record<string, any>) =>
    put(`/marketing/register/config`, data),
  /** PUT /marketing/synthesis/{id} */
  synthesis2: (id: number | string, data?: Record<string, any>) =>
    put(`/marketing/synthesis/${id}`, data),
  /** POST /marketing/airdrop/{id}/execute */
  execute: (id: number | string, data?: Record<string, any>) =>
    post(`/marketing/airdrop/${id}/execute`, data),
  /** POST /marketing/lucky-draw/{id}/grant */
  grant: (id: number | string, data?: Record<string, any>) =>
    post(`/marketing/lucky-draw/${id}/grant`, data),
  /** GET /marketing/lucky-draw/{id}/prizes */
  prizes: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/lucky-draw/${id}/prizes`, params),
  /** POST /marketing/lucky-draw/{id}/prizes */
  prizes1: (id: number | string, data?: Record<string, any>) =>
    post(`/marketing/lucky-draw/${id}/prizes`, data),
  /** GET /marketing/lucky-draw/{id}/records */
  records2: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/lucky-draw/${id}/records`, params),
  /** PUT /marketing/priority/{id}/end */
  end: (id: number | string, data?: Record<string, any>) =>
    put(`/marketing/priority/${id}/end`, data),
  /** PUT /marketing/priority/{id}/start */
  start: (id: number | string, data?: Record<string, any>) =>
    put(`/marketing/priority/${id}/start`, data),
  /** GET /marketing/priority/{id}/whitelist */
  whitelist: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/priority/${id}/whitelist`, params),
  /** GET /marketing/synthesis/{id}/materials */
  materials: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/synthesis/${id}/materials`, params),
  /** GET /marketing/synthesis/{id}/records */
  records3: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/synthesis/${id}/records`, params),
  /** PUT /marketing/lucky-draw/{id}/prizes/{pid} */
  prizes2: (id: number | string, pid: number | string, data?: Record<string, any>) =>
    put(`/marketing/lucky-draw/${id}/prizes/${pid}`, data),
  /** DELETE /marketing/lucky-draw/{id}/prizes/{pid} */
  prizes3: (id: number | string, pid: number | string) =>
    del(`/marketing/lucky-draw/${id}/prizes/${pid}`),
  /** GET /marketing/priority/{id}/whitelist/export */
  export: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/marketing/priority/${id}/whitelist/export`, params),
  /** POST /marketing/priority/{id}/whitelist/import */
  import: (id: number | string, data?: Record<string, any>) =>
    post(`/marketing/priority/${id}/whitelist/import`, data),
  /** DELETE /marketing/priority/{id}/whitelist/{wid} */
  whitelist1: (id: number | string, wid: number | string) =>
    del(`/marketing/priority/${id}/whitelist/${wid}`),
}

// ============================================================
// 订单管理
// ============================================================
export const orderApi = {
  /** GET /orders */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/orders`, params),
  /** GET /orders/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/orders/${id}`, params),
  /** GET /orders/abnormal/list */
  list2: (params?: Record<string, any>) =>
    get<any>(`/orders/abnormal/list`, params),
  /** GET /orders/export/data */
  data: (params?: Record<string, any>) =>
    get<any>(`/orders/export/data`, params),
  /** PUT /orders/{id}/cancel */
  cancel: (id: number | string, data?: Record<string, any>) =>
    put(`/orders/${id}/cancel`, data),
  /** PUT /orders/{id}/mark-paid */
  markPaid: (id: number | string, data?: Record<string, any>) =>
    put(`/orders/${id}/mark-paid`, data),
  /** POST /orders/{id}/refund */
  refund: (id: number | string, data?: Record<string, any>) =>
    post(`/orders/${id}/refund`, data),
  /** POST /orders/{id}/repair */
  repair: (id: number | string, data?: Record<string, any>) =>
    post(`/orders/${id}/repair`, data),
}

// ============================================================
// 权限管理
// ============================================================
export const permissionApi = {
  /** GET /permission/admins */
  admins: (params?: Record<string, any>) =>
    get<any>(`/permission/admins`, params),
  /** POST /permission/admins */
  admins1: (data?: Record<string, any>) =>
    post(`/permission/admins`, data),
  /** GET /permission/login-logs */
  loginLogs: (params?: Record<string, any>) =>
    get<any>(`/permission/login-logs`, params),
  /** GET /permission/operation-logs */
  operationLogs: (params?: Record<string, any>) =>
    get<any>(`/permission/operation-logs`, params),
  /** GET /permission/roles */
  roles: (params?: Record<string, any>) =>
    get<any>(`/permission/roles`, params),
  /** POST /permission/roles */
  roles1: (data?: Record<string, any>) =>
    post(`/permission/roles`, data),
  /** GET /permission/admins/{id} */
  admins2: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/permission/admins/${id}`, params),
  /** PUT /permission/admins/{id} */
  admins3: (id: number | string, data?: Record<string, any>) =>
    put(`/permission/admins/${id}`, data),
  /** DELETE /permission/admins/{id} */
  admins4: (id: number | string) =>
    del(`/permission/admins/${id}`),
  /** GET /permission/operation-logs/export */
  export: (params?: Record<string, any>) =>
    get<any>(`/permission/operation-logs/export`, params),
  /** GET /permission/operation-logs/{id} */
  operationLogs1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/permission/operation-logs/${id}`, params),
  /** GET /permission/permissions/tree */
  tree: (params?: Record<string, any>) =>
    get<any>(`/permission/permissions/tree`, params),
  /** PUT /permission/roles/{id} */
  roles2: (id: number | string, data?: Record<string, any>) =>
    put(`/permission/roles/${id}`, data),
  /** DELETE /permission/roles/{id} */
  roles3: (id: number | string) =>
    del(`/permission/roles/${id}`),
  /** PUT /permission/admins/{id}/reset-password */
  resetPassword: (id: number | string, data?: Record<string, any>) =>
    put(`/permission/admins/${id}/reset-password`, data),
  /** PUT /permission/roles/{id}/permissions */
  permissions: (id: number | string, data?: Record<string, any>) =>
    put(`/permission/roles/${id}/permissions`, data),
}

// ============================================================
// 平台管理
// ============================================================
export const platformApi = {
  /** POST /platform/backup */
  backup: (data?: Record<string, any>) =>
    post(`/platform/backup`, data),
  /** POST /platform/cleanup-execute */
  cleanupExecute: (data?: Record<string, any>) =>
    post(`/platform/cleanup-execute`, data),
  /** GET /platform/cleanup-logs */
  cleanupLogs: (params?: Record<string, any>) =>
    get<any>(`/platform/cleanup-logs`, params),
  /** POST /platform/cleanup-preview */
  cleanupPreview: (data?: Record<string, any>) =>
    post(`/platform/cleanup-preview`, data),
}

// ============================================================
// 退款管理
// ============================================================
export const refundApi = {
  /** GET /refunds */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/refunds`, params),
  /** GET /refunds/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/refunds/${id}`, params),
  /** PUT /refunds/{id}/approve */
  approve: (id: number | string, data?: Record<string, any>) =>
    put(`/refunds/${id}/approve`, data),
  /** PUT /refunds/{id}/reject */
  reject: (id: number | string, data?: Record<string, any>) =>
    put(`/refunds/${id}/reject`, data),
}

// ============================================================
// 报表
// ============================================================
export const reportApi = {
  /** GET /reports/blindboxes */
  blindboxes: (params?: Record<string, any>) =>
    get<any>(`/reports/blindboxes`, params),
  /** GET /reports/collectibles */
  collectibles: (params?: Record<string, any>) =>
    get<any>(`/reports/collectibles`, params),
  /** POST /reports/custom-export */
  customExport: (data?: Record<string, any>) =>
    post(`/reports/custom-export`, data),
  /** GET /reports/finance */
  finance: (params?: Record<string, any>) =>
    get<any>(`/reports/finance`, params),
  /** GET /reports/sales */
  sales: (params?: Record<string, any>) =>
    get<any>(`/reports/sales`, params),
  /** GET /reports/users */
  users: (params?: Record<string, any>) =>
    get<any>(`/reports/users`, params),
}

// ============================================================
// 奖励管理
// ============================================================
export const rewardApi = {
  /** GET /rewards */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/rewards`, params),
  /** POST /rewards */
  create: (data?: Record<string, any>) =>
    post(`/rewards`, data),
  /** GET /rewards/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/rewards/${id}`, params),
  /** PUT /rewards/{id} */
  update: (id: number | string, data?: Record<string, any>) =>
    put(`/rewards/${id}`, data),
}

// ============================================================
// 发售计划
// ============================================================
export const salePlanApi = {
  /** GET /sale-plans */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/sale-plans`, params),
  /** POST /sale-plans */
  create: (data?: Record<string, any>) =>
    post(`/sale-plans`, data),
  /** GET /sale-plans/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/sale-plans/${id}`, params),
  /** PUT /sale-plans/{id} */
  update: (id: number | string, data?: Record<string, any>) =>
    put(`/sale-plans/${id}`, data),
  /** DELETE /sale-plans/{id} */
  delete: (id: number | string) =>
    del(`/sale-plans/${id}`),
  /** PUT /sale-plans/{id}/publish */
  publish: (id: number | string, data?: Record<string, any>) =>
    put(`/sale-plans/${id}/publish`, data),
  /** PUT /sale-plans/{id}/unpublish */
  unpublish: (id: number | string, data?: Record<string, any>) =>
    put(`/sale-plans/${id}/unpublish`, data),
}

// ============================================================
// 安全管理
// ============================================================
export const securityApi = {
  /** GET /security/approvals */
  approvals: (params?: Record<string, any>) =>
    get<any>(`/security/approvals`, params),
  /** GET /security/blacklist */
  blacklist: (params?: Record<string, any>) =>
    get<any>(`/security/blacklist`, params),
  /** POST /security/blacklist */
  blacklist1: (data?: Record<string, any>) =>
    post(`/security/blacklist`, data),
  /** GET /security/events */
  events: (params?: Record<string, any>) =>
    get<any>(`/security/events`, params),
  /** GET /security/risk-alerts */
  riskAlerts: (params?: Record<string, any>) =>
    get<any>(`/security/risk-alerts`, params),
  /** GET /security/tx-locks */
  txLocks: (params?: Record<string, any>) =>
    get<any>(`/security/tx-locks`, params),
  /** GET /security/approvals/{id} */
  approvals1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/security/approvals/${id}`, params),
  /** DELETE /security/blacklist/{id} */
  blacklist2: (id: number | string) =>
    del(`/security/blacklist/${id}`),
  /** GET /security/events/{id} */
  events1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/security/events/${id}`, params),
  /** GET /security/risk-alerts/{id} */
  riskAlerts1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/security/risk-alerts/${id}`, params),
  /** PUT /security/approvals/{id}/approve */
  approve: (id: number | string, data?: Record<string, any>) =>
    put(`/security/approvals/${id}/approve`, data),
  /** PUT /security/approvals/{id}/reject */
  reject: (id: number | string, data?: Record<string, any>) =>
    put(`/security/approvals/${id}/reject`, data),
  /** PUT /security/events/{id}/handle */
  handle: (id: number | string, data?: Record<string, any>) =>
    put(`/security/events/${id}/handle`, data),
  /** PUT /security/risk-alerts/{id}/handle */
  handle1: (id: number | string, data?: Record<string, any>) =>
    put(`/security/risk-alerts/${id}/handle`, data),
  /** PUT /security/tx-locks/{id}/unlock */
  unlock: (id: number | string, data?: Record<string, any>) =>
    put(`/security/tx-locks/${id}/unlock`, data),
}

// ============================================================
// 库存预热
// ============================================================
export const stockApi = {
  /** POST /stock/warmup */
  warmup: (data?: Record<string, any>) =>
    post(`/stock/warmup`, data),
}

// ============================================================
// 系统配置
// ============================================================
export const systemApi = {
  /** GET /system/global */
  global: (params?: Record<string, any>) =>
    get<any>(`/system/global`, params),
  /** PUT /system/global */
  global1: (data?: Record<string, any>) =>
    put(`/system/global`, data),
  /** GET /system/oss */
  oss: (params?: Record<string, any>) =>
    get<any>(`/system/oss`, params),
  /** PUT /system/oss */
  oss1: (data?: Record<string, any>) =>
    put(`/system/oss`, data),
  /** GET /system/payment */
  payment: (params?: Record<string, any>) =>
    get<any>(`/system/payment`, params),
  /** PUT /system/payment */
  payment1: (data?: Record<string, any>) =>
    put(`/system/payment`, data),
  /** GET /system/security */
  security: (params?: Record<string, any>) =>
    get<any>(`/system/security`, params),
  /** PUT /system/security */
  security1: (data?: Record<string, any>) =>
    put(`/system/security`, data),
  /** GET /system/sms */
  sms: (params?: Record<string, any>) =>
    get<any>(`/system/sms`, params),
  /** PUT /system/sms */
  sms1: (data?: Record<string, any>) =>
    put(`/system/sms`, data),
}

// ============================================================
// 工单管理
// ============================================================
export const ticketApi = {
  /** GET /tickets */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/tickets`, params),
  /** GET /tickets/feedbacks */
  feedbacks: (params?: Record<string, any>) =>
    get<any>(`/tickets/feedbacks`, params),
  /** GET /tickets/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/tickets/${id}`, params),
  /** GET /tickets/feedbacks/{id} */
  feedbacks1: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/tickets/feedbacks/${id}`, params),
  /** PUT /tickets/{id}/assign */
  assign: (id: number | string, data?: Record<string, any>) =>
    put(`/tickets/${id}/assign`, data),
  /** PUT /tickets/{id}/close */
  close: (id: number | string, data?: Record<string, any>) =>
    put(`/tickets/${id}/close`, data),
  /** POST /tickets/{id}/compensate */
  compensate: (id: number | string, data?: Record<string, any>) =>
    post(`/tickets/${id}/compensate`, data),
  /** POST /tickets/{id}/reply */
  reply: (id: number | string, data?: Record<string, any>) =>
    post(`/tickets/${id}/reply`, data),
}

// ============================================================
// 转赠管理
// ============================================================
export const transferApi = {
  /** GET /transfers */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/transfers`, params),
  /** GET /transfers/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/transfers/${id}`, params),
  /** GET /transfers/abnormal/list */
  list2: (params?: Record<string, any>) =>
    get<any>(`/transfers/abnormal/list`, params),
  /** GET /transfers/stats/overview */
  overview: (params?: Record<string, any>) =>
    get<any>(`/transfers/stats/overview`, params),
  /** PUT /transfers/{id}/cancel */
  cancel: (id: number | string, data?: Record<string, any>) =>
    put(`/transfers/${id}/cancel`, data),
  /** PUT /transfers/{id}/revoke */
  revoke: (id: number | string, data?: Record<string, any>) =>
    put(`/transfers/${id}/revoke`, data),
}

// ============================================================
// 用户管理
// ============================================================
export const userApi = {
  /** GET /users */
  list: (params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/users`, params),
  /** GET /users/export */
  export: (params?: Record<string, any>) =>
    get<any>(`/users/export`, params),
  /** GET /users/{id} */
  list1: (id: number | string, params: PaginationQuery = {}) =>
    get<PaginatedData<any>>(`/users/${id}`, params),
  /** PUT /users/{id}/blacklist */
  blacklist: (id: number | string, data?: Record<string, any>) =>
    put(`/users/${id}/blacklist`, data),
  /** GET /users/{id}/blindboxes */
  blindboxes: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/users/${id}/blindboxes`, params),
  /** GET /users/{id}/collectibles */
  collectibles: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/users/${id}/collectibles`, params),
  /** PUT /users/{id}/force-logout */
  forceLogout: (id: number | string, data?: Record<string, any>) =>
    put(`/users/${id}/force-logout`, data),
  /** PUT /users/{id}/freeze */
  freeze: (id: number | string, data?: Record<string, any>) =>
    put(`/users/${id}/freeze`, data),
  /** GET /users/{id}/invites */
  invites: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/users/${id}/invites`, params),
  /** GET /users/{id}/priority-qualifications */
  priorityQualifications: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/users/${id}/priority-qualifications`, params),
  /** POST /users/{id}/recover-blindbox */
  recoverBlindbox: (id: number | string, data?: Record<string, any>) =>
    post(`/users/${id}/recover-blindbox`, data),
  /** POST /users/{id}/recover-collectible */
  recoverCollectible: (id: number | string, data?: Record<string, any>) =>
    post(`/users/${id}/recover-collectible`, data),
  /** PUT /users/{id}/reset-tx-password */
  resetTxPassword: (id: number | string, data?: Record<string, any>) =>
    put(`/users/${id}/reset-tx-password`, data),
  /** PUT /users/{id}/unfreeze */
  unfreeze: (id: number | string, data?: Record<string, any>) =>
    put(`/users/${id}/unfreeze`, data),
  /** GET /users/{id}/wallet */
  wallet: (id: number | string, params?: Record<string, any>) =>
    get<any>(`/users/${id}/wallet`, params),
}

// ============================================================
// 钱包管理
// ============================================================
export const walletApi = {
  /** GET /wallet/abnormal */
  abnormal: (params?: Record<string, any>) =>
    get<any>(`/wallet/abnormal`, params),
  /** POST /wallet/adjust */
  adjust: (data?: Record<string, any>) =>
    post(`/wallet/adjust`, data),
  /** GET /wallet/balance */
  balance: (params?: Record<string, any>) =>
    get<any>(`/wallet/balance`, params),
  /** GET /wallet/conservation */
  conservation: (params?: Record<string, any>) =>
    get<any>(`/wallet/conservation`, params),
  /** GET /wallet/fee-stats */
  feeStats: (params?: Record<string, any>) =>
    get<any>(`/wallet/fee-stats`, params),
  /** GET /wallet/frozen */
  frozen: (params?: Record<string, any>) =>
    get<any>(`/wallet/frozen`, params),
  /** GET /wallet/recharges */
  recharges: (params?: Record<string, any>) =>
    get<any>(`/wallet/recharges`, params),
  /** GET /wallet/transactions */
  transactions: (params?: Record<string, any>) =>
    get<any>(`/wallet/transactions`, params),
  /** PUT /wallet/recharge/{id}/audit */
  audit: (id: number | string, data?: Record<string, any>) =>
    put(`/wallet/recharge/${id}/audit`, data),
}
