// [钱包模块] - 钱包模块定义
//
// forFeature 注册说明：
//  - NftUserWallet        -> 钱包信息查询 / 充值回调余额更新（乐观锁）
//  - NftWalletTransaction -> 流水查询 / 充值下单创建流水 / 回调更新流水 balance_after
//
// 第三方支付服务（AlipayService / WechatService）由全局 SharedModule 提供，
// 无需在此重复注册或导入。
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftUserWallet,
      NftWalletTransaction,
    ]),
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
