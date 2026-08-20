// [管理后台-钱包管理模块] - AdminWalletService
// 实现平台余额概览、冻结统计、充值审核、流水查询、手续费统计、资金守恒校验、异常交易、手动调账。
//
// 关键设计：
//  - 余额概览：聚合 nft_user_wallets 的 balance/frozen_balance/total_recharged/total_consumed
//  - 充值审核：驳回时冲正余额（扣除 balance、调减 total_recharged、生成冲正流水）
//  - 手动调账：先创建审批记录，再调整钱包余额并生成流水
//  - 资金守恒：total_recharged - total_consumed - current_balance 应为 0
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftUserWallet } from '../../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../../database/entities/nft-wallet-transaction.entity';
import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftPayment } from '../../../database/entities/nft-payment.entity';
import { NftApproval } from '../../../database/entities/nft-approval.entity';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 工具：将可能为字符串的数值转为 number */
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

@Injectable()
export class AdminWalletService {
  constructor(
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly txRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 平台余额概览
  // ============================================================

  /** 平台余额总览（所有用户钱包聚合） */
  async getBalanceOverview(): Promise<Record<string, any>> {
    const row = await this.walletRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.balance),0)', 'totalBalance')
      .addSelect('COALESCE(SUM(w.frozen_balance),0)', 'totalFrozen')
      .addSelect('COALESCE(SUM(w.total_recharged),0)', 'totalRecharged')
      .addSelect('COALESCE(SUM(w.total_consumed),0)', 'totalConsumed')
      .addSelect('COUNT(w.id)', 'walletCount')
      .where('w.is_delete = 0')
      .getRawOne();

