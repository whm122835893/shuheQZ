// [抽奖模块] - 抽奖模块定义
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawPrize } from '../../database/entities/nft-lucky-draw-prize.entity';
import { NftLuckyDrawRecord } from '../../database/entities/nft-lucky-draw-record.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { LuckyDrawController } from './luckydraw.controller';
import { LuckyDrawService } from './luckydraw.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftLuckyDrawActivity,
      NftLuckyDrawPrize,
      NftLuckyDrawRecord,
      NftLuckyDrawUserChance,
      NftCollectible,
      NftUserCollectible,
      NftOperationLog,
    ]),
  ],
  controllers: [LuckyDrawController],
  providers: [LuckyDrawService],
  exports: [LuckyDrawService],
})
export class LuckyDrawModule {}
