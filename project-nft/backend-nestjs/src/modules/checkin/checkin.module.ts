// [签到模块] - 签到模块定义
//
// forFeature 注册说明：
//  - NftCheckInRecord    -> 签到记录读写
//  - NftUser             -> 签到前校验用户存在且状态正常
//  - NftUserCollectible  -> 藏品奖励时生成用户藏品(source='airdrop')
//  - NftCollectible      -> 藏品奖励时检索奖励藏品并递增 serial_current/circulate
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftCheckInRecord } from '../../database/entities/nft-check-in-record.entity';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { CheckInController } from './checkin.controller';
import { CheckInService } from './checkin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftCheckInRecord,
      NftUser,
      NftUserCollectible,
      NftCollectible,
    ]),
  ],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService],
})
export class CheckInModule {}
