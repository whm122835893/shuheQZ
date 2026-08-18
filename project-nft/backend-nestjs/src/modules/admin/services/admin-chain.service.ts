// [管理后台-链上管理模块] - AdminChainService
// 实现区块链渠道管理、藏品上链状态查询、批量铸造、追溯铸造、
// 离线藏品标识生成、上链任务管理。
//
// 关键设计：
//  - 渠道 CRUD：标准软删除模式（is_delete=0/1）
//  - 批量铸造：为每件用户藏品创建一个 NftOnchainTask（type=mint, status=0）
//  - 追溯铸造：查询 isOnChain=0 的历史藏品并批量创建任务
//  - 离线标识生成：为 tokenId 为空的用户藏品生成随机 tokenId
//  - 任务重试：重置 status=0 并递增 retryCount（不超过 maxRetry）
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';

import { NftChainChannel } from '../../../database/entities/nft-chain-channel.entity';
import { NftOnchainTask } from '../../../database/entities/nft-onchain-task.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../../database/entities/nft-operation-log.entity';
import {
  encryptConfig,
  decryptConfig,
} from '../../../shared/aes.util';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminChainService {
  private readonly logger = new Logger(AdminChainService.name);

  constructor(
    @InjectRepository(NftChainChannel)
    private readonly channelRepo: Repository<NftChainChannel>,
    @InjectRepository(NftOnchainTask)
    private readonly taskRepo: Repository<NftOnchainTask>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 上链任务最大重试次数（从配置 ONCHAIN_MAX_RETRY 读取，默认 3）
   * 通过环境变量可动态调整，无需修改代码。
   */
  private get maxRetry(): number {
    return this.configService.get<number>('ONCHAIN_MAX_RETRY', 3);
  }

  // ============================================================
  // 渠道管理（6）
  // ============================================================

  /** 渠道列表（分页） */
  async getChannelList(query: Record<string, any>): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));

    const qb = this.channelRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0');

    if (query.chainType) {
      qb.andWhere('c.chain_type = :chainType', { chainType: query.chainType });
    }
    if (query.status !== undefined && query.status !== null && query.status !== '') {
      qb.andWhere('c.status = :status', { status: Number(query.status) });
    }
    if (query.keyword) {
      qb.andWhere('(c.code LIKE :kw OR c.name LIKE :kw)', {
        kw: `%${query.keyword}%`,
      });
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        chainType: c.chainType,
        rpcUrl: c.rpcUrl,
        explorerUrl: c.explorerUrl,
        contractAddress: c.contractAddress,
        walletAddress: c.walletAddress,
        config: decryptConfig(c.config),
        status: c.status,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 创建渠道 */
  async createChannel(body: Record<string, any>): Promise<NftChainChannel> {
    if (!body.code) {
      throw new BadRequestException('code 不能为空');
    }
    if (!body.name) {
      throw new BadRequestException('name 不能为空');
    }
    if (!body.chainType) {
      throw new BadRequestException('chainType 不能为空');
    }
    if (!body.rpcUrl) {
      throw new BadRequestException('rpcUrl 不能为空');
    }

    // 检查 code 唯一性 + 插入在同一事务中，防止竞态
    return this.dataSource.transaction(async (mgr) => {
      const existing = await mgr.findOne(NftChainChannel, {
        where: { code: body.code, isDelete: 0 },
      });
      if (existing) {
        throw new BadRequestException(`渠道编码 ${body.code} 已存在`);
      }

      const channel = this.channelRepo.create({
        code: body.code,
        name: body.name,
        chainType: body.chainType,
        rpcUrl: body.rpcUrl,
        explorerUrl: body.explorerUrl || null,
        contractAddress: body.contractAddress || null,
        walletAddress: body.walletAddress || null,
        config: encryptConfig(body.config) as any,
        status: body.status !== undefined ? Number(body.status) : 1,
        isDelete: 0,
      });

      const saved = await mgr.save(channel);
      // 返回前解密 config，避免暴露密文
      saved.config = decryptConfig(saved.config);
      return saved;
    });
  }

  /** 编辑渠道 */
  async updateChannel(
    id: number,
    body: Record<string, any>,
  ): Promise<NftChainChannel> {
    const channel = await this.channelRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!channel) {
      throw new NotFoundException('渠道不存在');
    }

    const updatableFields = [
      'code',
      'name',
      'chainType',
      'rpcUrl',
      'explorerUrl',
      'contractAddress',
      'walletAddress',
      'config',
      'status',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'config') {
          // config 字段需要 AES 加密后存储
          channel[field] = encryptConfig(body[field]) as any;
        } else {
          channel[field] = body[field];
        }
      }
    }

    const saved = await this.channelRepo.save(channel);
    // 返回前解密 config，避免暴露密文
    saved.config = decryptConfig(saved.config);
    return saved;
  }

  /** 删除渠道（软删除） */
  async deleteChannel(id: number): Promise<void> {
    const channel = await this.channelRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!channel) {
      throw new NotFoundException('渠道不存在');
    }
    channel.isDelete = 1;
    await this.channelRepo.save(channel);
  }

  /** 启用/停用渠道 */
  async toggleChannel(id: number): Promise<NftChainChannel> {
    const channel = await this.channelRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!channel) {
      throw new NotFoundException('渠道不存在');
    }
    channel.status = channel.status === 1 ? 0 : 1;
    return this.channelRepo.save(channel);
  }

  // ============================================================
  // 藏品上链状态（1）
  // ============================================================

  /** 藏品上链状态列表（分页 + 按上链状态筛选） */
  async getCollectibleOnchainList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));

    const qb = this.collectibleRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0');

    if (query.isOnChain !== undefined && query.isOnChain !== null && query.isOnChain !== '') {
      qb.andWhere('c.is_on_chain = :isOnChain', {
        isOnChain: Number(query.isOnChain),
      });
    }
    if (query.keyword) {
      qb.andWhere('c.name LIKE :kw', { kw: `%${query.keyword}%` });
    }
    if (query.chainType !== undefined && query.chainType !== null && query.chainType !== '') {
      qb.andWhere('c.chain_type = :chainType', {
        chainType: Number(query.chainType),
      });
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((c) => ({
        id: c.id,
        name: c.name,
        image: c.image,
        edition: c.edition,
        circulate: c.circulate,
        sold: c.sold,
        isOnChain: c.isOnChain,
        chainType: c.chainType,
        tokenStandard: c.tokenStandard,
        contractAddress: c.contractAddress,
        certId: c.certId,
        certSerial: c.certSerial,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ============================================================
  // 批量铸造（2）
  // ============================================================

  /**
   * 批量铸造：为指定用户藏品创建上链任务
   * body: { channelId, collectibleIds?: number[], userId?: number, targetType?: 'user_collectible' }
   */
  async batchMint(body: Record<string, any>): Promise<Record<string, any>> {
    if (!body.channelId) {
      throw new BadRequestException('channelId 不能为空');
    }
    const channelId = Number(body.channelId);

    // 验证渠道存在
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, isDelete: 0 },
    });
    if (!channel) {
      throw new NotFoundException('渠道不存在');
    }

    // 查找目标用户藏品
    const qb = this.userCollectibleRepo
      .createQueryBuilder('uc')
      .where('uc.is_delete = 0')
      .andWhere('uc.mint_status IS NULL OR uc.mint_status = 0');

    if (Array.isArray(body.collectibleIds) && body.collectibleIds.length) {
      qb.andWhere('uc.collectible_id IN (:...cids)', {
        cids: body.collectibleIds.map(Number),
      });
    }
    if (body.userId) {
      qb.andWhere('uc.user_id = :userId', { userId: Number(body.userId) });
    }
    // 限制单次批量数量
    qb.limit(Math.min(500, Number(body.limit) || 100));

    const userCollectibles = await qb.getMany();

    if (userCollectibles.length === 0) {
      return {
        channelId,
        taskCount: 0,
        message: '无可铸造的用户藏品',
      };
    }

    // 批量创建上链任务
    const tasks = userCollectibles.map((uc) =>
      this.taskRepo.create({
        collectibleId: uc.collectibleId,
        userCollectibleId: uc.id,
        channelId,
        taskType: 'mint',
        targetType: 'user_collectible',
        targetId: uc.id,
        payload: {
          userCollectibleId: uc.id,
          userId: uc.userId,
          collectibleId: uc.collectibleId,
          serialNo: uc.serialNo,
        },
        status: 0,
        retryCount: 0,
        maxRetry: this.maxRetry,
      }),
    );

    const saved = await this.dataSource.transaction(async (mgr) => {
      const savedTasks = await mgr.save(tasks);

      // 标记用户藏品 mint_status=1（处理中）
      const ucIds = userCollectibles.map((uc) => uc.id);
      if (ucIds.length) {
        await mgr
          .createQueryBuilder()
          .update(NftUserCollectible)
          .set({ mintStatus: 1 })
          .where('id IN (:...ids)', { ids: ucIds })
          .execute();
      }

      return savedTasks;
    });

    return {
      channelId,
      taskCount: saved.length,
      taskIds: saved.map((t) => t.id),
      message: `已创建 ${saved.length} 个上链任务`,
    };
  }

  /**
   * 追溯铸造：为历史未上链的藏品批量创建任务
   * body: { channelId, collectibleIds?: number[] }
   */
  async retroactiveMint(body: Record<string, any>): Promise<Record<string, any>> {
    if (!body.channelId) {
      throw new BadRequestException('channelId 不能为空');
    }
    const channelId = Number(body.channelId);

    const channel = await this.channelRepo.findOne({
      where: { id: channelId, isDelete: 0 },
    });
    if (!channel) {
      throw new NotFoundException('渠道不存在');
    }

    // 查找未上链的藏品（isOnChain=0）
    const qb = this.collectibleRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0')
      .andWhere('c.is_on_chain = 0');

    if (Array.isArray(body.collectibleIds) && body.collectibleIds.length) {
      qb.andWhere('c.id IN (:...cids)', {
        cids: body.collectibleIds.map(Number),
      });
    }
    qb.limit(Math.min(200, Number(body.limit) || 100));

    const collectibles = await qb.getMany();

    if (collectibles.length === 0) {
      return {
        channelId,
        taskCount: 0,
        message: '无可追溯铸造的藏品',
      };
    }

    // 为每个藏品创建上链任务（targetType=collectible）
    const tasks = collectibles.map((c) =>
      this.taskRepo.create({
        collectibleId: c.id,
        channelId,
        taskType: 'mint',
        targetType: 'collectible',
        targetId: c.id,
        payload: {
          collectibleId: c.id,
          name: c.name,
          edition: c.edition,
          circulate: c.circulate,
        },
        status: 0,
        retryCount: 0,
        maxRetry: this.maxRetry,
      }),
    );

    const saved = await this.dataSource.transaction(async (mgr) => {
      return mgr.save(tasks);
    });

    return {
      channelId,
      taskCount: saved.length,
      taskIds: saved.map((t) => t.id),
      message: `已创建 ${saved.length} 个追溯铸造任务`,
    };
  }

  // ============================================================
  // 离线标识生成（1）
  // ============================================================

  /**
   * 为离线藏品生成随机 tokenId
   * body: { collectibleIds?: number[], count?: number }
   */
  async generateOffchainIdentifiers(
    body: Record<string, any>,
  ): Promise<Record<string, any>> {
    // 查找 tokenId 为空的用户藏品
    const qb = this.userCollectibleRepo
      .createQueryBuilder('uc')
      .where('uc.is_delete = 0')
      .andWhere('(uc.token_id IS NULL OR uc.token_id = "")');

    if (Array.isArray(body.collectibleIds) && body.collectibleIds.length) {
      qb.andWhere('uc.collectible_id IN (:...cids)', {
        cids: body.collectibleIds.map(Number),
      });
    }

    const limit = Math.min(1000, Number(body.count) || 100);
    qb.limit(limit);

    const items = await qb.getMany();

    if (items.length === 0) {
      return {
        generated: 0,
        message: '无需生成标识的离线藏品',
      };
    }

    // 批量生成随机 tokenId 并更新（使用 crypto.randomBytes 替代 Math.random，事务保护）
    await this.dataSource.transaction(async (mgr) => {
      for (const uc of items) {
        const randomHex = crypto.randomBytes(6).toString('hex');
        const randomTokenId = `OFF-${Date.now()}-${randomHex}-${uc.id}`;
        await mgr.update(NftUserCollectible, uc.id, { tokenId: randomTokenId });
      }
    });

    return {
      generated: items.length,
      message: `已为 ${items.length} 件离线藏品生成随机标识`,
    };
  }

  // ============================================================
  // 上链任务管理（3）
  // ============================================================

  /** 上链任务列表（分页 + 筛选） */
  async getTaskList(query: Record<string, any>): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));

    const qb = this.taskRepo.createQueryBuilder('t');

    if (query.channelId) {
      qb.andWhere('t.channel_id = :channelId', {
        channelId: Number(query.channelId),
      });
    }
    if (query.taskType) {
      qb.andWhere('t.task_type = :taskType', { taskType: query.taskType });
    }
    if (query.status !== undefined && query.status !== null && query.status !== '') {
      qb.andWhere('t.status = :status', { status: Number(query.status) });
    }
    if (query.targetType) {
      qb.andWhere('t.target_type = :targetType', {
        targetType: query.targetType,
      });
    }
    if (query.targetId) {
      qb.andWhere('t.target_id = :targetId', {
        targetId: Number(query.targetId),
      });
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

    return {
      list: list.map((t) => ({
        id: t.id,
        channelId: t.channelId,
        taskType: t.taskType,
        targetType: t.targetType,
        targetId: t.targetId,
        payload: t.payload,
        txHash: t.txHash,
        blockNumber: t.blockNumber,
        status: t.status,
        retryCount: t.retryCount,
        maxRetry: t.maxRetry,
        errorMessage: t.errorMessage,
        executedAt: t.executedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 任务详情 */
  async getTaskDetail(id: number): Promise<NftOnchainTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('上链任务不存在');
    }
    return task;
  }

  /**
   * 重试失败任务
   * 条件：status=3（已失败）且 retryCount < maxRetry
   */
  async retryTask(id: number): Promise<NftOnchainTask> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('上链任务不存在');
    }
    if (task.status !== 3) {
      throw new BadRequestException('仅失败任务可重试');
    }
    if (task.retryCount >= task.maxRetry) {
      throw new BadRequestException(
        `已达最大重试次数 ${task.maxRetry}，不可继续重试`,
      );
    }

    task.status = 0; // 重置为待处理
    task.retryCount = task.retryCount + 1;
    task.errorMessage = null;
    task.executedAt = null;

    return this.taskRepo.save(task);
  }

  // ============================================================
  // 自动重试 + 死信队列（定时任务）
  // ============================================================

  /**
   * 自动重试失败的上链任务
   *
   * 定时策略：每 5 分钟扫描一次 status=3（已失败）的任务。
   *  - 若 retryCount < maxRetry：重置为 status=0（待执行）并递增 retryCount，
   *    等待上链执行器重新拉取处理。
   *  - 若 retryCount >= maxRetry：转入死信状态 status=5（死信队列），
   *    不再自动重试，需人工介入处理。
   *
   * 说明：
   *  - status 取值：0=待处理 1=处理中 2=已成功 3=已失败 4=已回滚 5=死信(死信队列)
   *    （4=已回滚 已被实体占用，故死信使用 5）
   *  - maxRetry 通过 ConfigService 从环境变量 ONCHAIN_MAX_RETRY 读取（默认 3），
   *    可在不改代码的前提下动态调整。
   *  - ScheduleModule.forRoot() 已在 app.module.ts 全局注册，@Cron 装饰器可直接生效。
   */
  @Cron('*/5 * * * *')
  async autoRetryFailedTasks() {
    const failedTasks = await this.taskRepo.find({
      where: { status: 3 },
    });

    if (failedTasks.length === 0) {
      return;
    }

    this.logger.log(
      `自动重试扫描：发现 ${failedTasks.length} 个失败的上链任务`,
    );

    for (const task of failedTasks) {
      if (task.retryCount < this.maxRetry) {
        // 未超过最大重试次数：重置为待执行并递增重试计数
        task.status = 0;
        task.retryCount += 1;
        task.errorMessage = null;
        task.executedAt = null;
        await this.taskRepo.save(task);
        this.logger.log(
          `自动重试上链任务 #${task.id}（第 ${task.retryCount} 次，上限 ${this.maxRetry}）`,
        );
      } else {
        // 超过最大重试次数：转入死信队列（status=5 死信），不再自动重试
        task.status = 5;
        await this.taskRepo.save(task);
        this.logger.error(
          `上链任务 #${task.id} 超过最大重试次数 ${this.maxRetry}，转入死信队列（status=5）`,
        );
      }
    }
  }
}
