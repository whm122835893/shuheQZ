// [藏品模块] - 藏品模块定义
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftCategory } from '../../database/entities/nft-category.entity';
import { NftUserFavorite } from '../../database/entities/nft-user-favorite.entity';
import { CollectibleController } from './collectible.controller';
import { CollectibleService } from './collectible.service';

@Module({
  imports: [TypeOrmModule.forFeature([NftCollectible, NftCategory, NftUserFavorite])],
  controllers: [CollectibleController],
  providers: [CollectibleService],
  exports: [CollectibleService],
})
export class CollectibleModule {}
