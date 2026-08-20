// [管理后台-藏品管理模块] - AdminCollectibleService
// 实现管理后台藏品管理 18 个接口的业务逻辑：
//   列表/创建/详情/编辑/发行/配额/重新上架/强制售罄/销毁/软删除/
//   空投/寄售开关/价格管控/资格配置/资格白名单/优先购配置/优先购白名单/审计日志
//
// 说明：
//   - 寄售开关复用 NftCollectible.isTransferable（藏品是否可流转/寄售）
//   - 价格管控无独立字段，通过操作日志(nft_operation_logs)持久化并审计
//   - 销毁记录写入 nft_destroy_records，并记录操作日志
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import {
  NftCollectible,
  NftCategory,
  NftUserCollectible,
  NftInventoryQuota,
  NftDestroyRecord,
  NftQualificationConfig,
  NftQualificationWhitelist,
  NftPrioritySale,
  NftPrioritySaleWhitelist,
  NftOperationLog,
  NftAirdropRecord,
  NftUser,
} from '../../../database/entities';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { RedisService } from '../../../shared/redis.service';

/** 藏品表名，用于操作日志 */
const TARGET_TABLE = 'nft_collectibles';

/** 藏品列表缓存 key 模式（C 端 collectible.service.ts 中使用的前缀） */
const COLLECTIBLES_LIST_CACHE_PATTERN = 'collectibles:list*';

@Injectable()
export class AdminCollectibleService {
  private readonly logger = new Logger(AdminCollectibleService.name);

