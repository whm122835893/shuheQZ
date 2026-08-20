// [管理后台-盲盒管理模块] - AdminBlindBoxService
// 实现管理后台盲盒管理 17 个接口的业务逻辑：
//   列表/创建/详情/编辑/盲盒项CRUD/发行/重新上架/强制售罄/销毁/软删除/
//   空投/恢复/开盒记录/销毁记录
//
// 说明：
//   - nft_blind_boxes 是薄表（仅 collectible_id + is_delete），盲盒的商品属性
//     （名称/图片/价格/上下架状态）由关联的 nft_collectibles 承载
//   - 发行/重新上架/强制售罄/编辑均作用在底层 collectible 上
//   - 恢复盲盒创建审批记录(nft_approvals)，审批通过后执行
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
  NftBlindBox,
  NftBlindBoxItem,
  NftBlindBoxOpenRecord,
  NftDestroyRecord,
  NftAirdropRecord,
  NftApproval,
  NftCollectible,
  NftUser,
} from '../../../database/entities';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';

/** 盲盒表名 */
const BLIND_BOX_TABLE = 'nft_blind_boxes';

@Injectable()
export class AdminBlindBoxService {
  private readonly logger = new Logger(AdminBlindBoxService.name);

  constructor(
    @InjectRepository(NftBlindBox)
    private readonly blindBoxRepo: Repository<NftBlindBox>,
    @InjectRepository(NftBlindBoxItem)
    private readonly blindBoxItemRepo: Repository<NftBlindBoxItem>,
    @InjectRepository(NftBlindBoxOpenRecord)
    private readonly openRecordRepo: Repository<NftBlindBoxOpenRecord>,
    @InjectRepository(NftDestroyRecord)
    private readonly destroyRecordRepo: Repository<NftDestroyRecord>,
    @InjectRepository(NftAirdropRecord)
    private readonly airdropRecordRepo: Repository<NftAirdropRecord>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    private readonly dataSource: DataSource,
  ) {}

  /** 解析分页参数 */
  private parsePaging(query: any): { page: number; pageSize: number } {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    return { page, pageSize };
  }

