// [签到模块] - 签到业务服务
// 负责：每日签到 / 签到记录查询
// 签到在事务内执行，并使用乐观锁(version 字段)防并发，影响行数为 0 时抛出 ConflictException。
// 本模块不涉及交易密码。
//
// 说明：reward_type 枚举与 nft_check_in_records.reward_type 一致：
//   none / collectible / points / draw_chance
// （API 文档示例中的 'lucky_draw_chance' 与实体枚举 'draw_chance' 不一致，
//   以实体枚举为准，统一使用 'draw_chance'）
import { DataSource, EntityManager } from 'typeorm';
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
import { NftCheckInRecord } from '../../database/entities/nft-check-in-record.entity';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { CheckInRecordsQueryDto } from './dto/check-in-records-query.dto';

/** 签到藏品奖励的藏品标签(用于检索奖励藏品) */
const CHECKIN_REWARD_TAG = 'checkin_reward';
/** 默认签到积分奖励 */
const DEFAULT_CHECKIN_POINTS = 10;
/** 默认签到抽奖次数奖励 */
const DEFAULT_CHECKIN_DRAW_CHANCES = 1;

@Injectable()
export class CheckInService {
  private readonly logger = new Logger(CheckInService.name);

  constructor(
    @InjectRepository(NftCheckInRecord)
    private readonly checkInRepo: Repository<NftCheckInRecord>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly walletTxnRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftLuckyDrawActivity)
    private readonly activityRepo: Repository<NftLuckyDrawActivity>,
    @InjectRepository(NftLuckyDrawUserChance)
    private readonly chanceRepo: Repository<NftLuckyDrawUserChance>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 每日签到
   * 事务内：
   *   1. 查询今天是否已签到(UNIQUE(user_id, check_in_date))
   *   2. 计算连续天数: 昨日有签到记录则 consecutive_days+1, 否则重置为1
   *   3. 根据连续天数确定奖励类型(reward_type)
   *   4. 发放奖励(points/collectible/draw_chance)
   *   5. 写入 nft_check_in_records
   *   6. 返回签到结果(consecutive_days, reward_type, reward_desc)
   */
  async checkIn(userId: number): Promise<{ data: any; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      // 0) 校验用户存在且状态正常
      const user = await manager.findOne(NftUser, {
        where: { id: userId, isDelete: 0 },
      });
      if (!user) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '用户不存在',
        });
      }
      if (user.status !== 1) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          data: null,
          message: '账号已被禁用，无法签到',
        });
      }

      const now = new Date();
      const todayStr = this.formatDate(now);

      // 1) 查询今天是否已签到(UNIQUE(user_id, check_in_date))
      const existed = await manager
        .createQueryBuilder(NftCheckInRecord, 'r')
        .where('r.user_id = :userId', { userId })
        .andWhere('r.check_in_date = :date', { date: todayStr })
        .andWhere('r.is_delete = 0')
        .getOne();
      if (existed) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '今日已签到，明天再来吧',
        });
      }

      // 2) 计算连续天数: 昨日有签到记录则 +1，否则重置为 1
      const yesterdayStr = this.formatDate(this.addDays(now, -1));
      const yesterdayRecord = await manager
        .createQueryBuilder(NftCheckInRecord, 'r')
        .where('r.user_id = :userId', { userId })
        .andWhere('r.check_in_date = :date', { date: yesterdayStr })
        .andWhere('r.is_delete = 0')
        .getOne();
      const consecutiveDays = yesterdayRecord
        ? yesterdayRecord.consecutiveDays + 1
        : 1;

      // 3) 根据连续天数确定奖励类型
      const rewardType = this.resolveRewardType(consecutiveDays);

      // 4) 发放奖励
      let reward: any;
      let rewardDesc: string;
      switch (rewardType) {
        case 'collectible': {
          const result = await this.awardCollectible(manager, userId);
          reward = result.reward;
          rewardDesc = result.desc;
          break;
        }
        case 'points': {
          const pointsResult = await this.awardPoints(manager, userId);
          reward = { points: pointsResult.points };
          rewardDesc = pointsResult.desc;
          break;
        }
        case 'draw_chance': {
          const drawResult = await this.awardDrawChance(manager, userId);
          reward = drawResult.reward;
          rewardDesc = drawResult.desc;
          break;
        }
        default: {
          reward = null;
          rewardDesc = '感谢签到';
          break;
        }
      }

      // 5) 写入 nft_check_in_records
      try {
        const record = manager.create(NftCheckInRecord, {
          userId,
          checkInDate: this.parseDate(todayStr),
          consecutiveDays,
          rewardType,
          isDelete: 0,
        });
        await manager.save(NftCheckInRecord, record);
      } catch (e: any) {
        // UNIQUE(user_id, check_in_date) 并发兜底
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '今日已签到，请勿重复操作',
          });
        }
        throw e;
      }

      // 6) 返回签到结果
      const data = {
        check_in_date: todayStr,
        consecutive_days: consecutiveDays,
        reward_type: rewardType,
        reward,
        reward_desc: rewardDesc,
      };
      const message = `签到成功！获得${rewardDesc}`;
      return { data, message };
    });
  }

  /**
   * 签到记录查询
   * 按月份查询签到记录，返回日历数据(已签到日期数组 + 连续天数 + 奖励列表)
   */
  async getRecords(userId: number, query: CheckInRecordsQueryDto) {
    // 解析月份，默认当月
    const now = new Date();
    const month = query.month ?? this.formatMonth(now);
    const { start, end } = this.getMonthRange(month);

    const records = await this.checkInRepo
      .createQueryBuilder('r')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.is_delete = 0')
      .andWhere('r.check_in_date BETWEEN :start AND :end', { start, end })
      .orderBy('r.check_in_date', 'DESC')
      .getMany();

    // 计算 current_consecutive(基于最近一次签到记录)
    const currentConsecutive = await this.computeCurrentConsecutive(userId);

    return {
      current_consecutive: currentConsecutive,
      total_days: records.length,
      records: records.map((r) => ({
        check_in_date: this.formatDate(r.checkInDate),
        consecutive_days: r.consecutiveDays,
        reward_type: r.rewardType,
      })),
    };
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 根据连续天数确定奖励类型
   * - 7/14/30 天: collectible(藏品奖励)
   * - 每周首日(day % 7 === 1，即 1/8/15/22/29): draw_chance(抽奖机会)
   * - 其他天: points(积分)
   */
  private resolveRewardType(consecutiveDays: number): string {
    if (
      consecutiveDays === 7 ||
      consecutiveDays === 14 ||
      consecutiveDays === 30
    ) {
      return 'collectible';
    }
    if (consecutiveDays % 7 === 1) {
      return 'draw_chance';
    }
    return 'points';
  }

  /**
   * 发放藏品奖励
   * 检索 tag=checkin_reward 的藏品，生成 nft_user_collectibles(source='airdrop')
   * 若未配置奖励藏品，降级为积分奖励
   */
  private async awardCollectible(
    manager: EntityManager,
    userId: number,
  ): Promise<{ reward: any; desc: string }> {
    const rewardCollectible = await manager.findOne(NftCollectible, {
      where: { tag: CHECKIN_REWARD_TAG, isRelease: 1, isDelete: 0 },
      order: { id: 'ASC' },
    });

    // 未配置奖励藏品 -> 降级为积分
    if (!rewardCollectible) {
      this.logger.warn(
        `签到藏品奖励未配置(tag=${CHECKIN_REWARD_TAG})，降级为积分奖励`,
      );
      return {
        reward: { points: DEFAULT_CHECKIN_POINTS },
        desc: `${DEFAULT_CHECKIN_POINTS}积分`,
      };
    }

    // 乐观锁递增 serial_current + circulate
    const newSerial = rewardCollectible.serialCurrent + 1;
    const updated = await manager
      .createQueryBuilder()
      .update(NftCollectible)
      .set({
        serialCurrent: () => 'serial_current + 1',
        circulate: () => 'circulate + 1',
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version', {
        id: rewardCollectible.id,
        version: rewardCollectible.version,
      })
      .execute();
    if (!updated.affected) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        data: null,
        message: '奖励藏品库存已变更，请重试',
      });
    }

    const serialNo = this.buildSerialNo(
      rewardCollectible.serialPrefix,
      newSerial,
      rewardCollectible.edition,
    );

    // 创建用户藏品(source='airdrop')
    const now = new Date();
    const uc = manager.create(NftUserCollectible, {
      userId,
      collectibleId: rewardCollectible.id,
      orderId: null,
      blindBoxItemId: null,
      airdropRecordId: null,
      serialNo,
      source: 'airdrop',
      acquiredPrice: 0,
      acquiredAt: now,
      isConsigned: 0,
      status: 1, // 持有
      txHash: null,
      blockNumber: null,
      tokenId: null,
      mintStatus: 0, // 待上链
      isDelete: 0,
    });
    await manager.save(NftUserCollectible, uc);

    return {
      reward: {
        collectible_id: Number(rewardCollectible.id),
        name: rewardCollectible.name,
        serial_no: serialNo,
      },
      desc: `限定藏品「${rewardCollectible.name}」`,
    };
  }

  /**
   * 发放积分奖励
   * 事务内：查找/创建用户钱包 → 乐观锁更新余额 → 写入钱包流水
   * 积分直接进入钱包余额，可在平台内消费使用
   */
  private async awardPoints(
    manager: EntityManager,
    userId: number,
  ): Promise<{ points: number; desc: string }> {
    // 查找用户钱包，不存在则创建（兜底，正常应在注册时创建）
    let wallet = await manager.findOne(NftUserWallet, {
      where: { userId, isDelete: 0 },
    });
    if (!wallet) {
      this.logger.warn(`用户钱包不存在(user_id=${userId})，自动创建`);
      wallet = manager.create(NftUserWallet, { userId });
      wallet = await manager.save(NftUserWallet, wallet);
    }

    // 乐观锁更新钱包余额
    const updated = await manager
      .createQueryBuilder()
      .update(NftUserWallet)
      .set({
        balance: () => `balance + ${DEFAULT_CHECKIN_POINTS}`,
        version: () => 'version + 1',
      })
      .where('id = :id AND version = :version', {
        id: wallet.id,
        version: wallet.version,
      })
      .execute();
    if (!updated.affected) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        data: null,
        message: '钱包余额更新冲突，请重试',
      });
    }

    // 写入钱包流水
    const balanceAfter = Number(wallet.balance) + DEFAULT_CHECKIN_POINTS;
    const txn = manager.create(NftWalletTransaction, {
      userId,
      type: 'recharge',
      amount: DEFAULT_CHECKIN_POINTS,
      balanceAfter,
      direction: 'in',
      relatedOrderNo: null,
      remark: '签到积分奖励',
    });
    await manager.save(NftWalletTransaction, txn);

    return {
      points: DEFAULT_CHECKIN_POINTS,
      desc: `${DEFAULT_CHECKIN_POINTS}积分`,
    };
  }

  /**
   * 发放抽奖机会奖励
   * 事务内：查询进行中的抽奖活动 → 写入/更新用户抽奖次数(source='check_in')
   * 若无进行中的活动，仍然返回奖励信息但不实际发放次数（降级处理）
   */
  private async awardDrawChance(
    manager: EntityManager,
    userId: number,
  ): Promise<{ reward: any; desc: string }> {
    const now = new Date();

    // 查询进行中的抽奖活动(status=2, 时间范围内)
    const activity = await manager
      .createQueryBuilder(NftLuckyDrawActivity, 'a')
      .where('a.status = 2')
      .andWhere('a.is_delete = 0')
      .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
      .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
      .orderBy('a.created_at', 'DESC')
      .getOne();

    if (!activity) {
      this.logger.warn('签到抽奖机会奖励：当前无进行中的抽奖活动，次数未发放');
      return {
        reward: {
          chances: DEFAULT_CHECKIN_DRAW_CHANCES,
          activity_id: null,
          activity_name: null,
        },
        desc: `${DEFAULT_CHECKIN_DRAW_CHANCES}次抽奖机会（暂无活动，稍后发放）`,
      };
    }

    // 查找已有次数记录
    const existing = await manager.findOne(NftLuckyDrawUserChance, {
      where: { activityId: activity.id, userId, source: 'check_in', isDelete: 0 },
    });

    if (existing) {
      // 累加次数
      await manager
        .createQueryBuilder()
        .update(NftLuckyDrawUserChance)
        .set({ chances: () => `chances + ${DEFAULT_CHECKIN_DRAW_CHANCES}` })
        .where('id = :id', { id: existing.id })
        .execute();
    } else {
      // 创建新记录
      try {
        const chance = manager.create(NftLuckyDrawUserChance, {
          activityId: activity.id,
          userId,
          source: 'check_in',
          chances: DEFAULT_CHECKIN_DRAW_CHANCES,
          usedChances: 0,
          expiresAt: null,
          isDelete: 0,
        });
        await manager.save(NftLuckyDrawUserChance, chance);
      } catch (e: any) {
        // 并发创建冲突：回退为累加
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
          await manager
            .createQueryBuilder()
            .update(NftLuckyDrawUserChance)
            .set({ chances: () => `chances + ${DEFAULT_CHECKIN_DRAW_CHANCES}` })
            .where('activity_id = :aid AND user_id = :uid AND source = :src AND is_delete = 0', {
              aid: activity.id,
              uid: userId,
              src: 'check_in',
            })
            .execute();
        } else {
          throw e;
        }
      }
    }

    return {
      reward: {
        chances: DEFAULT_CHECKIN_DRAW_CHANCES,
        activity_id: Number(activity.id),
        activity_name: activity.name,
      },
      desc: `${DEFAULT_CHECKIN_DRAW_CHANCES}次抽奖机会`,
    };
  }

  /**
   * 计算当前连续签到天数
   * - 最近一条记录为今天 -> 其 consecutive_days
   * - 最近一条记录为昨天 -> 其 consecutive_days(streak 仍有效)
   * - 否则 -> 0
   */
  private async computeCurrentConsecutive(userId: number): Promise<number> {
    const latest = await this.checkInRepo.findOne({
      where: { userId, isDelete: 0 },
      order: { checkInDate: 'DESC' },
    });
    if (!latest) return 0;

    const todayStr = this.formatDate(new Date());
    const yesterdayStr = this.formatDate(this.addDays(new Date(), -1));
    const latestStr = this.formatDate(latest.checkInDate);

    if (latestStr === todayStr || latestStr === yesterdayStr) {
      return latest.consecutiveDays;
    }
    return 0;
  }

  /**
   * 生成编号：prefix + 零填充 serial(宽度按 edition 位数，最小 4)
   */
  private buildSerialNo(
    prefix: string,
    serial: number,
    edition: number,
  ): string {
    const width = Math.max(4, String(edition || 0).length);
    return `${prefix}${String(serial).padStart(width, '0')}`;
  }

  /**
   * 格式化日期为 YYYY-MM-DD(本地时区)
   * 支持 Date 对象和字符串输入（TypeORM date 列返回字符串）
   */
  private formatDate(date: Date | string): string {
    if (typeof date === 'string') return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * 格式化月份为 YYYY-MM
   */
  private formatMonth(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * 将 YYYY-MM-DD 字符串解析为本地时区 Date(避免 UTC 偏移)
   */
  private parseDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  /**
   * 日期加减天数
   */
  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * 解析 YYYY-MM 月份，返回 [start, end] 日期字符串(含月末)
   */
  private getMonthRange(month: string): { start: string; end: string } {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const m = Number(monthStr);
    const start = `${yearStr}-${monthStr}-01`;
    // 月末：下月第 0 天
    const end = this.formatDate(new Date(year, m, 0));
    return { start, end };
  }
}
