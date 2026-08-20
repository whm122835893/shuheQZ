// [管理后台-安全管理模块] - AdminSecurityService
// 实现黑名单、风险预警、安全事件、交易锁、审批工作流。
//
// 关键设计：
//  - 交易锁使用进程内存 Map 维护（无持久化表，重启即清空）
//  - 风险预警/安全事件处理时记录 handlerId 与处理备注
//  - 审批工作流：approve=1 / reject=2，记录 approver 与审批时间
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NftBlacklist } from '../../../database/entities/nft-blacklist.entity';
import { NftRiskAlert } from '../../../database/entities/nft-risk-alert.entity';
import { NftSecurityEvent } from '../../../database/entities/nft-security-event.entity';
import { NftApproval } from '../../../database/entities/nft-approval.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 交易锁结构 */
export interface TxLock {
  id: string;
  target: string;
  reason: string;
  adminId: number | null;
  createdAt: Date;
}

@Injectable()
export class AdminSecurityService {
  /** 进程内交易锁存储（id -> lock） */
  private readonly txLocks = new Map<string, TxLock>();

  constructor(
    @InjectRepository(NftBlacklist)
    private readonly blacklistRepo: Repository<NftBlacklist>,
    @InjectRepository(NftRiskAlert)
    private readonly riskAlertRepo: Repository<NftRiskAlert>,
    @InjectRepository(NftSecurityEvent)
    private readonly eventRepo: Repository<NftSecurityEvent>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
  ) {}

  // ============================================================
  // 黑名单（3）
  // ============================================================

  async getBlacklist(query: Record<string, any>): Promise<PaginatedResult<NftBlacklist>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.blacklistRepo.createQueryBuilder('b');
    if (query.type !== undefined && query.type !== '') {
      qb.andWhere('b.type = :type', { type: Number(query.type) });
    }
    if (query.target) {
      qb.andWhere('b.target LIKE :t', { t: `%${query.target}%` });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('b.status = :status', { status: Number(query.status) });
    }
    qb.orderBy('b.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async createBlacklist(
    body: Record<string, any>,
    admin: { id: number },
  ): Promise<NftBlacklist> {
    if (!body.type || !body.target) {
      throw new BadRequestException('类型与目标不能为空');
    }
    const exist = await this.blacklistRepo.findOne({
      where: { type: Number(body.type), target: body.target, status: 1 },
      select: ['id'],
    });
    if (exist) {
      throw new BadRequestException('该目标已在黑名单中');
    }
    const row = this.blacklistRepo.create({
      type: Number(body.type),
      target: body.target,
      reason: body.reason ?? null,
      adminId: admin.id,
      expiredAt: body.expiredAt ? new Date(body.expiredAt) : null,
      status: 1,
    });
    return this.blacklistRepo.save(row);
  }

  async removeBlacklist(id: number): Promise<void> {
    const row = await this.blacklistRepo.findOne({
      where: { id },
      select: ['id', 'status'],
    });
    if (!row) {
      throw new NotFoundException('黑名单记录不存在');
    }
    await this.blacklistRepo.update(id, { status: 0 });
  }

  // ============================================================
  // 风险预警（3）
  // ============================================================

