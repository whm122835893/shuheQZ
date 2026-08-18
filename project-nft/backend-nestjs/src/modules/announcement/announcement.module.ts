// [公告新闻模块] - 公告新闻模块定义
//
// forFeature 注册说明：
//  - NftAnnouncement -> 公告/新闻列表与详情查询
//  - NftBanner       -> 首页轮播图查询
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftAnnouncement } from '../../database/entities/nft-announcement.entity';
import { NftBanner } from '../../database/entities/nft-banner.entity';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';

@Module({
  imports: [TypeOrmModule.forFeature([NftAnnouncement, NftBanner])],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
