// [合成模块] - 合成模块定义
//
// forFeature 注册说明：
//  - NftSynthesisActivity     -> 活动查询 / 状态校验 / used_count 更新
//  - NftSynthesisMaterial      -> 材料配方查询
//  - NftSynthesisRecord        -> 合成记录写入 / 查询
//  - NftSynthesisRecordItem    -> 合成材料明细写入
//  - NftCollectible            -> 结果藏品信息 / serial_current 乐观锁更新
//  - NftUserCollectible        -> 用户藏品持有查询 / 消耗(status=5) 乐观锁更新 / 生成结果藏品
//  - NftOperationLog           -> 审计日志写入
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftSynthesisActivity } from '../../database/entities/nft-synthesis-activity.entity';
import { NftSynthesisMaterial } from '../../database/entities/nft-synthesis-material.entity';
import { NftSynthesisRecord } from '../../database/entities/nft-synthesis-record.entity';
import { NftSynthesisRecordItem } from '../../database/entities/nft-synthesis-record-item.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { SynthesisController } from './synthesis.controller';
import { SynthesisService } from './synthesis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NftSynthesisActivity,
      NftSynthesisMaterial,
      NftSynthesisRecord,
      NftSynthesisRecordItem,
      NftCollectible,
      NftUserCollectible,
      NftOperationLog,
    ]),
  ],
  controllers: [SynthesisController],
  providers: [SynthesisService],
  exports: [SynthesisService],
})
export class SynthesisModule {}
