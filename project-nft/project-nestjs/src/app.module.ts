/**
 * 应用根模块
 *
 * 汇总内容：
 *  - 全局配置：ConfigModule（isGlobal: true）
 *  - 数据库：TypeOrmModule（forRootAsync，使用 databaseConfig 工厂 + ConfigService）
 *  - 定时任务：ScheduleModule
 *  - 限流：ThrottlerModule（60s 窗口内最多 100 次请求）
 *  - 全局共享模块：SharedModule（@Global，提供 Redis/SMS/Upload/Payment/TraceId 服务）
 *  - 全局 Provider（依赖注入方式注册）：
 *      APP_GUARD        → JwtAuthGuard          全局认证守卫
 *      APP_INTERCEPTOR  → LoggingInterceptor    全局请求日志拦截器（记录方法/路径/IP/耗时/状态码/traceId）
 *      APP_INTERCEPTOR  → TransformInterceptor  全局响应拦截器（注入 traceId + timestamp）
 *      APP_FILTER       → HttpExceptionFilter   全局异常过滤器（注入 traceId + timestamp）
 *  - 全局中间件：TraceIdMiddleware（请求级 traceId 注入，最先执行）
 *  - 业务模块：共 14 个
 */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TxPasswordGuard } from './common/guards/tx-password.guard';
import { ConcurrencyLimiterInterceptor } from './common/interceptors/concurrency-limiter.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import { FeatureFlagGuard } from './common/guards/feature-flag.guard';
import databaseConfig from './config/database.config';
import { SharedModule } from './shared/shared.module';
import { TraceIdService } from './shared/trace-id.service';
import { UserModule } from './modules/user/user.module';
import { CollectibleModule } from './modules/collectible/collectible.module';
import { MarketModule } from './modules/market/market.module';
import { BlindBoxModule } from './modules/blindbox/blindbox.module';
import { CheckInModule } from './modules/checkin/checkin.module';
import { SynthesisModule } from './modules/synthesis/synthesis.module';
import { LuckyDrawModule } from './modules/luckydraw/luckydraw.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PriorityModule } from './modules/priority/priority.module';
import { ArtifactModule } from './modules/artifact/artifact.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { AnnouncementModule } from './modules/announcement/announcement.module';
import { SystemModule } from './modules/system/system.module';
import { AddressModule } from './modules/address/address.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // 全局配置（环境变量）
    ConfigModule.forRoot({ isGlobal: true }),

    // 数据库（TypeORM）
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),

    // 定时任务
    ScheduleModule.forRoot(),

    // 限流：全局默认 10000 req/60s（高并发场景）
    // 细粒度限流通过 @Throttle 装饰器 + ConcurrencyLimiterInterceptor 实现
    // 测试环境可通过 THROTTLE_LIMIT 环境变量调高
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '10000', 10),
      },
    ]),

    // 全局共享模块（@Global，提供 REDIS_SERVICE / SMS / Upload / Payment / TraceId 服务）
    SharedModule,

    // ============================================================
    // 业务模块（共 14 个）
    // ------------------------------------------------------------
    UserModule,           // 用户模块（13 端点）
    CollectibleModule,    // 藏品模块（5 端点）
    MarketModule,         // 市场模块（6 端点）
    BlindBoxModule,       // 盲盒模块（3 端点）
    SynthesisModule,      // 合成模块（4 端点）
    CheckInModule,        // 签到模块（2 端点）
    LuckyDrawModule,      // 抽奖模块（5 端点）
    TransferModule,       // 转赠模块（5 端点）
    PaymentModule,        // 支付模块（5 端点）
    PriorityModule,       // 优先购模块（3 端点）
    ArtifactModule,       // 文物展馆（2 端点）
    WalletModule,         // 钱包模块（5 端点）
    AnnouncementModule,   // 公告新闻（3 端点）
    SystemModule,         // 系统模块（4 端点）
    AddressModule,        // 收货地址模块（5 端点）

    // ============================================================
    // 管理后台模块（独立 Admin API，前缀 /admin/api/v1/）
    // ------------------------------------------------------------
    AdminModule,          // 管理后台（209 端点，20 个子模块）
    HealthModule,         // 健康检查（/health, /health/ready, /health/live）
    // ============================================================
  ],
  providers: [
    // 全局认证守卫（需注入 Reflector + Redis 黑名单服务）
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 全局限流守卫（60s 窗口内最多 100 次请求，防止暴力破解和 DoS）
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // 全局交易密码守卫（仅对 @TxPassword() 标记的端点生效）
    { provide: APP_GUARD, useClass: TxPasswordGuard },
    // 全局 Feature Flag 守卫（仅对 @FeatureFlag() 标记的端点生效，默认不拦截）
    { provide: APP_GUARD, useClass: FeatureFlagGuard },
    // 全局请求日志拦截器（记录方法/路径/IP/耗时/状态码/traceId，慢请求告警）
    // 注册顺序在 TransformInterceptor 之前，确保最先执行、最后完成，能准确统计整条链路耗时
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    // 全局并发限制拦截器（Redis 信号量，防止 DB 连接池耗尽，10K+ 并发核心防护）
    { provide: APP_INTERCEPTOR, useClass: ConcurrencyLimiterInterceptor },
    // 全局请求超时拦截器（默认 30s，可通过 @Timeout(ms) 或 REQUEST_TIMEOUT_MS 配置）
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    // 全局响应拦截器（将返回值包装为统一 BaseResponseVo，注入 traceId + timestamp）
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    // 全局异常过滤器（捕获异常并返回统一错误结构，注入 traceId + timestamp）
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  constructor(private readonly traceIdService: TraceIdService) {}

  /**
   * 全局中间件配置
   * TraceIdMiddleware 最先执行，为每个请求注入 traceId 到 AsyncLocalStorage
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