    return {
      totalBalance: toNum(row.totalBalance).toFixed(2),
      totalFrozen: toNum(row.totalFrozen).toFixed(2),
      totalRecharged: toNum(row.totalRecharged).toFixed(2),
      totalConsumed: toNum(row.totalConsumed).toFixed(2),
      walletCount: Number(row.walletCount),
    };
  }

  /** 冻结余额统计 */
  async getFrozenStats(): Promise<Record<string, any>> {
    const row = await this.walletRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.frozen_balance),0)', 'totalFrozen')
      .addSelect('COUNT(w.id)', 'frozenCount')
      .where('w.is_delete = 0')
      .andWhere('w.frozen_balance > 0')
      .getRawOne();

    const list = await this.walletRepo
      .createQueryBuilder('w')
      .where('w.is_delete = 0')
      .andWhere('w.frozen_balance > 0')
      .orderBy('w.frozen_balance', 'DESC')
      .limit(20)
      .getMany();

    return {
      totalFrozen: toNum(row.totalFrozen).toFixed(2),
      frozenCount: Number(row.frozenCount),
      topAccounts: list.map((w) => ({
        userId: w.userId,
        frozenBalance: w.frozenBalance,
        balance: w.balance,
      })),
    };
  }

  // ============================================================
  // 充值记录与审核
  // ============================================================

  /** 充值记录分页（wallet_transactions where type='recharge'） */
  async getRechargeList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<NftWalletTransaction>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.type = :type', { type: 'recharge' });

    if (query.userId) {
      qb.andWhere('t.user_id = :userId', { userId: Number(query.userId) });
    }
    if (query.startDate) {
      qb.andWhere('t.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('t.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 充值审核（通过 / 驳回冲正） */
  async auditRecharge(
    id: number,
    body: Record<string, any>,
    admin: { id: number; realName: string },
  ): Promise<any> {
    const tx = await this.txRepo.findOne({ where: { id } });
    if (!tx || tx.type !== 'recharge') {
      throw new NotFoundException('充值记录不存在');
    }

    const action = body.status || body.action;
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException("status 必须为 approve 或 reject");
    }

    if (action === 'approve') {
      await this.txRepo.update(id, {
        remark: body.remark || '充值审核通过',
      });
      return { id, status: 'approve' };
    }

    // 驳回：冲正余额
    const amount = Number(tx.amount);
    await this.dataSource.transaction(async (mgr) => {
      const wallet = await mgr.findOne(NftUserWallet, {
        where: { userId: tx.userId },
      });
      if (!wallet) {
        throw new NotFoundException('用户钱包不存在');
      }
      const newBalance = Number(wallet.balance) - amount;
      const newRecharged = Number(wallet.totalRecharged) - amount;
      await mgr.update(
        NftUserWallet,
        { userId: tx.userId },
        {
          balance: newBalance,
          totalRecharged: newRecharged,
        },
      );
      // 冲正流水
      const reversal = this.txRepo.create({
        userId: tx.userId,
        type: 'consume',
        amount,
        balanceAfter: newBalance,
        direction: 'out',
        relatedOrderNo: tx.relatedOrderNo,
        remark: `充值审核驳回-冲正 (原充值#${tx.id})`,
      });
      await mgr.save(reversal);
      // 更新原充值记录备注
      await mgr.update(NftWalletTransaction, id, {
        remark: body.remark || `充值审核驳回`,
      });
    });

    return { id, status: 'reject', adminId: admin.id };
  }

  // ============================================================
  // 钱包流水
  // ============================================================

  /** 所有钱包流水（分页 + 筛选） */
  async getTransactionList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<NftWalletTransaction>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.txRepo.createQueryBuilder('t');

    if (query.userId) {
      qb.andWhere('t.user_id = :userId', { userId: Number(query.userId) });
    }
    if (query.type) {
      qb.andWhere('t.type = :type', { type: query.type });
    }
    if (query.direction) {
      qb.andWhere('t.direction = :direction', { direction: query.direction });
    }
    if (query.relatedOrderNo) {
      qb.andWhere('t.related_order_no = :no', { no: query.relatedOrderNo });
    }
    if (query.startDate) {
      qb.andWhere('t.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('t.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 手续费统计
  // ============================================================

  /** 手续费统计（订单成交额 + 市场交易额 + 估算手续费） */
  async getFeeStats(query: Record<string, any>): Promise<Record<string, any>> {
    const startQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .andWhere('o.completed_at IS NOT NULL');

    if (query.startDate) {
      startQb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      startQb.andWhere('o.created_at <= :end', { end: query.endDate });
    }

    const row = await startQb
      .select('COALESCE(SUM(o.total_price),0)', 'totalVolume')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect(
        'COALESCE(SUM(CASE WHEN o.source = :rel THEN o.total_price ELSE 0 END),0)',
        'releaseVolume',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN o.source = :mkt THEN o.total_price ELSE 0 END),0)',
        'marketVolume',
      )
      .setParameter('rel', 'release')
      .setParameter('mkt', 'market')
      .getRawOne();

    const totalVolume = toNum(row.totalVolume);
    const marketVolume = toNum(row.marketVolume);
    // 手续费率可由 system_configs 配置，此处默认 0，实际由调用方配置
    const feeRate = Number(query.feeRate) || 0;
    const estimatedFee = (totalVolume * feeRate) / 100;

    return {
      totalVolume: totalVolume.toFixed(2),
      releaseVolume: toNum(row.releaseVolume).toFixed(2),
      marketVolume: marketVolume.toFixed(2),
      orderCount: Number(row.orderCount),
      feeRate,
      estimatedFee: estimatedFee.toFixed(2),
    };
  }

  // ============================================================
  // 资金守恒校验
  // ============================================================

  /** 资金守恒校验：total_recharged - total_consumed - current_balance 应为 0 */
  async getConservation(): Promise<Record<string, any>> {
    const row = await this.walletRepo
      .createQueryBuilder('w')
      .select('COALESCE(SUM(w.balance),0)', 'currentBalance')
      .addSelect('COALESCE(SUM(w.frozen_balance),0)', 'totalFrozen')
      .addSelect('COALESCE(SUM(w.total_recharged),0)', 'totalRecharged')
      .addSelect('COALESCE(SUM(w.total_consumed),0)', 'totalConsumed')
      .where('w.is_delete = 0')
      .getRawOne();

    const currentBalance = toNum(row.currentBalance);
    const totalRecharged = toNum(row.totalRecharged);
    const totalConsumed = toNum(row.totalConsumed);

    // 守恒公式：累计充值 - 累计消费 - 当前余额(含冻结) 应为 0
    const diff = totalRecharged - totalConsumed - currentBalance;

    return {
      totalRecharged: totalRecharged.toFixed(2),
      totalConsumed: totalConsumed.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
      totalFrozen: toNum(row.totalFrozen).toFixed(2),
      diff: diff.toFixed(2),
      isBalanced: Math.abs(diff) < 0.01,
    };
  }

  // ============================================================
  // 异常交易
  // ============================================================

  /** 异常交易（金额 <=0 或 余额为负 或 冻结异常） */
  async getAbnormalList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.amount <= 0')
      .orWhere('t.balance_after < 0');

    if (query.userId) {
      qb.andWhere('t.user_id = :userId', { userId: Number(query.userId) });
    }
    if (query.startDate) {
      qb.andWhere('t.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('t.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('t.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 手动调账
  // ============================================================

  /** 手动调账：创建审批记录 + 调整钱包余额 + 生成流水 */
  async adjust(
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<any> {
    const userId = Number(body.userId);
    const amount = Number(body.amount);
    const direction = body.direction; // 'in' | 'out'
    const reason = body.reason || '手动调账';

    if (!userId || !amount || amount <= 0) {
      throw new BadRequestException('userId、amount 必填且 amount 须大于 0');
    }
    if (direction !== 'in' && direction !== 'out') {
      throw new BadRequestException("direction 必须为 in 或 out");
    }

    return this.dataSource.transaction(async (mgr) => {
      const wallet = await mgr.findOne(NftUserWallet, {
        where: { userId, isDelete: 0 },
      });
      if (!wallet) {
        throw new NotFoundException('用户钱包不存在');
      }

      const absAmount = Math.abs(amount);
      let newBalance: number;
      let newRecharged = Number(wallet.totalRecharged);
      let newConsumed = Number(wallet.totalConsumed);

      if (direction === 'in') {
        newBalance = Number(wallet.balance) + absAmount;
        newRecharged += absAmount;
      } else {
        newBalance = Number(wallet.balance) - absAmount;
        newConsumed += absAmount;
      }

      await mgr.update(
        NftUserWallet,
        { userId },
        {
          balance: newBalance,
          totalRecharged: newRecharged,
          totalConsumed: newConsumed,
        },
      );

      // 生成流水
      const tx = this.txRepo.create({
        userId,
        type: direction === 'in' ? 'recharge' : 'consume',
        amount: absAmount,
        balanceAfter: newBalance,
        direction,
        remark: reason,
      });
      await mgr.save(tx);

      // 创建审批记录（已应用）
      const approval = this.approvalRepo.create({
        type: 'wallet_adjust',
        targetId: userId,
        applicantId: admin.id,
        applicantName: admin.realName || admin.username,
        content: { userId, amount: absAmount, direction, reason, txId: tx.id },
        status: 1,
        approverId: admin.id,
        approverName: admin.realName || admin.username,
        approverRemark: '手动调账已即时应用',
        approvedAt: new Date(),
      });
      await mgr.save(approval);

      return {
        userId,
        direction,
        amount: absAmount,
        balanceAfter: newBalance,
        approvalId: approval.id,
        txId: tx.id,
      };
    });
  }
}
