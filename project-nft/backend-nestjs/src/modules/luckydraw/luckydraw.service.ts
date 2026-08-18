// [抽奖模块] - 抽奖业务服务
// 负责：抽奖活动列表 / 抽奖规则与奖品池 / 次数明细 / 参与抽奖 / 中奖记录
// 所有抽奖操作均在事务内执行，奖品藏品生成使用乐观锁(version 字段)防并发。
// 抽奖仅 JWT 认证，不涉及交易密码。
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawPrize } from '../../database/entities/nft-lucky-draw-prize.entity';
import { NftLuckyDrawRecord } from '../../database/entities/nft-lucky-draw-record.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { LuckyDrawRecordsQueryDto } from './dto/lucky-draw-records-query.dto';

/** 抽奖次数来源类型（供其他 Service 调用 grantChances 时使用） */
export type LuckyDrawChanceSource =
  | 'hold_collectible'
  | 'invite_friend'
  | 'register'
  | 'check_in'
  | 'system';

/** 来源中文名称映射 */
const SOURCE_NAME_MAP: Record<string, string> = {
  hold_collectible: '持有指定藏品',
  invite_friend: '邀请好友',
  register: '注册奖励',
  check_in: '签到奖励',
  system: '系统赠送',
};

/** 抽奖结果数据结构 */
export interface DrawResultData {
  won: boolean;
  prize: {
    prize_id: number;
    collectible_id: number;
    name: string;
    image: string;
    serial_no: string;
  } | null;
  new_user_collectible_id: number | null;
  remaining_draws: number;
}

@Injectable()
export class LuckyDrawService {
  private readonly logger = new Logger(LuckyDrawService.name);

  constructor(
    @InjectRepository(NftLuckyDrawActivity)
    private readonly activityRepo: Repository<NftLuckyDrawActivity>,
    @InjectRepository(NftLuckyDrawPrize)
    private readonly prizeRepo: Repository<NftLuckyDrawPrize>,
    @InjectRepository(NftLuckyDrawRecord)
    private readonly recordRepo: Repository<NftLuckyDrawRecord>,
    @InjectRepository(NftLuckyDrawUserChance)
    private readonly chanceRepo: Repository<NftLuckyDrawUserChance>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 端点 1：抽奖活动列表
  // ============================================================

  /**
   * 抽奖活动列表（分页）
   * 查询 nft_lucky_draw_activities WHERE status=2(进行中) AND 时间范围内
   */
  async getActivities(query: PaginationDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;
    const now = new Date();

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.is_delete = 0')
      .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
      .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
      .orderBy('a.start_time', 'ASC');

    qb.skip((page - 1) * page_size).take(page_size);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((a) => ({
        id: Number(a.id),
        name: a.name,
        image: null, // 活动实体暂无 image 字段，预留兼容 API 响应
        draw_limit_per_user: a.drawLimitPerUser,
        start_time: a.startTime,
        end_time: a.endTime,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 端点 2：抽奖规则与奖品池
  // ============================================================

  /**
   * 抽奖规则与奖品池
   * 查询活动详情 + nft_lucky_draw_prizes（JOIN 藏品信息）
   * + 查询 nft_lucky_draw_user_chances 按来源分组聚合，返回当前用户剩余抽奖次数
   */
  async getActivityDetail(activityId: number, userId: number) {
    // 1) 查询活动详情
    const activity = await this.activityRepo.findOne({
      where: { id: activityId, isDelete: 0 },
    });
    if (!activity) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '抽奖活动不存在',
      });
    }

    // 2) 查询奖品池（JOIN nft_collectibles 获取藏品图片）
    const prizeRows = await this.prizeRepo
      .createQueryBuilder('p')
      .leftJoin(NftCollectible, 'c', 'c.id = p.collectible_id')
      .where('p.activity_id = :activityId', { activityId })
      .andWhere('p.is_delete = 0')
      .select([
        'p.id AS id',
        'p.collectible_id AS collectible_id',
        'p.name AS name',
        'c.image AS image',
        'p.probability AS probability',
        'p.quantity_limit AS quantity_limit',
        'p.quantity_distributed AS quantity_distributed',
      ])
      .orderBy('p.id', 'ASC')
      .getRawMany();

    // 3) 查询当前用户次数明细
    const chances = await this.chanceRepo.find({
      where: { activityId, userId, isDelete: 0 },
      order: { createdAt: 'ASC' },
    });
    const chancesData = this.buildChancesData(chances);

    return {
      id: Number(activity.id),
      name: activity.name,
      draw_limit_per_user: activity.drawLimitPerUser,
      my_remaining_draws: chancesData.total_remaining,
      draw_chances: chancesData.chances,
      prizes: prizeRows.map((r: any) => ({
        id: Number(r.id),
        collectible_id: r.collectible_id ? Number(r.collectible_id) : null,
        name: r.name,
        image: r.image,
        probability: r.probability,
        quantity_limit: r.quantity_limit,
        quantity_distributed: r.quantity_distributed,
      })),
    };
  }

  // ============================================================
  // 端点 3：抽奖次数明细（独立端点）
  // ============================================================

  /**
   * 我的抽奖次数来源明细
   * 查询 nft_lucky_draw_user_chances WHERE user_id=? AND activity_id=? AND is_delete=0
   * 按来源分组返回 granted_count / used_count / remaining
   */
  async getChances(activityId: number, userId: number) {
    // 校验活动存在
    const activity = await this.activityRepo.findOne({
      where: { id: activityId, isDelete: 0 },
    });
    if (!activity) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '抽奖活动不存在',
      });
    }

