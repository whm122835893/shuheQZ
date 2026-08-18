/**
 * 前端 API 类型定义
 *
 * 所有接口字段均严格对应后端实体定义和控制器返回结构。
 * - 实体字段：camelCase，与 TypeORM 实体一致
 * - 分页结构：{ list: T[]; total: number; page: number; pageSize: number }
 * - 时间字段：后端返回 ISO string，前端统一用 string
 */

// ============================================================
// 分页查询参数
// ============================================================
export interface PaginationQuery {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
  startDate?: string
  endDate?: string
}

// ============================================================
// 订单模块
// ============================================================

/** 订单实体（nft_orders） */
export interface Order {
  id: number
  orderNo: string
  userId: number
  collectibleId: number
  resaleListingId: number | null
  prioritySaleId: number | null
  unitPrice: number
  quantity: number
  totalPrice: number
  status: number
  source: string
  paidAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  cancelReason: string | null
  expiresAt: string
  version: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 订单列表项（含 join 的 user / collectible） */
export interface OrderListItem extends Order {
  user: {
    id: number
    username: string | null
    nickname: string | null
    phone: string | null
    avatar: string | null
  } | null
  collectible: {
    id: number
    name: string
    image: string | null
    price: string
  } | null
}

/** 订单详情（含关联的 payment / user / collectible） */
export interface OrderDetail extends Order {
  payment: Payment | null
  user: {
    id: number
    username: string | null
    nickname: string | null
    phone: string | null
    avatar: string | null
  } | null
  collectible: {
    id: number
    name: string
    image: string | null
    price: string
  } | null
}

/** 支付记录（nft_payments） */
export interface Payment {
  id: number
  orderId: number
  paymentNo: string
  channel: string
  amount: number
  status: number
  tradeNo: string | null
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// 盲盒模块
// ============================================================

/** 盲盒实体（nft_blind_boxes） */
export interface BlindBox {
  id: number
  collectibleId: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 盲盒列表项（含 join 的 collectible） */
export interface BlindBoxListItem extends BlindBox {
  collectible: Collectible | null
}

/** 盲盒项（nft_blind_box_items） */
export interface BlindBoxItem {
  id: number
  blindBoxId: number
  collectibleId: number
  probability: number
  quantityLimit: number | null
  quantityDistributed: number
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 盲盒详情（含 collectible 和 items 子数组） */
export interface BlindBoxDetail extends BlindBox {
  collectible: Collectible | null
  items: BlindBoxItem[]
}

/** 盲盒开盒记录（nft_blind_box_open_records） */
export interface BlindBoxOpenRecord {
  id: number
  userId: number
  blindBoxId: number
  consumedUserCollectibleId: number
  blindBoxItemId: number
  prizeUserCollectibleId: number
  isDelete: number
  createdAt: string
}

// ============================================================
// 藏品模块
// ============================================================

/** 藏品实体（已在 index.ts 中定义，此处重新导出） */
export interface Collectible {
  id: string
  name: string
  subtitle: string | null
  image: string | null
  price: string
  edition: number
  circulate: number
  sold: number
  status: number
  issuer: string | null
  creator: string | null
  brand: string | null
  contractAddress: string | null
  chainType: string | null
  tokenStandard: string | null
  isOnChain: number
  isRelease: number
  featured: number
  isTransferable: number
  description: string | null
  createdAt: string
  updatedAt: string
}

/** 库存配额（nft_inventory_quotas） */
export interface InventoryQuota {
  id: number
  collectibleId: number
  totalQuota: number
  soldCount: number
  reservedCount: number
  maxPerUser: number
  createdAt: string
  updatedAt: string
}

/** 空投记录（nft_airdrop_records） */
export interface AirdropRecord {
  id: number
  collectibleId: number
  userId: number
  quantity: number
  batchNo: string | null
  adminId: number | null
  isDelete: number
  createdAt: string
}

/** 销毁记录（nft_destroy_records） */
export interface DestroyRecord {
  id: number
  collectibleId: number
  userCollectibleId: number
  quantity: number
  reason: string | null
  adminId: number | null
  createdAt: string
}

// ============================================================
// 市场管理（寄售）
// ============================================================

/** 寄售列表（nft_resale_listings） */
export interface ResaleListing {
  id: number
  sellerId: number
  collectibleId: number
  userCollectibleId: number
  price: number
  status: number
  listedAt: string
  version: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 寄售列表项（含 join 的 seller/collectible） */
export interface ResaleListingListItem extends ResaleListing {
  seller: {
    id: number
    username: string | null
    nickname: string | null
    phone: string | null
    avatar: string | null
  } | null
  collectible: {
    id: number
    name: string
    image: string | null
  } | null
}

/** 市场交易记录 */
export interface MarketTrade {
  id: number
  orderId: number
  collectibleId: number
  sellerId: number | null
  buyerId: number
  price: number
  quantity: number
  tradeType: string
  createdAt: string
}

// ============================================================
// 转赠管理
// ============================================================

/** 转赠记录（nft_transfers） */
export interface Transfer {
  id: number
  fromUserId: number
  toUserId: number
  toPhone: string
  toNickname: string | null
  collectibleId: number
  userCollectibleId: number
  status: number
  confirmedAt: string | null
  isDelete: number
  createdAt: string
  updatedAt: string
}

// ============================================================
// 营销模块
// ============================================================

/** 优先购活动（nft_priority_sales） */
export interface PrioritySale {
  id: number
  collectibleId: number
  name: string
  startTime: string
  endTime: string
  status: number
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 优先购白名单（nft_priority_sale_whitelists） */
export interface PriorityWhitelist {
  id: number
  prioritySaleId: number
  userId: number
  maxQuantity: number
  usedQuantity: number
  status: number
  version: number
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 优先购白名单列表项（含手动附加的 user） */
export interface PriorityWhitelistItem extends PriorityWhitelist {
  user: {
    id: number
    username: string | null
    phone: string | null
    uid: string | null
  } | null
}

/** 邀请活动（nft_invite_activities） */
export interface InviteActivity {
  id: number
  name: string
  status: number
  startTime: string | null
  endTime: string | null
  inviterCollectibleId: number | null
  inviteeCollectibleId: number | null
  airdropMode: string
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 抽奖活动（nft_lucky_draw_activities） */
export interface LuckyDrawActivity {
  id: number
  name: string
  status: number
  drawLimitPerUser: number
  registerGrant: number
  inviteGrant: number
  startTime: string | null
  endTime: string | null
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 合成活动（nft_synthesis_activities） */
export interface SynthesisActivity {
  id: number
  name: string
  resultCollectibleId: number
  type: string
  totalLimit: number | null
  usedCount: number
  perUserLimit: number
  startTime: string | null
  endTime: string | null
  status: number
  description: string | null
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 空投活动（nft_airdrop_activities） */
export interface AirdropActivity {
  id: number
  name: string
  type: string
  status: number
  airdropMode: string
  collectibleId: number
  quantityPerUser: number
  totalLimit: number | null
  issuedCount: number
  startTime: string | null
  endTime: string | null
  snapshotAt: string | null
  snapshotCollectibleId: number | null
  checkinDays: number | null
  conditionConfig: Record<string, unknown> | null
  description: string | null
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 签到/注册奖励配置项 */
export interface RewardConfigItem {
  id: number
  configKey: string
  configValue: string
  configDesc: string
}

// ============================================================
// 钱包管理
// ============================================================

/** 钱包流水（nft_wallet_transactions） */
export interface WalletTransaction {
  id: number
  userId: number
  type: string
  amount: number
  balanceAfter: number
  direction: string
  relatedOrderNo: string | null
  remark: string | null
  createdAt: string
}

// ============================================================
// 内容管理
// ============================================================

/** 公告（nft_announcements） */
export interface Announcement {
  id: number
  title: string
  summary: string | null
  content: string | null
  coverImage: string | null
  type: string
  subtype: string | null
  tagColor: string | null
  isTop: number
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 轮播图（nft_banners） */
export interface Banner {
  id: number
  title: string
  image: string
  linkType: string | null
  linkUrl: string | null
  sortOrder: number
  status: number
  isDelete: number
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// 权限管理
// ============================================================

/** 管理员（nft_admin_users，不含 password） */
export interface AdminUser {
  id: number
  username: string
  realName: string
  role: number
  status: number
  lastLoginAt: string | null
  lastLoginIp: string | null
  loginCount: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 管理员列表项（可能含 password，前端不应使用该字段） */
export interface AdminUserListItem extends AdminUser {
  password?: string
}

/** 角色（nft_admin_roles，含附加统计字段） */
export interface AdminRole {
  id: number
  code: string
  name: string
  description: string | null
  status: number
  sort: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 角色列表项（含附加 adminCount / permissionCount） */
export interface AdminRoleListItem extends AdminRole {
  adminCount: number
  permissionCount: number
}

/** 权限树节点 */
export interface PermissionTreeNode {
  id: number
  code: string
  name: string
  description: string | null
  parentId: number | null
  status: number
  sort: number
  children: PermissionTreeNode[]
}

/** 操作日志（nft_operation_logs） */
export interface OperationLog {
  id: number
  adminId: number
  adminName: string | null
  action: string
  targetTable: string | null
  targetId: number | null
  detail: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  isDelete: number
  createdAt: string
}

/** 登录日志（nft_audit_logs） */
export interface AuditLog {
  id: number
  adminId: number
  adminName: string | null
  action: string
  ip: string | null
  userAgent: string | null
  status: number
  detail: Record<string, unknown> | null
  createdAt: string
}

// ============================================================
// 安全管理
// ============================================================

/** 黑名单（nft_blacklist） */
export interface Blacklist {
  id: number
  type: number
  target: string
  reason: string | null
  adminId: number | null
  expiredAt: string | null
  status: number
  createdAt: string
  updatedAt: string
}

/** 风险预警（nft_risk_alerts） */
export interface RiskAlert {
  id: number
  level: number
  type: string
  userId: number | null
  description: string
  detail: Record<string, unknown> | null
  status: number
  handlerId: number | null
  handleRemark: string | null
  createdAt: string
  updatedAt: string
}

/** 安全事件（nft_security_events） */
export interface SecurityEvent {
  id: number
  type: string
  userId: number | null
  adminId: number | null
  ip: string | null
  userAgent: string | null
  detail: Record<string, unknown> | null
  status: number
  createdAt: string
}

/** 审批记录（nft_approvals） */
export interface Approval {
  id: number
  type: string
  targetType: string
  targetId: number
  applicantId: number
  applicantName: string | null
  status: number
  handlerId: number | null
  handlerName: string | null
  handleRemark: string | null
  detail: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// 工单管理
// ============================================================

/** 工单（nft_support_tickets） */
export interface SupportTicket {
  id: number
  ticketNo: string
  userId: number
  category: string
  title: string
  content: string
  priority: number
  status: number
  assigneeId: number | null
  resolvedAt: string | null
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 用户反馈（nft_feedbacks） */
export interface Feedback {
  id: number
  userId: number
  type: string
  content: string
  images: string[] | null
  contact: string | null
  ticketId: string
  status: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

// ============================================================
// 退款管理
// ============================================================

/** 退款记录（nft_refunds） */
export interface Refund {
  id: number
  orderId: number
  paymentId: number | null
  userId: number
  refundNo: string
  amount: number
  reason: string
  adminId: number | null
  status: number
  channel: string | null
  tradeNo: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// 奖励管理
// ============================================================

/** 活动奖励记录（nft_activity_rewards） */
export interface ActivityReward {
  id: number
  activityType: string
  activityId: number | null
  userId: number
  rewardType: string
  rewardId: number | null
  rewardName: string
  quantity: number
  status: number
  adminId: number | null
  createdAt: string
}

// ============================================================
// 链上管理
// ============================================================

/** 链渠道（nft_chain_channels） */
export interface ChainChannel {
  id: number
  code: string
  name: string
  chainType: string
  rpcUrl: string
  explorerUrl: string | null
  contractAddress: string | null
  walletAddress: string | null
  config: Record<string, unknown> | null
  status: number
  isDelete: number
  createdAt: string
  updatedAt: string
}

/** 上链任务（nft_onchain_tasks） */
export interface OnchainTask {
  id: number
  collectibleId: number
  userCollectibleId: number | null
  channelId: number | null
  taskType: string
  targetType: string | null
  targetId: number | null
  payload: Record<string, unknown> | null
  status: number
  txHash: string | null
  blockNumber: number | null
  tokenId: string | null
  retryCount: number
  maxRetry: number
  errorMessage: string | null
  operatorId: number | null
  executedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// 平台管理
// ============================================================

/** 平台清理日志（nft_platform_cleanup_logs） */
export interface PlatformCleanupLog {
  id: number
  targetTable: string
  targetIds: number[] | null
  adminId: number
  adminName: string
  reason: string
  affectedCount: number
  createdAt: string
}

// ============================================================
// 通用操作结果
// ============================================================

/** 删除/操作结果 */
export interface OperationResult {
  deleted?: boolean
  success?: boolean
  message?: string
}

/** 导入结果 */
export interface ImportResult {
  imported: number
}

/** 执行结果 */
export interface ExecuteResult {
  executed: number
}
