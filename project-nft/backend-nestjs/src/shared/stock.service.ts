// [公共] - Redis 库存预扣减服务（秒杀级）
//
// 核心原理：
//   在 DB 事务之前，先通过 Redis Lua 脚本原子扣减库存。
//   只有 Redis 扣减成功的请求才能进入 DB 事务，将并发压力从 DB 层转移到 Redis 层。
//   Redis 单线程 DECR/Lua 可支撑 10W+ QPS，远超 MySQL 行锁并发能力。
//
// 流程：
//   1. 活动开始时调用 initStock() 将 DB 库存同步到 Redis
//   2. 用户请求时调用 preDeduct() 原子扣减 Redis 库存
//   3a. 扣减成功 → 进入 DB 事务 → 事务成功则结束
//   3b. 扣减成功 → 进入 DB 事务 → 事务失败则调用 restore() 回补 Redis 库存
//   4. 扣减失败（-2 库存不足）→ 直接返回，不触碰 DB
//
// Key 命名规范：
//   stock:release:{collectibleId}       发售库存
//   stock:luckydraw:{activityId}:{prizeId}  抽奖奖品库存
//   stock:synthesis:{activityId}        合成活动库存
//   stock:priority:{prioritySaleId}     优先购库存
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from './redis.service';
import { NftCollectible } from '../database/entities/nft-collectible.entity';
import { NftLuckyDrawPrize } from '../database/entities/nft-lucky-draw-prize.entity';
import { NftSynthesisActivity } from '../database/entities/nft-synthesis-activity.entity';

/** 库存 key 前缀 */
const STOCK_KEY_PREFIX = 'stock:';

/** 库存 key TTL（7天，防止僵尸 key） */
const STOCK_KEY_TTL = 7 * 24 * 3600;

