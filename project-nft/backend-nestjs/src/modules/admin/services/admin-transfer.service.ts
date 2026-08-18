// [管理后台-转赠管理模块] - AdminTransferService
// 6 个端点的业务逻辑：转赠列表、详情、撤销、取消、统计、异常转赠
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftTransfer } from '../../../database/entities/nft-transfer.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';
import { NftApproval } from '../../../database/entities/nft-approval.entity';

@Injectable()
export class AdminTransferService {
  private readonly logger = new Logger(AdminTransferService.name);

  constructor(
    @InjectRepository(NftTransfer)
    private readonly transferRepo: Repository<NftTransfer>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 1. 分页转赠列表（按 status/from_user_id/to_user_id/日期范围过滤）
   */
  async findList(query: {
    page?: number;
    pageSize?: number;
    status?: number;
    fromUserId?: number;
    toUserId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .where('t.is_delete = 0');

    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('t.status = :status', { status: query.status });
    }
    if (query.fromUserId) {
      qb.andWhere('t.from_user_id = :fromUserId', { fromUserId: query.fromUserId });
    }
    if (query.toUserId) {
      qb.andWhere('t.to_user_id = :toUserId', { toUserId: query.toUserId });
    }
    if (query.startDate) {
      qb.andWhere('t.created_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('t.created_at <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('t.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /**
   * 2. 转赠详情（含转出/转入用户信息、藏品信息）
   */
  async findOne(id: number): Promise<any> {
    const transfer = await this.transferRepo.findOne({ where: { id, isDelete: 0 } });
    if (!transfer) {
      throw new NotFoundException(`转赠记录 #${id} 不存在`);
    }

    const [fromUser, toUser, userCollectible] = await Promise.all([
      this.userRepo.findOne({ where: { id: transfer.fromUserId } }),
      this.userRepo.findOne({ where: { id: transfer.toUserId } }),
      this.userCollectibleRepo.findOne({ where: { id: transfer.userCollectibleId } }),
    ]);

    return {
      ...transfer,
      fromUser: fromUser
        ? { id: fromUser.id, username: fromUser.username, phone: fromUser.phone, uid: fromUser.uid }
        : null,
      toUser: toUser
        ? { id: toUser.id, username: toUser.username, phone: toUser.phone, uid: toUser.uid }
        : null,
      userCollectible: userCollectible
        ? {
            id: userCollectible.id,
            collectibleId: userCollectible.collectibleId,
            serialNo: userCollectible.serialNo,
            status: userCollectible.status,
          }
        : null,
    };
  }

  /**
   * 3. 撤销转赠（管理员操作，先创建审批记录，再撤销转赠）
   */
  async revoke(id: number, adminId: number, adminName: string, reason: string): Promise<any> {
    const transfer = await this.transferRepo.findOne({ where: { id, isDelete: 0 } });
    if (!transfer) {
      throw new NotFoundException(`转赠记录 #${id} 不存在`);
    }

    // 只有已完成(2)的转赠可以撤销
    if (transfer.status !== 2) {
      throw new BadRequestException(`转赠状态为 ${transfer.status}，无法撤销（仅已完成转赠可撤销）`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1) 创建审批记录
      const approval = new NftApproval();
      approval.type = 'transfer_revoke';
      approval.targetId = transfer.id;
      approval.applicantId = adminId;
      approval.applicantName = adminName;
      approval.content = {
        transferId: transfer.id,
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        collectibleId: transfer.collectibleId,
        reason: reason || '管理员撤销转赠',
      };
      approval.status = 1; // 直接通过（管理员操作）
      approval.approverId = adminId;
      approval.approverName = adminName;
      approval.approverRemark = reason || '管理员撤销转赠';
      approval.approvedAt = new Date();
      await queryRunner.manager.save(approval);

      // 2) 撤销转赠：将藏品所有权转回原用户
      const userCollectible = await queryRunner.manager.findOne(NftUserCollectible, {
        where: { id: transfer.userCollectibleId },
      });

      if (userCollectible) {
        userCollectible.userId = transfer.fromUserId;
        await queryRunner.manager.save(userCollectible);
      }

      // 3) 更新转赠状态为已撤销(4)
      transfer.status = 4;
      await queryRunner.manager.save(transfer);

      await queryRunner.commitTransaction();
      return { transfer, approval };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`撤销转赠失败: ${err.message}`, err.stack);
      throw new HttpException(
        '撤销转赠失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 4. 取消转赠（取消待确认的转赠）
   */
  async cancel(id: number, adminId: number, reason: string): Promise<NftTransfer> {
    const transfer = await this.transferRepo.findOne({ where: { id, isDelete: 0 } });
    if (!transfer) {
      throw new NotFoundException(`转赠记录 #${id} 不存在`);
    }

    // 只有待确认(1)的转赠可以取消
    if (transfer.status !== 1) {
      throw new BadRequestException(`转赠状态为 ${transfer.status}，无法取消（仅待确认转赠可取消）`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 更新转赠状态为已取消(3)
      transfer.status = 3;
      await queryRunner.manager.save(transfer);

      // 恢复用户藏品状态
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({ status: 1 })
        .where('id = :id', { id: transfer.userCollectibleId })
        .execute();

      await queryRunner.commitTransaction();
      return transfer;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`取消转赠失败: ${err.message}`, err.stack);
      throw new HttpException(
        '取消转赠失败，请稍后重试',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 5. 转赠统计（总数、按状态分组、按日期分组）
   */
  async getStats(): Promise<any> {
    // 总数
    const total = await this.transferRepo.count({ where: { isDelete: 0 } });

    // 按状态分组统计
    const statusStats = await this.transferRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.is_delete = 0')
      .groupBy('t.status')
      .getRawMany();

    // 按日期分组统计（最近30天）
    const dateStats = await this.transferRepo
      .createQueryBuilder('t')
      .select("DATE(t.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('t.is_delete = 0')
      .andWhere('t.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .groupBy("DATE(t.created_at)")
      .orderBy('date', 'DESC')
      .getRawMany();

    const statusMap: Record<number, string> = {
      1: '待确认',
      2: '已完成',
      3: '已取消',
      4: '已撤销',
    };

    return {
      total,
      byStatus: statusStats.map((s) => ({
        status: s.status,
        statusName: statusMap[s.status] || `状态${s.status}`,
        count: Number(s.count),
      })),
      byDate: dateStats.map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
    };
  }

  /**
   * 6. 异常转赠（同一用户对之间高频转赠）
   */
  async findAbnormal(query: {
    page?: number;
    pageSize?: number;
    threshold?: number;
  }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const threshold = Number(query.threshold) || 5; // 默认同一用户对超过5次为异常

    // 查询同一 from_user_id -> to_user_id 的转赠次数超过阈值的组合
    const pairs = await this.transferRepo
      .createQueryBuilder('t')
      .select('t.from_user_id', 'fromUserId')
      .addSelect('t.to_user_id', 'toUserId')
      .addSelect('COUNT(*)', 'count')
      .where('t.is_delete = 0')
      .andWhere('t.status = 2') // 已完成的转赠
      .groupBy('t.from_user_id, t.to_user_id')
      .having('COUNT(*) >= :threshold', { threshold })
      .orderBy('count', 'DESC')
      .getRawMany();

    // 为每对用户查询详细转赠记录
    const allDetails: any[] = [];
    for (const pair of pairs) {
      const transfers = await this.transferRepo.find({
        where: { fromUserId: pair.fromUserId, toUserId: pair.toUserId, isDelete: 0, status: 2 },
        order: { createdAt: 'DESC' },
      });

      const [fromUser, toUser] = await Promise.all([
        this.userRepo.findOne({ where: { id: pair.fromUserId } }),
        this.userRepo.findOne({ where: { id: pair.toUserId } }),
      ]);

      allDetails.push({
        fromUserId: pair.fromUserId,
        toUserId: pair.toUserId,
        count: Number(pair.count),
        fromUser: fromUser
          ? { id: fromUser.id, username: fromUser.username, phone: fromUser.phone, uid: fromUser.uid }
          : null,
        toUser: toUser
          ? { id: toUser.id, username: toUser.username, phone: toUser.phone, uid: toUser.uid }
          : null,
        transfers: transfers.map((t) => ({
          id: t.id,
          collectibleId: t.collectibleId,
          userCollectibleId: t.userCollectibleId,
          confirmedAt: t.confirmedAt,
          createdAt: t.createdAt,
        })),
      });
    }

    const total = allDetails.length;
    const start = (page - 1) * pageSize;
    const list = allDetails.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  }
}
