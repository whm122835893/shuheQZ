// [管理后台-报表统计模块] - AdminReportService
// 实现销售、用户、藏品、盲盒、财务报表及自定义导出。
//
// 关键设计：
//  - 销售/财务按时间维度聚合，支持 daily/weekly/monthly
//  - 使用 MySQL DATE_FORMAT 按周期分组
//  - 自定义导出根据 config.dataSource + config.fields 动态生成 CSV
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftPayment } from '../../../database/entities/nft-payment.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';
import { NftBlindBox } from '../../../database/entities/nft-blind-box.entity';
import { NftBlindBoxOpenRecord } from '../../../database/entities/nft-blind-box-open-record.entity';
import { NftWalletTransaction } from '../../../database/entities/nft-wallet-transaction.entity';
import { NftRefund } from '../../../database/entities/nft-refund.entity';
import { NftUserWallet } from '../../../database/entities/nft-user-wallet.entity';

/** 工具：将可能为字符串的数值转为 number */
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** 根据周期返回 DATE_FORMAT 格式串 */
function getFormat(period: string): string {
  switch (period) {
    case 'weekly':
      return '%Y-%u';
    case 'monthly':
      return '%Y-%m';
    case 'daily':
    default:
      return '%Y-%m-%d';
  }
}

@Injectable()
export class AdminReportService {
  constructor(
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftBlindBox)
    private readonly blindBoxRepo: Repository<NftBlindBox>,
    @InjectRepository(NftBlindBoxOpenRecord)
    private readonly openRecordRepo: Repository<NftBlindBoxOpenRecord>,
    @InjectRepository(NftWalletTransaction)
    private readonly txRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftRefund)
    private readonly refundRepo: Repository<NftRefund>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
  ) {}

  // ============================================================
  // 销售报表
  // ============================================================

  async getSalesReport(query: Record<string, any>): Promise<any> {
    const period = query.period || 'daily';
    const fmt = getFormat(period);

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .andWhere('o.completed_at IS NOT NULL');

    if (query.startDate) {
      qb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :end', { end: query.endDate });
    }

    const rows = await qb
      .select(`DATE_FORMAT(o.completed_at, :fmt)`, 'period')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('COALESCE(SUM(o.total_price),0)', 'totalAmount')
      .addSelect('COALESCE(SUM(o.quantity),0)', 'totalQuantity')
      .setParameter('fmt', fmt)
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    const total = rows.reduce(
      (acc, r) => ({
        orderCount: acc.orderCount + Number(r.orderCount),
        totalAmount: acc.totalAmount + toNum(r.totalAmount),
        totalQuantity: acc.totalQuantity + Number(r.totalQuantity),
      }),
      { orderCount: 0, totalAmount: 0, totalQuantity: 0 },
    );

    return {
      period,
      list: rows.map((r) => ({
        period: r.period,
        orderCount: Number(r.orderCount),
        totalAmount: toNum(r.totalAmount).toFixed(2),
        totalQuantity: Number(r.totalQuantity),
      })),
      summary: {
        orderCount: total.orderCount,
        totalAmount: total.totalAmount.toFixed(2),
        totalQuantity: total.totalQuantity,
      },
    };
  }

  // ============================================================
  // 用户报表
  // ============================================================

  async getUserReport(query: Record<string, any>): Promise<any> {
    const period = query.period || 'daily';
    const fmt = getFormat(period);

    // 注册趋势
    const regQb = this.userRepo
      .createQueryBuilder('u')
      .where('u.is_delete = 0');
    if (query.startDate) {
      regQb.andWhere('u.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      regQb.andWhere('u.created_at <= :end', { end: query.endDate });
    }
    const regRows = await regQb
      .select(`DATE_FORMAT(u.created_at, :fmt)`, 'period')
      .addSelect('COUNT(u.id)', 'count')
      .setParameter('fmt', fmt)
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();

    // 活跃用户（指定区间内有登录记录）
    const activeQb = this.userRepo.createQueryBuilder('u').where('u.is_delete = 0');
    if (query.startDate) {
      activeQb.andWhere('u.last_login_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      activeQb.andWhere('u.last_login_at <= :end', { end: query.endDate });
    }
    const activeCount = await activeQb.getCount();

    // 总用户数
    const totalUsers = await this.userRepo.count({ where: { isDelete: 0 } });

    return {
      period,
      registrationTrend: regRows.map((r) => ({
        period: r.period,
        count: Number(r.count),
      })),
      activeUsers: activeCount,
      totalUsers,
    };
  }

  // ============================================================
  // 藏品报表
  // ============================================================

  async getCollectibleReport(query: Record<string, any>): Promise<any> {
    const limit = Number(query.top) || 10;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .andWhere('o.completed_at IS NOT NULL');

    if (query.startDate) {
      qb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :end', { end: query.endDate });
    }

    const rows = await qb
      .select('o.collectible_id', 'collectibleId')
      .addSelect('COUNT(o.id)', 'orderCount')
      .addSelect('COALESCE(SUM(o.quantity),0)', 'soldQuantity')
      .addSelect('COALESCE(SUM(o.total_price),0)', 'salesAmount')
      .groupBy('o.collectible_id')
      .orderBy('salesAmount', 'DESC')
      .limit(limit)
      .getRawMany();

    const ids = rows.map((r) => Number(r.collectibleId));
    const collectibles = ids.length
      ? await this.collectibleRepo.find({
          where: ids.map((id) => ({ id })),
          select: ['id', 'name', 'image', 'price'],
        })
      : [];
    const map = new Map(collectibles.map((c) => [c.id, c]));

    return {
      topSelling: rows.map((r) => ({
        collectibleId: Number(r.collectibleId),
        name: map.get(Number(r.collectibleId))?.name || null,
        image: map.get(Number(r.collectibleId))?.image || null,
        orderCount: Number(r.orderCount),
        soldQuantity: Number(r.soldQuantity),
        salesAmount: toNum(r.salesAmount).toFixed(2),
      })),
    };
  }

  // ============================================================
  // 盲盒报表
  // ============================================================

  async getBlindboxReport(query: Record<string, any>): Promise<any> {
    try {
      const period = query.period || 'daily';

      // 统计总开盒数
      const totalOpened = await this.openRecordRepo.count({
        where: { isDelete: 0 },
      });

      // 按盲盒分组统计开奖次数
      const rows = await this.openRecordRepo
        .createQueryBuilder('r')
        .select('r.blindBoxId', 'blindBoxId')
        .addSelect('COUNT(r.id)', 'openCount')
        .where('r.isDelete = :del', { del: 0 })
        .groupBy('r.blindBoxId')
        .orderBy('openCount', 'DESC')
        .getRawMany();

      // 奖品分布
      const prizeRows = await this.openRecordRepo
        .createQueryBuilder('r')
        .select('r.blindBoxItemId', 'blindBoxItemId')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.isDelete = :del', { del: 0 })
        .groupBy('r.blindBoxItemId')
        .getRawMany();

      // 计算概率（模拟值，生产环境需根据实际业务计算）
      const totalItems = prizeRows.reduce((sum, r) => sum + Number(r.count), 0);
      const openRate = totalOpened > 0 ? Math.round((totalItems / totalOpened) * 100) / 100 : 0;

      return {
        period,
        totalOpened,
        openRate,
        emptyRate: 0,
        rareRate: 0,
        itemDistribution: prizeRows.map((r) => ({
          name: `奖品${r.blindBoxItemId || '未知'}`,
          hits: Number(r.count),
        })),
        byBlindBox: rows.map((r) => ({
          blindBoxId: Number(r.blindBoxId),
          openCount: Number(r.openCount),
        })),
      };
    } catch (error: any) {
      throw new Error(`盲盒报表错误: ${error.message}`);
    }
  }

  // ============================================================
  // 财务报表
  // ============================================================

  async getFinanceReport(query: Record<string, any>): Promise<any> {
    const startDate = query.startDate;
    const endDate = query.endDate;

    // 营收：已支付金额（paid_at 非空）
    const paymentQb = this.paymentRepo
      .createQueryBuilder('p')
      .where('p.is_delete = 0')
      .andWhere('p.paid_at IS NOT NULL');
    if (startDate) {
      paymentQb.andWhere('p.created_at >= :start', { start: startDate });
    }
    if (endDate) {
      paymentQb.andWhere('p.created_at <= :end', { end: endDate });
    }
    const paymentRow = await paymentQb
      .select('COALESCE(SUM(p.amount),0)', 'revenue')
      .addSelect('COUNT(p.id)', 'paymentCount')
      .getRawOne();

    // 退款：status=3 已退款
    const refundQb = this.refundRepo.createQueryBuilder('r').where('r.status = 3');
    if (startDate) {
      refundQb.andWhere('r.created_at >= :start', { start: startDate });
    }
    if (endDate) {
      refundQb.andWhere('r.created_at <= :end', { end: endDate });
    }
    const refundRow = await refundQb
      .select('COALESCE(SUM(r.amount),0)', 'refundAmount')
      .addSelect('COUNT(r.id)', 'refundCount')
      .getRawOne();

    const revenue = toNum(paymentRow.revenue);
    const refundAmount = toNum(refundRow.refundAmount);
    const feeRate = Number(query.feeRate) || 0;
    const feeIncome = (revenue * feeRate) / 100;
    const netIncome = revenue - refundAmount - feeIncome;

    return {
      revenue: revenue.toFixed(2),
      paymentCount: Number(paymentRow.paymentCount),
      refundAmount: refundAmount.toFixed(2),
      refundCount: Number(refundRow.refundCount),
      feeRate,
      feeIncome: feeIncome.toFixed(2),
      netIncome: netIncome.toFixed(2),
    };
  }

  // ============================================================
  // 自定义导出
  // ============================================================

  async customExport(body: Record<string, any>): Promise<string> {
    const dataSource = body.dataSource || 'orders';
    const fields: { key: string; label: string }[] = Array.isArray(body.fields)
      ? body.fields
      : [];
    if (!fields.length) {
      throw new BadRequestException('fields 不能为空');
    }

    const startDate = body.startDate;
    const endDate = body.endDate;
    const limit = Number(body.limit) || 5000;

    let rows: any[] = [];
    if (dataSource === 'orders') {
      const qb = this.orderRepo
        .createQueryBuilder('o')
        .where('o.is_delete = 0')
        .orderBy('o.created_at', 'DESC')
        .limit(limit);
      if (startDate) {
        qb.andWhere('o.created_at >= :start', { start: startDate });
      }
      if (endDate) {
        qb.andWhere('o.created_at <= :end', { end: endDate });
      }
      rows = await qb.getMany();
    } else if (dataSource === 'users') {
      const qb = this.userRepo
        .createQueryBuilder('u')
        .where('u.is_delete = 0')
        .orderBy('u.created_at', 'DESC')
        .limit(limit);
      if (startDate) {
        qb.andWhere('u.created_at >= :start', { start: startDate });
      }
      if (endDate) {
        qb.andWhere('u.created_at <= :end', { end: endDate });
      }
      rows = await qb.getMany();
    } else {
      throw new BadRequestException('不支持的 dataSource');
    }

    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const header = fields.map((f) => escape(f.label || f.key)).join(',');
    const bodyRows = rows.map((row) =>
      fields
        .map((f) => {
          const val = row[f.key];
          if (val instanceof Date) {
            return escape(val.toISOString());
          }
          return escape(val);
        })
        .join(','),
    );

    return [header, ...bodyRows].join('\n');
  }
}