/** 库存预扣减结果 */
export enum StockDeductResult {
  /** 库存未初始化 */
  NOT_INITIALIZED = -1,
  /** 库存不足 */
  INSUFFICIENT = -2,
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftLuckyDrawPrize)
    private readonly luckyDrawPrizeRepo: Repository<NftLuckyDrawPrize>,
    @InjectRepository(NftSynthesisActivity)
    private readonly synthesisActivityRepo: Repository<NftSynthesisActivity>,
  ) {}

  // ============================================================
  // Key 生成工具方法
  // ============================================================

  /**
   * 发售库存 key
   */
  releaseKey(collectibleId: number): string {
    return `${STOCK_KEY_PREFIX}release:${collectibleId}`;
  }

  /**
   * 抽奖奖品库存 key
   */
  luckyDrawPrizeKey(activityId: number, prizeId: number): string {
    return `${STOCK_KEY_PREFIX}luckydraw:${activityId}:${prizeId}`;
  }

  /**
   * 合成活动库存 key
   */
  synthesisKey(activityId: number): string {
    return `${STOCK_KEY_PREFIX}synthesis:${activityId}`;
  }

  /**
   * 优先购库存 key
   */
  priorityKey(prioritySaleId: number): string {
    return `${STOCK_KEY_PREFIX}priority:${prioritySaleId}`;
  }

  // ============================================================
  // 核心方法
  // ============================================================

  /**
   * 初始化库存到 Redis
   *
   * 将 DB 中的库存量同步到 Redis，活动开始前调用。
   * 若 key 已存在则覆盖（以 DB 为准）。
   *
   * @param stockKey 库存 key
   * @param quantity 库存数量
   * @param ttl 过期时间(秒)，默认 7 天
   */
  async initStock(
    stockKey: string,
    quantity: number,
    ttl: number = STOCK_KEY_TTL,
  ): Promise<void> {
    if (quantity < 0) {
      this.logger.warn(`initStock: 库存不能为负数 key=${stockKey} qty=${quantity}`);
      quantity = 0;
    }
    await this.redisService.set(stockKey, String(quantity), ttl);
    this.logger.log(`库存已初始化: key=${stockKey} quantity=${quantity} ttl=${ttl}s`);
  }

  /**
   * 原子预扣减库存（秒杀核心）
   *
   * 通过 Lua 脚本原子操作：GET → 判断 → DECRBY
   * 单次操作延迟 <0.1ms，可支撑 10W+ QPS
   *
   * @param stockKey 库存 key
   * @param quantity 扣减数量（默认 1）
   * @returns >=0 扣减成功(剩余库存)；-1 库存未初始化；-2 库存不足
   */
  async preDeduct(stockKey: string, quantity: number = 1): Promise<number> {
    const result = await this.redisService.deductStock(stockKey, quantity);

    if (result === StockDeductResult.NOT_INITIALIZED) {
      this.logger.warn(`preDeduct: 库存未初始化 key=${stockKey}`);
    } else if (result === StockDeductResult.INSUFFICIENT) {
      // 库存不足是正常业务场景，不打 warn，仅 debug
      this.logger.debug(`preDeduct: 库存不足 key=${stockKey}`);
    }

    return result;
  }

  /**
   * 回补库存（事务失败时调用）
   *
   * @param stockKey 库存 key
   * @param quantity 回补数量
   * @returns 回补后的库存值
   */
  async restore(stockKey: string, quantity: number = 1): Promise<number> {
    const result = await this.redisService.restoreStock(stockKey, quantity);
    this.logger.log(
      `库存已回补: key=${stockKey} quantity=+${quantity} remaining=${result}`,
    );
    return result;
  }

  /**
   * 获取当前 Redis 库存
   */
  async getStock(stockKey: string): Promise<number | null> {
    const value = await this.redisService.get(stockKey);
    if (value === null) return null;
    return parseInt(value, 10);
  }

  /**
   * 删除库存 key（活动结束时清理）
   */
  async removeStock(stockKey: string): Promise<void> {
    await this.redisService.del(stockKey);
    this.logger.log(`库存 key 已删除: ${stockKey}`);
  }

  /**
   * 增补库存（管理员追加库存时调用）
   *
   * @param stockKey 库存 key
   * @param quantity 增补数量
   * @returns 增补后的库存值
   */
  async addStock(stockKey: string, quantity: number): Promise<number> {
    const result = await this.redisService.restoreStock(stockKey, quantity);
    this.logger.log(
      `库存已增补: key=${stockKey} quantity=+${quantity} total=${result}`,
    );
    return result;
  }

  /**
   * 安全预扣减 + 自动回补包装器
   *
   * 封装「预扣减 → 执行业务 → 失败回补」的完整流程。
   * 当 fn 抛出异常时自动回补 Redis 库存，确保库存一致性。
   *
   * @param stockKey 库存 key
   * @param fn 业务函数（通常包含 DB 事务）
   * @param quantity 扣减数量
   * @returns fn 的返回值
   * @throws BadRequestException 库存不足时
   */
  async withStockDeduction<T>(
    stockKey: string,
    fn: () => Promise<T>,
    quantity: number = 1,
  ): Promise<T> {
    // 1) Redis 原子预扣减
    const remaining = await this.preDeduct(stockKey, quantity);

    if (remaining === StockDeductResult.NOT_INITIALIZED) {
      // 库存未初始化：降级为直接执行 fn（不阻塞业务，但会打告警日志）
      this.logger.warn(
        `withStockDeduction: 库存未初始化，降级直执行 DB key=${stockKey}`,
      );
      return fn();
    }

    if (remaining === StockDeductResult.INSUFFICIENT) {
      // 库存不足：直接拒绝，不触碰 DB
      throw new BadRequestException({
        code: 400,
        data: null,
        message: '库存不足，手慢了！',
      });
    }

    // 2) 预扣减成功，执行业务
    try {
      return await fn();
    } catch (error) {
      // 3) 业务失败，回补 Redis 库存
      this.logger.warn(
        `withStockDeduction: 业务失败，回补库存 key=${stockKey} qty=+${quantity}: ${error?.message ?? error}`,
      );
      await this.restore(stockKey, quantity);
      throw error;
    }
  }

  // ============================================================
  // 缓存预热方法（活动开始前将 DB 库存同步到 Redis）
  // ============================================================

  /**
   * 预热发售库存
   *
   * 从 DB 读取藏品可用库存（circulate - locked_quantity），写入 Redis。
   * 管理员将藏品状态改为"发售中"时自动触发。
   *
   * @param collectibleIds 藏品 ID 数组
   * @returns 预热成功的数量
   */
  async warmUpReleaseStock(collectibleIds: number[]): Promise<number> {
    let warmed = 0;
    for (const id of collectibleIds) {
      const collectible = await this.collectibleRepo.findOne({
        where: { id, isDelete: 0 },
        select: ['id', 'circulate', 'lockedQuantity', 'status', 'isRelease'],
      });
      if (!collectible) {
        this.logger.warn(`warmUpReleaseStock: 藏品不存在 id=${id}`);
        continue;
      }
      const availableStock = collectible.circulate - collectible.lockedQuantity;
      const key = this.releaseKey(id);
      await this.initStock(key, Math.max(0, availableStock));
      warmed++;
      this.logger.log(
        `warmUpReleaseStock: 藏品 id=${id} 库存预热完成 available=${availableStock} (circulate=${collectible.circulate} locked=${collectible.lockedQuantity})`,
      );
    }
    this.logger.log(
      `warmUpReleaseStock: 完成 ${warmed}/${collectibleIds.length} 个藏品库存预热`,
    );
    return warmed;
  }

  /**
   * 预热抽奖活动奖品库存
   *
   * 遍历活动下所有奖品，将每个奖品的剩余可发数量写入 Redis。
   * 管理员将抽奖活动状态改为"进行中"时自动触发。
   *
   * @param activityId 抽奖活动 ID
   * @returns 预热成功的奖品数量
   */
  async warmUpDrawStock(activityId: number): Promise<number> {
    const prizes = await this.luckyDrawPrizeRepo.find({
      where: { activityId, isDelete: 0 },
      select: ['id', 'activityId', 'quantityLimit', 'quantityDistributed'],
    });
    if (!prizes.length) {
      this.logger.warn(
        `warmUpDrawStock: 抽奖活动 ${activityId} 无奖品`,
      );
      return 0;
    }
    let warmed = 0;
    for (const prize of prizes) {
      const remaining = (prize.quantityLimit ?? 0) - prize.quantityDistributed;
      const key = this.luckyDrawPrizeKey(activityId, prize.id);
      await this.initStock(key, Math.max(0, remaining));
      warmed++;
      this.logger.log(
        `warmUpDrawStock: 奖品 id=${prize.id} 活动id=${activityId} 库存预热完成 remaining=${remaining} (limit=${prize.quantityLimit} distributed=${prize.quantityDistributed})`,
      );
    }
    this.logger.log(
      `warmUpDrawStock: 抽奖活动 ${activityId} 完成 ${warmed} 个奖品库存预热`,
    );
    return warmed;
  }

  /**
   * 预热合成活动库存
   *
   * 从 DB 读取合成活动的剩余可合成次数，写入 Redis。
   * 管理员将合成活动状态改为"进行中"时自动触发。
   *
   * @param activityId 合成活动 ID
   * @returns 是否预热成功
   */
  async warmUpSynthesisStock(activityId: number): Promise<boolean> {
    const activity = await this.synthesisActivityRepo.findOne({
      where: { id: activityId, isDelete: 0 },
      select: ['id', 'totalLimit', 'perUserLimit', 'type'],
    });
    if (!activity) {
      this.logger.warn(
        `warmUpSynthesisStock: 合成活动 ${activityId} 不存在`,
      );
      return false;
    }
    // totalLimit 为 null 时表示永久活动，使用一个大数作为库存上限
    const stock = activity.totalLimit ?? 999999;
    const key = this.synthesisKey(activityId);
    await this.initStock(key, stock);
    this.logger.log(
      `warmUpSynthesisStock: 合成活动 ${activityId} 库存预热完成 stock=${stock} (totalLimit=${activity.totalLimit ?? 'unlimited'})`,
    );
    return true;
  }
}
