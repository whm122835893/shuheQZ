// [合成模块] - 合成业务服务
// 负责：合成活动列表 / 合成公式详情(含用户持有) / 提交合成 / 合成记录
// 所有资产变动操作均在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException。
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NftSynthesisActivity } from '../../database/entities/nft-synthesis-activity.entity';
import { NftSynthesisMaterial } from '../../database/entities/nft-synthesis-material.entity';
import { NftSynthesisRecord } from '../../database/entities/nft-synthesis-record.entity';
import { NftSynthesisRecordItem } from '../../database/entities/nft-synthesis-record-item.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SynthesisRecordsQueryDto } from './dto/synthesis-records-query.dto';
import { SynthesizeDto } from './dto/synthesize.dto';

/** 藏品序号零填充位数 */
const SERIAL_NO_PAD = 4;

/** 用户藏品状态：1=持有 */
const USER_COLLECTIBLE_STATUS_HOLDING = 1;
/** 用户藏品状态：5=已消耗(合成) */
const USER_COLLECTIBLE_STATUS_CONSUMED = 5;
/** 活动状态：2=进行中 */
const ACTIVITY_STATUS_ONGOING = 2;

@Injectable()
export class SynthesisService {
  private readonly logger = new Logger(SynthesisService.name);

  constructor(
    @InjectRepository(NftSynthesisActivity)
    private readonly activityRepo: Repository<NftSynthesisActivity>,
    @InjectRepository(NftSynthesisMaterial)
    private readonly materialRepo: Repository<NftSynthesisMaterial>,
    @InjectRepository(NftSynthesisRecord)
    private readonly recordRepo: Repository<NftSynthesisRecord>,
    @InjectRepository(NftSynthesisRecordItem)
    private readonly recordItemRepo: Repository<NftSynthesisRecordItem>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 1. 合成活动列表(分页)
  // 查询 nft_synthesis_activities WHERE status=2(进行中) AND is_delete=0
  // JOIN 结果藏品信息(nft_collectibles)
  // ============================================================
  async getActivities(query: PaginationDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.activityRepo
      .createQueryBuilder('a')
      .innerJoin(NftCollectible, 'c', 'c.id = a.result_collectible_id')
      .where('a.status = :status', { status: ACTIVITY_STATUS_ONGOING })
      .andWhere('a.is_delete = 0')
      .andWhere('c.is_delete = 0')
      .orderBy('a.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'a.id AS id',
        'a.name AS name',
        'a.type AS type',
        'a.total_limit AS total_limit',
        'a.used_count AS used_count',
        'a.per_user_limit AS per_user_limit',
        'a.end_time AS end_time',
        'c.id AS result_collectible_id',
        'c.name AS result_collectible_name',
        'c.image AS result_collectible_image',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        name: r.name,
        result_collectible: {
          id: Number(r.result_collectible_id),
          name: r.result_collectible_name,
          image: r.result_collectible_image,
        },
        type: r.type,
        total_limit: r.total_limit == null ? null : Number(r.total_limit),
        used_count: Number(r.used_count),
        per_user_limit: Number(r.per_user_limit),
        end_time: r.end_time,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 2. 合成公式详情(含我的持有情况)
  // 查询活动详情 + 材料公式(nft_synthesis_materials JOIN nft_collectibles)
  // + 计算用户持有量(my_holding) + 是否足够(is_sufficient) + 是否可合成(can_synthesize)
  // ============================================================
  async getActivityDetail(userId: number, activityId: number) {
    // 1) 查询活动详情(含结果藏品信息)
    const activity = await this.activityRepo
      .createQueryBuilder('a')
      .innerJoin(NftCollectible, 'c', 'c.id = a.result_collectible_id')
      .where('a.id = :activityId', { activityId })
      .andWhere('a.is_delete = 0')
      .andWhere('c.is_delete = 0')
      .select([
        'a.id AS id',
        'a.name AS name',
        'a.type AS type',
        'a.total_limit AS total_limit',
        'a.used_count AS used_count',
        'a.per_user_limit AS per_user_limit',
        'a.start_time AS start_time',
        'a.end_time AS end_time',
        'a.status AS status',
        'c.id AS result_collectible_id',
        'c.name AS result_collectible_name',
        'c.image AS result_collectible_image',
      ])
      .getRawOne();

    if (!activity) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '合成活动不存在',
      });
    }

    // 2) 查询材料公式(nft_synthesis_materials JOIN nft_collectibles)
    const materials = await this.materialRepo
      .createQueryBuilder('m')
      .innerJoin(NftCollectible, 'c', 'c.id = m.collectible_id')
      .where('m.activity_id = :activityId', { activityId })
      .andWhere('m.is_delete = 0')
      .andWhere('c.is_delete = 0')
      .select([
        'm.collectible_id AS collectible_id',
        'c.name AS name',
        'c.image AS image',
        'm.required_quantity AS required_quantity',
      ])
      .getRawMany();

    // 3) 批量查询用户对各材料的持有量
    //    nft_user_collectibles WHERE user_id=? AND collectible_id IN (...) AND status=1 AND is_delete=0
    const collectibleIds = materials.map((m: any) => Number(m.collectible_id));
    const holdingsMap = new Map<number, number>();

    if (collectibleIds.length > 0) {
      const holdingRows = await this.userCollectibleRepo
        .createQueryBuilder('uc')
        .select('uc.collectible_id AS collectible_id')
        .addSelect('COUNT(*) AS holding')
        .where('uc.user_id = :userId', { userId })
        .andWhere('uc.collectible_id IN (:...collectibleIds)', { collectibleIds })
        .andWhere('uc.status = :status', { status: USER_COLLECTIBLE_STATUS_HOLDING })
        .andWhere('uc.is_delete = 0')
        .groupBy('uc.collectible_id')
        .getRawMany();

      for (const row of holdingRows) {
        holdingsMap.set(Number(row.collectible_id), Number(row.holding));
      }
    }

    // 4) 构建材料响应(含 my_holding + is_sufficient)
    const materialsResult = materials.map((m: any) => {
      const collectibleId = Number(m.collectible_id);
      const requiredQuantity = Number(m.required_quantity);
      const myHolding = holdingsMap.get(collectibleId) ?? 0;
      return {
        collectible_id: collectibleId,
        name: m.name,
        image: m.image,
        required_quantity: requiredQuantity,
        my_holding: myHolding,
        is_sufficient: myHolding >= requiredQuantity,
      };
    });

    // 5) 查询用户已合成次数(my_used_count)
    const myUsedCount = await this.recordRepo.count({
      where: { activityId, userId, isDelete: 0 },
    });

    // 6) 计算 can_synthesize
    //    is_sufficient && 活动进行中 && 时间窗口内 && 未超出 per_user_limit && 未超出 total_limit
    const now = new Date();
    const allSufficient = materialsResult.every((m) => m.is_sufficient);
    const isOngoing = Number(activity.status) === ACTIVITY_STATUS_ONGOING;
    const inTimeWindow =
      (!activity.start_time || now >= new Date(activity.start_time)) &&
      (!activity.end_time || now <= new Date(activity.end_time));
    const withinPerUserLimit = myUsedCount < Number(activity.per_user_limit);
    const withinTotalLimit =
      activity.total_limit == null ||
      Number(activity.used_count) < Number(activity.total_limit);

    const canSynthesize =
      allSufficient && isOngoing && inTimeWindow && withinPerUserLimit && withinTotalLimit;

    return {
      id: Number(activity.id),
      name: activity.name,
      result_collectible: {
        id: Number(activity.result_collectible_id),
        name: activity.result_collectible_name,
        image: activity.result_collectible_image,
      },
      materials: materialsResult,
      can_synthesize: canSynthesize,
      my_used_count: myUsedCount,
      per_user_limit: Number(activity.per_user_limit),
    };
  }

