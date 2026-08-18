// [藏品模块] - 藏品业务服务
// 负责：分类列表 / 藏品列表 / 藏品详情(含合约地址脱敏 + is_favored) / 关注 / 取消关注
import { InjectRepository } from '@nestjs/typeorm';
import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftCategory } from '../../database/entities/nft-category.entity';
import { NftUserFavorite } from '../../database/entities/nft-user-favorite.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { CollectibleQueryDto } from './dto/collectible-query.dto';
import { RedisService } from '../../shared/redis.service';

/** 藏品列表缓存 key 前缀（实际 Redis key 会带 keyPrefix "shuhe:"，即 "shuhe:collectibles:list:*"） */
const COLLECTIBLES_LIST_CACHE_KEY = 'collectibles:list';
/** 藏品列表缓存有效期（秒）：5 分钟 */
const COLLECTIBLES_LIST_CACHE_TTL = 300;

@Injectable()
export class CollectibleService {
  private readonly logger = new Logger(CollectibleService.name);

  constructor(
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftCategory)
    private readonly categoryRepo: Repository<NftCategory>,
    @InjectRepository(NftUserFavorite)
    private readonly favoriteRepo: Repository<NftUserFavorite>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 藏品分类列表
   * 查询 nft_categories WHERE is_delete=0 ORDER BY sort_order
   */
  async getCategories() {
    const categories = await this.categoryRepo.find({
      where: { isDelete: 0 },
      order: { sortOrder: 'ASC' },
    });

    return {
      list: categories.map((c) => ({
        id: Number(c.id),
        name: c.name,
        code: c.code,
        icon: c.icon,
        sort_order: c.sortOrder,
      })),
    };
  }

  /**
   * 藏品列表(分页)
   * WHERE is_release=1 AND is_delete=0，支持 category_id/keyword/status 筛选与 sort 排序
   * 合约地址脱敏：前8后6中间 *
   *
   * 缓存：基于查询参数生成缓存 key，命中缓存直接返回；TTL 5 分钟。
   * 当管理后台修改藏品（create/update/delete/release 等）时会通过 delCacheByPattern
   * 清除 "collectibles:list*" 全部缓存，保证数据一致性。
   */
  async getCollectibles(query: CollectibleQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    // 基于查询参数生成稳定的缓存 key（实际 Redis key 形如 shuhe:collectibles:list:p1:ps20:...）
    const cacheKey = `${COLLECTIBLES_LIST_CACHE_KEY}:p${page}:ps${page_size}:c${query.category_id || 'all'}:k${query.keyword || 'all'}:s${query.status || 'all'}:${query.sort || 'newest'}`;

    return this.redisService.getOrSetCache(
      cacheKey,
      COLLECTIBLES_LIST_CACHE_TTL,
      () => this.loadCollectiblesFromDb(query, page, page_size),
    );
  }

