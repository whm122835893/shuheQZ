// [优先购模块] - 优先购模块定义
//
// forFeature 注册说明：
//  - 基础实体：NftPrioritySale, NftPrioritySaleWhitelist, NftCollectible
//  - 订单/支付实体(下单必需)：NftOrder, NftPayment
//  - 审计日志实体：NftOperationLog
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftPrioritySale } from '../../database/entities/nft-priority-sale.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { PriorityController } from './priority.controller';
import { PriorityService } from './priority.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftPrioritySale,
      NftPrioritySaleWhitelist,
      NftCollectible,
      // 下单必需的订单/支付实体
      NftOrder,
      NftPayment,
      // 审计日志实体
      NftOperationLog,
    ]),
  ],
  controllers: [PriorityController],
  providers: [PriorityService],
  exports: [PriorityService],
})
export class PriorityModule {}