    const chances = await this.chanceRepo.find({
      where: { activityId, userId, isDelete: 0 },
      order: { createdAt: 'ASC' },
    });
    const chancesData = this.buildChancesData(chances);

    return {
      activity_id: Number(activity.id),
      activity_name: activity.name,
      total_granted: chancesData.total_granted,
      total_used: chancesData.total_used,
      total_remaining: chancesData.total_remaining,
      chances: chancesData.chances,
    };
  }

  // ============================================================
  // 端点 4：参与抽奖
  // ============================================================

  /**
   * 参与抽奖
   *
   * 事务内执行：
   * 1. 校验活动状态(status=2 进行中)
   * 2. 校验时间窗口
   * 3. 校验总剩余次数 > 0（汇总所有 source 的 remaining）
   * 4. 加权随机选择奖品(nft_lucky_draw_prizes.probability)
   * 5. 概率兜底：概率总和不为1时按剩余可用奖品均分；库存用尽的奖品概率置0；
   *    所有奖品库存为0时返回未中奖
   * 6. 扣减用户次数：找到最早获得的未用完的 chance 记录，used_chances += 1
   * 7. 如果中奖：奖品库存扣减 + 生成新藏品(乐观锁) + 写入 records
   * 8. 如果未中奖：写入 records(result_user_collectible_id=NULL)
   * 9. 写入 nft_operation_logs 审计
   * 10. 返回抽奖结果
   *
   * @returns { data: DrawResultData, message: string }
   */
  async draw(
    userId: number,
    activityId: number,
  ): Promise<{ data: DrawResultData; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      // ----------------------------------------------------------
      // 1) 校验活动存在且进行中
      // ----------------------------------------------------------
      const activity = await manager.findOne(NftLuckyDrawActivity, {
        where: { id: activityId, isDelete: 0 },
      });
      if (!activity) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '抽奖活动不存在',
        });
      }
      if (activity.status !== 2) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '抽奖活动未进行中',
        });
      }

      // ----------------------------------------------------------
      // 2) 校验时间窗口
      // ----------------------------------------------------------
      const now = new Date();
      if (activity.startTime && now < activity.startTime) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '抽奖活动尚未开始',
        });
      }
      if (activity.endTime && now > activity.endTime) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '抽奖活动已结束',
        });
      }

      // ----------------------------------------------------------
      // 3) 校验总剩余次数 > 0
      // ----------------------------------------------------------
      const chances = await manager.find(NftLuckyDrawUserChance, {
        where: { activityId, userId, isDelete: 0 },
        order: { createdAt: 'ASC' }, // 按获得时间正序，便于扣减最早记录
      });

      const totalRemaining = chances.reduce(
        (sum, c) => sum + (c.chances - c.usedChances),
        0,
      );
      if (totalRemaining <= 0) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '抽奖次数已用完',
        });
      }

      // ----------------------------------------------------------
      // 4) 查询奖品池
      // ----------------------------------------------------------
      const prizes = await manager.find(NftLuckyDrawPrize, {
        where: { activityId, isDelete: 0 },
        order: { id: 'ASC' },
      });

      // ----------------------------------------------------------
      // 5) 概率兜底 + 加权随机选择
      // ----------------------------------------------------------
      // 筛选有库存的奖品（quantity_limit 为 NULL 表示不限量）
      const availablePrizes = prizes.filter(
        (p) =>
          p.quantityLimit === null ||
          p.quantityDistributed < p.quantityLimit,
      );

      let selectedPrize: NftLuckyDrawPrize | null = null;
      let isWin = false;

      if (availablePrizes.length === 0) {
        // 所有奖品库存为 0 → 未中奖
        // 使用第一个奖品作为记录引用（若无奖品则为 null）
        selectedPrize = prizes.length > 0 ? prizes[0] : null;
        isWin = false;
      } else {
        // 直接使用配置的概率值进行加权随机，不做兜底归一化
        const weights = availablePrizes.map((p) => Number(p.probability));

        // 加权随机选择
        selectedPrize = this.weightedRandomSelect(
          availablePrizes,
          weights,
        );

        // 判断是否中奖：选中的奖品具有有效藏品ID（collectibleId > 0）
        if (selectedPrize && Number(selectedPrize.collectibleId) > 0) {
          isWin = true;
        }
      }

      // ----------------------------------------------------------
      // 6) 扣减用户次数：找到最早获得的未用完的 chance 记录
      // ----------------------------------------------------------
      const chanceToDeduct = chances.find((c) => c.chances > c.usedChances);
      if (chanceToDeduct) {
        // 条件更新：WHERE used_chances < chances 防止并发超额扣减
        const chanceUpdated = await manager
          .createQueryBuilder()
          .update(NftLuckyDrawUserChance)
          .set({ usedChances: () => 'used_chances + 1' })
          .where('id = :id AND used_chances < chances', {
            id: chanceToDeduct.id,
          })
          .execute();
        if (!chanceUpdated.affected) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '抽奖次数已变更，请刷新后重试',
          });
        }
      }

      // ----------------------------------------------------------
      // 7) 中奖处理：奖品库存扣减 + 生成新藏品 + 写入 records
      //    8) 未中奖处理：写入 records
      // ----------------------------------------------------------
      let resultUserCollectibleId: number | null = null;
      let serialNo: string | null = null;
      let collectibleImage: string | null = null;
      let prizeName: string | null = null;

      if (isWin && selectedPrize) {
        // 查询藏品信息
        const collectible = await manager.findOne(NftCollectible, {
          where: { id: Number(selectedPrize.collectibleId), isDelete: 0 },
        });

        if (!collectible) {
          // 藏品不存在，降级为未中奖
          isWin = false;
        } else {
          // 奖品库存扣减：条件更新确保不超发
          // WHERE quantity_limit IS NULL OR quantity_distributed < quantity_limit
          const prizeUpdated = await manager
            .createQueryBuilder()
            .update(NftLuckyDrawPrize)
            .set({
              quantityDistributed: () => 'quantity_distributed + 1',
            })
            .where(
              'id = :id AND (quantity_limit IS NULL OR quantity_distributed < quantity_limit)',
              { id: selectedPrize.id },
            )
            .execute();

          if (!prizeUpdated.affected) {
            // 库存在并发场景下已被扣完，降级为未中奖
            isWin = false;
          } else {
            // 藏品序列号自增 + circulate 递增（乐观锁 version 字段防并发）
            const collectibleUpdated = await manager
              .createQueryBuilder()
              .update(NftCollectible)
              .set({
                serialCurrent: () => 'serial_current + 1',
                circulate: () => 'circulate + 1',
                version: () => 'version + 1',
              })
              .where('id = :id AND version = :version', {
                id: collectible.id,
                version: collectible.version,
              })
              .execute();

            if (!collectibleUpdated.affected) {
              throw new ConflictException({
                code: ErrorCode.CONFLICT,
                data: null,
                message: '藏品状态已变更，请刷新后重试',
              });
            }

            // 生成序列号：serialPrefix + 4位补零序号
            const newSerialCurrent = collectible.serialCurrent + 1;
            serialNo = `${collectible.serialPrefix}${String(newSerialCurrent).padStart(4, '0')}`;
            collectibleImage = collectible.image;
            prizeName = selectedPrize.name;

            // 创建用户藏品（source = 'lucky_draw'）
            const userCollectible = manager.create(NftUserCollectible, {
              userId,
              collectibleId: collectible.id,
              orderId: null,
              blindBoxItemId: null,
              airdropRecordId: null,
              serialNo,
              source: 'lucky_draw',
              acquiredPrice: 0,
              acquiredAt: now,
              isConsigned: 0,
              status: 1,
              txHash: null,
              blockNumber: null,
              tokenId: null,
              mintStatus: null,
              isDelete: 0,
            });
            const savedUc = await manager.save(NftUserCollectible, userCollectible);
            resultUserCollectibleId = Number(savedUc.id);

            // TODO: 触发异步 mint
          }
        }
      }

      // 写入抽奖记录
      const recordPrizeId = selectedPrize ? Number(selectedPrize.id) : 0;
      const record = manager.create(NftLuckyDrawRecord, {
        prizeId: recordPrizeId,
        userId,
        resultUserCollectibleId,
        isDelete: 0,
      });
      const savedRecord = await manager.save(NftLuckyDrawRecord, record);

      // ----------------------------------------------------------
      // 9) 写入审计日志
      // ----------------------------------------------------------
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_lucky_draw_records',
        targetId: Number(savedRecord.id),
        action: 'lucky_draw',
        oldValue: null,
        newValue: {
          activity_id: activityId,
          user_id: userId,
          won: isWin,
          prize_id: selectedPrize ? Number(selectedPrize.id) : null,
          result_user_collectible_id: resultUserCollectibleId,
        },
        ip: null,
        isDelete: 0,
      });

      // ----------------------------------------------------------
      // 10) 返回抽奖结果
      // ----------------------------------------------------------
      const remainingDraws = totalRemaining - 1;

      const data: DrawResultData = {
        won: isWin,
        prize: isWin
          ? {
              prize_id: Number(selectedPrize!.id),
              collectible_id: Number(selectedPrize!.collectibleId),
              name: prizeName!,
              image: collectibleImage!,
              serial_no: serialNo!,
            }
          : null,
        new_user_collectible_id: resultUserCollectibleId,
        remaining_draws: remainingDraws,
      };

      const message = isWin
        ? `恭喜中奖！获得了${prizeName}`
        : '很遗憾，未中奖';

      return { data, message };
    });
  }

  // ============================================================
  // 端点 5：中奖记录（分页）
  // ============================================================

  /**
   * 我的抽奖记录（分页）
   * 查询 nft_lucky_draw_records WHERE user_id=当前用户
   * JOIN 奖品信息 + 活动信息 + 藏品图片，支持 activity_id / is_win 筛选
   */
  async getRecords(userId: number, query: LuckyDrawRecordsQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.recordRepo
      .createQueryBuilder('r')
      .leftJoin(NftLuckyDrawPrize, 'p', 'p.id = r.prize_id')
      .leftJoin(NftLuckyDrawActivity, 'a', 'a.id = p.activity_id')
      .leftJoin(NftCollectible, 'c', 'c.id = p.collectible_id')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.is_delete = 0');

    if (query.activity_id) {
      qb.andWhere('p.activity_id = :activityId', {
        activityId: query.activity_id,
      });
    }

    if (query.is_win === true) {
      qb.andWhere('r.result_user_collectible_id IS NOT NULL');
    } else if (query.is_win === false) {
      qb.andWhere('r.result_user_collectible_id IS NULL');
    }

    qb.orderBy('r.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'r.id AS id',
        'a.name AS activity_name',
        'p.name AS prize_name',
        'c.image AS prize_image',
        'r.result_user_collectible_id AS result_user_collectible_id',
        'r.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        activity_name: r.activity_name,
        prize_name: r.prize_name,
        prize_image: r.prize_image,
        won: r.result_user_collectible_id !== null,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 供其他模块调用：发放抽奖次数
  // ============================================================

  /**
   * 发放抽奖次数（供注册/邀请/签到/支付回调/转赠确认后异步调用）
   *
   * - 写入或更新 nft_lucky_draw_user_chances
   * - 如果该用户+活动+来源已有记录，chances += count
   * - 否则创建新记录
   *
   * @param userId   用户ID
   * @param activityId 活动ID
   * @param source   次数来源（hold_collectible/invite_friend/register/check_in/system）
   * @param count    发放次数
   */
  async grantChances(
    userId: number,
    activityId: number,
    source: LuckyDrawChanceSource,
    count: number,
  ): Promise<void> {
    if (count <= 0) {
      return;
    }

    const existing = await this.chanceRepo.findOne({
      where: { activityId, userId, source, isDelete: 0 },
    });

    if (existing) {
      // 已有记录，累加次数
      await this.chanceRepo.increment(
        { id: existing.id },
        'chances',
        count,
      );
    } else {
      // 创建新记录，处理并发场景下的唯一约束冲突
      try {
        const chance = this.chanceRepo.create({
          activityId,
          userId,
          source,
          chances: count,
          usedChances: 0,
          expiresAt: null,
          isDelete: 0,
        });
        await this.chanceRepo.save(chance);
      } catch (e) {
        // 并发创建冲突：回退为累加
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
          await this.chanceRepo.increment(
            { activityId, userId, source, isDelete: 0 },
            'chances',
            count,
          );
        } else {
          throw e;
        }
      }
    }
  }

  /**
   * 检测并发放持有藏品类型的抽奖次数
   * 在用户获得藏品（转赠确认/购买/空投/合成等）后异步调用
   *
   * 逻辑：
   * 1. 查询进行中的抽奖活动，其 hold_collectible_id 等于指定藏品ID
   * 2. 对每个匹配活动，检查用户是否已持有该藏品（status=1）
   * 3. 若用户已持有且尚未发放过 hold_collectible 来源的次数，则发放
   *
   * @param userId       用户ID
   * @param collectibleId 藏品ID（刚获得的藏品）
   */
  async checkAndGrantHoldCollectibleChances(
    userId: number,
    collectibleId: number,
  ): Promise<void> {
    const now = new Date();

    // 查询进行中的、配置了 hold_collectible 规则的活动
    const activities = await this.activityRepo
      .createQueryBuilder('a')
      .where('a.status = 2')
      .andWhere('a.is_delete = 0')
      .andWhere('a.hold_collectible_id = :collectibleId', { collectibleId })
      .andWhere('a.hold_collectible_grant > 0')
      .andWhere('(a.start_time IS NULL OR a.start_time <= :now)', { now })
      .andWhere('(a.end_time IS NULL OR a.end_time >= :now)', { now })
      .getMany();

    if (activities.length === 0) {
      this.logger.debug(
        `hold_collectible 检测：无匹配活动 userId=${userId}, collectibleId=${collectibleId}`,
      );
      return;
    }

    // 校验用户确实持有该藏品（status=1 持有）
    const holdingCount = await this.userCollectibleRepo.count({
      where: { userId, collectibleId, status: 1, isDelete: 0 },
    });
    if (holdingCount === 0) {
      this.logger.debug(
        `hold_collectible 检测：用户未持有该藏品 userId=${userId}, collectibleId=${collectibleId}`,
      );
      return;
    }

    // 逐个活动发放次数（仅首次持有才发放，避免重复）
    for (const activity of activities) {
      // 检查是否已发放过 hold_collectible 来源的次数
      const existing = await this.chanceRepo.findOne({
        where: {
          activityId: activity.id,
          userId,
          source: 'hold_collectible',
          isDelete: 0,
        },
      });
      if (existing) {
        this.logger.debug(
          `hold_collectible 已发放过：activityId=${activity.id}, userId=${userId}`,
        );
        continue;
      }

      const grantCount = Number(activity.holdCollectibleGrant) || 0;
      if (grantCount > 0) {
        await this.grantChances(userId, activity.id, 'hold_collectible', grantCount);
        this.logger.log(
          `hold_collectible 发放成功：activityId=${activity.id}, userId=${userId}, chances=${grantCount}`,
        );
      }
    }
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 构建次数明细数据（按来源分组）
   * @returns { chances, total_granted, total_used, total_remaining }
   */
  private buildChancesData(chances: NftLuckyDrawUserChance[]) {
    const chancesData = chances.map((c) => ({
      source: c.source,
      source_name: SOURCE_NAME_MAP[c.source] ?? c.source,
      related_id: null, // 实体暂未存储 related_id，预留兼容 API 响应
      granted_count: c.chances,
      used_count: c.usedChances,
      remaining: c.chances - c.usedChances,
    }));

    const total_granted = chances.reduce((sum, c) => sum + c.chances, 0);
    const total_used = chances.reduce((sum, c) => sum + c.usedChances, 0);
    const total_remaining = total_granted - total_used;

    return { chances: chancesData, total_granted, total_used, total_remaining };
  }

  /**
   * 加权随机选择
   * 使用密码学安全随机数（crypto.randomBytes），直接使用传入的权重值
   * @param items  候选项数组
   * @param weights 对应权重数组（非负数）
   * @returns 选中的项，若数组为空返回 null
   */
  private weightedRandomSelect<T>(
    items: T[],
    weights: number[],
  ): T | null {
    if (items.length === 0) return null;

    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) {
      // 权重全为0时使用密码学安全随机数选一个
      const randBuffer = crypto.randomBytes(4);
      const idx = randBuffer.readUInt32BE() % items.length;
      return items[idx];
    }

    // 密码学安全随机数 [0, total)
    const randBuffer = crypto.randomBytes(8);
    let r = (Number(randBuffer.readBigUInt64BE()) / Number(2n ** 64n)) * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) {
        return items[i];
      }
    }
    // 浮点精度兜底：返回最后一项
    return items[items.length - 1];
  }
}