  async getRiskAlertList(query: Record<string, any>): Promise<PaginatedResult<NftRiskAlert>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.riskAlertRepo.createQueryBuilder('r');
    if (query.level !== undefined && query.level !== '') {
      qb.andWhere('r.level = :level', { level: Number(query.level) });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('r.status = :status', { status: Number(query.status) });
    }
    if (query.type) {
      qb.andWhere('r.type = :type', { type: query.type });
    }
    if (query.userId) {
      qb.andWhere('r.user_id = :userId', { userId: Number(query.userId) });
    }
    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async getRiskAlertDetail(id: number): Promise<NftRiskAlert> {
    const row = await this.riskAlertRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('风险预警不存在');
    }
    return row;
  }

  async handleRiskAlert(
    id: number,
    body: Record<string, any>,
    admin: { id: number },
  ): Promise<NftRiskAlert> {
    const row = await this.riskAlertRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('风险预警不存在');
    }
    // 0=未处理 1=已确认 2=已忽略 3=已处理
    const action = body.action || 'process';
    const statusMap: Record<string, number> = {
      confirm: 1,
      ignore: 2,
      process: 3,
    };
    const status = statusMap[action];
    if (status === undefined) {
      throw new BadRequestException('action 必须为 confirm / ignore / process');
    }
    await this.riskAlertRepo.update(id, {
      status,
      handlerId: admin.id,
      handleRemark: body.remark ?? row.handleRemark,
    });
    return this.riskAlertRepo.findOne({ where: { id } }) as Promise<NftRiskAlert>;
  }

  // ============================================================
  // 安全事件（3）
  // ============================================================

  async getEventList(query: Record<string, any>): Promise<PaginatedResult<NftSecurityEvent>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.eventRepo.createQueryBuilder('e');
    if (query.type) {
      qb.andWhere('e.type = :type', { type: query.type });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('e.status = :status', { status: Number(query.status) });
    }
    if (query.userId) {
      qb.andWhere('e.user_id = :userId', { userId: Number(query.userId) });
    }
    qb.orderBy('e.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async getEventDetail(id: number): Promise<NftSecurityEvent> {
    const row = await this.eventRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('安全事件不存在');
    }
    return row;
  }

  async handleEvent(
    id: number,
    body: Record<string, any>,
    admin: { id: number },
  ): Promise<NftSecurityEvent> {
    const row = await this.eventRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('安全事件不存在');
    }
    const detail = {
      ...(row.detail || {}),
      handledBy: admin.id,
      handleRemark: body.remark ?? '',
      handledAt: new Date().toISOString(),
    };
    await this.eventRepo.update(id, { detail: detail as any });
    return this.eventRepo.findOne({ where: { id } }) as Promise<NftSecurityEvent>;
  }

  // ============================================================
  // 交易锁（2）—— 进程内存
  // ============================================================

  async getTxLocks(): Promise<TxLock[]> {
    return Array.from(this.txLocks.values());
  }

  async unlockTx(id: string): Promise<any> {
    if (!this.txLocks.has(id)) {
      throw new NotFoundException('交易锁不存在或已解锁');
    }
    this.txLocks.delete(id);
    return { id, unlocked: true };
  }

  // ============================================================
  // 审批工作流（4）
  // ============================================================

  async getApprovalList(query: Record<string, any>): Promise<PaginatedResult<NftApproval>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.approvalRepo.createQueryBuilder('a');
    if (query.type) {
      qb.andWhere('a.type = :type', { type: query.type });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('a.status = :status', { status: Number(query.status) });
    }
    if (query.applicantId) {
      qb.andWhere('a.applicant_id = :applicantId', {
        applicantId: Number(query.applicantId),
      });
    }
    qb.orderBy('a.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  async getApprovalDetail(id: number): Promise<NftApproval> {
    const row = await this.approvalRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('审批记录不存在');
    }
    return row;
  }

  async approve(
    id: number,
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<NftApproval> {
    const row = await this.approvalRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('审批记录不存在');
    }
    if (row.status !== 0) {
      throw new BadRequestException('该审批已处理，不可重复操作');
    }
    await this.approvalRepo.update(id, {
      status: 1,
      approverId: admin.id,
      approverName: admin.realName || admin.username,
      approverRemark: body.remark ?? '审批通过',
      approvedAt: new Date(),
    });
    return this.approvalRepo.findOne({ where: { id } }) as Promise<NftApproval>;
  }

  async reject(
    id: number,
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<NftApproval> {
    const row = await this.approvalRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('审批记录不存在');
    }
    if (row.status !== 0) {
      throw new BadRequestException('该审批已处理，不可重复操作');
    }
    await this.approvalRepo.update(id, {
      status: 2,
      approverId: admin.id,
      approverName: admin.realName || admin.username,
      approverRemark: body.remark ?? '审批拒绝',
      approvedAt: new Date(),
    });
    return this.approvalRepo.findOne({ where: { id } }) as Promise<NftApproval>;
  }
}
