// [用户模块] - 用户模块定义
// 汇总：TypeORM 实体注册、JWT/Passport 配置、SharedModule(Redis)、控制器与服务注册。
// 对外以 'USER_SERVICE' token 暴露 UserService（供 TxPasswordGuard 注入）。
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SharedModule } from '../../shared/shared.module';
import { DEV_JWT_SECRET } from '../../config/dev-defaults';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftSmsLog } from '../../database/entities/nft-sms-log.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftInviteRecord } from '../../database/entities/nft-invite-record.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // 共享模块（@Global，提供 'REDIS_SERVICE' token）
    SharedModule,

    // Passport（JWT 策略由 JwtStrategy 提供者注册）
    PassportModule,

    // JWT 配置（从 .env 读取）
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          DEV_JWT_SECRET,
        expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
      }),
    }),

    // 用户模块涉及的实体
    TypeOrmModule.forFeature([
      NftUser,
      NftUserWallet,
      NftSmsLog,
      NftUserCollectible,
      NftInviteRecord,
      NftOperationLog,
      NftLuckyDrawActivity,
      NftLuckyDrawUserChance,
    ]),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // 以 'USER_SERVICE' token 暴露 UserService，供 TxPasswordGuard 注入
    { provide: 'USER_SERVICE', useExisting: UserService },
    JwtStrategy,
  ],
  exports: [UserService, 'USER_SERVICE'],
})
export class UserModule {}
