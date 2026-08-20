// [管理后台-订单管理模块] - AdminOrderService
// 8 个端点的业务逻辑：订单列表、详情、取消、标记已付、发起退款、异常订单、修复异常、导出
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftPayment } from '../../../database/entities/nft-payment.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';
import { NftRefund } from '../../../database/entities/nft-refund.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';

/** 订单状态常量 */
const ORDER_STATUS = {
  PENDING: 1,
  PAID: 2,
  DELIVERING: 3,
  CANCELLED: 4,
  EXPIRED: 5,
} as const;

/** 订单状态转换映射（from -> 允许的 to 列表） */
const ORDER_TRANSITIONS: Record<number, number[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED, ORDER_STATUS.EXPIRED],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.DELIVERING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERING]: [ORDER_STATUS.CANCELLED],
};

/** 检查订单状态是否可以从 from 转换到 to */
function canTransitionOrder(from: number, to: number): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

@Injectable()
export class AdminOrderService {
  private readonly logger = new Logger(AdminOrderService.name);

  constructor(
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftRefund)
    private readonly refundRepo: Repository<NftRefund>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. 分页订单列表（支持按 order_no 搜索，按 status/source/user_id/日期范围过滤）
   */
  async findList(query: {
    page?: number;
    pageSize?: number;
    orderNo?: string;
    status?: number;
    source?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0');

    if (query.orderNo) {
      qb.andWhere('o.order_no = :orderNo', { orderNo: query.orderNo });
    }
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.source) {
      qb.andWhere('o.source = :source', { source: query.source });
    }
    if (query.userId) {
      qb.andWhere('o.user_id = :userId', { userId: query.userId });
    }
    if (query.startDate) {
      qb.andWhere('o.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('o.created_at', 'DESC');
    qb.skip(skip).take(pageSize);

    const [orders, total] = await qb.getManyAndCount();

    // 批量查询关联的用户和藏品信息，避免 N+1 问题
    if (orders.length > 0) {
      const userIds = [...new Set(orders.map((o) => o.userId))];
      const collectibleIds = [...new Set(orders.map((o) => o.collectibleId))];

      const [users, collectibles] = await Promise.all([
        userIds.length > 0
          ? this.userRepo
              .createQueryBuilder('u')
              .select(['u.id', 'u.phone', 'u.username', 'u.uid', 'u.avatar'])
              .where('u.id IN (:...userIds)', { userIds })
              .getMany()
          : [],
        collectibleIds.length > 0
          ? this.collectibleRepo
              .createQueryBuilder('c')
              .select(['c.id', 'c.name', 'c.image', 'c.price'])
              .where('c.id IN (:...collectibleIds)', { collectibleIds })
              .getMany()
          : [],
      ]);

      const userMap = new Map<number, any>(users.map((u) => [u.id, u] as [number, any]));
      const collectibleMap = new Map<number, any>(collectibles.map((c) => [c.id, c] as [number, any]));

      const list = orders.map((order) => ({
        ...order,
        user: userMap.get(order.userId) || null,
        collectible: collectibleMap.get(order.collectibleId) || null,
      }));

      return { list, total, page, pageSize };
    }

    return { list: [], total, page, pageSize };
  }

  /**
   * 2. 订单详情（含支付信息、用户信息、藏品信息）
   */
  async findOne(id: number): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!order) {
      throw new NotFoundException(`订单 #${id} 不存在`);
    }

    const [payment, user, collectible] = await Promise.all([
      this.paymentRepo.findOne({ where: { orderId: id, isDelete: 0 } }),
      this.userRepo.findOne({ where: { id: order.userId } }),
      this.collectibleRepo.findOne({ where: { id: order.collectibleId } }),
    ]);

    return {
      ...order,
      payment: payment || null,
      user: user
        ? {
            id: user.id,
            phone: user.phone,
            username: user.username,
            uid: user.uid,
            avatar: user.avatar,
          }
        : null,
      collectible: collectible
        ? {
            id: collectible.id,
            name: collectible.name,
            image: collectible.image,
            price: collectible.price,
          }
        : null,
    };
  }

