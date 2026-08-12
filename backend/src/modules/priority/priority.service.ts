// [优先购模块] - 优先购业务服务
// 负责：优先购活动列表 / 查询优先购资格 / 优先购下单
// 所有资产变动操作均在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException。
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { NftPrioritySale } from '../../database/entities/nft-priority-sale.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { PrioritySaleQueryDto } from './dto/priority-sale-query.dto';
import { PriorityBuyDto } from './dto/priority-buy.dto';

/** 订单待支付有效期（分钟） */
const ORDER_EXPIRE_MINUTES = 15;

@Injectable()
export class PriorityService {
  private readonly logger = new Logger(PriorityService.name);

  constructor(
    @InjectRepository(NftPrioritySale)
    private readonly prioritySaleRepo: Repository<NftPrioritySale>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 优先购活动列表
   * 查询 nft_priority_sales → JOIN nft_collectibles
   * → 查询当前用户在各活动的白名单状态(nft_priority_sale_whitelists)
   * → 返回活动列表 + 我的资格
   *
   * status 未传时默认查询进行中(2)
   */
  async getPrioritySales(userId: number, query: PrioritySaleQueryDto) {
    const status = query.status ?? 2;

    const qb = this.prioritySaleRepo
      .createQueryBuilder('ps')
      .innerJoin(NftCollectible, 'c', 'c.id = ps.collectible_id')
      .where('ps.is_delete = 0')
      .andWhere('c.is_delete = 0')
      .andWhere('ps.status = :status', { status });

    if (query.collectible_id) {
      qb.andWhere('ps.collectible_id = :collectible_id', {
        collectible_id: query.collectible_id,
      });
    }

    qb.orderBy('ps.start_time', 'DESC');

    const sales = await qb
      .select([
        'ps.id AS id',
        'ps.collectible_id AS collectible_id',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'ps.name AS name',
        'ps.start_time AS start_time',
        'ps.end_time AS end_time',
        'ps.status AS status',
      ])
      .getRawMany();

    if (sales.length === 0) {
      return { list: [] };
    }

    // 批量查询当前用户在这些活动中的白名单记录
    const saleIds = sales.map((s: any) => Number(s.id));
    const whitelists = await this.priorityWhitelistRepo
      .createQueryBuilder('wl')
      .where('wl.priority_sale_id IN (:...saleIds)', { saleIds })
      .andWhere('wl.user_id = :userId', { userId })
      .andWhere('wl.is_delete = 0')
      .getMany();

    const wlMap = new Map<number, NftPrioritySaleWhitelist>();
    for (const wl of whitelists) {
      wlMap.set(Number(wl.prioritySaleId), wl);
    }

    const now = new Date();
    const list = sales.map((s: any) => {
      const wl = wlMap.get(Number(s.id));
      let myWhitelist: {
        max_quantity: number;
        used_quantity: number;
        status: number;
        can_buy: boolean;
      } | null = null;

      if (wl) {
        const startTime = new Date(s.start_time);
        const endTime = new Date(s.end_time);
        const withinTimeWindow = now >= startTime && now <= endTime;
        // can_buy: status=1 AND used_quantity < max_quantity AND 活动状态=2 AND 在时间窗口内
        const canBuy =
          wl.status === 1 &&
          wl.usedQuantity < wl.maxQuantity &&
          Number(s.status) === 2 &&
          withinTimeWindow;

        myWhitelist = {
          max_quantity: wl.maxQuantity,
          used_quantity: wl.usedQuantity,
          status: wl.status,
          can_buy: canBuy,
        };
      }

      return {
        id: Number(s.id),
        collectible_id: Number(s.collectible_id),
        collectible_name: s.collectible_name,
        collectible_image: s.collectible_image,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time,
        status: Number(s.status),
        my_whitelist: myWhitelist,
      };
    });

    return { list };
  }

  /**
   * 查询我的优先购资格
   * 查询 nft_priority_sale_whitelists WHERE priority_sale_id=? AND user_id=当前用户
   * → 返回资格状态 + 剩余可购数量
   *
   * can_buy_now: is_eligible=true AND status=1 AND sale_status=2 AND 在时间窗口内 AND remaining > 0
   */
  async getEligibility(userId: number, prioritySaleId: number) {
    // 1) 校验活动存在
    const sale = await this.prioritySaleRepo.findOne({
      where: { id: prioritySaleId, isDelete: 0 },
    });
    if (!sale) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '优先购活动不存在',
      });
    }

    // 2) 查询当前用户的白名单记录
    const wl = await this.priorityWhitelistRepo.findOne({
      where: { prioritySaleId, userId, isDelete: 0 },
    });

    const now = new Date();
    const withinTimeWindow = now >= sale.startTime && now <= sale.endTime;
    const isEligible = !!wl;
    const maxQuantity = wl ? wl.maxQuantity : 0;
    const usedQuantity = wl ? wl.usedQuantity : 0;
    const remaining = Math.max(0, maxQuantity - usedQuantity);
    const wlStatus = wl ? wl.status : 0;

    // can_buy_now: is_eligible AND status=1 AND sale_status=2 AND 在时间窗口内 AND remaining > 0
    const canBuyNow =
      isEligible &&
      wlStatus === 1 &&
      sale.status === 2 &&
      withinTimeWindow &&
      remaining > 0;

    return {
      priority_sale_id: prioritySaleId,
      is_eligible: isEligible,
      max_quantity: maxQuantity,
      used_quantity: usedQuantity,
      remaining,
      status: wlStatus,
      sale_status: sale.status,
      can_buy_now: canBuyNow,
    };
  }

  /**
   * 优先购下单
   * 事务内：校验活动进行中(status=2) + 校验时间窗口 + 校验白名单资格(status=1)
   *         + 校验 used_quantity+quantity <= max_quantity
   *         + 乐观锁扣减库存(locked_quantity+=qty，基于 collectibles.version)
   *         + 创建订单(source='release', priority_sale_id=活动ID)
   *         + 创建支付记录(待支付, status=1) + 写入审计日志
   *
   * 注意：白名单 used_quantity 在支付成功回调时再扣减，此处仅校验上限。
   *       序列号(user_collectibles.serial_no) 也在支付回调时生成，此处不处理。
   */
  async buy(userId: number, prioritySaleId: number, dto: PriorityBuyDto) {
    return this.dataSource.transaction(async (manager) => {
      // 1) 校验活动存在
      const sale = await manager.findOne(NftPrioritySale, {
        where: { id: prioritySaleId, isDelete: 0 },
      });
      if (!sale) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '优先购活动不存在',
        });
      }

      // 2) 校验活动进行中(status=2)
      if (sale.status !== 2) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '优先购活动未进行中',
        });
      }

      // 3) 校验当前时间在 start_time ~ end_time
      const now = new Date();
      if (now < sale.startTime || now > sale.endTime) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '不在优先购时间窗口内',
        });
      }

      // 4) 校验白名单 status=1(有效)
      const wl = await manager.findOne(NftPrioritySaleWhitelist, {
        where: { prioritySaleId, userId, isDelete: 0 },
      });
      if (!wl || wl.status !== 1) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          data: null,
          message: '无优先购资格',
        });
      }

      // 5) 原子预扣减 used_quantity（乐观锁，防 TOCTOU 竞态）
      //    下单时即扣减，订单超时取消时在 doCancelOrder 中回补
      const quantity = dto.quantity;
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

      // 6) 校验藏品存在且库存充足
      const collectible = await manager.findOne(NftCollectible, {
        where: { id: sale.collectibleId, isDelete: 0 },
      });
      if (!collectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品不存在',
        });
      }

      const available = collectible.circulate - collectible.lockedQuantity;
      if (available < quantity) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '库存不足',
        });
      }

      // 7) 乐观锁扣减库存(locked_quantity += quantity)，基于 version
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

      // 8) 创建订单(source='release', priority_sale_id=活动ID)
      const unitPrice = Number(collectible.price);
      const totalPrice = Number((unitPrice * quantity).toFixed(2));
      const expiresAt = new Date(
        now.getTime() + ORDER_EXPIRE_MINUTES * 60 * 1000,
      );
      const orderNo = this.generateOrderNo();

      const order = manager.create(NftOrder, {
        orderNo,
        userId,
        collectibleId: sale.collectibleId,
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

      // 9) 创建支付记录(待支付, status=1)
      const payment = manager.create(NftPayment, {
        orderId: Number(savedOrder.id),
        userId,
        amount: totalPrice,
        paymentMethod: dto.payment_method,
        transactionNo: null,
        status: 1, // 待支付
        paidAt: null,
        isDelete: 0,
      });
      await manager.save(NftPayment, payment);

      // 10) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_orders',
        targetId: Number(savedOrder.id),
        action: 'priority_buy',
        oldValue: null,
        newValue: {
          order_id: Number(savedOrder.id),
          priority_sale_id: prioritySaleId,
          collectible_id: sale.collectibleId,
          quantity,
          total_price: totalPrice,
          buyer_id: userId,
        },
        ip: null,
        isDelete: 0,
      });

      // 返回 BaseResponseVo 以携带自定义 message（拦截器会透传，不再二次包装）
      return BaseResponseVo.success(
        {
          order_id: Number(savedOrder.id),
          order_no: orderNo,
          unit_price: unitPrice,
          quantity,
          total_price: totalPrice,
          priority_sale_id: prioritySaleId,
          expires_at: expiresAt,
        },
        '优先购下单成功',
      );
    });
  }

  /**
   * 生成订单号：ORD + yyyyMMddHHmmss + 3位随机数，共 20 位
   * @example ORD20260806143052001
   */
  private generateOrderNo(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = pad(Math.floor(Math.random() * 1000), 3);
    return `ORD${stamp}${rand}`;
  }
}
