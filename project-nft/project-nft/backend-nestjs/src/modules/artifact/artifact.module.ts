// [文物展馆模块] - 模块定义
//
// forFeature 注册说明：
//  - NftArtifact -> 文物展品列表/详情查询
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NftArtifact } from '../../database/entities/nft-artifact.entity';
import { ArtifactController } from './artifact.controller';
import { ArtifactService } from './artifact.service';

@Module({
  imports: [TypeOrmModule.forFeature([NftArtifact])],
  controllers: [ArtifactController],
  providers: [ArtifactService],
  exports: [ArtifactService],
})
export class ArtifactModule {}
