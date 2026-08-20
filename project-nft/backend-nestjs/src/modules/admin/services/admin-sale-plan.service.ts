// [管理后台-发售计划服务] - AdminSalePlanService
// 负责发售计划的 CRUD、上架开售、下架结束等操作
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NftSalePlan } from '../../../database/entities/nft-sale-plan.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';
import { NftOperationLog } from '../../../database/entities/nft-operation-log.entity';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { ErrorCode } from '../../../common/enums/error-code.enum';

const TARGET_TABLE = 'nft_sale_plans';

@Injectable()
export class AdminSalePlanService {
  private readonly logger = new Logger(AdminSalePlanService.name);

  constructor(
    @InjectRepository(NftSalePlan)
    private readonly salePlanRepo: Repository<NftSalePlan>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 1. 发售计划列表（分页）
  // ============================================================
  async findList(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    status?: number;
    saleMode?: number;
  }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.salePlanRepo
      .createQueryBuilder('sp')
      .where('sp.is_delete = 0');

    if (query.keyword) {
      qb.andWhere('sp.name LIKE :kw', { kw: `%${query.keyword}%` });
    }
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('sp.status = :status', { status: query.status });
    }
    if (query.saleMode !== undefined && query.saleMode !== null) {
      qb.andWhere('sp.sale_mode = :saleMode', { saleMode: query.saleMode });
    }

    qb.orderBy('sp.created_at', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 关联藏品信息
    const collectibleIds = [...new Set(list.map((p) => Number(p.collectibleId)))];
    const collectibles: any[] = [];
    if (collectibleIds.length > 0) {
      const result = await this.collectibleRepo
        .createQueryBuilder('c')
        .select(['c.id', 'c.name', 'c.image'])
        .where('c.id IN (:...ids)', { ids: collectibleIds })
        .andWhere('c.is_delete = 0')
        .getRawMany();
      collectibles.push(...result);
    }
    const collMap = new Map(collectibles.map((c) => [Number(c.c_id), c]));

    return {
      list: list.map((p) => ({
        id: Number(p.id),
        collectible_id: Number(p.collectibleId),
        collectible_type: p.collectibleType,
        collectible_name: collMap.get(Number(p.collectibleId))?.c_name || '',
        collectible_image: collMap.get(Number(p.collectibleId))?.c_image || '',
        name: p.name,
        sale_mode: p.saleMode,
        price: p.price,
        per_user_limit: p.perUserLimit,
        stock_allocation: p.stockAllocation,
        start_time: p.startTime,
        end_time: p.endTime,
        status: p.status,
        sold_count: p.soldCount,
        created_at: p.createdAt,
      })),
      total,
      page,
      pageSize: pageSize,
    };
  }

  // ============================================================
  // 2. 发售计划详情
  // ============================================================
  async findOne(id: number) {
    const plan = await this.salePlanRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!plan) throw new NotFoundException(`发售计划 #${id} 不存在`);

    const collectible = await this.collectibleRepo.findOne({
      where: { id: plan.collectibleId, isDelete: 0 },
    });

