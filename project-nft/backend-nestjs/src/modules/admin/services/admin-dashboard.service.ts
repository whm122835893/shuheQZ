// [管理后台-仪表盘模块] - AdminDashboardService
// 实现管理后台仪表盘 6 个接口的业务逻辑：
//   核心指标、财务概览、告警概览、活动概览、趋势数据、优先购统计
//
// 数据来源：
//   - 用户 / 藏品 / 订单 / 支付 / 钱包（核心 + 财务）
//   - 风险预警 / 审批 / 工单（告警）
//   - 抽奖 / 合成 / 空投 / 邀请 活动（活动概览）
//   - 优先购 + 白名单（优先购统计）
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  NftUser,
  NftCollectible,
  NftOrder,
  NftPayment,
  NftUserWallet,
  NftRiskAlert,
  NftApproval,
  NftSupportTicket,
  NftLuckyDrawActivity,
  NftSynthesisActivity,
  NftAirdropActivity,
  NftInviteActivity,
  NftPrioritySale,
  NftPrioritySaleWhitelist,
  NftRefund,
} from '../../../database/entities';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftPayment)
    private readonly paymentRepo: Repository<NftPayment>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftRiskAlert)
    private readonly riskAlertRepo: Repository<NftRiskAlert>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    @InjectRepository(NftSupportTicket)
    private readonly ticketRepo: Repository<NftSupportTicket>,
    @InjectRepository(NftLuckyDrawActivity)
    private readonly luckyDrawRepo: Repository<NftLuckyDrawActivity>,
    @InjectRepository(NftSynthesisActivity)
    private readonly synthesisRepo: Repository<NftSynthesisActivity>,
    @InjectRepository(NftAirdropActivity)
    private readonly airdropRepo: Repository<NftAirdropActivity>,
    @InjectRepository(NftInviteActivity)
    private readonly inviteRepo: Repository<NftInviteActivity>,
    @InjectRepository(NftPrioritySale)
    private readonly prioritySaleRepo: Repository<NftPrioritySale>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftRefund)
    private readonly refundRepo: Repository<NftRefund>,
  ) {}

  /** 获取当天 00:00:00 的时间对象 */
  private getTodayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ============================================================
  // 1. 核心指标
  // ============================================================
  async getMetrics() {
    try {
      const totalUsers = await this.userRepo.count({
        where: { isDelete: 0 },
      });
      const totalCollectibles = await this.collectibleRepo.count({
        where: { isDelete: 0 },
      });
      const totalOrders = await this.orderRepo.count({
        where: { isDelete: 0 },
      });

      // GMV：已支付与已完成订单的成交总额
      const gmvRow = await this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total_price), 0)', 'gmv')
        .where('o.is_delete = 0')
        .andWhere('o.status IN (:...statuses)', { statuses: [2, 3] })
        .getRawOne();
      const totalGMV = Number(gmvRow?.gmv ?? 0);

      const todayStart = this.getTodayStart();
      const todayNewUsers = await this.userRepo.count({
        where: { isDelete: 0, createdAt: MoreThanOrEqual(todayStart) },
      });
      const todayOrders = await this.orderRepo.count({
        where: { isDelete: 0, createdAt: MoreThanOrEqual(todayStart) },
      });

      // 今日收入：今日支付的订单金额
      const todayRevRow = await this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total_price), 0)', 'rev')
        .where('o.is_delete = 0')
        .andWhere('o.status IN (:...statuses)', { statuses: [2, 3] })
        .andWhere('o.paid_at >= :todayStart', { todayStart })
        .getRawOne();
      const todayRevenue = Number(todayRevRow?.rev ?? 0);

      return {
        totalUsers,
        totalCollectibles,
        totalOrders,
        totalGMV,
        todayNewUsers,
        todayOrders,
        todayRevenue,
      };
    } catch (err) {
      this.logger.error(`获取核心指标失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取核心指标失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 2. 财务概览
  // ============================================================
  async getFinance() {
    try {
      // 总收入：成功支付金额合计（payment.status=2 支付成功）
      const revenueRow = await this.paymentRepo
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.is_delete = 0')
        .andWhere('p.status = 2')
        .getRawOne();
      const totalRevenue = Number(revenueRow?.total ?? 0);

      // 总退款：已退款金额合计（refund.status=3 已退款）
      const refundRow = await this.refundRepo
        .createQueryBuilder('r')
        .select('COALESCE(SUM(r.amount), 0)', 'total')
        .where('r.status = 3')
        .getRawOne();
      const totalRefunds = Number(refundRow?.total ?? 0);

      // 平台余额：所有用户钱包余额合计
      const balanceRow = await this.walletRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.balance), 0)', 'total')
        .where('w.is_delete = 0')
        .getRawOne();
      const platformBalance = Number(balanceRow?.total ?? 0);

      return {
        totalRevenue,
        totalRefunds,
        platformBalance,
        netRevenue: Number((totalRevenue - totalRefunds).toFixed(2)),
      };
    } catch (err) {
      this.logger.error(`获取财务概览失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取财务概览失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 3. 告警概览
  // ============================================================
  async getAlerts() {
    try {
      const pendingRiskAlerts = await this.riskAlertRepo.count({
        where: { status: 0 },
      });
      const pendingApprovals = await this.approvalRepo.count({
        where: { status: 0 },
      });
      const pendingTickets = await this.ticketRepo.count({
        where: { status: 0 },
      });

      return {
        pendingRiskAlerts,
        pendingApprovals,
        pendingTickets,
        total: pendingRiskAlerts + pendingApprovals + pendingTickets,
      };
    } catch (err) {
      this.logger.error(`获取告警概览失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取告警概览失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 4. 活动概览
  // ============================================================
  async getActivities() {
    try {
      const now = new Date();

      // 进行中的活动 = status=1 且 isDelete=0 且 在有效期内
      const activeLuckyDraw = await this.luckyDrawRepo
        .createQueryBuilder('a')
        .where('a.is_delete = 0')
        .andWhere('a.status = 1')
        .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
        .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
        .getCount();

      const activeSynthesis = await this.synthesisRepo
        .createQueryBuilder('a')
        .where('a.is_delete = 0')
        .andWhere('a.status = 1')
        .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
        .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
        .getCount();

      const activeAirdrop = await this.airdropRepo
        .createQueryBuilder('a')
        .where('a.is_delete = 0')
        .andWhere('a.status = 1')
        .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
        .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
        .getCount();

      const activeInvite = await this.inviteRepo
        .createQueryBuilder('a')
        .where('a.is_delete = 0')
        .andWhere('a.status = 1')
        .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
        .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
        .getCount();

      return {
        activeLuckyDraw,
        activeSynthesis,
        activeAirdrop,
        activeInvite,
        total:
          activeLuckyDraw + activeSynthesis + activeAirdrop + activeInvite,
      };
    } catch (err) {
      this.logger.error(`获取活动概览失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取活动概览失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ============================================================
  // 5. 趋势数据（每日新增用户与订单）
  // ============================================================
  async getTrends(days: number) {
    try {
      // 仅支持 7 或 30 天，其余默认 7
      const span = days === 30 ? 30 : 7;
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() - (span - 1));

      const userRows = await this.userRepo
        .createQueryBuilder('u')
        .select("DATE_FORMAT(u.created_at, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('u.is_delete = 0')
        .andWhere('u.created_at >= :startDate', { startDate })
        .andWhere('u.created_at <= :endDate', { endDate })
        .groupBy("DATE_FORMAT(u.created_at, '%Y-%m-%d')")
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>();

      const orderRows = await this.orderRepo
        .createQueryBuilder('o')
        .select("DATE_FORMAT(o.created_at, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'count')
        .where('o.is_delete = 0')
        .andWhere('o.created_at >= :startDate', { startDate })
        .andWhere('o.created_at <= :endDate', { endDate })
        .groupBy("DATE_FORMAT(o.created_at, '%Y-%m-%d')")
        .orderBy('date', 'ASC')
        .getRawMany<{ date: string; count: string }>();

      // 构建完整日期序列，补齐无数据的日期为 0
      const userMap = new Map<string, number>();
      userRows.forEach((r) => userMap.set(r.date, Number(r.count)));
      const orderMap = new Map<string, number>();
      orderRows.forEach((r) => orderMap.set(r.date, Number(r.count)));

      const list: Array<{ date: string; newUsers: number; newOrders: number }> =
        [];
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const key = this.formatDate(cursor);
        list.push({
          date: key,
          newUsers: userMap.get(key) ?? 0,
          newOrders: orderMap.get(key) ?? 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      return { days: span, list };
    } catch (err) {
      this.logger.error(`获取趋势数据失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取趋势数据失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** 将 Date 格式化为 YYYY-MM-DD */
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // ============================================================
  // 6. 优先购统计
  // ============================================================
  async getPriorityStats() {
    try {
      const now = new Date();

      // 进行中的优先购活动数
      const activePrioritySales = await this.prioritySaleRepo
        .createQueryBuilder('ps')
        .where('ps.is_delete = 0')
        .andWhere('ps.status = 1')
        .andWhere('ps.start_time <= :now', { now })
        .andWhere('ps.end_time >= :now', { now })
        .getCount();

      // 白名单总数
      const totalWhitelist = await this.priorityWhitelistRepo.count({
        where: { isDelete: 0 },
      });

      // 转化率：已使用名额的用户数 / 白名单总数
      const converted = await this.priorityWhitelistRepo
        .createQueryBuilder('w')
        .where('w.is_delete = 0')
        .andWhere('w.used_quantity > 0')
        .getCount();

      const conversionRate =
        totalWhitelist > 0
          ? Number(((converted / totalWhitelist) * 100).toFixed(2))
          : 0;

      return {
        activePrioritySales,
        totalWhitelist,
        converted,
        conversionRate,
      };
    } catch (err) {
      this.logger.error(`获取优先购统计失败: ${err.message}`, err.stack);
      throw new HttpException(
        '获取优先购统计失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
