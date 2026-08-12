// [公共] - 共享模块
// 全局模块（@Global），提供 'REDIS_SERVICE' token 及其他共享服务。
// 全局注册后，JwtAuthGuard（APP_GUARD）与各业务模块均可直接注入 'REDIS_SERVICE'。
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftSmsLog } from '../database/entities/nft-sms-log.entity';
import { RedisService } from './redis.service';
import { SmsService } from './sms.service';
import { UploadService } from './upload.service';
import { AlipayService } from './payment/alipay.service';
import { WechatService } from './payment/wechat.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([NftSmsLog])],
  providers: [
    // 以 token 'REDIS_SERVICE' 暴露 RedisService，兼容守卫中的 @Inject('REDIS_SERVICE')
    { provide: 'REDIS_SERVICE', useClass: RedisService },
    RedisService,
    SmsService,
    UploadService,
    AlipayService,
    WechatService,
  ],
  exports: [
    'REDIS_SERVICE',
    RedisService,
    SmsService,
    UploadService,
    AlipayService,
    WechatService,
  ],
})
export class SharedModule {}
