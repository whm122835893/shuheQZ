// [支付模块] - 支付模块定义
//
// forFeature 注册说明：
//  - 订单与支付：NftOrder, NftPayment
//  - 藏品与库存：NftCollectible, NftUserCollectible
//  - 钱包与流水：NftUserWallet, NftWalletTransaction（余额支付扣款 + 流水）
//  - 优先购白名单：NftPrioritySaleWhitelist（支付完成扣减 used_quantity）
//  - 寄售挂单：NftResaleListing（取消订单时恢复 listing.status）
//  - 审计日志：NftOperationLog
//
// 第三方支付服务（AlipayService / WechatService）由全局 SharedModule 提供，
// 无需在此重复注册或导入。
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftResaleListing } from '../../database/entities/nft-resale-listing.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // 订单与支付
      NftOrder,
      NftPayment,
      // 藏品与库存
      NftCollectible,
      NftUserCollectible,
      // 钱包与流水（余额支付）
      NftUserWallet,
      NftWalletTransaction,
      // 优先购白名单（支付完成扣减名额）
      NftPrioritySaleWhitelist,
      // 寄售挂单（取消订单恢复在售状态）
      NftResaleListing,
      // 审计日志
      NftOperationLog,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