  /**
   * 3. 取消订单（管理员操作）
   */
  async cancelOrder(id: number, adminId: number, reason: string): Promise<NftOrder> {
    const order = await this.orderRepo.findOne({ where: { id, isDelete: 0 } });
    if (!order) {
      throw new NotFoundException(`订单 #${id} 不存在`);
    }

    // 待支付或已过期的订单可以取消
    if (!canTransitionOrder(order.status, ORDER_STATUS.CANCELLED)) {
      throw new BadRequestException(`订单状态为 ${order.status}，无法取消（仅待支付或已过期的订单可取消）`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      order.status = ORDER_STATUS.CANCELLED;
      order.cancelledAt = new Date();
      order.cancelReason = reason || '管理员取消';
      await queryRunner.manager.save(order);

      // 如果有关联的寄售，恢复寄售状态（status 3->1）
      if (order.resaleListingId) {
        await queryRunner.manager
          .createQueryBuilder()
          .update('NftResaleListing')
          .set({ status: 1 })
          .where('id = :id', { id: order.resaleListingId })
          .execute();
      }

      await queryRunner.commitTransaction();
      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`取消订单失败: ${err.message}`, err.stack);
      throw new HttpException(
        '取消订单失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 4. 手动标记已支付（创建支付记录，更新订单状态）
   */
  async markPaid(id: number, adminId: number, dto: { paymentMethod?: string; remark?: string }): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id, isDelete: 0 } });
    if (!order) {
      throw new NotFoundException(`订单 #${id} 不存在`);
    }

