// [管理后台-内容管理模块] - AdminCmsService
// 实现轮播图、公告、合规文档、文物、页面装饰配置的管理。
//
// 关键设计：
//  - 轮播图支持批量排序（PUT /banners/sort 传入 [{id, sortOrder}]）
//  - 公告发布/取消：切换 is_delete（发布=0，取消=1，但不写 deleted_at，区别于删除）
//  - 页面装饰配置存于 nft_system_configs 的 page_decoration key
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftBanner } from '../../../database/entities/nft-banner.entity';
import { NftAnnouncement } from '../../../database/entities/nft-announcement.entity';
import { NftAgreement } from '../../../database/entities/nft-agreement.entity';
import { NftArtifact } from '../../../database/entities/nft-artifact.entity';
import { NftSystemConfig } from '../../../database/entities/nft-system-config.entity';

const DECORATION_KEY = 'page_decoration';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminCmsService {
  constructor(
    @InjectRepository(NftBanner)
    private readonly bannerRepo: Repository<NftBanner>,
    @InjectRepository(NftAnnouncement)
    private readonly announcementRepo: Repository<NftAnnouncement>,
    @InjectRepository(NftAgreement)
    private readonly agreementRepo: Repository<NftAgreement>,
    @InjectRepository(NftArtifact)
    private readonly artifactRepo: Repository<NftArtifact>,
    @InjectRepository(NftSystemConfig)
    private readonly configRepo: Repository<NftSystemConfig>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 轮播图（5）
  // ============================================================

  async getBannerList(query: Record<string, any>): Promise<any> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.bannerRepo
      .createQueryBuilder('b')
      .where('b.is_delete = 0');
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('b.status = :status', { status: Number(query.status) });
    }
    if (query.title) {
      qb.andWhere('b.title LIKE :t', { t: `%${query.title}%` });
    }
    qb.orderBy('b.sort_order', 'ASC')
      .addOrderBy('b.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async createBanner(body: Record<string, any>): Promise<NftBanner> {
    if (!body.title || !body.image) {
      throw new BadRequestException('标题与图片不能为空');
    }
    const banner = this.bannerRepo.create({
      title: body.title,
      image: body.image,
      linkType: body.linkType ?? null,
      linkUrl: body.linkUrl ?? null,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : 0,
      status: body.status !== undefined ? Number(body.status) : 1,
    });
    return this.bannerRepo.save(banner);
  }

  async updateBanner(id: number, body: Record<string, any>): Promise<NftBanner> {
    const banner = await this.bannerRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!banner) {
      throw new NotFoundException('轮播图不存在');
    }
    await this.bannerRepo.update(id, {
      title: body.title ?? banner.title,
      image: body.image ?? banner.image,
      linkType: body.linkType ?? banner.linkType,
      linkUrl: body.linkUrl ?? banner.linkUrl,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : banner.sortOrder,
      status: body.status !== undefined ? Number(body.status) : banner.status,
    });
    return this.bannerRepo.findOne({ where: { id } }) as Promise<NftBanner>;
  }

  async deleteBanner(id: number): Promise<void> {
    const banner = await this.bannerRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!banner) {
      throw new NotFoundException('轮播图不存在');
    }
    await this.bannerRepo.update(id, { isDelete: 1, deletedAt: new Date() });
  }

  /** 批量排序 */
  async batchSortBanners(body: Record<string, any>): Promise<any> {
    const items: any[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      throw new BadRequestException('items 不能为空');
    }
    await this.dataSource.transaction(async (mgr) => {
      for (const item of items) {
        await mgr.update(
          NftBanner,
          { id: Number(item.id), isDelete: 0 },
          { sortOrder: Number(item.sortOrder) },
        );
      }
    });
    return { count: items.length };
  }

  // ============================================================
  // 公告（5）
  // ============================================================

  async getAnnouncementList(query: Record<string, any>): Promise<PaginatedResult<NftAnnouncement>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.announcementRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');
    if (query.title) {
      qb.andWhere('a.title LIKE :t', { t: `%${query.title}%` });
    }
    if (query.type) {
      qb.andWhere('a.type = :type', { type: query.type });
    }
    qb.orderBy('a.is_top', 'DESC')
      .addOrderBy('a.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async createAnnouncement(body: Record<string, any>): Promise<NftAnnouncement> {
    if (!body.title || !body.type) {
      throw new BadRequestException('标题与类型不能为空');
    }
    const ann = this.announcementRepo.create({
      title: body.title,
      summary: body.summary ?? null,
      content: body.content ?? null,
      coverImage: body.coverImage ?? null,
      type: body.type,
      subtype: body.subtype ?? null,
      tagColor: body.tagColor ?? null,
      isTop: body.isTop !== undefined ? Number(body.isTop) : 0,
    });
    return this.announcementRepo.save(ann);
  }

  async updateAnnouncement(
    id: number,
    body: Record<string, any>,
  ): Promise<NftAnnouncement> {
    const ann = await this.announcementRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!ann) {
      throw new NotFoundException('公告不存在');
    }
    await this.announcementRepo.update(id, {
      title: body.title ?? ann.title,
      summary: body.summary ?? ann.summary,
      content: body.content ?? ann.content,
      coverImage: body.coverImage ?? ann.coverImage,
      type: body.type ?? ann.type,
      subtype: body.subtype ?? ann.subtype,
      tagColor: body.tagColor ?? ann.tagColor,
      isTop: body.isTop !== undefined ? Number(body.isTop) : ann.isTop,
    });
    return this.announcementRepo.findOne({ where: { id } }) as Promise<NftAnnouncement>;
  }

  /** 发布 / 取消发布（切换 is_delete，不写 deleted_at） */
  async togglePublishAnnouncement(id: number): Promise<any> {
    const ann = await this.announcementRepo.findOne({
      where: { id },
      select: ['id', 'isDelete'],
    });
    if (!ann) {
      throw new NotFoundException('公告不存在');
    }
    const next = ann.isDelete === 1 ? 0 : 1;
    await this.announcementRepo.update(id, { isDelete: next });
    return { id, isDelete: next, published: next === 0 };
  }

  async deleteAnnouncement(id: number): Promise<void> {
    const ann = await this.announcementRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!ann) {
      throw new NotFoundException('公告不存在');
    }
    await this.announcementRepo.update(id, { isDelete: 1, deletedAt: new Date() });
  }

  // ============================================================
  // 合规文档（2）
  // ============================================================

  async getAgreementList(query: Record<string, any>): Promise<any> {
    const qb = this.agreementRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');
    if (query.title) {
      qb.andWhere('a.title LIKE :t', { t: `%${query.title}%` });
    }
    if (query.code) {
      qb.andWhere('a.code = :code', { code: query.code });
    }
    qb.orderBy('a.created_at', 'DESC');
    const list = await qb.getMany();
    return list;
  }

  async updateAgreement(
    id: number,
    body: Record<string, any>,
  ): Promise<NftAgreement> {
    const ag = await this.agreementRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!ag) {
      throw new NotFoundException('合规文档不存在');
    }
    await this.agreementRepo.update(id, {
      title: body.title ?? ag.title,
      content: body.content ?? ag.content,
      version: body.version ?? ag.version,
      status: body.status !== undefined ? Number(body.status) : ag.status,
      effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : ag.effectiveAt,
    });
    return this.agreementRepo.findOne({ where: { id } }) as Promise<NftAgreement>;
  }

  // ============================================================
  // 文物（4）
  // ============================================================

  async getArtifactList(query: Record<string, any>): Promise<PaginatedResult<NftArtifact>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.artifactRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');
    if (query.name) {
      qb.andWhere('a.name LIKE :n', { n: `%${query.name}%` });
    }
    if (query.dynasty) {
      qb.andWhere('a.dynasty = :d', { d: query.dynasty });
    }
    qb.orderBy('a.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async createArtifact(body: Record<string, any>): Promise<NftArtifact> {
    if (!body.name || !body.image) {
      throw new BadRequestException('名称与图片不能为空');
    }
    const art = this.artifactRepo.create({
      name: body.name,
      dynasty: body.dynasty ?? null,
      category: body.category ?? null,
      image: body.image,
      description: body.description ?? null,
      size: body.size ?? null,
      origin: body.origin ?? null,
      tags: body.tags ?? null,
    });
    return this.artifactRepo.save(art);
  }

  async updateArtifact(id: number, body: Record<string, any>): Promise<NftArtifact> {
    const art = await this.artifactRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!art) {
      throw new NotFoundException('文物不存在');
    }
    await this.artifactRepo.update(id, {
      name: body.name ?? art.name,
      dynasty: body.dynasty ?? art.dynasty,
      category: body.category ?? art.category,
      image: body.image ?? art.image,
      description: body.description ?? art.description,
      size: body.size !== undefined ? body.size : art.size,
      origin: body.origin !== undefined ? body.origin : art.origin,
      tags: body.tags ?? art.tags,
    });
    return this.artifactRepo.findOne({ where: { id } }) as Promise<NftArtifact>;
  }

  async deleteArtifact(id: number): Promise<void> {
    const art = await this.artifactRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!art) {
      throw new NotFoundException('文物不存在');
    }
    await this.artifactRepo.update(id, { isDelete: 1, deletedAt: new Date() });
  }

  // ============================================================
  // 页面装饰（2）
  // ============================================================

  async getDecoration(): Promise<any> {
    const row = await this.configRepo.findOne({
      where: { configKey: DECORATION_KEY, isDelete: 0 },
    });
    if (!row) {
      return {};
    }
    try {
      return JSON.parse(row.configValue);
    } catch {
      return { value: row.configValue };
    }
  }

  async updateDecoration(body: Record<string, any>): Promise<any> {
    const strValue = JSON.stringify(body);
    const row = await this.configRepo.findOne({
      where: { configKey: DECORATION_KEY, isDelete: 0 },
    });
    if (row) {
      row.configValue = strValue;
      await this.configRepo.save(row);
    } else {
      const created = this.configRepo.create({
        configKey: DECORATION_KEY,
        configValue: strValue,
      });
      await this.configRepo.save(created);
    }
    return body;
  }
}
