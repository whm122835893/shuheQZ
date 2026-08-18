// [系统模块] - 系统模块定义
//
// forFeature 注册说明：
//  - NftAgreement    -> 1. GET /agreements/:code 合规文档查询
//  - NftSiteSetting  -> 3. GET /settings 网站全局配置查询
//  - NftFeedback     -> 4. POST /feedback 意见反馈写入
// UploadService 由全局 SharedModule 提供，无需在此导入
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftAgreement } from '../../database/entities/nft-agreement.entity';
import { NftSiteSetting } from '../../database/entities/nft-site-setting.entity';
import { NftFeedback } from '../../database/entities/nft-feedback.entity';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftAgreement,
      NftSiteSetting,
      NftFeedback,
    ]),
  ],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
