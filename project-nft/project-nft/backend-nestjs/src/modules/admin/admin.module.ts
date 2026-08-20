// [管理后台模块] - 管理后台根模块
//
// 汇总内容：
//  - TypeORM 实体注册（56 个实体：18 个新增管理后台实体 + 38 个已有业务实体）
//  - JWT 配置（独立密钥 JWT_ADMIN_SECRET，有效期 8h）
//  - Passport（admin-jwt 策略）
//  - SharedModule（@Global，提供 Redis 服务）
//  - 控制器：20 个管理后台控制器
//  - 服务：20 个管理后台服务 + AdminJwtStrategy
//  - 导出：AdminAuthService（供其他模块或全局守卫注入）
//
// 守卫协作说明：
//  - 全局 JwtAuthGuard 使用 @Public() 跳过（IS_PUBLIC_KEY）
//  - AdminJwtGuard 使用 @AdminPublic() 跳过（ADMIN_PUBLIC_KEY）
//  - 管理后台所有端点标记 @Public() 以跳过全局用户端守卫
//  - AdminJwtGuard 在控制器级通过 @UseGuards() 应用
//  - 登录/刷新端点额外标记 @AdminPublic() 以跳过 AdminJwtGuard
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '../../shared/shared.module';
import { DEV_JWT_ADMIN_SECRETS } from '../../config/dev-defaults';

// 实体导入（56 个：18 个新增 + 38 个已有）
import {
  // 管理员相关（4 个新增 + NftAdminUser）
  NftAdminUser,
  NftAdminRole,
  NftAdminPermission,
  NftAdminRolePermission,
  // 藏品 / 用户 / 订单 / 支付
  NftCollectible,
  NftUser,
  NftUserCollectible,
  NftOrder,
  NftPayment,
  // 寄售 / 盲盒 / 转赠
  NftResaleListing,
  NftBlindBox,
  NftBlindBoxItem,
  NftTransfer,
  // 签到 / 抽奖 / 合成
  NftCheckInRecord,
  NftLuckyDrawActivity,
  NftLuckyDrawPrize,
  NftLuckyDrawRecord,
  NftLuckyDrawUserChance,
  NftSynthesisActivity,
  NftSynthesisMaterial,
  NftSynthesisRecord,
  // 空投 / 邀请
  NftAirdropActivity,
  NftAirdropRecord,
  NftInviteActivity,
  NftInviteRecord,
  // 钱包 / 内容
  NftUserWallet,
  NftWalletTransaction,
  NftAnnouncement,
  NftBanner,
  // 系统 / 合规
  NftSystemConfig,
  NftAgreement,
  NftArtifact,
  NftCategory,
  NftFeedback,
  // 审计 / 日志 / 短信
  NftAuditLog,
  NftOperationLog,
  NftSmsLog,
  // 用户地址 / 收藏 / 优先购
  NftUserAddress,
  NftUserFavorite,
  NftPrioritySale,
  NftPrioritySaleWhitelist,
  NftBlindBoxOpenRecord,
  // 资格 / 配额（3 个新增）
  NftQualificationConfig,
  NftQualificationWhitelist,
  NftInventoryQuota,
  // 销毁 / 退款 / 审批（3 个新增）
  NftDestroyRecord,
  NftRefund,
  NftApproval,
  // 安全（3 个新增）
  NftBlacklist,
  NftRiskAlert,
  NftSecurityEvent,
  // 工单（2 个新增）
  NftSupportTicket,
  NftTicketReply,
  // 平台清理 / 奖励（2 个新增）
  NftPlatformCleanupLog,
  NftActivityReward,
  // 链渠道 / 上链任务（2 个新增）
  NftChainChannel,
  NftOnchainTask,
} from '../../database/entities';

// 控制器导入
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { AdminCollectibleController } from './controllers/admin-collectible.controller';
import { AdminBlindBoxController } from './controllers/admin-blind-box.controller';
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminRefundController } from './controllers/admin-refund.controller';
import { AdminMarketController } from './controllers/admin-market.controller';
import { AdminTransferController } from './controllers/admin-transfer.controller';
import { AdminMarketingController } from './controllers/admin-marketing.controller';
import { AdminWalletController } from './controllers/admin-wallet.controller';
import { AdminCmsController } from './controllers/admin-cms.controller';
import { AdminSystemController } from './controllers/admin-system.controller';
import { AdminPermissionController } from './controllers/admin-permission.controller';
import { AdminSecurityController } from './controllers/admin-security.controller';
import { AdminTicketController } from './controllers/admin-ticket.controller';
import { AdminReportController } from './controllers/admin-report.controller';
import { AdminPlatformController } from './controllers/admin-platform.controller';
import { AdminRewardController } from './controllers/admin-reward.controller';
import { AdminChainController } from './controllers/admin-chain.controller';
import { AdminStockController } from './controllers/admin-stock.controller';
import { AdminFeatureFlagController } from './controllers/admin-feature-flag.controller';