  // ============================================================
  // 1. 盲盒列表（分页 + 搜索 + 过滤）
  // ============================================================
  async findList(query: any) {
    const { page, pageSize } = this.parsePaging(query);
    const qb = this.blindBoxRepo
      .createQueryBuilder('bb')
      .leftJoinAndMapOne(
        'bb.collectible',
        NftCollectible,
        'c',
        'c.id = bb.collectible_id',
      )
      .where('bb.is_delete = 0');

    if (query.keyword) {
      qb.andWhere('c.name LIKE :kw', { kw: `%${query.keyword}%` });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('c.status = :status', { status: Number(query.status) });
    }
    if (query.isRelease !== undefined && query.isRelease !== '') {
      qb.andWhere('c.is_release = :isRelease', {
        isRelease: Number(query.isRelease),
      });
    }

    qb.orderBy('bb.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 2. 创建盲盒
  //    - 提供 collectibleId 则直接关联已有藏品
  //    - 否则按商品字段新建藏品再关联
  // ============================================================
  async create(dto: any, admin: AuthenticatedAdmin) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let collectibleId: number;

      if (dto.collectibleId) {
        collectibleId = Number(dto.collectibleId);
        const exist = await queryRunner.manager.findOne(NftCollectible, {
          where: { id: collectibleId },
        });
        if (!exist) {
          throw new NotFoundException(
            `藏品 #${collectibleId} 不存在，无法关联盲盒`,
          );
        }
      } else {
        if (!dto?.name || !dto?.categoryId || !dto?.image) {
          throw new BadRequestException(
            '缺少参数：collectibleId 或（name / categoryId / image）',
          );
        }
        const collectible = queryRunner.manager.create(NftCollectible, {
          categoryId: Number(dto.categoryId),
          name: dto.name,
          image: dto.image,
          subtitle: dto.subtitle ?? null,
          price: Number(dto.price ?? 0),
          edition: Number(dto.edition ?? 0),
          issuer: dto.issuer ?? '数和文创',
          creator: dto.creator ?? '数和文创',
          brand: dto.brand ?? '数和文创',
          description: dto.description ?? null,
          isTransferable: 1,
          status: Number(dto.status ?? 1),
          isRelease: 0,
        });
        const savedC = await queryRunner.manager.save(collectible);
        collectibleId = savedC.id;
      }

      const blindBox = queryRunner.manager.create(NftBlindBox, {
        collectibleId,
      });
      const saved = await queryRunner.manager.save(blindBox);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      if (err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`创建盲盒失败: ${err.message}`, err.stack);
      throw new HttpException(
        '创建盲盒失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 3. 盲盒详情（含藏品与盲盒项）
  // ============================================================
  async findOne(id: number) {
    const blindBox = await this.blindBoxRepo
      .createQueryBuilder('bb')
      .leftJoinAndMapOne(
        'bb.collectible',
        NftCollectible,
        'c',
        'c.id = bb.collectible_id',
      )
      .where('bb.id = :id', { id })
      .getOne();
    if (!blindBox) {
      throw new NotFoundException(`盲盒 #${id} 不存在`);
    }
    const items = await this.blindBoxItemRepo.find({
      where: { blindBoxId: id, isDelete: 0 },
      order: { createdAt: 'ASC' },
    });
    return { ...blindBox, items };
  }

  // ============================================================
  // 4. 编辑盲盒（更新底层藏品商品属性）
  // ============================================================
  async update(id: number, dto: any, admin: AuthenticatedAdmin) {
    const blindBox = await this.findBlindBoxOrThrow(id);
    const collectible = await this.collectibleRepo.findOne({
      where: { id: blindBox.collectibleId },
    });
    if (!collectible) {
      throw new NotFoundException(
        `盲盒关联藏品 #${blindBox.collectibleId} 不存在`,
      );
    }
    const allowed: Array<keyof NftCollectible> = [
      'name',
      'subtitle',
      'image',
      'gradient',
      'icon',
      'price',
      'edition',
      'issuer',
      'creator',
      'brand',
      'album',
      'tag',
      'description',
      'featured',
      'marketTag',
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
    await this.collectibleRepo
      .createQueryBuilder()
      .update()
      .set(update)
      .where('id = :cid', { cid: collectible.id })
      .execute();
    return { id, collectibleId: collectible.id, ...update };
  }

  // ============================================================
  // 5. 盲盒项列表
  // ============================================================
  async getItems(id: number) {
    await this.findBlindBoxOrThrow(id);
    const list = await this.blindBoxItemRepo.find({
      where: { blindBoxId: id, isDelete: 0 },
      order: { createdAt: 'ASC' },
    });
    return list;
  }

  // ============================================================
  // 6. 新增盲盒项
  // ============================================================
  async addItem(
    id: number,
    body: { collectibleId: number; probability: number; quantityLimit?: number },
    admin: AuthenticatedAdmin,
  ) {
    await this.findBlindBoxOrThrow(id);
    if (!body?.collectibleId || body?.probability === undefined) {
      throw new BadRequestException('缺少参数：collectibleId / probability');
    }

    // 校验 probability 取值范围 [0, 1]
    const prob = Number(body.probability);
    if (isNaN(prob) || prob < 0 || prob > 1) {
      throw new BadRequestException('probability 必须在 [0, 1] 范围内');
    }

    // 校验概率总和不超过 1.01（与 C 端开盒校验容差一致）
    const existingItems = await this.blindBoxItemRepo.find({
      where: { blindBoxId: id, isDelete: 0 },
    });
    const currentSum = existingItems.reduce(
      (sum, item) => sum + Number(item.probability),
      0,
    );
    if (currentSum + prob > 1.01) {
      throw new BadRequestException(
        `概率总和将超过 1.0（当前 ${currentSum.toFixed(4)} + 新增 ${prob} > 1.01），请调整其他盲盒项的概率`,
      );
    }

    const prize = await this.collectibleRepo.findOne({
      where: { id: Number(body.collectibleId) },
    });
    if (!prize) {
      throw new NotFoundException(
        `奖品藏品 #${body.collectibleId} 不存在`,
      );
    }
    const item = this.blindBoxItemRepo.create({
      blindBoxId: id,
      collectibleId: Number(body.collectibleId),
      probability: prob,
      quantityLimit: body.quantityLimit ?? null,
      quantityDistributed: 0,
    });
    const saved = await this.blindBoxItemRepo.save(item);
    return saved;
  }

  // ============================================================
  // 7. 编辑盲盒项
  // ============================================================
  async updateItem(
    id: number,
    itemId: number,
    body: { probability?: number; quantityLimit?: number },
    admin: AuthenticatedAdmin,
  ) {
    await this.findBlindBoxOrThrow(id);
    const item = await this.blindBoxItemRepo.findOne({
      where: { id: itemId, blindBoxId: id, isDelete: 0 },
    });
    if (!item) {
      throw new NotFoundException(`盲盒项 #${itemId} 不存在`);
    }
    const update: Partial<NftBlindBoxItem> = {};
    if (body.probability !== undefined) {
      // 校验 probability 取值范围 [0, 1]
      const prob = Number(body.probability);
      if (isNaN(prob) || prob < 0 || prob > 1) {
        throw new BadRequestException('probability 必须在 [0, 1] 范围内');
      }
      // 检查更新后的概率总和不超过 1.01
      const allItems = await this.blindBoxItemRepo.find({
        where: { blindBoxId: id, isDelete: 0 },
      });
      const otherSum = allItems
        .filter((i) => i.id !== itemId)
        .reduce((sum, i) => sum + Number(i.probability), 0);
      if (otherSum + prob > 1.01) {
        throw new BadRequestException(
          `更新后概率总和将超过 1.0（其他项 ${otherSum.toFixed(4)} + 当前 ${prob} > 1.01），请调整其他盲盒项的概率`,
        );
      }
      update.probability = prob;
    }
    if (body.quantityLimit !== undefined) {
      update.quantityLimit =
        body.quantityLimit === null ? null : Number(body.quantityLimit);
    }
    if (Object.keys(update).length === 0) {
      throw new BadRequestException('没有可更新的字段');
    }
    await this.blindBoxItemRepo
      .createQueryBuilder()
      .update()
      .set(update)
      .where('id = :itemId', { itemId })
      .execute();
    return { id: itemId, ...update };
  }

  // ============================================================
  // 8. 删除盲盒项
  // ============================================================
  async deleteItem(id: number, itemId: number, admin: AuthenticatedAdmin) {
    await this.findBlindBoxOrThrow(id);
    const item = await this.blindBoxItemRepo.findOne({
      where: { id: itemId, blindBoxId: id, isDelete: 0 },
    });
    if (!item) {
      throw new NotFoundException(`盲盒项 #${itemId} 不存在`);
    }
    await this.blindBoxItemRepo
      .createQueryBuilder()
      .update()
      .set({ isDelete: 1, deletedAt: new Date() })
      .where('id = :itemId', { itemId })
      .execute();
    return { id: itemId, isDelete: 1 };
  }

  // ============================================================
  // 9. 发行盲盒
  // ============================================================
  async release(id: number, admin: AuthenticatedAdmin) {
    const { collectible } = await this.getBlindBoxWithCollectible(id);
    if (collectible.isRelease === 1) {
      throw new BadRequestException('盲盒已发行');
    }
    const now = new Date();
    await this.collectibleRepo
      .createQueryBuilder()
      .update()
      .set({ isRelease: 1, status: 1, releaseDate: now, onsaleAt: now })
      .where('id = :cid', { cid: collectible.id })
      .execute();
    return { id, isRelease: 1, status: 1, releaseDate: now };
  }

  // ============================================================
  // 10. 重新上架
  // ============================================================
  async relist(id: number, admin: AuthenticatedAdmin) {
    const { collectible } = await this.getBlindBoxWithCollectible(id);
    const now = new Date();
    await this.collectibleRepo
      .createQueryBuilder()
      .update()
      .set({ status: 1, isRelease: 1, onsaleAt: now, offSaleAt: null })
      .where('id = :cid', { cid: collectible.id })
      .execute();
    return { id, status: 1, onsaleAt: now };
  }

  // ============================================================
  // 11. 强制售罄
  // ============================================================
  async forceSoldout(id: number, admin: AuthenticatedAdmin) {
    const { collectible } = await this.getBlindBoxWithCollectible(id);
    const now = new Date();
    await this.collectibleRepo
      .createQueryBuilder()
      .update()
      .set({ status: 0, offSaleAt: now })
      .where('id = :cid', { cid: collectible.id })
      .execute();
    return { id, status: 0, offSaleAt: now };
  }

  // ============================================================
  // 12. 销毁盲盒库存（指定用户藏品）
  // ============================================================
  async destroy(
    id: number,
    body: { userCollectibleId: number; userId: number; reason: string },
    admin: AuthenticatedAdmin,
  ) {
    const blindBox = await this.findBlindBoxOrThrow(id);
    if (!body?.userCollectibleId || !body?.userId || !body?.reason) {
      throw new BadRequestException(
        '缺少参数：userCollectibleId / userId / reason',
      );
    }
    const record = this.destroyRecordRepo.create({
      userCollectibleId: body.userCollectibleId,
      collectibleId: blindBox.collectibleId,
      userId: body.userId,
      adminId: admin.id,
      reason: body.reason,
      status: 1, // 已销毁
    });
    const saved = await this.destroyRecordRepo.save(record);
    return saved;
  }

  // ============================================================
  // 13. 软删除盲盒
  // ============================================================
  async softDelete(id: number, admin: AuthenticatedAdmin) {
    await this.findBlindBoxOrThrow(id);
    await this.blindBoxRepo
      .createQueryBuilder()
      .update()
      .set({ isDelete: 1 })
      .where('id = :id', { id })
      .execute();
    return { id, isDelete: 1 };
  }

  // ============================================================
  // 14. 空投盲盒（向用户空投盲盒底层藏品）
  // ============================================================
  async airdrop(
    id: number,
    body: { activityId: number; userIds: number[]; quantity?: number },
    admin: AuthenticatedAdmin,
  ) {
    const blindBox = await this.findBlindBoxOrThrow(id);
    if (body?.activityId === undefined || body?.activityId === null) {
      throw new BadRequestException('缺少参数：activityId');
    }
    if (!Array.isArray(body?.userIds) || body.userIds.length === 0) {
      throw new BadRequestException('缺少参数：userIds');
    }
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
          collectibleId: blindBox.collectibleId,
          phone: u.phone,
          quantity,
          status: 1,
          issuedAt: now,
        }),
      );
      const saved = await queryRunner.manager.save(records);
      await queryRunner.commitTransaction();
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
  // 15. 恢复盲盒（创建审批记录）
  // ============================================================
  async recover(
    id: number,
    body: { openRecordId: number; userId?: number; reason?: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findBlindBoxOrThrow(id);
    if (!body?.openRecordId) {
      throw new BadRequestException('缺少参数：openRecordId');
    }
    const approval = this.approvalRepo.create({
      type: 'recover_blindbox',
      targetId: body.openRecordId,
      applicantId: admin.id,
      applicantName: admin.realName,
      content: {
        blindBoxId: id,
        openRecordId: body.openRecordId,
        userId: body.userId ?? null,
        reason: body.reason || '',
      },
      status: 0,
    });
    const saved = await this.approvalRepo.save(approval);
    return saved;
  }

  // ============================================================
  // 16. 开盒记录
  // ============================================================
  async getOpenRecords(id: number, query: any) {
    await this.findBlindBoxOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.openRecordRepo.findAndCount({
      where: { blindBoxId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 17. 销毁记录
  // ============================================================
  async getDestroyRecords(id: number, query: any) {
    const blindBox = await this.findBlindBoxOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.destroyRecordRepo.findAndCount({
      where: { collectibleId: blindBox.collectibleId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /** 查询盲盒，不存在则抛 404 */
  private async findBlindBoxOrThrow(id: number): Promise<NftBlindBox> {
    const blindBox = await this.blindBoxRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!blindBox) {
      throw new NotFoundException(`盲盒 #${id} 不存在`);
    }
    return blindBox;
  }

  /** 查询盲盒及其底层藏品 */
  private async getBlindBoxWithCollectible(id: number): Promise<{
    blindBox: NftBlindBox;
    collectible: NftCollectible;
  }> {
    const blindBox = await this.findBlindBoxOrThrow(id);
    const collectible = await this.collectibleRepo.findOne({
      where: { id: blindBox.collectibleId },
    });
    if (!collectible) {
      throw new NotFoundException(
        `盲盒关联藏品 #${blindBox.collectibleId} 不存在`,
      );
    }
    return { blindBox, collectible };
  }
}