    return {
      ...plan,
      id: Number(plan.id),
      collectible_id: Number(plan.collectibleId),
      collectible_name: collectible?.name || '',
      collectible_image: collectible?.image || '',
    };
  }

  // ============================================================
  // 3. 创建发售计划
  // ============================================================
  async create(dto: {
    collectibleId: number;
    collectibleType?: string;
    name: string;
    saleMode: number;
    price: number;
    perUserLimit?: number;
    stockAllocation?: number;
    startTime: Date;
    endTime: Date;
  }, admin: AuthenticatedAdmin) {
    // 校验藏品存在
    const collectible = await this.collectibleRepo.findOne({
      where: { id: dto.collectibleId, isDelete: 0 },
    });
    if (!collectible) throw new NotFoundException('藏品不存在');

    // 校验时间
    if (new Date(dto.startTime) >= new Date(dto.endTime)) {
      throw new BadRequestException('开售时间必须早于结束时间');
    }

    // 检查同一藏品是否已有进行中的发售计划
    const existing = await this.salePlanRepo
      .createQueryBuilder('sp')
      .where('sp.collectible_id = :cid', { cid: dto.collectibleId })
      .andWhere('sp.is_delete = 0')
      .andWhere('sp.status IN (:...statuses)', { statuses: [1, 2] })
      .getOne();
    if (existing) {
      throw new BadRequestException('该藏品已有进行中的发售计划，请先结束或删除');
    }

    const plan = this.salePlanRepo.create({
      collectibleId: dto.collectibleId,
      collectibleType: dto.collectibleType || 'collectible',
      name: dto.name,
      saleMode: dto.saleMode as 1 | 2,
      price: dto.price,
      perUserLimit: dto.perUserLimit ?? 0,
      stockAllocation: dto.stockAllocation ?? 0,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      status: 0, // 草稿
    });

    const saved = await this.salePlanRepo.save(plan);

    await this.operationLogRepo.save({
      adminId: admin.id,
      targetTable: TARGET_TABLE,
      targetId: Number(saved.id),
      action: 'create',
      oldValue: null,
      newValue: { ...dto, id: Number(saved.id) },
      ip: null,
      isDelete: 0,
    });

    return { ...saved, id: Number(saved.id) };
  }

  // ============================================================
  // 4. 编辑发售计划
  // ============================================================
  async update(id: number, dto: Partial<{
    name: string;
    saleMode: number;
    price: number;
    perUserLimit: number;
    stockAllocation: number;
    startTime: Date;
    endTime: Date;
  }>, admin: AuthenticatedAdmin) {
    const plan = await this.salePlanRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!plan) throw new NotFoundException(`发售计划 #${id} 不存在`);

    // 只有草稿状态可以编辑
    if (plan.status !== 0) {
      throw new BadRequestException('仅草稿状态的发售计划可以编辑');
    }

    if (dto.startTime && dto.endTime) {
      if (new Date(dto.startTime) >= new Date(dto.endTime)) {
        throw new BadRequestException('开售时间必须早于结束时间');
      }
    }

    const oldValue = { ...plan };
    Object.assign(plan, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.saleMode !== undefined ? { saleMode: dto.saleMode as 1 | 2 } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.perUserLimit !== undefined ? { perUserLimit: dto.perUserLimit } : {}),
      ...(dto.stockAllocation !== undefined ? { stockAllocation: dto.stockAllocation } : {}),
      ...(dto.startTime !== undefined ? { startTime: new Date(dto.startTime) } : {}),
      ...(dto.endTime !== undefined ? { endTime: new Date(dto.endTime) } : {}),
    });

    const saved = await this.salePlanRepo.save(plan);

    await this.operationLogRepo.save({
      adminId: admin.id,
      targetTable: TARGET_TABLE,
      targetId: id,
      action: 'update',
      oldValue,
      newValue: dto,
      ip: null,
      isDelete: 0,
    });

    return { ...saved, id: Number(saved.id) };
  }

  // ============================================================
  // 5. 上架开售（发布到用户端）
  // ============================================================
  async publish(id: number, admin: AuthenticatedAdmin) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const plan = await queryRunner.manager.findOne(NftSalePlan, {
        where: { id, isDelete: 0 },
      });
      if (!plan) throw new NotFoundException(`发售计划 #${id} 不存在`);
      if (plan.status !== 0) {
        throw new BadRequestException('仅草稿状态的发售计划可以上架');
      }

      const collectible = await queryRunner.manager.findOne(NftCollectible, {
        where: { id: plan.collectibleId, isDelete: 0 },
      });
      if (!collectible) throw new NotFoundException('藏品不存在');

      const now = new Date();
      const startTime = new Date(plan.startTime);
      const endTime = new Date(plan.endTime);

      // 根据开始时间决定初始状态
      let newStatus: 1 | 2 = 1; // 待开售
      if (now >= startTime && now <= endTime) {
        newStatus = 2; // 直接发售中
      }

      // 更新发售计划状态
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftSalePlan)
        .set({ status: newStatus })
        .where('id = :id', { id })
        .execute();

      // 设置藏品为已发布状态（C端可见）
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({
          isRelease: 1,
          status: newStatus === 2 ? 2 : 1, // 发售中=2，待开售=1
          releaseDate: now,
          onsaleAt: startTime,
          offSaleAt: endTime,
          // 如果有分配库存，使用分配的库存；否则使用全部 edition
          ...(plan.stockAllocation > 0
            ? { circulate: plan.stockAllocation }
            : { circulate: collectible.edition }),
        })
        .where('id = :cid', { cid: plan.collectibleId })
        .execute();

      // 写入操作日志
      await queryRunner.manager.save(NftOperationLog, {
        adminId: admin.id,
        targetTable: TARGET_TABLE,
        targetId: id,
        action: 'publish',
        oldValue: { status: 0 },
        newValue: { status: newStatus, collectible_is_release: 1 },
        ip: null,
        isDelete: 0,
      });

      await queryRunner.commitTransaction();
      return { id, status: newStatus };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`上架发售计划失败: ${err.message}`, err.stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new HttpException('上架失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 6. 下架（结束发售）
  // ============================================================
  async unpublish(id: number, admin: AuthenticatedAdmin) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const plan = await queryRunner.manager.findOne(NftSalePlan, {
        where: { id, isDelete: 0 },
      });
      if (!plan) throw new NotFoundException(`发售计划 #${id} 不存在`);
      if (plan.status === 0 || plan.status === 3) {
        throw new BadRequestException('当前状态无法下架');
      }

      const now = new Date();

      // 更新发售计划状态为已结束
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftSalePlan)
        .set({ status: 3 })
        .where('id = :id', { id })
        .execute();

      // 藏品下架（C端不可见）
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ status: 0, offSaleAt: now })
        .where('id = :cid', { cid: plan.collectibleId })
        .execute();

      await queryRunner.manager.save(NftOperationLog, {
        adminId: admin.id,
        targetTable: TARGET_TABLE,
        targetId: id,
        action: 'unpublish',
        oldValue: { status: plan.status },
        newValue: { status: 3 },
        ip: null,
        isDelete: 0,
      });

      await queryRunner.commitTransaction();
      return { id, status: 3 };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`下架发售计划失败: ${err.message}`, err.stack);
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      throw new HttpException('下架失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 7. 删除发售计划
  // ============================================================
  async delete(id: number, admin: AuthenticatedAdmin) {
    const plan = await this.salePlanRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!plan) throw new NotFoundException(`发售计划 #${id} 不存在`);

    if (plan.status === 1 || plan.status === 2) {
      throw new BadRequestException('进行中的发售计划不能删除，请先下架');
    }

    plan.isDelete = 1;
    plan.deletedAt = new Date();
    await this.salePlanRepo.save(plan);

    await this.operationLogRepo.save({
      adminId: admin.id,
      targetTable: TARGET_TABLE,
      targetId: id,
      action: 'delete',
      oldValue: { is_delete: 0 },
      newValue: { is_delete: 1 },
      ip: null,
      isDelete: 0,
    });

    return { deleted: true };
  }
}
