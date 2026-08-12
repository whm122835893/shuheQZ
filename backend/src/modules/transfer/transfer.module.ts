// [转赠模块] - 转赠模块定义
//
// forFeature 注册说明：
//  - 基础实体(任务规格)：NftTransfer, NftUserCollectible, NftCollectible, NftOperationLog
//  - 额外实体(服务逻辑必需)：
//      NftUser -> createTransfer 需按手机号查询接收方用户是否存在
//  - forwardRef 注入 LuckyDrawModule：
//      confirmTransfer 确认接收后，异步检测 hold_collectible 抽奖规则并发放次数
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftTransfer } from '../../database/entities/nft-transfer.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { LuckyDrawModule } from '../luckydraw/luckydraw.module';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftTransfer,
      NftUserCollectible,
      NftCollectible,
      NftUser,
      NftOperationLog,
    ]),
    forwardRef(() => LuckyDrawModule),
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