    if (!canTransitionOrder(order.status, ORDER_STATUS.PAID)) {
      throw new BadRequestException(`订单状态为 ${order.status}，无法标记已支付（仅待支付订单可操作）`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();

      // 创建支付记录
      const payment = new NftPayment();
      payment.orderId = order.id;
      payment.userId = order.userId;
      payment.amount = Number(order.totalPrice);
      payment.paymentMethod = (dto.paymentMethod as any) || 'balance';
      payment.transactionNo = `MANUAL${now.getTime()}${crypto.randomInt(10000)}`;
      payment.status = 2; // 2=支付成功
      payment.paidAt = now;
      await queryRunner.manager.save(payment);

      // 更新订单状态为已支付
      order.status = ORDER_STATUS.PAID;
      order.paidAt = now;
      await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return { order, payment };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`标记支付失败: ${err.message}`, err.stack);
      throw new HttpException(
        '标记支付失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 5. 发起退款（创建 nft_refunds 记录，status=0 待审核）
   */
  async initiateRefund(id: number, adminId: number, dto: { reason: string; amount?: number }): Promise<NftRefund> {
    const order = await this.orderRepo.findOne({ where: { id, isDelete: 0 } });
    if (!order) {
      throw new NotFoundException(`订单 #${id} 不存在`);
    }

    // 已支付或已发货的订单可以发起退款
    if (order.status !== ORDER_STATUS.PAID && order.status !== ORDER_STATUS.DELIVERING) {
      throw new BadRequestException(`订单状态为 ${order.status}，无法发起退款`);
    }

    // 检查是否已有未处理的退款
    const existingRefund = await this.refundRepo.findOne({
      where: { orderId: id, status: 0 },
    });
    if (existingRefund) {
      throw new BadRequestException(`订单 #${id} 已有待处理的退款申请`);
    }

    const payment = await this.paymentRepo.findOne({
      where: { orderId: id, status: 2, isDelete: 0 },
    });

    const refund = new NftRefund();
    refund.orderId = order.id;
    refund.paymentId = payment?.id ?? null;
    refund.userId = order.userId;
    refund.refundNo = `RF${Date.now()}${crypto.randomInt(10000)}`;
    refund.amount = dto.amount ? Number(dto.amount) : Number(order.totalPrice);
    refund.reason = dto.reason;
    refund.adminId = adminId;
    refund.status = 0; // 0=待审核
    refund.channel = payment?.paymentMethod || 'balance';

    return this.refundRepo.save(refund);
  }

  /**
   * 6. 异常订单列表（已过期但未取消，或已支付但未完成）
   */
  async findAbnormal(query: { page?: number; pageSize?: number }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .andWhere(
        // 已过期但未取消 (待支付且 expires_at < now)
        `(o.status = ${ORDER_STATUS.PENDING} AND o.expires_at < :now) ` +
        // 或已支付但未完成
        `OR (o.status = ${ORDER_STATUS.PAID})`,
        { now },
      )
      .orderBy('o.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 7. 修复异常订单
   */
  async repairOrder(id: number, adminId: number): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id, isDelete: 0 } });
    if (!order) {
      throw new NotFoundException(`订单 #${id} 不存在`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      const isExpired = order.status === ORDER_STATUS.PENDING && order.expiresAt < now;
      const isPaidNotCompleted = order.status === ORDER_STATUS.PAID;

      if (isExpired) {
        // 过期未取消 -> 取消
        if (!canTransitionOrder(order.status, ORDER_STATUS.CANCELLED)) {
          throw new BadRequestException(`订单 #${id} 状态为 ${order.status}，无法取消`);
        }
        order.status = ORDER_STATUS.CANCELLED;
        order.cancelledAt = now;
        order.cancelReason = '系统修复：过期未支付自动取消';

        // 恢复寄售状态
        if (order.resaleListingId) {
          await queryRunner.manager
            .createQueryBuilder()
            .update('NftResaleListing')
            .set({ status: 1 })
            .where('id = :id', { id: order.resaleListingId })
            .execute();
        }
      } else if (isPaidNotCompleted) {
        // 已支付未完成 -> 完成订单，发放藏品
        if (!canTransitionOrder(order.status, ORDER_STATUS.DELIVERING)) {
          throw new BadRequestException(`订单 #${id} 状态为 ${order.status}，无法转换为发货状态`);
        }
        order.status = ORDER_STATUS.DELIVERING;
        order.completedAt = now;

        // 创建用户藏品记录
        const collectible = await this.collectibleRepo.findOne({
          where: { id: order.collectibleId },
        });
        if (collectible) {
          const userCollectible = new NftUserCollectible();
          userCollectible.userId = order.userId;
          userCollectible.collectibleId = order.collectibleId;
          userCollectible.orderId = order.id;
          userCollectible.serialNo = `${collectible.serialPrefix}${String(collectible.serialCurrent + 1).padStart(4, '0')}`;
          userCollectible.source = order.source === 'market' ? 'purchase' : 'purchase';
          userCollectible.acquiredPrice = Number(order.unitPrice);
          userCollectible.acquiredAt = now;
          userCollectible.status = 1;
          await queryRunner.manager.save(userCollectible);

          // 使用乐观锁更新 collectible（version 字段防止并发超卖）
          const updateResult = await queryRunner.manager
            .createQueryBuilder()
            .update(NftCollectible)
            .set({
              sold: () => 'sold + ' + order.quantity,
              serialCurrent: () => 'serial_current + 1',
            })
            .where('id = :id AND version = :version', {
              id: collectible.id,
              version: collectible.version,
            })
            .execute();
          if (updateResult.affected === 0) {
            throw new BadRequestException('藏品库存已被其他操作修改，请重试');
          }
          // 递增版本号
          collectible.version += 1;
        }

        // 如果是寄售订单，更新寄售状态为已售
        if (order.resaleListingId) {
          await queryRunner.manager
            .createQueryBuilder()
            .update('NftResaleListing')
            .set({ status: 2 })
            .where('id = :id', { id: order.resaleListingId })
            .execute();
        }
      } else {
        throw new BadRequestException(`订单 #${id} 状态为 ${order.status}，非异常订单`);
      }

      await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return { order, repaired: true, action: isExpired ? 'cancelled' : 'completed' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`修复订单失败: ${err.message}`, err.stack);
      throw new HttpException(
        '修复订单失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 8. 导出订单（CSV）
   */
  async exportOrders(query: {
    orderNo?: string;
    status?: number;
    source?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<string> {
    const qb = this.orderRepo.createQueryBuilder('o').where('o.is_delete = 0');

    if (query.orderNo) {
      qb.andWhere('o.order_no = :orderNo', { orderNo: query.orderNo });
    }
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.source) {
      qb.andWhere('o.source = :source', { source: query.source });
    }
    if (query.userId) {
      qb.andWhere('o.user_id = :userId', { userId: query.userId });
    }
    if (query.startDate) {
      qb.andWhere('o.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('o.created_at', 'DESC').limit(10000);
    const orders = await qb.getMany();

    const statusMap: Record<number, string> = {
      [ORDER_STATUS.PENDING]: '待支付',
      [ORDER_STATUS.PAID]: '已支付',
      [ORDER_STATUS.DELIVERING]: '已完成',
      [ORDER_STATUS.CANCELLED]: '已取消',
      [ORDER_STATUS.EXPIRED]: '已过期',
    };

    const header = [
      'ID',
      '订单号',
      '用户ID',
      '藏品ID',
      '单价',
      '数量',
      '总价',
      '状态',
      '来源',
      '支付时间',
      '完成时间',
      '取消时间',
      '过期时间',
      '创建时间',
    ];

    const rows = orders.map((o) => [
      o.id,
      o.orderNo,
      o.userId,
      o.collectibleId,
      o.unitPrice,
      o.quantity,
      o.totalPrice,
      statusMap[o.status] || String(o.status),
      o.source,
      o.paidAt ? new Date(o.paidAt).toISOString() : '',
      o.completedAt ? new Date(o.completedAt).toISOString() : '',
      o.cancelledAt ? new Date(o.cancelledAt).toISOString() : '',
      o.expiresAt ? new Date(o.expiresAt).toISOString() : '',
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csv;
  }
}
