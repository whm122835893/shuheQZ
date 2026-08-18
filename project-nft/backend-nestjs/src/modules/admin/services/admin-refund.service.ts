// [管理后台-退款管理模块] - AdminRefundService
// 4 个端点的业务逻辑：退款列表、详情、审批通过、审批拒绝
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftRefund } from '../../../database/entities/nft-refund.entity';
import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftPayment } from '../../../database/entities/nft-payment.entity';
import { NftUserWallet } from '../../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../../database/entities/nft-wallet-transaction.entity';

@Injectable()
export class AdminRefundService {
  private readonly logger = new Logger(AdminRefundService.name);

  constructor(
    @InjectRepository(NftRefund)
    private readonly refundRepo: Repository<NftRefund>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly walletTxRepo: Repository<NftWalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. 分页退款列表（按 status/日期范围过滤）
   */
  async findList(query: {
    page?: number;
    pageSize?: number;
    status?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ list: NftRefund[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.refundRepo.createQueryBuilder('r');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.startDate) {
      qb.andWhere('r.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('r.created_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('r.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 2. 退款详情（含订单信息、支付信息）
   */
  async findOne(id: number): Promise<any> {
    const refund = await this.refundRepo.findOne({ where: { id } });
    if (!refund) {
      throw new NotFoundException(`退款记录 #${id} 不存在`);
    }

    const [order, payment] = await Promise.all([
      this.orderRepo.findOne({ where: { id: refund.orderId } }),
      refund.paymentId
        ? this.paymentRepo.findOne({ where: { id: refund.paymentId } })
        : Promise.resolve(null),
    ]);

    return {
      ...refund,
      order: order || null,
      payment: payment || null,
    };
  }

  /**
   * 3. 审批通过退款（status=1 已通过，然后处理退款到用户钱包，status=3 已退款）
   *
   * 安全措施：状态检查在事务内使用悲观锁（FOR UPDATE）重新查询，防止 TOCTOU 竞态
   */
  async approve(id: number, adminId: number): Promise<NftRefund> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 事务内加悲观锁重新查询退款记录，防止并发审批
      const refund = await queryRunner.manager
        .createQueryBuilder(NftRefund, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id })
        .getOne();

      if (!refund) {
        throw new NotFoundException(`退款记录 #${id} 不存在`);
      }

      // 在事务内检查状态，防止并发请求重复审批
      if (refund.status !== 0) {
        throw new BadRequestException(
          `退款状态为 ${refund.status}，无法审批（仅待审核退款可审批）`,
        );
      }

      const now = new Date();

      // 1) 设置退款状态为已通过(1)
      refund.status = 1;
      refund.adminId = adminId;
      await queryRunner.manager.save(refund);

      // 2) 处理退款到用户钱包
      let wallet = await queryRunner.manager.findOne(NftUserWallet, {
        where: { userId: refund.userId },
      });

      if (!wallet) {
        // 如果用户没有钱包，创建一个
        wallet = new NftUserWallet();
        wallet.userId = refund.userId;
        wallet.balance = 0;
        wallet.frozenBalance = 0;
        wallet.totalRecharged = 0;
        wallet.totalConsumed = 0;
      }

      const refundAmount = Number(refund.amount);
      wallet.balance = Number(wallet.balance) + refundAmount;
      await queryRunner.manager.save(wallet);

      // 3) 记录钱包流水
      const walletTx = new NftWalletTransaction();
      walletTx.userId = refund.userId;
      walletTx.type = 'recharge';
      walletTx.amount = refundAmount;
      walletTx.balanceAfter = Number(wallet.balance);
      walletTx.direction = 'in';
      walletTx.relatedOrderNo = refund.refundNo;
      walletTx.remark = `退款到账 - ${refund.reason}`;
      await queryRunner.manager.save(walletTx);

      // 4) 设置退款状态为已退款(3)
      refund.status = 3;
      refund.tradeNo = `RFD${now.getTime()}${Math.floor(Math.random() * 10000)}`;
      await queryRunner.manager.save(refund);

      // 5) 更新订单状态为已取消(4)
      const order = await queryRunner.manager.findOne(NftOrder, {
        where: { id: refund.orderId },
      });
      if (order && order.status !== 4) {
        order.status = 4;
        order.cancelledAt = now;
        order.cancelReason = `退款 ${refund.refundNo}`;
        await queryRunner.manager.save(order);
      }

      await queryRunner.commitTransaction();
      return refund;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`审批退款失败 #${id}: ${err.message}`, err.stack);
      throw new HttpException(
        '审批退款失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 4. 拒绝退款（status=2 已拒绝，添加备注）
   *
   * 安全措施：状态检查在事务内使用悲观锁，防止并发操作
   */
  async reject(id: number, adminId: number, comment: string): Promise<NftRefund> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 事务内加悲观锁重新查询
      const refund = await queryRunner.manager
        .createQueryBuilder(NftRefund, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id })
        .getOne();

      if (!refund) {
        throw new NotFoundException(`退款记录 #${id} 不存在`);
      }

      if (refund.status !== 0) {
        throw new BadRequestException(
          `退款状态为 ${refund.status}，无法拒绝（仅待审核退款可拒绝）`,
        );
      }

      refund.status = 2; // 2=已拒绝
      refund.adminId = adminId;
      refund.tradeNo = null;
      refund.rejectReason = comment || '管理员拒绝';

      const saved = await queryRunner.manager.save(refund);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`拒绝退款失败 #${id}: ${err.message}`, err.stack);
      throw new HttpException(
        '拒绝退款失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
