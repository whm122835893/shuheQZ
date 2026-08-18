// [公告新闻模块] - 公告新闻业务服务
// 端点：
//   1. GET /announcements        公告/新闻列表（分页）
//   2. GET /announcements/:id    公告/新闻详情
//   3. GET /banners              首页轮播图（全量）
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NftAnnouncement } from '../../database/entities/nft-announcement.entity';
import { NftBanner } from '../../database/entities/nft-banner.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(NftAnnouncement)
    private readonly announcementRepo: Repository<NftAnnouncement>,
    @InjectRepository(NftBanner)
    private readonly bannerRepo: Repository<NftBanner>,
  ) {}

  /**
   * 公告/新闻列表（分页）
   * 查询 nft_announcements WHERE is_delete=0
   * 排序：置顶优先(is_top DESC) → created_at DESC
   * 可选按 type(notice/news) 筛选
   */
  async getListings(query: AnnouncementQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');

    if (query.type) {
      qb.andWhere('a.type = :type', { type: query.type });
    }

    // 置顶优先(is_top DESC) → created_at DESC
    qb.orderBy('a.is_top', 'DESC').addOrderBy('a.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'a.id AS id',
        'a.title AS title',
        'a.summary AS summary',
        'a.cover_image AS cover_image',
        'a.type AS type',
        'a.is_top AS is_top',
        'a.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        title: r.title,
        summary: r.summary,
        cover_image: r.cover_image,
        type: r.type,
        is_top: Number(r.is_top) === 1,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * 公告/新闻详情
   * 查询 nft_announcements WHERE id=? AND is_delete=0，返回完整 content
   */
  async getDetail(id: number) {
    const row = await this.announcementRepo
      .createQueryBuilder('a')
      .select([
        'a.id AS id',
        'a.title AS title',
        'a.content AS content',
        'a.cover_image AS cover_image',
        'a.type AS type',
        'a.created_at AS created_at',
      ])
      .where('a.id = :id', { id })
      .andWhere('a.is_delete = 0')
      .getRawOne();

    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '公告不存在',
      });
    }

    return {
      id: Number(row.id),
      title: row.title,
      content: row.content,
      cover_image: row.cover_image,
      type: row.type,
      created_at: row.created_at,
    };
  }

  /**
   * 首页轮播图（全量，不分页）
   * 查询 nft_banners WHERE status=1 AND is_delete=0 ORDER BY sort_order ASC
   */
  async getBanners() {
    const rows = await this.bannerRepo
      .createQueryBuilder('b')
      .select([
        'b.id AS id',
        'b.title AS title',
        'b.image AS image',
        'b.link_type AS link_type',
        'b.link_url AS link_url',
      ])
      .where('b.status = 1')
      .andWhere('b.is_delete = 0')
      .orderBy('b.sort_order', 'ASC')
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        title: r.title,
        image: r.image,
        link_type: r.link_type,
        link_url: r.link_url,
      })),
    };
  }
}
