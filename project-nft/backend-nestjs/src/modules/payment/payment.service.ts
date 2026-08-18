// [支付模块] - 支付业务服务
// 端点：
//   1. GET  /orders             我的订单列表
//   2. GET  /orders/:id         订单详情
//   3. POST /payments           创建支付
//   4. POST /payments/callback  支付回调（第三方异步通知）
//   5. PUT  /orders/:id/cancel  取消订单
//
// 负责：订单查询 / 创建支付（余额 or 第三方）/ 支付回调（幂等 + 完成订单）/ 取消订单 / 超时订单自动取消定时任务
// 所有资产变动操作均在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException(code 409)。
import { Cron } from '@nestjs/schedule';
import { DataSource, EntityManager, LessThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NftOrder } from '../../database/entities/nft-order.entity';
import { NftPayment } from '../../database/entities/nft-payment.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { NftPrioritySaleWhitelist } from '../../database/entities/nft-priority-sale-whitelist.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftResaleListing } from '../../database/entities/nft-resale-listing.entity';
import { AlipayService } from '../../shared/payment/alipay.service';
import { WechatService } from '../../shared/payment/wechat.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly walletTxnRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    @InjectRepository(NftResaleListing)
    private readonly listingRepo: Repository<NftResaleListing>,
    private readonly dataSource: DataSource,
    private readonly alipayService: AlipayService,
    private readonly wechatService: WechatService,
  ) {}

  // ============================================================
  // 端点 1：GET /orders - 我的订单列表
  // ============================================================
  /**
   * 我的订单列表(分页)
   * 查询当前用户的订单，JOIN nft_collectibles 取藏品名/图，支持 status / source 筛选
   */
  async getOrders(userId: number, query: OrderQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin(NftCollectible, 'c', 'c.id = o.collectible_id')
      .where('o.user_id = :userId', { userId })
      .andWhere('o.is_delete = 0');

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.source) {
      qb.andWhere('o.source = :source', { source: query.source });
    }

    qb.orderBy('o.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'o.id AS id',
        'o.order_no AS order_no',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'o.unit_price AS unit_price',
        'o.quantity AS quantity',
        'o.total_price AS total_price',
        'o.status AS status',
        'o.source AS source',
        'o.priority_sale_id AS priority_sale_id',
        'o.expires_at AS expires_at',
        'o.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        order_no: r.order_no,
        collectible_name: r.collectible_name,
        collectible_image: r.collectible_image,
        unit_price: Number(r.unit_price),
        quantity: Number(r.quantity),
        total_price: Number(r.total_price),
        status: Number(r.status),
        source: r.source,
        is_priority: r.priority_sale_id !== null && r.priority_sale_id !== undefined,
        expires_at: r.expires_at,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 端点 2：GET /orders/:id - 订单详情
  // ============================================================
  /**
   * 订单详情
   * 校验订单归属，返回订单 + 藏品基础信息 + 支付信息
   */
  async getOrderDetail(userId: number, orderId: number) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, userId, isDelete: 0 },
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '订单不存在或不属于您',
      });
    }

    const collectible = await this.collectibleRepo.findOne({
      where: { id: order.collectibleId, isDelete: 0 },
    });

    const payment = await this.paymentRepo.findOne({
      where: { orderId: order.id, isDelete: 0 },
    });

    return {
      id: Number(order.id),
      order_no: order.orderNo,
      collectible: collectible
        ? {
            id: Number(collectible.id),
            name: collectible.name,
            image: collectible.image,
          }
        : null,
      unit_price: Number(order.unitPrice),
      quantity: Number(order.quantity),
      total_price: Number(order.totalPrice),
      status: Number(order.status),
      source: order.source,
      priority_sale_id: order.prioritySaleId,
      paid_at: order.paidAt,
      completed_at: order.completedAt,
      expires_at: order.expiresAt,
      payment: payment
        ? {
            payment_method: payment.paymentMethod,
            status: Number(payment.status),
            transaction_no: payment.transactionNo,
          }
        : null,
    };
  }

  // ============================================================
  // 端点 3：POST /payments - 创建支付
  // ============================================================
  /**
   * 创建支付
   * 校验订单 status=1(待支付) 且未过期 → 按支付方式分发：
   *   - balance：乐观锁扣减余额 → 同步完成支付
   *   - alipay/wechat：创建支付记录 → 调用第三方下单 → 返回支付参数
   *   - huifu/yeepay：TODO，coming_soon
   */
  async createPayment(userId: number, dto: CreatePaymentDto) {
    // 1) 校验订单归属 + 状态 + 有效期
    const order = await this.orderRepo.findOne({
      where: { id: dto.order_id, userId, isDelete: 0 },
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '订单不存在或不属于您',
      });
    }
    if (order.status !== 1) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '订单当前状态不可支付',
      });
    }
    if (new Date(order.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '订单已过期，请重新下单',
      });
    }

    // 2) 按支付方式分发
    if (dto.payment_method === 'balance') {
      return this.payByBalance(userId, order);
    }
    if (dto.payment_method === 'alipay' || dto.payment_method === 'wechat') {
      return this.payByThirdParty(order, dto.payment_method);
    }

    // huifu / yeepay：TODO coming_soon
    // TODO: 接入汇付(huifu) / 易宝(yeepay) 支付通道
    throw new BadRequestException({
      code: ErrorCode.BAD_REQUEST,
      data: null,
      message: '该支付方式暂未开通',
    });
  }

  /**
   * 余额支付：事务内 乐观锁扣减余额 → 更新支付方式 → 调用共享完成方法 → 记录钱包流水
   */
  private async payByBalance(userId: number, order: NftOrder) {
    const transactionNo = this.generateTransactionNo();
    const totalPrice = Number(order.totalPrice);

    const paidAt = await this.dataSource.transaction(async (manager) => {
      // 1) 校验钱包存在
      const wallet = await manager.findOne(NftUserWallet, {
        where: { userId, isDelete: 0 },
      });
      if (!wallet) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '钱包不存在',
        });
      }
      if (Number(wallet.balance) < totalPrice) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '钱包余额不足',
        });
      }

      // 2) 乐观锁扣减余额（条件 balance >= totalPrice 防并发超额扣款，基于 version）
      const walletUpdated = await manager
        .createQueryBuilder()
        .update(NftUserWallet)
        .set({
          balance: () => `balance - ${totalPrice}`,
          totalConsumed: () => `total_consumed + ${totalPrice}`,
          version: () => 'version + 1',
        })
        .where(
          'user_id = :userId AND balance >= :totalPrice AND version = :version',
          { userId, totalPrice, version: wallet.version },
        )
        .execute();
      if (!walletUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '余额扣减失败，请刷新后重试',
        });
      }

      // 3) 更新支付记录 payment_method=balance
      await manager.update(
        NftPayment,
        { orderId: order.id, status: 1 },
        { paymentMethod: 'balance' },
      );

      // 4) 完成订单支付（共享方法，复用当前事务保证原子性）
      await this.completeOrderPayment(order.id, transactionNo, manager);

      // 5) 记录钱包流水（消费 / out）
      const balanceAfter = Number(wallet.balance) - totalPrice;
      await manager.save(NftWalletTransaction, {
        userId,
        type: 'consume',
        amount: totalPrice,
        balanceAfter,
        direction: 'out',
        relatedOrderNo: order.orderNo,
        remark: '余额支付购买藏品',
      });

      // 6) 读取完成后的支付记录，返回 paid_at
      const payment = await manager.findOne(NftPayment, {
        where: { orderId: order.id, isDelete: 0 },
      });
      return payment?.paidAt ?? new Date();
    });

    return {
      payment_id: await this.getPaymentIdByOrder(order.id),
      status: 2,
      paid_at: paidAt,
    };
  }

  /**
   * 第三方支付（alipay/wechat）：更新支付方式 → 调用第三方下单 → 返回支付参数
   * 支付记录保持 status=1(待支付)，等待第三方异步回调完成订单
   */
  private async payByThirdParty(order: NftOrder, method: string) {
    const collectible = await this.collectibleRepo.findOne({
      where: { id: order.collectibleId, isDelete: 0 },
    });
    const subject = collectible?.name ?? '藏品购买';
    const amount = Number(order.totalPrice);

    // 更新待支付记录的 payment_method
    await this.paymentRepo.update(
      { orderId: order.id, status: 1 },
      { paymentMethod: method },
    );

    // 调用第三方下单，获取支付页面 URL
    let pay_url: string;
    if (method === 'alipay') {
      const result = await this.alipayService.createOrder(
        order.orderNo,
        amount,
        subject,
      );
      pay_url = result.pay_url;
    } else {
      // wechat
      const result = await this.wechatService.createOrder(
        order.orderNo,
        amount,
        subject,
      );
      pay_url = result.pay_url;
    }

    const payment = await this.paymentRepo.findOne({
      where: { orderId: order.id, status: 1, isDelete: 0 },
    });

    return {
      payment_id: payment ? Number(payment.id) : 0,
      status: 1,
      pay_url,
    };
  }

  // ============================================================
  // 端点 4：POST /payments/callback - 支付回调
  // ============================================================
  /**
   * 支付回调（第三方异步通知）
   * 流程：验签 → 幂等校验（transaction_no 已处理直接返回）→ 事务内完成订单支付
   *      → 异步触发 mint / 抽奖规则检测（TODO）
   * 注意：本方法内部捕获异常，保证始终返回 void，由控制器统一 res.send('SUCCESS')
   */
  async handleCallback(dto: PaymentCallbackDto): Promise<void> {
    try {
      // 1) 验签
      if (!this.verifyCallbackSignature(dto)) {
        this.logger.warn(
          `[callback] 验签失败 order_no=${dto.order_no} transaction_no=${dto.transaction_no}`,
        );
        return;
      }

      // 2) 仅处理支付成功通知
      if (dto.status !== 'success') {
        this.logger.log(
          `[callback] 支付状态非 success(${dto.status})，忽略`,
        );
        return;
      }

      // 3) 幂等校验：transaction_no 已处理直接返回
      const existing = await this.paymentRepo.findOne({
        where: { transactionNo: dto.transaction_no, isDelete: 0 },
      });
      if (existing && existing.status === 2) {
        this.logger.log(
          `[callback] 交易号 ${dto.transaction_no} 已处理，幂等返回`,
        );
        return;
      }

      // 4) 查找订单
      const order = await this.orderRepo.findOne({
        where: { orderNo: dto.order_no, isDelete: 0 },
      });
      if (!order) {
        this.logger.warn(
          `[callback] 回调订单号不存在: ${dto.order_no}`,
        );
        return;
      }

      // 4.5) 校验支付金额与订单金额一致（防伪造小额支付套取高价藏品）
      const expectedAmount = Number(order.totalPrice);
      if (Math.abs(Number(dto.amount) - expectedAmount) > 0.01) {
        this.logger.error(
          `[callback] 金额不匹配 order_no=${dto.order_no} expected=${expectedAmount} actual=${dto.amount}`,
        );
        return;
      }

      // 5) 事务内完成支付（共享方法，内部开启事务）
      await this.completeOrderPayment(
        Number(order.id),
        dto.transaction_no,
      );

      // 6) 异步 TODO（不阻塞回调返回）
      // TODO: 若 collectible.is_on_chain，触发异步 mint（上链铸造）
      // TODO: 异步检测 hold_collectible 抽奖规则（持有藏品触发抽奖）
    } catch (e: any) {
      // 回调处理异常：记录日志但不抛出，始终由控制器返回 SUCCESS，避免第三方重试风暴
      this.logger.error(
        `[callback] 处理失败 order_no=${dto.order_no} transaction_no=${dto.transaction_no}: ${e?.message}`,
      );
    }
  }

  /**
   * 验签
   * 根据 payment_method 路由到对应支付渠道进行真实验签
   */
  private verifyCallbackSignature(dto: PaymentCallbackDto): boolean {
    // 支付宝验签
    if (dto.payment_method === 'alipay') {
      return this.alipayService.verifyCallback(dto);
    }
    // 微信验签
    if (dto.payment_method === 'wechat') {
      return this.wechatService.verifyCallback(dto);
    }
    this.logger.warn(
      `[callback] 未知支付方式 payment_method=${dto.payment_method}，验签失败`,
    );
    return false;
  }

  // ============================================================
  // 共享：完成订单支付（余额支付 & 第三方回调复用）
  // ============================================================
  /**
   * 完成订单支付（共享私有方法）
   * 事务内：
   *   1) 校验订单 status=1（幂等，非待支付直接跳过）
   *   2) 更新 payment.status=2, paid_at, transaction_no（条件 status=1 保证幂等）
   *   3) 更新 order.status=2, paid_at, completed_at
   *   4) 乐观锁扣减库存（release: circulate-=qty, sold+=qty, locked-=qty）+ 推进 serial_current
   *   5) 生成 user_collectibles（含 serial_no 生成）[release] / 转移所有权 [market]
   *   6) 若优先购：乐观锁扣减白名单 used_quantity
   *   7) 审计日志
   *
   * @param orderId       订单ID
   * @param transactionNo 第三方交易号 / 余额内部交易号
   * @param manager       可选，外部已开启事务时传入以复用，保证与余额扣减原子性
   */
  private async completeOrderPayment(
    orderId: number,
    transactionNo: string,
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (m: EntityManager) => {
      const now = new Date();

      // 1) 加载订单
      const order = await m.findOne(NftOrder, {
        where: { id: orderId, isDelete: 0 },
      });
      if (!order) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '订单不存在',
        });
      }
      // 幂等：订单已非待支付
      if (order.status !== 1) {
        this.logger.log(
          `[completeOrderPayment] 订单 ${orderId} 状态非待支付(${order.status})，跳过`,
        );
        // INT-003 修复：余额支付路径下钱包已扣款，必须抛异常触发事务回滚
        // 回调路径下未扣款，静默跳过即可
        if (manager) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '订单状态已变更，余额已退回',
          });
        }
        return;
      }

      // 2) 更新支付记录 status=2, paid_at, transaction_no（条件 status=1 保证幂等）
      const paymentUpdated = await m
        .createQueryBuilder()
        .update(NftPayment)
        .set({ status: 2, paidAt: now, transactionNo })
        .where('order_id = :orderId AND status = 1 AND is_delete = 0', {
          orderId,
        })
        .execute();
      if (!paymentUpdated.affected) {
        this.logger.log(
          `[completeOrderPayment] 订单 ${orderId} 支付记录已处理，跳过`,
        );
        return;
      }

      // 3) 更新订单 status=2(已完成), paid_at, completed_at（条件 status=1 防重复）
      // INT-001 修复：必须检查 affected，防止"已取消订单仍发货"的竞态
      const orderUpdated = await m
        .createQueryBuilder()
        .update(NftOrder)
        .set({ status: 2, paidAt: now, completedAt: now })
        .where('id = :orderId AND status = 1', { orderId })
        .execute();
      if (!orderUpdated.affected) {
        this.logger.log(
          `[completeOrderPayment] 订单 ${orderId} 已被取消或已处理，跳过后续操作`,
        );
        // 余额支付路径：钱包已扣款，必须回滚
        if (manager) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '订单状态已变更，余额已退回',
          });
        }
        // 回调路径：未扣款，静默跳过
        return;
      }

      const qty = Number(order.quantity);

      // 4) 扣减库存 + 生成用户藏品（release）/ 转移所有权（market）
      if (order.source === 'release') {
        const collectible = await m.findOne(NftCollectible, {
          where: { id: order.collectibleId, isDelete: 0 },
        });
        if (!collectible) {
          throw new NotFoundException({
            code: ErrorCode.NOT_FOUND,
            data: null,
            message: '藏品信息不存在',
          });
        }

        // 乐观锁扣减库存 + 推进 serial_current（一次 UPDATE，基于 version）
        const stockUpdated = await m
          .createQueryBuilder()
          .update(NftCollectible)
          .set({
            circulate: () => `circulate - ${qty}`,
            sold: () => `sold + ${qty}`,
            lockedQuantity: () => `locked_quantity - ${qty}`,
            serialCurrent: () => `serial_current + ${qty}`,
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
            message: '库存扣减冲突，请重试',
          });
        }

        // 审计日志：库存变动
        await m.save(NftOperationLog, {
          adminId: null,
          targetTable: 'nft_collectibles',
          targetId: Number(collectible.id),
          action: 'inventory_deduct',
          oldValue: {
            circulate: collectible.circulate,
            sold: collectible.sold,
            locked: collectible.lockedQuantity,
            serial_current: collectible.serialCurrent,
          },
          newValue: {
            circulate: collectible.circulate - qty,
            sold: collectible.sold + qty,
            locked: collectible.lockedQuantity - qty,
            serial_current: collectible.serialCurrent + qty,
            quantity: qty,
          },
          ip: null,
          isDelete: 0,
        });

        // 生成 user_collectibles（含 serial_no 生成）
        // serial_no = serial_prefix + (serial_current + i + 1).padStart(4, '0')
        const startSerial = collectible.serialCurrent + 1;
        const ucEntities: NftUserCollectible[] = [];
        for (let i = 0; i < qty; i++) {
          const serialNum = startSerial + i;
          const serialNo = `${collectible.serialPrefix}${String(serialNum).padStart(4, '0')}`;
          ucEntities.push(
            m.create(NftUserCollectible, {
              userId: order.userId,
              collectibleId: order.collectibleId,
              orderId: order.id,
              blindBoxItemId: null,
              airdropRecordId: null,
              serialNo,
              source: 'purchase',
              acquiredPrice: order.unitPrice,
              acquiredAt: now,
              isConsigned: 0,
              status: 1,
              txHash: null,
              blockNumber: null,
              tokenId: null,
              mintStatus: null,
              isDelete: 0,
            }),
          );
        }
        await m.save(NftUserCollectible, ucEntities);

        // 优先购：used_quantity 已在下单时原子预扣减，此处无需重复扣减
      } else if (order.source === 'market') {
        // 市场购买：转移寄售藏品所有权给买家 + 卖家钱包入账
        const listing = await m.findOne(NftResaleListing, {
          where: { id: order.resaleListingId, isDelete: 0 },
        });
        if (!listing) {
          throw new NotFoundException({
            code: ErrorCode.NOT_FOUND,
            data: null,
            message: '寄售挂单不存在',
          });
        }
        const uc = await m.findOne(NftUserCollectible, {
          where: { id: listing.userCollectibleId, isDelete: 0 },
        });
        if (uc) {
          // 乐观锁转移所有权：userId=买家, orderId=订单, status=1(持有)
          const ucUpdated = await m
            .createQueryBuilder()
            .update(NftUserCollectible)
            .set({
              userId: order.userId,
              orderId: order.id,
              status: 1,
              acquiredPrice: order.unitPrice,
              acquiredAt: now,
              version: () => 'version + 1',
            })
            .where('id = :id AND version = :version', {
              id: uc.id,
              version: uc.version,
            })
            .execute();
          if (!ucUpdated.affected) {
            throw new ConflictException({
              code: ErrorCode.CONFLICT,
              data: null,
              message: '藏品所有权转移冲突，请重试',
            });
          }
        }

        // INT-002 修复：卖家钱包入账（余额支付 & 第三方回调均在此处理）
        const sellerWallet = await m.findOne(NftUserWallet, {
          where: { userId: listing.sellerId, isDelete: 0 },
        });
        if (sellerWallet) {
          const sellerAmount = Number(order.totalPrice);
          const sellerWalletUpdated = await m
            .createQueryBuilder()
            .update(NftUserWallet)
            .set({
              balance: () => `balance + ${sellerAmount}`,
              totalRecharged: () => `total_recharged + ${sellerAmount}`,
              version: () => 'version + 1',
            })
            .where('id = :id AND version = :version', {
              id: sellerWallet.id,
              version: sellerWallet.version,
            })
            .execute();
          if (!sellerWalletUpdated.affected) {
            throw new ConflictException({
              code: ErrorCode.CONFLICT,
              data: null,
              message: '卖家钱包入账冲突，请重试',
            });
          }
          // 记录卖家钱包流水
          await m.save(NftWalletTransaction, {
            userId: listing.sellerId,
            type: 'recharge',
            amount: sellerAmount,
            balanceAfter: Number(sellerWallet.balance) + sellerAmount,
            direction: 'in',
            relatedOrderNo: order.orderNo,
            remark: '寄售藏品售出收入',
          });
        }
        // listing.status 保持 2(已售出)，无需变动
      }

      // 5) 订单完成审计日志
      await m.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_orders',
        targetId: Number(order.id),
        action: 'complete_payment',
        oldValue: { status: 1 },
        newValue: { status: 2, transaction_no: transactionNo },
        ip: null,
        isDelete: 0,
      });

      // TODO: 若 collectible.is_on_chain，触发异步 mint（上链铸造）
      // TODO: 异步检测 hold_collectible 抽奖规则（持有藏品触发抽奖）
    };

    // 复用外部事务（余额支付），否则内部开启事务（第三方回调）
    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction(run);
  }

  // ============================================================
  // 端点 5：PUT /orders/:id/cancel - 取消订单
  // ============================================================
  /**
   * 取消订单
   * 事务内：校验订单 status=1(待支付) → 调用共享取消方法
   *        → 释放锁定库存(release) / 恢复 listing.status=1(market) → 审计
   * 返回 BaseResponseVo(自定义 message)，由全局拦截器透传
   */
  async cancelOrder(userId: number, orderId: number) {
    await this.dataSource.transaction(async (manager) => {
      // 校验订单归属 + 状态
      const order = await manager.findOne(NftOrder, {
        where: { id: orderId, userId, isDelete: 0 },
      });
      if (!order) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '订单不存在或不属于您',
        });
      }
      if (order.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '订单当前状态不可取消',
        });
      }
      await this.doCancelOrder(manager, order, '用户主动取消');
    });
    return BaseResponseVo.success(null, '订单已取消');
  }

  /**
   * 共享取消订单逻辑（取消端点 & 超时定时任务复用）
   * 事务内：
   *   1) 乐观锁更新 order.status=3(已取消), cancelled_at, cancel_reason（基于 version）
   *   2) release：乐观锁释放锁定库存(locked_quantity -= qty，基于 collectibles.version)
   *      market：乐观锁恢复 listing.status=1(在售，基于 listing.version)
   *   3) 审计日志
   */
  private async doCancelOrder(
    manager: EntityManager,
    order: NftOrder,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    const qty = Number(order.quantity);

    // 1) 乐观锁更新订单 status=3
    const orderUpdated = await manager
      .createQueryBuilder()
      .update(NftOrder)
      .set({
        status: 3,
        cancelledAt: now,
        cancelReason: reason,
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version AND status = 1', {
        id: order.id,
        version: order.version,
      })
      .execute();
    if (!orderUpdated.affected) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        data: null,
        message: '订单状态已变更，请刷新后重试',
      });
    }

    // 2) 释放锁定库存 / 恢复寄售
    if (order.source === 'release') {
      const collectible = await manager.findOne(NftCollectible, {
        where: { id: order.collectibleId, isDelete: 0 },
      });
      if (collectible) {
        const stockUpdated = await manager
          .createQueryBuilder()
          .update(NftCollectible)
          .set({
            lockedQuantity: () => `locked_quantity - ${qty}`,
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
            message: '库存释放冲突，请重试',
          });
        }
        // 审计日志：库存释放
        await manager.save(NftOperationLog, {
          adminId: null,
          targetTable: 'nft_collectibles',
          targetId: Number(collectible.id),
          action: 'release_locked_stock',
          oldValue: { locked: collectible.lockedQuantity, order_status: 1 },
          newValue: {
            locked: collectible.lockedQuantity - qty,
            quantity: qty,
            order_status: 3,
          },
          ip: null,
          isDelete: 0,
        });
      }

      // 如果是优先购订单，回补白名单已购数量
      if (order.prioritySaleId) {
        const wl = await manager.findOne(NftPrioritySaleWhitelist, {
          where: {
            prioritySaleId: order.prioritySaleId,
            userId: order.userId,
            isDelete: 0,
          },
        });
        if (wl && wl.usedQuantity >= qty) {
          const wlUpdated = await manager
            .createQueryBuilder()
            .update(NftPrioritySaleWhitelist)
            .set({
              usedQuantity: () => `used_quantity - ${qty}`,
              version: () => 'version + 1',
            })
            .where('id = :id AND version = :version AND used_quantity >= :qty', {
              id: wl.id,
              version: wl.version,
              qty,
            })
            .execute();
          // INT-010 修复：检查 affected，配额回补失败时记录警告
          if (!wlUpdated.affected) {
            this.logger.warn(
              `[doCancelOrder] 白名单配额回补失败 wl_id=${wl.id}，可能已被其他事务修改`,
            );
          } else {
            await manager.save(NftOperationLog, {
              adminId: null,
              targetTable: 'nft_priority_sale_whitelists',
              targetId: Number(wl.id),
              action: 'restore_priority_quota',
              oldValue: { used_quantity: wl.usedQuantity },
              newValue: { used_quantity: wl.usedQuantity - qty },
              ip: null,
              isDelete: 0,
            });
          }
        }
      }
    } else if (order.source === 'market') {
      // 市场购买：恢复 listing.status=1(在售)
      if (order.resaleListingId) {
        const listing = await manager.findOne(NftResaleListing, {
          where: { id: order.resaleListingId, isDelete: 0 },
        });
        if (listing && listing.status === 2) {
          const listingUpdated = await manager
            .createQueryBuilder()
            .update(NftResaleListing)
            .set({ status: 1, version: () => 'version + 1' })
            .where('id = :id AND version = :version', {
              id: listing.id,
              version: listing.version,
            })
            .execute();
          if (!listingUpdated.affected) {
            throw new ConflictException({
              code: ErrorCode.CONFLICT,
              data: null,
              message: '挂单状态已变更，请重试',
            });
          }
          await manager.save(NftOperationLog, {
            adminId: null,
            targetTable: 'nft_resale_listings',
            targetId: Number(listing.id),
            action: 'restore_listing',
            oldValue: { status: 2 },
            newValue: { status: 1 },
            ip: null,
            isDelete: 0,
          });
        }
      }
    }

    // 3) 订单取消审计日志
    await manager.save(NftOperationLog, {
      adminId: null,
      targetTable: 'nft_orders',
      targetId: Number(order.id),
      action: 'cancel_order',
      oldValue: { status: 1 },
      newValue: { status: 3, reason },
      ip: null,
      isDelete: 0,
    });
  }

  // ============================================================
  // 定时任务：超时订单自动取消
  // ============================================================
  /**
   * 每 5 分钟扫描超时订单（status=1 且 expires_at < NOW()），自动取消并释放库存
   * - release 订单：释放锁定库存
   * - market 订单：恢复 listing.status=1
   */
  @Cron('*/5 * * * *')
  private async cancelExpiredOrders(): Promise<void> {
    const expired = await this.orderRepo.find({
      where: { status: 1, expiresAt: LessThan(new Date()), isDelete: 0 },
    });
    if (!expired.length) return;

    this.logger.log(
      `[Cron] 扫描到 ${expired.length} 笔超时未支付订单，开始自动取消`,
    );

    for (const o of expired) {
      try {
        await this.dataSource.transaction(async (manager) => {
          // 重新加载订单，获取最新 version 并二次确认状态
          const order = await manager.findOne(NftOrder, {
            where: { id: o.id, isDelete: 0 },
          });
          if (!order || order.status !== 1) return;
          await this.doCancelOrder(
            manager,
            order,
            '订单超时未支付，系统自动取消',
          );
        });
        this.logger.log(`[Cron] 订单 ${o.id} 已超时自动取消`);
      } catch (e: any) {
        this.logger.error(
          `[Cron] 订单 ${o.id} 自动取消失败: ${e?.message}`,
        );
      }
    }
  }

  // ============================================================
  // 私有工具方法
  // ============================================================
  /**
   * 获取订单对应的支付记录ID
   */
  private async getPaymentIdByOrder(orderId: number): Promise<number> {
    const payment = await this.paymentRepo.findOne({
      where: { orderId, isDelete: 0 },
    });
    return payment ? Number(payment.id) : 0;
  }

  /**
   * 生成余额支付内部交易号：BAL + yyyyMMddHHmmss + 3位随机数
   * @example BAL20260806143052001
   */
  private generateTransactionNo(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = pad(Math.floor(Math.random() * 1000), 3);
    return `BAL${stamp}${rand}`;
  }
}
