// [公共] - 共享模块
// 全局模块（@Global），提供 'REDIS_SERVICE' token 及其他共享服务。
// 全局注册后，JwtAuthGuard（APP_GUARD）与各业务模块均可直接注入 'REDIS_SERVICE'。
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftSmsLog } from '../database/entities/nft-sms-log.entity';
import { NftCollectible } from '../database/entities/nft-collectible.entity';
import { NftLuckyDrawPrize } from '../database/entities/nft-lucky-draw-prize.entity';
import { NftSynthesisActivity } from '../database/entities/nft-synthesis-activity.entity';
import { RedisService } from './redis.service';
import { StockService } from './stock.service';
import { SmsService } from './sms.service';
import { UploadService } from './upload.service';
import { AlipayService } from './payment/alipay.service';
import { WechatService } from './payment/wechat.service';
import { TraceIdService } from './trace-id.service';
import { FeatureFlagService } from './feature-flag.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftSmsLog,
      NftCollectible,
      NftLuckyDrawPrize,
      NftSynthesisActivity,
    ]),
  ],
  providers: [
    // 以 token 'REDIS_SERVICE' 暴露 RedisService，兼容守卫中的 @Inject('REDIS_SERVICE')
    { provide: 'REDIS_SERVICE', useClass: RedisService },
    RedisService,
    StockService,
    SmsService,
    UploadService,
    AlipayService,
    WechatService,
    TraceIdService,
    FeatureFlagService,
  ],
  exports: [
    'REDIS_SERVICE',
    RedisService,
    StockService,
    SmsService,
    UploadService,
    AlipayService,
    WechatService,
    TraceIdService,
    FeatureFlagService,
  ],
})
export class SharedModule {}
