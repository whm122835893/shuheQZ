// [市场模块] - 市场业务服务
// 负责：市场在售列表 / 挂售藏品 / 取消寄售 / 市场购买 / 发售购买 / 我的挂单
// 所有资产变动操作均在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException。
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { NftResaleListing } from '../../database/entities/nft-resale-listing.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftPrioritySale } from '../../database/entities/nft-priority-sale.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { RedisService } from '../../shared/redis.service';
import { StockService } from '../../shared/stock.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { MarketQueryDto } from './dto/market-query.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyFromMarketDto } from './dto/buy-from-market.dto';
import { BuyFromReleaseDto } from './dto/buy-from-release.dto';
import { MyListingsQueryDto } from './dto/my-listings-query.dto';

/** 订单待支付有效期（分钟） */
const ORDER_EXPIRE_MINUTES = 30;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    @InjectRepository(NftResaleListing)
    private readonly listingRepo: Repository<NftResaleListing>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftPrioritySale)
    private readonly prioritySaleRepo: Repository<NftPrioritySale>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    private readonly dataSource: DataSource,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
    private readonly stockService: StockService,
  ) {}

  /**
   * 市场在售列表(分页)
   * 查询 nft_resale_listings WHERE status=1 AND is_delete=0
   * JOIN nft_collectibles + nft_user_collectibles(serial_no)，返回 collectible_image 等字段
   */
  async getListings(query: MarketQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(NftCollectible, 'c', 'c.id = l.collectible_id')
      .innerJoin(
        NftUserCollectible,
        'uc',
        'uc.id = l.user_collectible_id',
      )
      .where('l.status = 1')
      .andWhere('l.is_delete = 0')
      .andWhere('c.is_delete = 0');

    if (query.collectible_id) {
      qb.andWhere('l.collectible_id = :collectible_id', {
        collectible_id: query.collectible_id,
      });
    }
    if (query.min_price !== undefined && query.min_price !== null) {
      qb.andWhere('l.price >= :min_price', { min_price: query.min_price });
    }
    if (query.max_price !== undefined && query.max_price !== null) {
      qb.andWhere('l.price <= :max_price', { max_price: query.max_price });
    }

    // 排序：price_asc / price_desc / newest(默认按挂出时间倒序)
    switch (query.sort) {
      case 'price_asc':
        qb.orderBy('l.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('l.price', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('l.listed_at', 'DESC');
        break;
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'l.id AS listing_id',
        'l.collectible_id AS collectible_id',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'uc.serial_no AS serial_no',
        'l.price AS price',
        'l.listed_at AS listed_at',
        'l.seller_id AS seller_uid',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        listing_id: Number(r.listing_id),
        collectible_id: Number(r.collectible_id),
        collectible_name: r.collectible_name,
        collectible_image: r.collectible_image,
        serial_no: r.serial_no,
        price: r.price,
        listed_at: r.listed_at,
        seller_uid: r.seller_uid,
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * 挂售藏品(寄售)
   * 事务内：校验藏品归属 + 校验可转赠 + 乐观锁更新 user_collectible.status=2(寄售中)
   *         + 创建 listing(status=1) + 写入审计日志
   */
  async createListing(userId: number, dto: CreateListingDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1) 校验藏品归属
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: dto.user_collectible_id, userId, isDelete: 0 },
      });
      if (!uc) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品不存在或不属于您',
        });
      }
      if (uc.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该藏品当前状态不可寄售',
        });
      }

      // 2) 校验藏品可转赠
      const collectible = await manager.findOne(NftCollectible, {
        where: { id: uc.collectibleId, isDelete: 0 },
      });
      if (!collectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品信息不存在',
        });
      }
      if (!collectible.isTransferable) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该藏品不可转售',
        });
      }

      // 3) 乐观锁更新 user_collectible.status=2(寄售中)，基于 version
      const ucUpdated = await manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({ status: 2, version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: uc.id,
          version: uc.version,
        })
        .execute();
      if (!ucUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '藏品状态已变更，请刷新后重试',
        });
      }

      // 4) 创建寄售挂单(status=1 在售)
      const now = new Date();
      const listing = manager.create(NftResaleListing, {
        sellerId: userId,
        collectibleId: uc.collectibleId,
        userCollectibleId: uc.id,
        price: dto.price,
        status: 1,
        listedAt: now,
        isDelete: 0,
      });
      const savedListing = await manager.save(NftResaleListing, listing);

      // 5) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_resale_listings',
        targetId: Number(savedListing.id),
        action: 'create_listing',
        oldValue: null,
        newValue: {
          listing_id: Number(savedListing.id),
          user_collectible_id: uc.id,
          price: dto.price,
          seller_id: userId,
        },
        ip: null,
        isDelete: 0,
      });

      return {
        listing_id: Number(savedListing.id),
        listed_at: now,
      };
    });
  }

  /**
   * 取消寄售
   * 事务内：校验归属 + 乐观锁恢复 user_collectible.status=1(持有)
   *         + 乐观锁更新 listing.status=3(已取消) + 写入审计
   */
  async cancelListing(userId: number, listingId: number) {
    return this.dataSource.transaction(async (manager) => {
      // 1) 校验挂单归属
      const listing = await manager.findOne(NftResaleListing, {
        where: { id: listingId, sellerId: userId, isDelete: 0 },
      });
      if (!listing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '挂单不存在或不属于您',
        });
      }
      if (listing.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '挂单当前状态不可取消',
        });
      }

      // 2) 乐观锁恢复 user_collectible.status=1(持有)，基于 version
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: listing.userCollectibleId, isDelete: 0 },
      });
      if (uc) {
        const ucUpdated = await manager
          .createQueryBuilder()
          .update(NftUserCollectible)
          .set({ status: 1, version: () => 'version + 1' })
          .where('id = :id AND version = :version', {
            id: uc.id,
            version: uc.version,
          })
          .execute();
        if (!ucUpdated.affected) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '藏品状态已变更，请刷新后重试',
          });
        }
      }

      // 3) 乐观锁更新 listing.status=3(已取消)，基于 version
      const listingUpdated = await manager
        .createQueryBuilder()
        .update(NftResaleListing)
        .set({ status: 3, version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: listing.id,
          version: listing.version,
        })
        .execute();
      if (!listingUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '挂单状态已变更，请刷新后重试',
        });
      }

      // 4) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_resale_listings',
        targetId: Number(listing.id),
        action: 'cancel_listing',
        oldValue: { status: 1 },
        newValue: { status: 3 },
        ip: null,
        isDelete: 0,
      });

      return null;
    });
  }

  /**
   * 市场购买(创建订单)
   * 事务内：校验 listing 有效 + 不能买自己的 + 乐观锁更新 listing.status=2(已售出)
   *         + 创建订单(source='market') + 创建支付记录(待支付) + 写入审计
   */
  async buyFromMarket(userId: number, listingId: number, dto: BuyFromMarketDto) {
    // INT-009 修复：幂等键校验，防止重复下单
    if (dto.idempotency_key) {
      const isFirst = await this.checkIdempotency(userId, dto.idempotency_key);
      if (!isFirst) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '请求已处理，请勿重复提交',
        });
      }
    }

    return this.dataSource.transaction(async (manager) => {
      // 1) 校验挂单有效
      const listing = await manager.findOne(NftResaleListing, {
        where: { id: listingId, isDelete: 0 },
      });
      if (!listing) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '挂单不存在',
        });
      }
      if (listing.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '挂单已不在售',
        });
      }
      if (Number(listing.sellerId) === Number(userId)) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '不能购买自己的挂单',
        });
      }

      // 2) 乐观锁更新 listing.status=2(已售出)，基于 version
      const listingUpdated = await manager
        .createQueryBuilder()
        .update(NftResaleListing)
        .set({ status: 2, version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: listing.id,
          version: listing.version,
        })
        .execute();
      if (!listingUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '挂单状态已变更，请刷新后重试',
        });
      }

      // 3) 创建订单(source='market')
      const totalPrice = Number(listing.price);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ORDER_EXPIRE_MINUTES * 60 * 1000);
      const orderNo = this.generateOrderNo();

      const order = manager.create(NftOrder, {
        orderNo,
        userId,
        collectibleId: listing.collectibleId,
        resaleListingId: listing.id,
        prioritySaleId: null,
        unitPrice: totalPrice,
        quantity: 1,
        totalPrice,
        status: 1, // 待支付
        source: 'market',
        paidAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        expiresAt,
        isDelete: 0,
      });
      const savedOrder = await manager.save(NftOrder, order);

      // 4) 创建支付记录(待支付)
      const payment = manager.create(NftPayment, {
        orderId: Number(savedOrder.id),
        userId,
        amount: totalPrice,
        paymentMethod: dto.payment_method ?? 'balance',
        transactionNo: null,
        status: 1, // 待支付
        paidAt: null,
        isDelete: 0,
      });
      await manager.save(NftPayment, payment);

      // 5) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_orders',
        targetId: Number(savedOrder.id),
        action: 'buy_from_market',
        oldValue: null,
        newValue: {
          order_id: Number(savedOrder.id),
          listing_id: listing.id,
          total_price: totalPrice,
          buyer_id: userId,
        },
        ip: null,
        isDelete: 0,
      });

      return {
        order_id: Number(savedOrder.id),
        order_no: orderNo,
        total_price: totalPrice,
        expires_at: expiresAt,
      };
    });
  }

  /**
   * 发售购买(创建订单)
   * 事务内：校验藏品发售中(status=2) + 校验库存(circulate - locked_quantity >= quantity)
   *         + 处理优先购(priority_sale_id 不为空时校验时间窗口+白名单+限购)
   *         + 乐观锁扣减库存(locked_quantity += quantity，基于 version)
   *         + 创建订单(source='release') + 创建支付记录(待支付)
   */
  async buyFromRelease(
    userId: number,
    collectibleId: number,
    dto: BuyFromReleaseDto,
  ) {
    // INT-009 修复：幂等键校验，防止重复下单
    if (dto.idempotency_key) {
      const isFirst = await this.checkIdempotency(userId, dto.idempotency_key);
      if (!isFirst) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '请求已处理，请勿重复提交',
        });
      }
    }

    const quantity = dto.quantity ?? 1;
    // Redis 库存预扣减（秒杀级）：在 DB 事务前原子扣减 Redis 库存
    // 只有扣减成功的请求才进入 DB 事务，大幅减少 DB 行锁竞争
    const stockKey = this.stockService.releaseKey(collectibleId);
    return this.stockService.withStockDeduction(
      stockKey,
      () => this.dataSource.transaction(async (manager) => {
      // 1) 校验藏品存在且发售中
      const collectible = await manager.findOne(NftCollectible, {
        where: { id: collectibleId, isDelete: 0 },
      });
      if (!collectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品不存在',
        });
      }
      if (collectible.status !== 2) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '藏品当前不在发售中',
        });
      }

      // 2) 校验库存：circulate - locked_quantity >= quantity
      const available = collectible.circulate - collectible.lockedQuantity;
      if (available < quantity) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '库存不足',
        });
      }

      // 3) 处理优先购(priority_sale_id 不为空时校验时间窗口+白名单+限购)
      let prioritySaleId: number | null = null;

      // 3.5) 校验是否存在进行中的优先购活动（防止绕过优先购直接走普通发售）
      const activePrioritySale = await manager.findOne(NftPrioritySale, {
        where: { collectibleId, status: 2, isDelete: 0 },
      });
      if (activePrioritySale) {
        const now0 = new Date();
        if (now0 >= activePrioritySale.startTime && now0 <= activePrioritySale.endTime) {
          // 当前处于优先购窗口期，必须提供 priority_sale_id 且通过白名单校验
          if (!dto.priority_sale_id || dto.priority_sale_id !== activePrioritySale.id) {
            throw new BadRequestException({
              code: ErrorCode.BAD_REQUEST,
              data: null,
              message: '当前为优先购阶段，请通过优先购通道购买',
            });
          }
        }
      }

      if (dto.priority_sale_id) {
        const ps = await manager.findOne(NftPrioritySale, {
          where: { id: dto.priority_sale_id, collectibleId, isDelete: 0 },
        });
        if (!ps) {
          throw new NotFoundException({
            code: ErrorCode.NOT_FOUND,
            data: null,
            message: '优先购活动不存在',
          });
        }

        const now = new Date();
        // 校验时间窗口
        if (now < ps.startTime || now > ps.endTime) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '不在优先购时间窗口内',
          });
        }
        // 校验活动进行中
        if (ps.status !== 2) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '优先购活动未进行中',
          });
        }

        // 校验白名单资格
        const wl = await manager.findOne(NftPrioritySaleWhitelist, {
          where: {
            prioritySaleId: ps.id,
            userId,
            isDelete: 0,
          },
        });
        if (!wl || wl.status !== 1) {
          throw new ForbiddenException({
            code: ErrorCode.FORBIDDEN,
            data: null,
            message: '无优先购资格',
          });
        }

        // 原子预扣减 used_quantity（乐观锁，防 TOCTOU 竞态）
        const wlUpdated = await manager
          .createQueryBuilder()
          .update(NftPrioritySaleWhitelist)
          .set({
            usedQuantity: () => `used_quantity + ${quantity}`,
            version: () => 'version + 1',
          })
          .where(
            'id = :id AND version = :version AND used_quantity + :qty <= max_quantity AND status = 1 AND is_delete = 0',
            { id: wl.id, version: wl.version, qty: quantity },
          )
          .execute();
        if (!wlUpdated.affected) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '超过优先购限购数量或资格已变更',
          });
        }

        prioritySaleId = ps.id;
      }

      // 4) 乐观锁扣减库存(locked_quantity += quantity)，基于 version
      //    quantity 已由 DTO @IsInt @Min(1) 校验，插值安全
      const stockUpdated = await manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({
          lockedQuantity: () => `locked_quantity + ${quantity}`,
          version: () => 'version + 1',
        })
        .where('id = :id AND version = :version', {
          id: collectible.id,
          version: collectible.version,
        })
        .execute();
      if (!stockUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '库存不足或已变更，请刷新后重试',
        });
      }

      // 5) 创建订单(source='release')
      const unitPrice = Number(collectible.price);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + ORDER_EXPIRE_MINUTES * 60 * 1000);
      const orderNo = this.generateOrderNo();

      const order = manager.create(NftOrder, {
        orderNo,
        userId,
        collectibleId,
        resaleListingId: null,
        prioritySaleId,
        unitPrice,
        quantity,
        totalPrice,
        status: 1, // 待支付
        source: 'release',
        paidAt: null,
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        expiresAt,
        isDelete: 0,
      });
      const savedOrder = await manager.save(NftOrder, order);

      // 6) 创建支付记录(待支付)
      const payment = manager.create(NftPayment, {
        orderId: Number(savedOrder.id),
        userId,
        amount: totalPrice,
        paymentMethod: dto.payment_method ?? 'balance',
        transactionNo: null,
        status: 1, // 待支付
        paidAt: null,
        isDelete: 0,
      });
      await manager.save(NftPayment, payment);

      return {
        order_id: Number(savedOrder.id),
        order_no: orderNo,
        unit_price: unitPrice,
        quantity,
        total_price: totalPrice,
        expires_at: expiresAt,
      };
    }),
      quantity, // withStockDeduction 的扣减数量
    );
  }

  /**
   * 我的挂单(分页)
   * 查询当前用户的挂单，支持 status 筛选
   */
  async getMyListings(userId: number, query: MyListingsQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .innerJoin(NftCollectible, 'c', 'c.id = l.collectible_id')
      .innerJoin(NftUserCollectible, 'uc', 'uc.id = l.user_collectible_id')
      .where('l.seller_id = :userId', { userId })
      .andWhere('l.is_delete = 0');

    if (query.status) {
      qb.andWhere('l.status = :status', { status: query.status });
    }

    qb.orderBy('l.listed_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'l.id AS listing_id',
        'l.collectible_id AS collectible_id',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'uc.serial_no AS serial_no',
        'l.price AS price',
        'l.status AS status',
        'l.listed_at AS listed_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        listing_id: Number(r.listing_id),
        collectible_id: Number(r.collectible_id),
        collectible_name: r.collectible_name,
        collectible_image: r.collectible_image,
        serial_no: r.serial_no,
        price: r.price,
        status: r.status,
        listed_at: r.listed_at,
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * INT-009 修复：幂等键校验
   * 使用 Redis 原子 SET NX EX 操作，防止前端重复提交导致重复下单
   * @returns true 表示首次请求（可继续），false 表示重复请求（应拒绝）
   */
  private async checkIdempotency(
    userId: number,
    idempotencyKey: string,
  ): Promise<boolean> {
    const key = `market:idempotency:${userId}:${idempotencyKey}`;
    // 原子 SET NX EX：加锁和设过期在同一命令中完成，避免进程崩溃导致锁永不释放
    return this.redis.setNxEx(key, Date.now().toString(), 86400);
  }

  /**
   * 生成订单号：ORD + yyyyMMddHHmmss + 4位随机数，共 21 位
   * 使用 crypto.randomInt 生成密码学安全随机数，降低碰撞风险
   * @example ORD202608061430520123
   */
  private generateOrderNo(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = pad(crypto.randomInt(1000, 9999), 4);
    return `ORD${stamp}${rand}`;
  }
}