  /** 藏品列表数据库查询（缓存未命中时执行） */
  private async loadCollectiblesFromDb(
    query: CollectibleQueryDto,
    page: number,
    page_size: number,
  ) {
    const qb = this.collectibleRepo
      .createQueryBuilder('c')
      .where('c.is_release = 1')
      .andWhere('c.is_delete = 0');

    if (query.category_id) {
      qb.andWhere('c.category_id = :category_id', {
        category_id: query.category_id,
      });
    }

    if (query.keyword) {
      qb.andWhere('(c.name LIKE :kw OR c.subtitle LIKE :kw)', {
        kw: `%${query.keyword}%`,
      });
    }

    if (query.status) {
      qb.andWhere('c.status = :status', { status: query.status });
    }

    // 排序：price_asc / price_desc / newest(默认，按上架时间倒序)
    switch (query.sort) {
      case 'price_asc':
        qb.orderBy('c.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('c.price', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('c.onsale_at', 'DESC');
        break;
    }

    qb.skip((page - 1) * page_size).take(page_size);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((c) => ({
        id: Number(c.id),
        name: c.name,
        subtitle: c.subtitle,
        image: c.image,
        price: c.price,
        edition: c.edition,
        sold: c.sold,
        circulate: c.circulate,
        status: c.status,
        onsale_at: c.onsaleAt,
        issuer: c.issuer,
        is_on_chain: !!c.isOnChain,
        is_transferable: !!c.isTransferable,
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * 藏品详情
   * 合约地址脱敏(前8后6中间 *)；若已登录(userId 不为空)则返回 is_favored 状态
   */
  async getCollectibleDetail(id: number, userId?: number | null) {
    const collectible = await this.collectibleRepo.findOne({
      where: { id, isDelete: 0 },
    });

    if (!collectible) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '藏品不存在',
      });
    }

    // 关联分类
    const category = await this.categoryRepo.findOne({
      where: { id: collectible.categoryId },
    });

    // 已登录则查询是否关注
    let isFavored = false;
    if (userId) {
      const fav = await this.favoriteRepo.findOne({
        where: { userId, collectibleId: id, isDelete: 0 },
      });
      isFavored = !!fav;
    }

    return {
      id: Number(collectible.id),
      category: category
        ? { id: Number(category.id), name: category.name }
        : null,
      name: collectible.name,
      subtitle: collectible.subtitle,
      image: collectible.image,
      gradient: collectible.gradient,
      price: collectible.price,
      edition: collectible.edition,
      sold: collectible.sold,
      circulate: collectible.circulate,
      status: collectible.status,
      issuer: collectible.issuer,
      creator: collectible.creator,
      brand: collectible.brand,
      description: collectible.description,
      release_date: collectible.releaseDate,
      onsale_at: collectible.onsaleAt,
      off_sale_at: collectible.offSaleAt,
      is_on_chain: !!collectible.isOnChain,
      chain_type: collectible.chainType,
      token_standard: collectible.tokenStandard,
      contract_address_masked: this.maskContractAddress(
        collectible.contractAddress,
      ),
      cert_id: collectible.certId,
      is_transferable: !!collectible.isTransferable,
      vol: collectible.vol,
      is_favored: isFavored,
    };
  }

  /**
   * 关注藏品
   * 写入 nft_user_favorites，UNIQUE(user_id, collectible_id) 防重复
   * - 已存在且未删除 -> 视为已关注
   * - 已存在但软删除 -> 恢复为未删除
   * - 不存在 -> 新增
   */
  async favorite(userId: number, collectibleId: number) {
    // 校验藏品存在
    const collectible = await this.collectibleRepo.findOne({
      where: { id: collectibleId, isDelete: 0 },
    });
    if (!collectible) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '藏品不存在',
      });
    }

    // 查询是否已存在(含软删除记录)
    const existing = await this.favoriteRepo.findOne({
      where: { userId, collectibleId },
    });

    if (existing && existing.isDelete === 0) {
      // 已关注，幂等返回
      return null;
    }

    if (existing && existing.isDelete === 1) {
      // 恢复软删除记录(避免触发唯一约束)
      existing.isDelete = 0;
      await this.favoriteRepo.save(existing);
      return null;
    }

    try {
      const fav = this.favoriteRepo.create({
        userId,
        collectibleId,
        isDelete: 0,
      });
      await this.favoriteRepo.save(fav);
    } catch (e) {
      // 唯一约束冲突(并发场景)：视为已关注
      if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
        return null;
      }
      throw e;
    }

    return null;
  }

  /**
   * 取消关注
   * 软删除 nft_user_favorites WHERE user_id=? AND collectible_id=?
   */
  async unfavorite(userId: number, collectibleId: number) {
    await this.favoriteRepo.update(
      { userId, collectibleId, isDelete: 0 },
      { isDelete: 1 },
    );
    return null;
  }

  /**
   * 合约地址脱敏：保留前 8 位与后 6 位，中间用 * 替换
   * @example "0xab12cd12345678ef" -> "0xab12cd****5678ef"
   */
  private maskContractAddress(address: string | null): string | null {
    if (!address) {
      return null;
    }
    // 长度不足以同时展示前8后6时，原样返回
    if (address.length <= 14) {
      return address;
    }
    return `${address.slice(0, 8)}****${address.slice(-6)}`;
  }
}
