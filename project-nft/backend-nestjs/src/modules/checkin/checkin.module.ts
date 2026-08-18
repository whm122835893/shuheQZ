// [签到模块] - 签到模块定义
//
// forFeature 注册说明：
//  - NftCheckInRecord         -> 签到记录读写
//  - NftUser                  -> 签到前校验用户存在且状态正常
//  - NftUserCollectible        -> 藏品奖励时生成用户藏品(source='airdrop')
//  - NftCollectible            -> 藏品奖励时检索奖励藏品并递增 serial_current/circulate
//  - NftUserWallet             -> 积分奖励时更新钱包余额（乐观锁）
//  - NftWalletTransaction      -> 积分奖励时写入钱包流水
//  - NftLuckyDrawActivity      -> 抽奖机会奖励时查询进行中的活动
//  - NftLuckyDrawUserChance    -> 抽奖机会奖励时写入/更新用户次数
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftCheckInRecord } from '../../database/entities/nft-check-in-record.entity';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';
import { CheckInController } from './checkin.controller';
import { CheckInService } from './checkin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftCheckInRecord,
      NftUser,
      NftUserCollectible,
      NftCollectible,
      NftUserWallet,
      NftWalletTransaction,
      NftLuckyDrawActivity,
      NftLuckyDrawUserChance,
    ]),
  ],
  controllers: [CheckInController],
  providers: [CheckInService],
  exports: [CheckInService],
})
export class CheckInModule {}
