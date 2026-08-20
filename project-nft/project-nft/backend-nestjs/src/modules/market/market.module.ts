// [市场模块] - 市场模块定义
//
// forFeature 注册说明：
//  - 基础实体(任务规格)：NftResaleListing, NftUserCollectible, NftCollectible, NftOrder, NftOperationLog
//  - 额外实体(服务逻辑必需)：
//      NftPayment             -> buyFromMarket / buyFromRelease 需创建待支付支付记录
//      NftPrioritySale        -> buyFromRelease 优先购时间窗口校验
//      NftPrioritySaleWhitelist -> buyFromRelease 优先购白名单资格 + 限购校验
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftResaleListing } from '../../database/entities/nft-resale-listing.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftPrioritySale } from '../../database/entities/nft-priority-sale.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftResaleListing,
      NftUserCollectible,
      NftCollectible,
      NftOrder,
      NftOperationLog,
      // 服务逻辑必需的额外实体
      NftPayment,
      NftPrioritySale,
      NftPrioritySaleWhitelist,
    ]),
  ],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
