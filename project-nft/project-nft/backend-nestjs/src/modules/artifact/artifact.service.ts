// [文物展馆模块] - 业务服务
// 负责：
//   1. GET  /artifacts      文物展品列表
//   2. GET  /artifacts/:id  文物展品详情
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftArtifact } from '../../database/entities/nft-artifact.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { ArtifactQueryDto } from './dto/artifact-query.dto';

@Injectable()
export class ArtifactService {
  constructor(
    @InjectRepository(NftArtifact)
    private readonly artifactRepo: Repository<NftArtifact>,
  ) {}

  /**
   * 文物展品列表(分页)
   * 查询 nft_artifacts WHERE is_delete=0 → 条件过滤 → 分页
   * 返回字段：id, name, dynasty, category, image, tags, size, origin
   */
  async getArtifacts(query: ArtifactQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.artifactRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');

    // 条件过滤
    if (query.dynasty) {
      qb.andWhere('a.dynasty = :dynasty', { dynasty: query.dynasty });
    }
    if (query.category) {
      qb.andWhere('a.category = :category', { category: query.category });
    }
    if (query.keyword) {
      qb.andWhere('a.name LIKE :keyword', {
        keyword: `%${query.keyword}%`,
      });
    }

    // 默认按 id 倒序
    qb.orderBy('a.id', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'a.id',
        'a.name',
        'a.dynasty',
        'a.category',
        'a.image',
        'a.tags',
        'a.size',
        'a.origin',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getMany();

    return {
      list: rows.map((r) => ({
        id: Number(r.id),
        name: r.name,
        dynasty: r.dynasty,
        category: r.category,
        image: r.image,
        tags: r.tags ?? [],
        size: r.size,
        origin: r.origin,
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * 文物展品详情
   * 查询 nft_artifacts WHERE id=? AND is_delete=0 → 返回完整信息含 description + tags + size + origin
   */
  async getArtifactById(id: number) {
    const artifact = await this.artifactRepo.findOne({
      where: { id, isDelete: 0 },
    });

    if (!artifact) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '文物展品不存在',
      });
    }

    return {
      id: Number(artifact.id),
      name: artifact.name,
      dynasty: artifact.dynasty,
      category: artifact.category,
      image: artifact.image,
      description: artifact.description,
      size: artifact.size,
      origin: artifact.origin,
      tags: artifact.tags ?? [],
    };
  }
}
