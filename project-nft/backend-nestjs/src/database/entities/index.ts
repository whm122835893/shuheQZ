// [数据库实体] - 统一导出所有 TypeORM Entity
// 供 TypeORM 自动加载及各模块引用
// 共 41 个 Entity（40 张 SQL 表 + 1 张 API 文档补充表 nft_lucky_draw_user_chances）

// 用户模块
export * from './nft-user.entity';

// 藏品分类模块
export * from './nft-category.entity';

// 藏品模块
export * from './nft-collectible.entity';

// 用户藏品模块
export * from './nft-user-collectible.entity';

// 盲盒模块
export * from './nft-blind-box.entity';
export * from './nft-blind-box-item.entity';
export * from './nft-blind-box-open-record.entity';

// 订单模块
export * from './nft-order.entity';

// 支付模块
export * from './nft-payment.entity';

// 寄售模块
export * from './nft-resale-listing.entity';

// 转赠模块
export * from './nft-transfer.entity';

// 合成模块
export * from './nft-synthesis-activity.entity';
export * from './nft-synthesis-material.entity';
export * from './nft-synthesis-record.entity';
export * from './nft-synthesis-record-item.entity';

// 抽奖模块
export * from './nft-lucky-draw-activity.entity';
export * from './nft-lucky-draw-prize.entity';
export * from './nft-lucky-draw-record.entity';
export * from './nft-lucky-draw-user-chance.entity';

// 签到模块
export * from './nft-check-in-record.entity';

// 文物模块
export * from './nft-artifact.entity';

// 公告模块
export * from './nft-announcement.entity';

// 轮播图模块
export * from './nft-banner.entity';

// 用户关注模块
export * from './nft-user-favorite.entity';

// 收货地址模块
export * from './nft-user-address.entity';

// 系统配置模块
export * from './nft-system-config.entity';

// 空投模块
export * from './nft-airdrop-activity.entity';
export * from './nft-airdrop-snapshot.entity';
export * from './nft-airdrop-record.entity';
export * from './nft-airdrop-eligibility.entity';

// 邀请模块
export * from './nft-invite-activity.entity';
export * from './nft-invite-record.entity';

// 网站配置模块
export * from './nft-site-setting.entity';

// 审计日志模块
export * from './nft-audit-log.entity';

// 钱包模块
export * from './nft-user-wallet.entity';
export * from './nft-wallet-transaction.entity';

// 短信模块
export * from './nft-sms-log.entity';

// 合规文档模块
export * from './nft-agreement.entity';

// 管理员模块
export * from './nft-admin-user.entity';

// 操作审计模块
export * from './nft-operation-log.entity';

// 优先购模块
export * from './nft-priority-sale.entity';
export * from './nft-priority-sale-whitelist.entity';

// 发售计划模块
export * from './nft-sale-plan.entity';

// 意见反馈模块
export * from './nft-feedback.entity';

// ============================================================
// 管理后台扩展实体（18 个新增）
// ------------------------------------------------------------

// 管理员角色 / 权限
export * from './nft-admin-role.entity';
export * from './nft-admin-permission.entity';
export * from './nft-admin-role-permission.entity';

// 资格配置 / 白名单 / 库存配额
export * from './nft-qualification-config.entity';
export * from './nft-qualification-whitelist.entity';
export * from './nft-inventory-quota.entity';

// 销毁 / 退款 / 审批
export * from './nft-destroy-record.entity';
export * from './nft-refund.entity';
export * from './nft-approval.entity';

// 安全：黑名单 / 风险预警 / 安全事件
export * from './nft-blacklist.entity';
export * from './nft-risk-alert.entity';
export * from './nft-security-event.entity';

// 工单 / 回复
export * from './nft-support-ticket.entity';
export * from './nft-ticket-reply.entity';

// 平台清理 / 活动奖励
export * from './nft-platform-cleanup-log.entity';
export * from './nft-activity-reward.entity';

// 链渠道 / 上链任务
export * from './nft-chain-channel.entity';
export * from './nft-onchain-task.entity';