  constructor(
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftCategory)
    private readonly categoryRepo: Repository<NftCategory>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftInventoryQuota)
    private readonly quotaRepo: Repository<NftInventoryQuota>,
    @InjectRepository(NftDestroyRecord)
    private readonly destroyRecordRepo: Repository<NftDestroyRecord>,
    @InjectRepository(NftQualificationConfig)
    private readonly qualificationConfigRepo: Repository<NftQualificationConfig>,
    @InjectRepository(NftQualificationWhitelist)
    private readonly qualificationWhitelistRepo: Repository<NftQualificationWhitelist>,
    @InjectRepository(NftPrioritySale)
    private readonly prioritySaleRepo: Repository<NftPrioritySale>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    @InjectRepository(NftAirdropRecord)
    private readonly airdropRecordRepo: Repository<NftAirdropRecord>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  /** 解析分页参数 */
  private parsePaging(query: any): { page: number; pageSize: number } {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    return { page, pageSize };
  }

  /**
   * 失效 C 端藏品列表缓存
   * 在管理后台对藏品进行增删改后调用，清除 "collectibles:list*" 全部缓存变体。
   * 缓存清除失败不影响业务主流程（仅记录日志）。
   */
  private async invalidateCollectiblesListCache(): Promise<void> {
    try {
      await this.redisService.delCacheByPattern(COLLECTIBLES_LIST_CACHE_PATTERN);
    } catch (err) {
      this.logger.warn(
        `清除藏品列表缓存失败（不影响业务）: ${err?.message ?? err}`,
      );
    }
  }

  // ============================================================
  // 1. 藏品列表（分页 + 搜索 + 过滤）
  // ============================================================
  async findList(query: any) {
    const { page, pageSize } = this.parsePaging(query);
    const qb = this.collectibleRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0');

    if (query.keyword) {
      qb.andWhere('c.name LIKE :kw', { kw: `%${query.keyword}%` });
    }
    if (query.categoryId !== undefined && query.categoryId !== '') {
      qb.andWhere('c.category_id = :categoryId', {
        categoryId: Number(query.categoryId),
      });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('c.status = :status', { status: Number(query.status) });
    }
    if (query.isRelease !== undefined && query.isRelease !== '') {
      qb.andWhere('c.is_release = :isRelease', {
        isRelease: Number(query.isRelease),
      });
    }

    qb.orderBy('c.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 2. 创建藏品
  // ============================================================
  async create(dto: any, admin: AuthenticatedAdmin) {
    if (!dto?.name || !dto?.categoryId || !dto?.image) {
      throw new BadRequestException('缺少必要参数：name / categoryId / image');
    }
    const collectible = this.collectibleRepo.create({
      categoryId: Number(dto.categoryId),
      name: dto.name,
      image: dto.image,
      subtitle: dto.subtitle ?? null,
      price: Number(dto.price ?? 0),
      royaltyRate: Number(dto.royaltyRate ?? 0),
      edition: Number(dto.edition ?? 0),
      issuer: dto.issuer ?? '数和文创',
      creator: dto.creator ?? '数和文创',
      brand: dto.brand ?? '数和文创',
      description: dto.description ?? null,
      tag: dto.tag ?? null,
      isTransferable: dto.isTransferable ?? 1,
      status: Number(dto.status ?? 1),
      isRelease: 0,
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const saved = await queryRunner.manager.save(collectible);

      // 若提供了库存配额，一并创建
      if (dto.totalQuota !== undefined || dto.maxPerUser !== undefined) {
        const quota = queryRunner.manager.create(NftInventoryQuota, {
          collectibleId: saved.id,
          totalQuota: Number(dto.totalQuota ?? 0),
          soldCount: 0,
          reservedCount: 0,
          maxPerUser: Number(dto.maxPerUser ?? 1),
        });
        await queryRunner.manager.save(quota);
      }

      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        saved.id,
        'create',
        null,
        { name: saved.name, categoryId: saved.categoryId },
      );

      await queryRunner.commitTransaction();
      // 新增藏品后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`创建藏品失败: ${err.message}`, err.stack);
      throw new HttpException(
        '创建藏品失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 3. 藏品详情（含分类与配额）
  // ============================================================
  async findOne(id: number) {
    const collectible = await this.collectibleRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!collectible) {
      throw new NotFoundException(`藏品 #${id} 不存在`);
    }
    const [category, quota] = await Promise.all([
      this.categoryRepo.findOne({ where: { id: collectible.categoryId } }),
      this.quotaRepo.findOne({ where: { collectibleId: id } }),
    ]);
    return { ...collectible, category: category || null, quota: quota || null };
  }

  // ============================================================
  // 4. 编辑藏品
  // ============================================================
  async update(id: number, dto: any, admin: AuthenticatedAdmin) {
    const collectible = await this.findCollectibleOrThrow(id);
    const oldValue = { ...collectible };
    // 仅更新 dto 中提供的字段
    const allowed: Array<keyof NftCollectible> = [
      'name',
      'subtitle',
      'image',
      'gradient',
      'icon',
      'price',
      'royaltyRate',
      'edition',
      'issuer',
      'creator',
      'brand',
      'album',
      'tag',
      'description',
      'categoryId',
      'isTransferable',
      'featured',
      'marketTag',
      'serialPrefix',
    ];
    const update: Partial<NftCollectible> = {};
    for (const key of allowed) {
      if (dto[key] !== undefined) {
        (update as any)[key] = dto[key];
      }
    }
    if (Object.keys(update).length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set(update)
        .where('id = :id', { id })
        .execute();

      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'update',
        oldValue,
        update,
      );

      await queryRunner.commitTransaction();
      // 编辑藏品后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, ...update };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`编辑藏品失败: ${err.message}`, err.stack);
      throw new HttpException(
        '编辑藏品失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 5. 发行 / 发布藏品
  // ============================================================
  async release(id: number, admin: AuthenticatedAdmin) {
    const collectible = await this.findCollectibleOrThrow(id);
    if (collectible.isRelease === 1) {
      throw new BadRequestException('藏品已发行');
    }
    const now = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ isRelease: 1, status: 1, releaseDate: now, onsaleAt: now })
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'release',
        { isRelease: 0 },
        { isRelease: 1, releaseDate: now },
      );
      await queryRunner.commitTransaction();
      // 发行藏品后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, isRelease: 1, status: 1, releaseDate: now };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`发行藏品失败: ${err.message}`, err.stack);
      throw new HttpException(
        '发行藏品失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 6. 库存配额列表
  // ============================================================
  async getQuotas(id: number) {
    await this.findCollectibleOrThrow(id);
    const list = await this.quotaRepo.find({ where: { collectibleId: id } });
    return list;
  }

  // ============================================================
  // 7. 重新上架
  // ============================================================
  async relist(id: number, admin: AuthenticatedAdmin) {
    await this.findCollectibleOrThrow(id);
    const now = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ status: 1, isRelease: 1, onsaleAt: now, offSaleAt: null })
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'relist',
        null,
        { status: 1, onsaleAt: now },
      );
      await queryRunner.commitTransaction();
      // 重新上架后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, status: 1, onsaleAt: now };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`重新上架失败: ${err.message}`, err.stack);
      throw new HttpException(
        '重新上架失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 8. 强制售罄
  // ============================================================
  async forceSoldout(id: number, admin: AuthenticatedAdmin) {
    await this.findCollectibleOrThrow(id);
    const now = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ status: 0, offSaleAt: now })
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'force_soldout',
        null,
        { status: 0, offSaleAt: now },
      );
      await queryRunner.commitTransaction();
      // 强制售罄后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, status: 0, offSaleAt: now };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`强制售罄失败: ${err.message}`, err.stack);
      throw new HttpException(
        '强制售罄失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 8.5. 切换藏品上下架状态
  // ============================================================
  async toggleStatus(id: number, admin: AuthenticatedAdmin) {
    const collectible = await this.findCollectibleOrThrow(id);
    const currentStatus = Number(collectible.status);
    const newStatus = currentStatus === 1 ? 0 : 1;
    const now = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const setFields: Record<string, unknown> = { status: newStatus };
      if (newStatus === 1) {
        setFields.onsaleAt = now;
        setFields.offSaleAt = null;
      } else {
        setFields.offSaleAt = now;
      }
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set(setFields)
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'toggle_status',
        { status: currentStatus },
        { status: newStatus },
      );
      await queryRunner.commitTransaction();
      await this.invalidateCollectiblesListCache();
      return { id, status: newStatus };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`切换藏品状态失败: ${err.message}`, err.stack);
      throw new HttpException(
        '切换藏品状态失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 9. 销毁库存（指定用户藏品）
  // ============================================================
  async destroy(
    id: number,
    body: { userCollectibleId: number; userId: number; reason: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.userCollectibleId || !body?.userId || !body?.reason) {
      throw new BadRequestException(
        '缺少参数：userCollectibleId / userId / reason',
      );
    }
    // 校验用户藏品记录存在且属于该藏品
    const userCollectible = await this.userCollectibleRepo.findOne({
      where: { id: body.userCollectibleId, collectibleId: id, userId: body.userId },
    });
    if (!userCollectible) {
      throw new NotFoundException(
        `用户藏品记录 #${body.userCollectibleId} 不存在或不属于该藏品`,
      );
    }
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const record = queryRunner.manager.create(NftDestroyRecord, {
        userCollectibleId: body.userCollectibleId,
        collectibleId: id,
        userId: body.userId,
        adminId: admin.id,
        reason: body.reason,
        status: 1, // 已销毁
      });
      const saved = await queryRunner.manager.save(record);

      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'destroy',
        null,
        {
          destroyRecordId: saved.id,
          userCollectibleId: body.userCollectibleId,
          userId: body.userId,
          reason: body.reason,
        },
      );

      await queryRunner.commitTransaction();
      // 销毁库存后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`销毁库存失败: ${err.message}`, err.stack);
      throw new HttpException(
        '销毁库存失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 10. 软删除藏品
  // ============================================================
  async softDelete(id: number, admin: AuthenticatedAdmin) {
    const collectible = await this.findCollectibleOrThrow(id);
    const now = new Date();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ isDelete: 1, deletedAt: now })
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'soft_delete',
        { name: collectible.name },
        { isDelete: 1, deletedAt: now },
      );
      await queryRunner.commitTransaction();
      // 软删除藏品后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, isDelete: 1 };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`软删除藏品失败: ${err.message}`, err.stack);
      throw new HttpException(
        '软删除藏品失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 11. 空投藏品给用户
  // ============================================================
  async airdrop(
    id: number,
    body: { activityId: number; userIds: number[]; quantity?: number },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.activityId) {
      throw new BadRequestException('缺少参数：activityId');
    }
    if (!Array.isArray(body?.userIds) || body.userIds.length === 0) {
      throw new BadRequestException('缺少参数：userIds');
    }
    // 查询用户手机号
    const users = await this.userRepo.find({
      where: { id: In(body.userIds), isDelete: 0 },
      select: ['id', 'phone'],
    });
    if (users.length === 0) {
      throw new BadRequestException('未找到有效用户');
    }
    const quantity = Number(body.quantity ?? 1);
    const now = new Date();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const records = users.map((u) =>
        queryRunner.manager.create(NftAirdropRecord, {
          activityId: body.activityId,
          userId: u.id,
          collectibleId: id,
          phone: u.phone,
          quantity,
          status: 1,
          issuedAt: now,
        }),
      );
      const saved = await queryRunner.manager.save(records);

      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'airdrop',
        null,
        {
          activityId: body.activityId,
          count: saved.length,
          quantity,
        },
      );

      await queryRunner.commitTransaction();
      // 空投后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { count: saved.length, records: saved };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`空投失败: ${err.message}`, err.stack);
      throw new HttpException(
        '空投失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 12. 寄售开关（切换可流转状态）
  // ============================================================
  async resaleToggle(id: number, admin: AuthenticatedAdmin) {
    const collectible = await this.findCollectibleOrThrow(id);
    const newValue = collectible.isTransferable === 1 ? 0 : 1;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ isTransferable: newValue })
        .where('id = :id', { id })
        .execute();
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'resale_toggle',
        { isTransferable: collectible.isTransferable },
        { isTransferable: newValue },
      );
      await queryRunner.commitTransaction();
      // 寄售开关切换后失效 C 端藏品列表缓存
      await this.invalidateCollectiblesListCache();
      return { id, isTransferable: newValue };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`寄售开关切换失败: ${err.message}`, err.stack);
      throw new HttpException(
        '寄售开关切换失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 13. 价格管控（寄售价格上下限，通过操作日志持久化）
  // ============================================================
  async priceControl(
    id: number,
    body: { minResalePrice: number; maxResalePrice: number },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (
      body?.minResalePrice === undefined ||
      body?.maxResalePrice === undefined
    ) {
      throw new BadRequestException(
        '缺少参数：minResalePrice / maxResalePrice',
      );
    }
    if (Number(body.maxResalePrice) < Number(body.minResalePrice)) {
      throw new BadRequestException('最高价不能低于最低价');
    }
    const config = {
      minResalePrice: Number(body.minResalePrice),
      maxResalePrice: Number(body.maxResalePrice),
    };
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'price_control',
        null,
        config,
      );
      await queryRunner.commitTransaction();
      return { id, ...config };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`价格管控失败: ${err.message}`, err.stack);
      throw new HttpException(
        '价格管控失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 14. 创建资格配置
  // ============================================================
  async createQualificationConfig(
    id: number,
    body: { name: string; activityType?: string; rules?: Record<string, any> },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.name) {
      throw new BadRequestException('缺少参数：name');
    }
    const config = this.qualificationConfigRepo.create({
      name: body.name,
      activityType: body.activityType || 'collectible',
      activityId: id,
      rules: body.rules ?? null,
      status: 1,
    });
    const saved = await this.qualificationConfigRepo.save(config);
    await this.logOperation(admin, TARGET_TABLE, id, 'qualification_config', null, {
      configId: saved.id,
      name: saved.name,
    });
    return saved;
  }

  // ============================================================
  // 15. 导入资格白名单（JSON/CSV 解析后的 userIds）
  // ============================================================
  async importQualificationWhitelist(
    id: number,
    body: { configId: number; userIds: number[]; remark?: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.configId) {
      throw new BadRequestException('缺少参数：configId');
    }
    if (!Array.isArray(body?.userIds) || body.userIds.length === 0) {
      throw new BadRequestException('缺少参数：userIds');
    }
    // 去重
    const userIds = [...new Set(body.userIds.map(Number))];
    // 跳过已存在
    const exist = await this.qualificationWhitelistRepo.find({
      where: { configId: body.configId, userId: In(userIds) },
      select: ['userId'],
    });
    const existSet = new Set(exist.map((e) => e.userId));
    const toInsert = userIds.filter((uid) => !existSet.has(uid));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const entities = toInsert.map((uid) =>
        queryRunner.manager.create(NftQualificationWhitelist, {
          configId: body.configId,
          userId: uid,
          remark: body.remark ?? null,
        }),
      );
      const saved = entities.length
        ? await queryRunner.manager.save(entities)
        : [];
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'qualification_whitelist_import',
        null,
        { configId: body.configId, imported: saved.length, skipped: exist.length },
      );
      await queryRunner.commitTransaction();
      return {
        imported: saved.length,
        skipped: exist.length,
        records: saved,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`导入资格白名单失败: ${err.message}`, err.stack);
      throw new HttpException(
        '导入资格白名单失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 16. 创建优先购配置
  // ============================================================
  async createPrioritySaleConfig(
    id: number,
    body: { name: string; startTime: string; endTime: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.name || !body?.startTime || !body?.endTime) {
      throw new BadRequestException('缺少参数：name / startTime / endTime');
    }
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('时间格式无效');
    }
    if (endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }
    const sale = this.prioritySaleRepo.create({
      collectibleId: id,
      name: body.name,
      startTime,
      endTime,
      status: 1,
    });
    const saved = await this.prioritySaleRepo.save(sale);
    await this.logOperation(admin, TARGET_TABLE, id, 'priority_sale_config', null, {
      saleId: saved.id,
      name: saved.name,
    });
    return saved;
  }

  // ============================================================
  // 17. 导入优先购白名单
  // ============================================================
  async importPrioritySaleWhitelist(
    id: number,
    body: {
      prioritySaleId: number;
      entries: Array<{ userId: number; maxQuantity?: number }>;
    },
    admin: AuthenticatedAdmin,
  ) {
    await this.findCollectibleOrThrow(id);
    if (!body?.prioritySaleId) {
      throw new BadRequestException('缺少参数：prioritySaleId');
    }
    if (!Array.isArray(body?.entries) || body.entries.length === 0) {
      throw new BadRequestException('缺少参数：entries');
    }
    // 校验优先购活动存在
    const sale = await this.prioritySaleRepo.findOne({
      where: { id: body.prioritySaleId, isDelete: 0 },
    });
    if (!sale) {
      throw new NotFoundException(
        `优先购活动 #${body.prioritySaleId} 不存在`,
      );
    }
    // 去重 + 跳过已存在
    const userIds = [
      ...new Set(body.entries.map((e) => Number(e.userId))),
    ];
    const exist = await this.priorityWhitelistRepo.find({
      where: {
        prioritySaleId: body.prioritySaleId,
        userId: In(userIds),
      },
      select: ['userId'],
    });
    const existSet = new Set(exist.map((e) => e.userId));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const toInsert = body.entries.filter(
        (e) => !existSet.has(Number(e.userId)),
      );
      const entities = toInsert.map((e) =>
        queryRunner.manager.create(NftPrioritySaleWhitelist, {
          prioritySaleId: body.prioritySaleId,
          userId: Number(e.userId),
          maxQuantity: Number(e.maxQuantity ?? 1),
          usedQuantity: 0,
          status: 1,
        }),
      );
      const saved = entities.length
        ? await queryRunner.manager.save(entities)
        : [];
      await this.logOperationWith(
        queryRunner.manager,
        admin,
        TARGET_TABLE,
        id,
        'priority_sale_whitelist_import',
        null,
        {
          prioritySaleId: body.prioritySaleId,
          imported: saved.length,
          skipped: exist.length,
        },
      );
      await queryRunner.commitTransaction();
      return {
        imported: saved.length,
        skipped: exist.length,
        records: saved,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`导入优先购白名单失败: ${err.message}`, err.stack);
      throw new HttpException(
        '导入优先购白名单失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 18. 操作审计日志
  // ============================================================
  async getAudit(id: number, query: any) {
    await this.findCollectibleOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.operationLogRepo.findAndCount({
      where: { targetTable: TARGET_TABLE, targetId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 19. 空投记录列表
  // ============================================================
  async getAirdropRecords(id: number, query: any) {
    await this.findCollectibleOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.airdropRecordRepo.findAndCount({
      where: { collectibleId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 20. 销毁记录列表
  // ============================================================
  async getDestroyRecords(id: number, query: any) {
    await this.findCollectibleOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.destroyRecordRepo.findAndCount({
      where: { collectibleId: id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /** 查询藏品，不存在则抛 404 */
  private async findCollectibleOrThrow(id: number): Promise<NftCollectible> {
    const collectible = await this.collectibleRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!collectible) {
      throw new NotFoundException(`藏品 #${id} 不存在`);
    }
    return collectible;
  }

  /** 记录操作日志（独立事务外，使用默认 manager） */
  private async logOperation(
    admin: AuthenticatedAdmin,
    targetTable: string,
    targetId: number,
    action: string,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
  ) {
    await this.operationLogRepo.save(
      this.operationLogRepo.create({
        adminId: admin.id,
        targetTable,
        targetId,
        action,
        oldValue,
        newValue,
        ip: null,
      }),
    );
  }

  /** 在指定事务 manager 中记录操作日志 */
  private async logOperationWith(
    manager: EntityManager,
    admin: AuthenticatedAdmin,
    targetTable: string,
    targetId: number,
    action: string,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
  ) {
    await manager.save(
      manager.create(NftOperationLog, {
        adminId: admin.id,
        targetTable,
        targetId,
        action,
        oldValue,
        newValue,
        ip: null,
      }),
    );
  }
}
