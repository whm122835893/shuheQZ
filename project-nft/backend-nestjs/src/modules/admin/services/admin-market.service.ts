// [管理后台-市场管理模块] - AdminMarketService
// 7 个端点的业务逻辑：寄售列表、强制下架、交易记录、价格异常、费用配置(读/写)、藏品寄售列表
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftResaleListing } from '../../../database/entities/nft-resale-listing.entity';
import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';
import { NftSystemConfig } from '../../../database/entities/nft-system-config.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';

@Injectable()
export class AdminMarketService {
  private readonly logger = new Logger(AdminMarketService.name);

  constructor(
    @InjectRepository(NftResaleListing)
    private readonly listingRepo: Repository<NftResaleListing>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftSystemConfig)
    private readonly configRepo: Repository<NftSystemConfig>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. 分页寄售列表（按 status/collectible_id/价格范围过滤）
   */
  async findListings(query: {
    page?: number;
    pageSize?: number;
    status?: number;
    collectibleId?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .where('l.is_delete = 0');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('l.status = :status', { status: query.status });
    }
    if (query.collectibleId) {
      qb.andWhere('l.collectible_id = :collectibleId', { collectibleId: query.collectibleId });
    }
    if (query.minPrice !== undefined && query.minPrice !== null) {
      qb.andWhere('l.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined && query.maxPrice !== null) {
      qb.andWhere('l.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    qb.orderBy('l.listed_at', 'DESC').skip(skip).take(pageSize);

    const [listings, total] = await qb.getManyAndCount();

    // 批量查询关联的藏品和用户信息
    const collectibleIds = [...new Set(listings.map((l) => l.collectibleId))];
    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];

    const [collectibles, sellers] = await Promise.all([
      collectibleIds.length > 0
        ? this.collectibleRepo.findByIds(collectibleIds)
        : Promise.resolve([]),
      sellerIds.length > 0
        ? this.userRepo.findByIds(sellerIds)
        : Promise.resolve([]),
    ]);

    const collectibleMap = new Map(collectibles.map((c) => [c.id, c]));
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    const list = listings.map((l) => ({
      ...l,
      collectible: collectibleMap.get(l.collectibleId)
        ? {
            id: collectibleMap.get(l.collectibleId)!.id,
            name: collectibleMap.get(l.collectibleId)!.name,
            image: collectibleMap.get(l.collectibleId)!.image,
          }
        : null,
      seller: sellerMap.get(l.sellerId)
        ? {
            id: sellerMap.get(l.sellerId)!.id,
            username: sellerMap.get(l.sellerId)!.username,
            phone: sellerMap.get(l.sellerId)!.phone,
            uid: sellerMap.get(l.sellerId)!.uid,
          }
        : null,
    }));

    return { list, total, page, pageSize };
  }

  /**
   * 2. 强制下架寄售（设置 status=3 表示系统下架）
   * 注：NftResaleListing 实体无 is_system_delisted/delist_reason 列，使用 status=3 标记
   */
  async delistListing(id: number, adminId: number, reason: string): Promise<NftResaleListing> {
    const listing = await this.listingRepo.findOne({ where: { id, isDelete: 0 } });
    if (!listing) {
      throw new NotFoundException(`寄售记录 #${id} 不存在`);
    }

    if (listing.status !== 1) {
      throw new BadRequestException(`寄售状态为 ${listing.status}，无法下架（仅在售(1)状态可下架）`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 设置寄售状态为系统下架(3)
      listing.status = 3;
      await queryRunner.manager.save(listing);

      // 恢复用户藏品为未寄售状态
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({ isConsigned: 0 })
        .where('id = :id', { id: listing.userCollectibleId })
        .execute();

      await queryRunner.commitTransaction();
      return listing;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`下架失败: ${err.message}`, err.stack);
      throw new HttpException(
        '下架失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 3. 交易记录（已完成的市场交易，即 source='market' 且 status=3 的订单）
   */
  async findTrades(query: {
    page?: number;
    pageSize?: number;
    collectibleId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .andWhere('o.source = :source', { source: 'market' })
      .andWhere('o.status = :status', { status: 3 });

    if (query.collectibleId) {
      qb.andWhere('o.collectible_id = :collectibleId', { collectibleId: query.collectibleId });
    }
    if (query.startDate) {
      qb.andWhere('o.completed_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.completed_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('o.completed_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 4. 价格异常预警（在售寄售中，价格显著高于或低于同藏品平均价格的记录）
   */
  async findPriceAlerts(query: {
    page?: number;
    pageSize?: number;
    threshold?: number;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const threshold = Number(query.threshold) || 0.5; // 默认偏离50%为异常

    // 查询所有在售寄售，按 collectible_id 分组计算平均价格
    const allListings = await this.listingRepo.find({
      where: { status: 1, isDelete: 0 },
    });

    // 按藏品分组
    const groupedByCollectible = new Map<number, NftResaleListing[]>();
    for (const listing of allListings) {
      const arr = groupedByCollectible.get(listing.collectibleId) || [];
      arr.push(listing);
      groupedByCollectible.set(listing.collectibleId, arr);
    }

    const alerts: any[] = [];
    for (const [collectibleId, listings] of groupedByCollectible) {
      if (listings.length < 2) continue; // 少于2个寄售无法判断异常

      const avgPrice =
        listings.reduce((sum, l) => sum + Number(l.price), 0) / listings.length;

      for (const listing of listings) {
        const deviation = Math.abs(Number(listing.price) - avgPrice) / avgPrice;
        if (deviation >= threshold) {
          alerts.push({
            ...listing,
            avgPrice: Number(avgPrice.toFixed(2)),
            deviation: Number((deviation * 100).toFixed(2)),
            alertType: Number(listing.price) > avgPrice ? 'high' : 'low',
          });
        }
      }
    }

    // 按偏离程度排序
    alerts.sort((a, b) => b.deviation - a.deviation);

    const total = alerts.length;
    const start = (page - 1) * pageSize;
    const list = alerts.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  }

  /**
   * 5. 获取手续费配置（从 nft_system_configs 中 config_key LIKE 'market_%' 的记录）
   */
  async getFeeConfig(): Promise<any[]> {
    const configs = await this.configRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0')
      .andWhere('c.config_key LIKE :pattern', { pattern: 'market_%' })
      .getMany();

    return configs.map((c) => ({
      id: c.id,
      configKey: c.configKey,
      configValue: c.configValue,
      configDesc: c.configDesc,
    }));
  }

  /**
   * 6. 更新手续费配置
   */
  async updateFeeConfig(items: Array<{ configKey: string; configValue: string; configDesc?: string }>): Promise<any[]> {
    const results: NftSystemConfig[] = [];

    for (const item of items) {
      let config = await this.configRepo.findOne({
        where: { configKey: item.configKey, isDelete: 0 },
      });

      if (config) {
        config.configValue = item.configValue;
        if (item.configDesc !== undefined) {
          config.configDesc = item.configDesc;
        }
      } else {
        config = new NftSystemConfig();
        config.configKey = item.configKey;
        config.configValue = item.configValue;
        config.configDesc = item.configDesc || null;
      }
      results.push(await this.configRepo.save(config));
    }

    return results.map((c) => ({
      id: c.id,
      configKey: c.configKey,
      configValue: c.configValue,
      configDesc: c.configDesc,
    }));
  }

  /**
   * 7. 获取指定藏品的全部寄售列表
   */
  async findCollectibleListings(collectibleId: number): Promise<any[]> {
    const listings = await this.listingRepo.find({
      where: { collectibleId, isDelete: 0 },
      order: { price: 'ASC' },
    });

    const collectible = await this.collectibleRepo.findOne({
      where: { id: collectibleId },
    });

    // 批量查询卖家信息
    const sellerIds = [...new Set(listings.map((l) => l.sellerId))];
    const sellers = sellerIds.length > 0
      ? await this.userRepo.findByIds(sellerIds)
      : [];
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));

    return listings.map((l) => ({
      ...l,
      collectible: collectible
        ? { id: collectible.id, name: collectible.name, image: collectible.image }
        : null,
      seller: sellerMap.get(l.sellerId)
        ? {
            id: sellerMap.get(l.sellerId)!.id,
            username: sellerMap.get(l.sellerId)!.username,
            uid: sellerMap.get(l.sellerId)!.uid,
          }
        : null,
    }));
  }
}