  // ============================================================
  // 3. 提交合成
  // 事务内完成所有操作，使用乐观锁防并发
  // ============================================================
  async synthesize(userId: number, activityId: number, dto: SynthesizeDto) {
    const now = new Date();
    let auditData: { recordId: number; activityId: number; userId: number; resultCollectibleId: number; resultUserCollectibleId: number; consumedIds: number[]; serialNo: string } | null = null;

    const result = await this.dataSource.transaction(async (manager) => {
      // 1) 校验活动状态(status=2 进行中)
      //    移除 pessimistic_write 锁，改用 CAS 乐观锁(第8步)防超卖，避免串行化
      const activity = await manager
        .createQueryBuilder(NftSynthesisActivity, 'a')
        .where('a.id = :activityId', { activityId })
        .andWhere('a.is_delete = 0')
        .getOne();
      if (!activity) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '合成活动不存在',
        });
      }
      if (activity.status !== ACTIVITY_STATUS_ONGOING) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '合成活动未进行中',
        });
      }

      // 2) 校验时间窗口(start_time <= now <= end_time)
      if (activity.startTime && now < activity.startTime) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '合成活动尚未开始',
        });
      }
      if (activity.endTime && now > activity.endTime) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '合成活动已结束',
        });
      }

      // 3) 校验用户已合成次数 < per_user_limit
      const userUsedCount = await manager.count(NftSynthesisRecord, {
        where: { activityId, userId, isDelete: 0 },
      });
      if (userUsedCount >= activity.perUserLimit) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: `已超过每人合成次数限制（${activity.perUserLimit} 次）`,
        });
      }

      // 4) 校验总次数 < total_limit(如果有限制)
      if (
        activity.totalLimit !== null &&
        activity.usedCount >= activity.totalLimit
      ) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '合成名额已用完',
        });
      }

      // 5) 校验材料匹配
      // 5a) 查询材料公式
      const materials = await manager.find(NftSynthesisMaterial, {
        where: { activityId, isDelete: 0 },
      });

      // 构建材料需求 map: collectible_id -> required_quantity
      const materialMap = new Map<number, number>();
      let totalRequired = 0;
      for (const m of materials) {
        materialMap.set(m.collectibleId, m.requiredQuantity);
        totalRequired += m.requiredQuantity;
      }

      const ids = dto.material_user_collectible_ids;

      // 5b) 检查传入数组无重复 ID
      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '材料藏品ID存在重复',
        });
      }

      // 5c) 检查数量匹配(传入数量 = 配方总数量)
      if (ids.length !== totalRequired) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: `材料数量不匹配，需要 ${totalRequired} 件`,
        });
      }

      // 5d) 查询用户藏品(校验归属 + 查询 version 用于乐观锁)
      const userCollectibles = await manager.find(NftUserCollectible, {
        where: { id: In(ids), userId, isDelete: 0 },
      });

      // 5e) 检查所有藏品都找到且属于当前用户
      if (userCollectibles.length !== ids.length) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '部分材料藏品不存在或不属于您',
        });
      }

      // 5f) 校验材料持有状态: 所有材料 status=1(持有)
      for (const uc of userCollectibles) {
        if (uc.status !== USER_COLLECTIBLE_STATUS_HOLDING) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '部分材料藏品当前状态不可用',
          });
        }
      }

      // 5g) 按 collectible_id 分组，校验每种材料数量匹配配方
      const providedMap = new Map<number, number>();
      for (const uc of userCollectibles) {
        providedMap.set(
          uc.collectibleId,
          (providedMap.get(uc.collectibleId) ?? 0) + 1,
        );
      }
      // 校验每种材料提供数量 = 需求数量
      for (const [collectibleId, requiredQty] of materialMap) {
        const providedQty = providedMap.get(collectibleId) ?? 0;
        if (providedQty !== requiredQty) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '材料配方不匹配',
          });
        }
      }
      // 校验没有多余的材料
      for (const collectibleId of providedMap.keys()) {
        if (!materialMap.has(collectibleId)) {
          throw new BadRequestException({
            code: ErrorCode.BAD_REQUEST,
            data: null,
            message: '材料配方不匹配',
          });
        }
      }

      // 6) 消耗材料: 批量更新 nft_user_collectibles.status=5(已消耗), 乐观锁 version+1
      const materialUserCollectibleIds = userCollectibles.map((uc) => uc.id);
      const consumed = await manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({
          status: USER_COLLECTIBLE_STATUS_CONSUMED,
          version: () => 'version + 1',
        })
        .where('id IN (:...ids) AND user_id = :userId AND status = 1 AND is_delete = 0', {
          ids: materialUserCollectibleIds,
          userId,
        })
        .execute();
      if (consumed.affected !== materialUserCollectibleIds.length) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '部分材料状态已变更，请刷新后重试',
        });
      }

      // 7) 生成结果藏品
      // 7a) 查询结果藏品信息
      const resultCollectible = await manager.findOne(NftCollectible, {
        where: { id: activity.resultCollectibleId, isDelete: 0 },
      });
      if (!resultCollectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '结果藏品不存在',
        });
      }

      // 7b) 乐观锁更新 collectible.serial_current += 1, circulate += 1
      const serialUpdated = await manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({
          serialCurrent: () => 'serial_current + 1',
          circulate: () => 'circulate + 1',
          version: () => 'version + 1',
        })
        .where('id = :id AND version = :version', {
          id: resultCollectible.id,
          version: resultCollectible.version,
        })
        .execute();
      if (!serialUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '藏品序号生成冲突，请重试',
        });
      }

      const newSerialCurrent = resultCollectible.serialCurrent + 1;
      const serialNo = this.buildSerialNo(
        resultCollectible.serialPrefix,
        newSerialCurrent,
      );

      // 7c) 创建 nft_user_collectibles(source='synthesis')
      const newUserCollectible = manager.create(NftUserCollectible, {
        userId,
        collectibleId: resultCollectible.id,
        orderId: null,
        blindBoxItemId: null,
        airdropRecordId: null,
        serialNo,
        source: 'synthesis',
        acquiredPrice: 0,
        acquiredAt: now,
        isConsigned: 0,
        status: USER_COLLECTIBLE_STATUS_HOLDING,
        txHash: null,
        blockNumber: null,
        tokenId: null,
        mintStatus: null,
        isDelete: 0,
      });
      const savedUserCollectible = await manager.save(
        NftUserCollectible,
        newUserCollectible,
      );

      // 8) 更新活动 used_count += 1 (CAS 乐观锁，防止超卖)
      const activityUpdated = await manager
        .createQueryBuilder()
        .update(NftSynthesisActivity)
        .set({ usedCount: () => 'used_count + 1' })
        .where(
          'id = :id AND status = :status AND is_delete = 0 AND used_count = :currentUsedCount',
          {
            id: activity.id,
            status: ACTIVITY_STATUS_ONGOING,
            currentUsedCount: activity.usedCount,
          },
        )
        .execute();
      if (!activityUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '合成名额已用完或活动状态已变更，请刷新后重试',
        });
      }

      // 9) 写入 nft_synthesis_records
      const record = manager.create(NftSynthesisRecord, {
        activityId,
        userId,
        resultCollectibleId: resultCollectible.id,
        resultUserCollectibleId: Number(savedUserCollectible.id),
        isDelete: 0,
      });
      const savedRecord = await manager.save(NftSynthesisRecord, record);

      // 10) 批量写入 nft_synthesis_record_items (每个消耗的材料一条记录)
      const recordItems = userCollectibles.map((uc) =>
        manager.create(NftSynthesisRecordItem, {
          synthesisRecordId: Number(savedRecord.id),
          userCollectibleId: uc.id,
          collectibleId: uc.collectibleId,
          isDelete: 0,
        }),
      );
      await manager.save(NftSynthesisRecordItem, recordItems);

      // 11) 审计日志数据收集(事务外异步写入)
      auditData = {
        recordId: Number(savedRecord.id),
        activityId,
        userId,
        resultCollectibleId: resultCollectible.id,
        resultUserCollectibleId: Number(savedUserCollectible.id),
        consumedIds: ids,
        serialNo,
      };

      // 12) 返回合成结果
      return {
        result_user_collectible_id: Number(savedUserCollectible.id),
        result_collectible: {
          id: Number(resultCollectible.id),
          name: resultCollectible.name,
          image: resultCollectible.image,
          serial_no: serialNo,
        },
      };
    });

    // 事务提交后异步写入审计日志(不阻塞响应)
    if (auditData) {
      this.dataSource
        .getRepository(NftOperationLog)
        .save({
          adminId: null,
          targetTable: 'nft_synthesis_records',
          targetId: auditData.recordId,
          action: 'synthesize',
          oldValue: null,
          newValue: {
            record_id: auditData.recordId,
            activity_id: auditData.activityId,
            user_id: auditData.userId,
            result_collectible_id: auditData.resultCollectibleId,
            result_user_collectible_id: auditData.resultUserCollectibleId,
            consumed_user_collectible_ids: auditData.consumedIds,
            serial_no: auditData.serialNo,
          },
          ip: null,
          isDelete: 0,
        })
        .catch((err) => this.logger.error(`审计日志写入失败: ${err.message}`));
    }

    return result;
  }

  // ============================================================
  // 4. 合成记录(分页)
  // 查询 nft_synthesis_records WHERE user_id=当前用户
  // JOIN 活动名 + 结果藏品信息 + 结果藏品序号
  // ============================================================
  async getRecords(userId: number, query: SynthesisRecordsQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.recordRepo
      .createQueryBuilder('r')
      .innerJoin(NftSynthesisActivity, 'a', 'a.id = r.activity_id')
      .innerJoin(NftCollectible, 'c', 'c.id = r.result_collectible_id')
      .innerJoin(NftUserCollectible, 'uc', 'uc.id = r.result_user_collectible_id')
      .where('r.user_id = :userId', { userId })
      .andWhere('r.is_delete = 0')
      .orderBy('r.created_at', 'DESC');

    if (query.activity_id) {
      qb.andWhere('r.activity_id = :activity_id', {
        activity_id: query.activity_id,
      });
    }

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'r.id AS id',
        'a.name AS activity_name',
        'c.name AS result_name',
        'c.image AS result_image',
        'uc.serial_no AS result_serial_no',
        'r.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        activity_name: r.activity_name,
        result_name: r.result_name,
        result_image: r.result_image,
        result_serial_no: r.result_serial_no,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 构建藏品序号：serial_prefix + 零填充序号
   * @example buildSerialNo('#', 36) -> '#0036'
   */
  private buildSerialNo(prefix: string, current: number): string {
    return `${prefix}${String(current).padStart(SERIAL_NO_PAD, '0')}`;
  }
}
