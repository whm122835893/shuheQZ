// [盲盒模块] - 盲盒模块定义
//
// forFeature 注册说明：
//  - 任务规格实体：NftBlindBox, NftBlindBoxItem, NftBlindBoxOpenRecord
//  - 藏品相关实体：NftCollectible, NftUserCollectible, NftOperationLog
//      NftCollectible        -> 盲盒本身也是藏品；开启时递增奖品藏品的 serial_current/circulate
//      NftUserCollectible    -> 消耗盲盒(status=5) + 生成奖品藏品(source='blindbox')
//      NftOperationLog       -> 开启盲盒审计日志
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftBlindBox } from '../../database/entities/nft-blind-box.entity';
import { NftBlindBoxItem } from '../../database/entities/nft-blind-box-item.entity';
import { NftBlindBoxOpenRecord } from '../../database/entities/nft-blind-box-open-record.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { BlindBoxController } from './blindbox.controller';
import { BlindBoxService } from './blindbox.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftBlindBox,
      NftBlindBoxItem,
      NftBlindBoxOpenRecord,
      NftCollectible,
      NftUserCollectible,
      NftOperationLog,
    ]),
  ],
  controllers: [BlindBoxController],
  providers: [BlindBoxService],
  exports: [BlindBoxService],
})
export class BlindBoxModule {}
