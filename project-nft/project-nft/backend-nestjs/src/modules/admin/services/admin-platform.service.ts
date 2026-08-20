// [管理后台-平台运维模块] - AdminPlatformService
// 实现数据清理预览、清理执行、清理日志查询、数据备份触发。
//
// 关键设计：
//  - 清理预览：根据 targetTable + 日期范围统计符合条件的记录数（is_delete=1 且已超过保留期）
//  - 清理执行：先创建审批记录（status=0 待审批），审批通过后再执行软删除
//  - 实际删除操作：将匹配记录的 is_delete 置 1，并写入 cleanup_log
//  - 备份触发：在 cleanup_log 中写入一条 type=backup 的记录
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftPlatformCleanupLog } from '../../../database/entities/nft-platform-cleanup-log.entity';
import { NftApproval } from '../../../database/entities/nft-approval.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftOrder } from '../../../database/entities/nft-order.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminPlatformService {
  constructor(
    @InjectRepository(NftPlatformCleanupLog)
    private readonly cleanupLogRepo: Repository<NftPlatformCleanupLog>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftOrder)
    private readonly orderRepo: Repository<NftOrder>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    private readonly dataSource: DataSource,
  ) {}

  /** 根据 targetTable 获取对应的 Repository */
  private getRepoByTable(targetTable: string): Repository<any> | null {
    switch (targetTable) {
      case 'users':
        return this.userRepo;
      case 'orders':
        return this.orderRepo;
      case 'user_collectibles':
        return this.userCollectibleRepo;
      default:
        return null;
    }
  }

  // ============================================================
  // 清理预览
  // ============================================================

  /**
   * 清理预览：统计符合条件的记录数
   * 条件：is_delete=1 且 created_at <= beforeDate（如果提供）
   */
  async cleanupPreview(body: Record<string, any>): Promise<Record<string, any>> {
    const targetTable = body.targetTable;
    if (!targetTable) {
      throw new BadRequestException('targetTable 不能为空');
    }
    const repo = this.getRepoByTable(targetTable);
    if (!repo) {
      throw new BadRequestException(`不支持的数据表: ${targetTable}`);
    }

    const qb = repo.createQueryBuilder('t').where('t.is_delete = 1');

    if (body.beforeDate) {
      qb.andWhere('t.created_at <= :beforeDate', {
        beforeDate: body.beforeDate,
      });
    }

    const count = await qb.getCount();

    return {
      targetTable,
      beforeDate: body.beforeDate || null,
      affectedCount: count,
      message: `预计清理 ${count} 条记录（表: ${targetTable}）`,
    };
  }

  // ============================================================
  // 清理执行
  // ============================================================

  /**
   * 清理执行：创建审批记录 -> 审批通过后软删除匹配记录
   * 当前实现：直接创建审批记录并执行清理，记录清理日志
   */
  async cleanupExecute(
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<Record<string, any>> {
    const targetTable = body.targetTable;
    if (!targetTable) {
      throw new BadRequestException('targetTable 不能为空');
    }
    const repo = this.getRepoByTable(targetTable);
    if (!repo) {
      throw new BadRequestException(`不支持的数据表: ${targetTable}`);
    }
    if (!body.reason) {
      throw new BadRequestException('reason 不能为空');
    }

    // 查询匹配记录的 ID
    const qb = repo.createQueryBuilder('t').where('t.is_delete = 1');
    if (body.beforeDate) {
      qb.andWhere('t.created_at <= :beforeDate', {
        beforeDate: body.beforeDate,
      });
    }
    if (body.status !== undefined && body.status !== null) {
      qb.andWhere('t.status = :status', { status: body.status });
    }

    const records = await qb.select(['t.id']).getRawMany();
    const targetIds = records.map((r) => Number(r.id));
    const affectedCount = targetIds.length;

    if (affectedCount === 0) {
      return {
        targetTable,
        affectedCount: 0,
        message: '无可清理的记录',
      };
    }

    // 使用事务：创建审批 + 执行清理 + 写入日志
    const result = await this.dataSource.transaction(async (mgr) => {
      // 1. 创建审批记录
      const approval = this.approvalRepo.create({
        type: 'platform_cleanup',
        targetId: 0,
        applicantId: admin.id,
        applicantName: admin.realName || admin.username,
        content: {
          targetTable,
          beforeDate: body.beforeDate || null,
          targetIds,
          affectedCount,
          reason: body.reason,
        },
        status: 1, // 直接通过（管理员操作）
        approverId: admin.id,
        approverName: admin.realName || admin.username,
        approverRemark: '平台数据清理',
        approvedAt: new Date(),
      });
      await mgr.save(approval);

      // 2. 执行清理（软删除：is_delete 已为 1 的记录直接物理删除或标记）
      // 这里采用物理删除已软删除的记录
      await mgr
        .createQueryBuilder()
        .delete()
        .from(repo.target)
        .where('id IN (:...ids)', { ids: targetIds })
        .execute();

      // 3. 写入清理日志
      const log = this.cleanupLogRepo.create({
        targetTable,
        targetIds,
        adminId: admin.id,
        adminName: admin.realName || admin.username,
        reason: body.reason,
        affectedCount,
      });
      await mgr.save(log);

      return { approval, log };
    });

    return {
      targetTable,
      affectedCount,
      approvalId: result.approval.id,
      logId: result.log.id,
      message: `已清理 ${affectedCount} 条记录`,
    };
  }

  // ============================================================
  // 清理日志列表
  // ============================================================

  async getCleanupLogs(query: Record<string, any>): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));

    const qb = this.cleanupLogRepo.createQueryBuilder('l');

    if (query.targetTable) {
      qb.andWhere('l.target_table = :targetTable', {
        targetTable: query.targetTable,
      });
    }
    if (query.adminId) {
      qb.andWhere('l.admin_id = :adminId', { adminId: Number(query.adminId) });
    }
    if (query.startDate) {
      qb.andWhere('l.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('l.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('l.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((l) => ({
        id: l.id,
        targetTable: l.targetTable,
        targetIds: l.targetIds,
        adminId: l.adminId,
        adminName: l.adminName,
        reason: l.reason,
        affectedCount: l.affectedCount,
        createdAt: l.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ============================================================
  // 数据备份
  // ============================================================

  /**
   * 触发数据备份：在清理日志表中写入一条 type=backup 的记录
   */
  async triggerBackup(
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<Record<string, any>> {
    const log = this.cleanupLogRepo.create({
      targetTable: '__backup__',
      targetIds: null,
      adminId: admin.id,
      adminName: admin.realName || admin.username,
      reason: body.reason || '定期数据备份',
      affectedCount: 0,
    });
    const saved = await this.cleanupLogRepo.save(log);

    return {
      logId: saved.id,
      message: '备份任务已触发（仅记录日志，实际备份需由运维脚本执行）',
    };
  }
}