// 服务导入
import { AdminAuthService } from './services/admin-auth.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUserService } from './services/admin-user.service';
import { AdminCollectibleService } from './services/admin-collectible.service';
import { AdminBlindBoxService } from './services/admin-blind-box.service';
import { AdminOrderService } from './services/admin-order.service';
import { AdminRefundService } from './services/admin-refund.service';
import { AdminMarketService } from './services/admin-market.service';
import { AdminTransferService } from './services/admin-transfer.service';
import { AdminMarketingService } from './services/admin-marketing.service';
import { AdminWalletService } from './services/admin-wallet.service';
import { AdminCmsService } from './services/admin-cms.service';
import { AdminSystemService } from './services/admin-system.service';
import { AdminPermissionService } from './services/admin-permission.service';
import { AdminSecurityService } from './services/admin-security.service';
import { AdminTicketService } from './services/admin-ticket.service';
import { AdminReportService } from './services/admin-report.service';
import { AdminPlatformService } from './services/admin-platform.service';
import { AdminRewardService } from './services/admin-reward.service';
import { AdminChainService } from './services/admin-chain.service';

// 策略导入
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

@Module({
  imports: [
    // 共享模块（@Global，提供 'REDIS_SERVICE' token）
    SharedModule,

    // 定时任务：ScheduleModule.forRoot() 已在 app.module.ts 全局注册，
    // 此处无需重复引入（重复 forRoot() 会创建重复的调度器实例）。
    // AdminChainService 中的 @Cron 装饰器依赖该全局调度器即可生效。

    // Passport（admin-jwt 策略由 AdminJwtStrategy 提供者注册）
    PassportModule,

    // JWT 配置（独立管理员密钥，有效期 8h）
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: (() => {
          const secret = config.get<string>('JWT_ADMIN_SECRET');
          if (!secret) {
            if (process.env.NODE_ENV === 'production') {
              throw new Error(
                '[JWT-Admin] 生产环境必须配置 JWT_ADMIN_SECRET 环境变量',
              );
            }
            return DEV_JWT_ADMIN_SECRETS[0];
          }
          return secret;
        })(),
        signOptions: { expiresIn: '8h' },
      }),
    }),

    // 管理后台涉及的全部实体（56 个）
    TypeOrmModule.forFeature([
      // 管理员 / 角色 / 权限
      NftAdminUser,
      NftAdminRole,
      NftAdminPermission,
      NftAdminRolePermission,
      // 藏品 / 用户 / 订单 / 支付
      NftCollectible,
      NftUser,
      NftUserCollectible,
      NftOrder,
      NftPayment,
      // 寄售 / 盲盒 / 转赠
      NftResaleListing,
      NftBlindBox,
      NftBlindBoxItem,
      NftTransfer,
      // 签到 / 抽奖 / 合成
      NftCheckInRecord,
      NftLuckyDrawActivity,
      NftLuckyDrawPrize,
      NftLuckyDrawRecord,
      NftLuckyDrawUserChance,
      NftSynthesisActivity,
      NftSynthesisMaterial,
      NftSynthesisRecord,
      // 空投 / 邀请
      NftAirdropActivity,
      NftAirdropRecord,
      NftInviteActivity,
      NftInviteRecord,
      // 钱包 / 内容管理
      NftUserWallet,
      NftWalletTransaction,
      NftAnnouncement,
      NftBanner,
      // 系统 / 合规 / 文物 / 分类 / 反馈
      NftSystemConfig,
      NftAgreement,
      NftArtifact,
      NftCategory,
      NftFeedback,
      // 审计 / 操作日志 / 短信
      NftAuditLog,
      NftOperationLog,
      NftSmsLog,
      // 用户地址 / 收藏 / 优先购
      NftUserAddress,
      NftUserFavorite,
      NftPrioritySale,
      NftPrioritySaleWhitelist,
      NftBlindBoxOpenRecord,
      // 资格配置 / 白名单 / 库存配额
      NftQualificationConfig,
      NftQualificationWhitelist,
      NftInventoryQuota,
      // 销毁 / 退款 / 审批
      NftDestroyRecord,
      NftRefund,
      NftApproval,
      // 安全：黑名单 / 风险预警 / 安全事件
      NftBlacklist,
      NftRiskAlert,
      NftSecurityEvent,
      // 工单 / 回复
      NftSupportTicket,
      NftTicketReply,
      // 平台清理 / 活动奖励
      NftPlatformCleanupLog,
      NftActivityReward,
      // 链渠道 / 上链任务
      NftChainChannel,
      NftOnchainTask,
    ]),
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUserController,
    AdminCollectibleController,
    AdminBlindBoxController,
    AdminOrderController,
    AdminRefundController,
    AdminMarketController,
    AdminTransferController,
    AdminMarketingController,
    AdminWalletController,
    AdminCmsController,
    AdminSystemController,
    AdminPermissionController,
    AdminSecurityController,
    AdminTicketController,
    AdminReportController,
    AdminPlatformController,
    AdminRewardController,
    AdminChainController,
    AdminStockController,
    AdminFeatureFlagController,
  ],
  providers: [
    AdminAuthService,
    AdminDashboardService,
    AdminUserService,
    AdminCollectibleService,
    AdminBlindBoxService,
    AdminOrderService,
    AdminRefundService,
    AdminMarketService,
    AdminTransferService,
    AdminMarketingService,
    AdminWalletService,
    AdminCmsService,
    AdminSystemService,
    AdminPermissionService,
    AdminSecurityService,
    AdminTicketService,
    AdminReportService,
    AdminPlatformService,
    AdminRewardService,
    AdminChainService,
    AdminJwtStrategy,
  ],
  exports: [AdminAuthService],
})
export class AdminModule {}
