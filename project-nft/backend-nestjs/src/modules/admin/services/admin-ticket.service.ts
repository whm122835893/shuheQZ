// [管理后台-工单管理模块] - AdminTicketService
// 实现工单列表、详情(含回复)、分派、回复、关闭、用户反馈、补偿发放。
//
// 关键设计：
//  - 工单回复后自动将状态置为「处理中」(status=1)
//  - 关闭工单记录 resolved_at
//  - 补偿：创建审批记录 + 调整用户钱包余额 + 生成充值流水（事务）
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftSupportTicket } from '../../../database/entities/nft-support-ticket.entity';
import { NftTicketReply } from '../../../database/entities/nft-ticket-reply.entity';
import { NftFeedback } from '../../../database/entities/nft-feedback.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftUserWallet } from '../../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../../database/entities/nft-wallet-transaction.entity';
import { NftApproval } from '../../../database/entities/nft-approval.entity';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminTicketService {
  constructor(
    @InjectRepository(NftSupportTicket)
    private readonly ticketRepo: Repository<NftSupportTicket>,
    @InjectRepository(NftTicketReply)
    private readonly replyRepo: Repository<NftTicketReply>,
    @InjectRepository(NftFeedback)
    private readonly feedbackRepo: Repository<NftFeedback>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly txRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    private readonly dataSource: DataSource,
  ) {}

  /** 工单分页列表 */
  async getTicketList(query: Record<string, any>): Promise<PaginatedResult<NftSupportTicket>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.ticketRepo
      .createQueryBuilder('t')
      .where('t.is_delete = 0');

    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('t.status = :status', { status: Number(query.status) });
    }
    if (query.priority !== undefined && query.priority !== '') {
      qb.andWhere('t.priority = :priority', { priority: Number(query.priority) });
    }
    if (query.category) {
      qb.andWhere('t.category = :category', { category: query.category });
    }
    if (query.assigneeId) {
      qb.andWhere('t.assignee_id = :assigneeId', {
        assigneeId: Number(query.assigneeId),
      });
    }
    if (query.userId) {
      qb.andWhere('t.user_id = :userId', { userId: Number(query.userId) });
    }

    qb.orderBy('t.priority', 'DESC')
      .addOrderBy('t.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 工单详情（含回复） */
  async getTicketDetail(id: number): Promise<any> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    const replies = await this.replyRepo.find({
      where: { ticketId: id },
      order: { createdAt: 'ASC' },
    });
    return { ...ticket, replies };
  }

  /** 分派工单给客服 */
  async assignTicket(id: number, body: Record<string, any>): Promise<NftSupportTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'status', 'assigneeId'],
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    const assigneeId = Number(body.assigneeId);
    if (!assigneeId) {
      throw new BadRequestException('assigneeId 不能为空');
    }
    await this.ticketRepo.update(id, {
      assigneeId,
      status: ticket.status === 0 ? 1 : ticket.status,
    });
    return this.ticketRepo.findOne({ where: { id } }) as Promise<NftSupportTicket>;
  }

  /** 回复工单（创建回复 + 置为处理中） */
  async replyTicket(
    id: number,
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<NftTicketReply> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'status'],
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    if (!body.content) {
      throw new BadRequestException('回复内容不能为空');
    }

    return this.dataSource.transaction(async (mgr) => {
      const reply = this.replyRepo.create({
        ticketId: id,
        replierId: admin.id,
        replierType: 'admin',
        content: body.content,
        attachments: body.attachments ?? null,
      });
      const saved = await mgr.save(reply);

      // 待处理(0) -> 处理中(1)
      if (ticket.status === 0) {
        await mgr.update(NftSupportTicket, id, { status: 1 });
      }
      return saved;
    });
  }

  /** 关闭工单 */
  async closeTicket(id: number, body: Record<string, any>): Promise<NftSupportTicket> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'status'],
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    await this.ticketRepo.update(id, {
      status: 3,
      resolvedAt: new Date(),
    });
    return this.ticketRepo.findOne({ where: { id } }) as Promise<NftSupportTicket>;
  }

  /** 用户反馈列表 */
  async getFeedbackList(query: Record<string, any>): Promise<PaginatedResult<NftFeedback>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.feedbackRepo
      .createQueryBuilder('f')
      .where('f.is_delete = 0');

    if (query.type) {
      qb.andWhere('f.type = :type', { type: query.type });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('f.status = :status', { status: Number(query.status) });
    }
    if (query.userId) {
      qb.andWhere('f.user_id = :userId', { userId: Number(query.userId) });
    }

    qb.orderBy('f.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 反馈详情 */
  async getFeedbackDetail(id: number): Promise<NftFeedback> {
    const fb = await this.feedbackRepo.findOne({ where: { id, isDelete: 0 } });
    if (!fb) {
      throw new NotFoundException('反馈不存在');
    }
    return fb;
  }

  /** 补偿：创建审批 + 调整钱包 + 生成充值流水 */
  async compensate(
    id: number,
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<any> {
    const ticket = await this.ticketRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'userId', 'ticketNo'],
    });
    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }
    const amount = Number(body.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('补偿金额须大于 0');
    }
    const reason = body.reason || `工单补偿 #${ticket.ticketNo}`;

    return this.dataSource.transaction(async (mgr) => {
      const wallet = await mgr.findOne(NftUserWallet, {
        where: { userId: ticket.userId, isDelete: 0 },
      });
      if (!wallet) {
        throw new NotFoundException('用户钱包不存在');
      }

      const newBalance = Number(wallet.balance) + amount;
      const newRecharged = Number(wallet.totalRecharged) + amount;
      await mgr.update(
        NftUserWallet,
        { userId: ticket.userId },
        { balance: newBalance, totalRecharged: newRecharged },
      );

      const tx = this.txRepo.create({
        userId: ticket.userId,
        type: 'recharge',
        amount,
        balanceAfter: newBalance,
        direction: 'in',
        remark: reason,
      });
      await mgr.save(tx);

      const approval = this.approvalRepo.create({
        type: 'ticket_compensate',
        targetId: id,
        applicantId: admin.id,
        applicantName: admin.realName || admin.username,
        content: { ticketId: id, userId: ticket.userId, amount, reason, txId: tx.id },
        status: 1,
        approverId: admin.id,
        approverName: admin.realName || admin.username,
        approverRemark: '补偿已即时发放',
        approvedAt: new Date(),
      });
      await mgr.save(approval);

      return {
        ticketId: id,
        userId: ticket.userId,
        amount,
        balanceAfter: newBalance,
        approvalId: approval.id,
        txId: tx.id,
      };
    });
  }
}
