// [管理后台模块] - 统一导出（Barrel Export）
// 汇总导出所有管理后台的模块、控制器、服务、守卫、策略、装饰器和 DTO，
// 便于外部模块统一引用：import { AdminModule, AdminAuthService, ... } from './admin';

// 模块
export { AdminModule } from './admin.module';

// 守卫
export { AdminJwtGuard } from './guards/admin-jwt.guard';

// 策略
export {
  AdminJwtStrategy,
  AdminJwtPayload,
  AuthenticatedAdmin,
} from './strategies/admin-jwt.strategy';

// 装饰器
export {
  AdminPublic,
  ADMIN_PUBLIC_KEY,
} from './decorators/admin-public.decorator';

// 控制器
export { AdminAuthController } from './controllers/admin-auth.controller';
export { AdminDashboardController } from './controllers/admin-dashboard.controller';
export { AdminUserController } from './controllers/admin-user.controller';
export { AdminCollectibleController } from './controllers/admin-collectible.controller';
export { AdminBlindBoxController } from './controllers/admin-blind-box.controller';
export { AdminOrderController } from './controllers/admin-order.controller';
export { AdminRefundController } from './controllers/admin-refund.controller';
export { AdminMarketController } from './controllers/admin-market.controller';
export { AdminTransferController } from './controllers/admin-transfer.controller';
export { AdminMarketingController } from './controllers/admin-marketing.controller';
export { AdminWalletController } from './controllers/admin-wallet.controller';
export { AdminCmsController } from './controllers/admin-cms.controller';
export { AdminSystemController } from './controllers/admin-system.controller';
export { AdminPermissionController } from './controllers/admin-permission.controller';
export { AdminSecurityController } from './controllers/admin-security.controller';
export { AdminTicketController } from './controllers/admin-ticket.controller';
export { AdminReportController } from './controllers/admin-report.controller';
export { AdminPlatformController } from './controllers/admin-platform.controller';
export { AdminRewardController } from './controllers/admin-reward.controller';
export { AdminChainController } from './controllers/admin-chain.controller';

// 服务
export { AdminAuthService } from './services/admin-auth.service';
export { AdminDashboardService } from './services/admin-dashboard.service';
export { AdminUserService } from './services/admin-user.service';
export { AdminCollectibleService } from './services/admin-collectible.service';
export { AdminBlindBoxService } from './services/admin-blind-box.service';
export { AdminOrderService } from './services/admin-order.service';
export { AdminRefundService } from './services/admin-refund.service';
export { AdminMarketService } from './services/admin-market.service';
export { AdminTransferService } from './services/admin-transfer.service';
export { AdminMarketingService } from './services/admin-marketing.service';
export { AdminWalletService } from './services/admin-wallet.service';
export { AdminCmsService } from './services/admin-cms.service';
export { AdminSystemService } from './services/admin-system.service';
export { AdminPermissionService } from './services/admin-permission.service';
export { AdminSecurityService } from './services/admin-security.service';
export { AdminTicketService } from './services/admin-ticket.service';
export { AdminReportService } from './services/admin-report.service';
export { AdminPlatformService } from './services/admin-platform.service';
export { AdminRewardService } from './services/admin-reward.service';
export { AdminChainService } from './services/admin-chain.service';

// DTO
export {
  AdminLoginDto,
  AdminChangePasswordDto,
  AdminRefreshTokenDto,
  Admin2faSetupDto,
  Admin2faVerifyDto,
  Admin2faLoginVerifyDto,
} from './dto/admin-auth.dto';
