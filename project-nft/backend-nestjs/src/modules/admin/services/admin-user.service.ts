// [管理后台-用户管理模块] - AdminUserService
// 实现管理后台用户管理 15 个接口的业务逻辑：
//   用户列表/详情/冻结/解冻/重置交易密码/强制下线/拉黑/钱包/藏品/盲盒/
//   优先购资格/邀请记录/恢复藏品/恢复盲盒/导出
//
// 说明：
//   - 用户黑名单通过 nft_blacklists 表维护（type=1 用户），NftUser 无 is_blacklisted 字段
//   - 用户的盲盒以开盒记录(nft_blind_box_open_records)体现
//   - 恢复藏品/盲盒创建审批记录(nft_approvals)，待审批通过后执行
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import {
  NftUser,
  NftUserWallet,
  NftUserCollectible,
  NftBlindBox,
  NftBlindBoxOpenRecord,
  NftPrioritySaleWhitelist,
  NftInviteRecord,
  NftApproval,
  NftBlacklist,
} from '../../../database/entities';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { RedisService } from '../../../shared/redis.service';

@Injectable()
export class AdminUserService {
  private readonly logger = new Logger(AdminUserService.name);

  constructor(
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftBlindBox)
    private readonly blindBoxRepo: Repository<NftBlindBox>,
    @InjectRepository(NftBlindBoxOpenRecord)
    private readonly openRecordRepo: Repository<NftBlindBoxOpenRecord>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftInviteRecord)
    private readonly inviteRecordRepo: Repository<NftInviteRecord>,
    @InjectRepository(NftApproval)
    private readonly approvalRepo: Repository<NftApproval>,
    @InjectRepository(NftBlacklist)
    private readonly blacklistRepo: Repository<NftBlacklist>,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
  ) {}

  /** 解析分页参数 */
  private parsePaging(query: any): { page: number; pageSize: number } {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query?.pageSize) || 20),
    );
    return { page, pageSize };
  }

  // ============================================================
  // 1. 用户列表（分页 + 搜索 + 过滤）
  // ============================================================
  async findList(query: any) {
    const { page, pageSize } = this.parsePaging(query);
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.is_delete = 0');

    // 关键字搜索：手机号 / 用户名 / UID
    if (query.keyword) {
      qb.andWhere(
        '(u.phone LIKE :kw OR u.username LIKE :kw OR u.uid LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    // 账号状态
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('u.status = :status', { status: Number(query.status) });
    }
    // 实名状态
    if (query.isRealname !== undefined && query.isRealname !== '') {
      qb.andWhere('u.is_realname = :isRealname', {
        isRealname: Number(query.isRealname),
      });
    }
    // 黑名单过滤（基于 nft_blacklists 子查询）
    const isBl = String(query.isBlacklisted ?? '');
    if (isBl === '1') {
      qb.andWhere(
        `u.id IN (SELECT CAST(bl.target AS UNSIGNED) FROM nft_blacklists bl WHERE bl.type = 1 AND bl.status = 1)`,
      );
    } else if (isBl === '0') {
      qb.andWhere(
        `u.id NOT IN (SELECT CAST(bl.target AS UNSIGNED) FROM nft_blacklists bl WHERE bl.type = 1 AND bl.status = 1)`,
      );
    }

    qb.orderBy('u.created_at', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 2. 用户详情（含钱包信息）
  // ============================================================
  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }
    const wallet = await this.walletRepo.findOne({
      where: { userId: id, isDelete: 0 },
    });
    // 是否在黑名单中
    const blacklistEntry = await this.blacklistRepo.findOne({
      where: { type: 1, target: String(id), status: 1 },
    });
    return {
      ...user,
      wallet: wallet || null,
      isBlacklisted: !!blacklistEntry,
    };
  }

  // ============================================================
  // 3. 冻结用户
  // ============================================================
  async freeze(id: number) {
    const user = await this.findUserOrThrow(id);
    if (user.status === 0) {
      throw new HttpException('用户已被冻结', HttpStatus.BAD_REQUEST);
    }
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({ status: 0 })
      .where('id = :id', { id })
      .execute();
    return { id, status: 0 };
  }

  // ============================================================
  // 4. 解冻用户
  // ============================================================
  async unfreeze(id: number) {
    const user = await this.findUserOrThrow(id);
    if (user.status === 1) {
      throw new HttpException('用户未被冻结', HttpStatus.BAD_REQUEST);
    }
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({ status: 1 })
      .where('id = :id', { id })
      .execute();
    return { id, status: 1 };
  }

  // ============================================================
  // 5. 重置交易密码（管理员操作，清空密码由用户重新设置）
  // ============================================================
  async resetTxPassword(id: number) {
    await this.findUserOrThrow(id);
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({ transactionPassword: null })
      .where('id = :id', { id })
      .execute();
    return { id, transactionPassword: null };
  }

  // ============================================================
  // 6. 强制下线（记录日志，后续接入 Redis token 版本号）
  // ============================================================
  async forceLogout(id: number) {
    const user = await this.findUserOrThrow(id);
    // 递增 Redis 中的 token 版本号，使用户已签发的 token 失效
    await this.redis.incr(`auth:token_version:${id}`);
    this.logger.log(
      `管理员强制下线用户 #${id}（${user.username} / ${user.phone}），已递增 token 版本号`,
    );
    return { id, forceLogout: true };
  }

  // ============================================================
  // 7. 加入黑名单
  // ============================================================
  async blacklist(
    id: number,
    body: { reason?: string },
    admin: AuthenticatedAdmin,
  ) {
    const user = await this.findUserOrThrow(id);
    // 已在黑名单则直接返回
    const exist = await this.blacklistRepo.findOne({
      where: { type: 1, target: String(id), status: 1 },
    });
    if (exist) {
      throw new HttpException('用户已在黑名单中', HttpStatus.BAD_REQUEST);
    }
    const entry = this.blacklistRepo.create({
      type: 1,
      target: String(id),
      reason: body?.reason || '管理员拉黑',
      adminId: admin.id,
      status: 1,
    });
    await this.blacklistRepo.save(entry);
    return entry;
  }

  // ============================================================
  // 8. 用户钱包信息
  // ============================================================
  async getWallet(id: number) {
    await this.findUserOrThrow(id);
    const wallet = await this.walletRepo.findOne({
      where: { userId: id, isDelete: 0 },
    });
    if (!wallet) {
      throw new NotFoundException(`用户 #${id} 钱包不存在`);
    }
    return wallet;
  }

  // ============================================================
  // 9. 用户藏品列表
  // ============================================================
  async getCollectibles(id: number, query: any) {
    await this.findUserOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.userCollectibleRepo.findAndCount({
      where: { userId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 10. 用户盲盒（开盒记录）
  // ============================================================
  async getBlindBoxes(id: number, query: any) {
    await this.findUserOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [records, total] = await this.openRecordRepo.findAndCount({
      where: { userId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 批量关联盲盒定义
    const blindBoxIds = [...new Set(records.map((r) => r.blindBoxId))];
    const boxes = blindBoxIds.length
      ? await this.blindBoxRepo.find({ where: { id: In(blindBoxIds) } })
      : [];
    const boxMap = new Map(boxes.map((b) => [b.id, b]));
    const list = records.map((r) => ({
      ...r,
      blindBox: boxMap.get(r.blindBoxId) ?? null,
    }));
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 11. 用户优先购资格（白名单）
  // ============================================================
  async getPriorityQualifications(id: number, query: any) {
    await this.findUserOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.priorityWhitelistRepo.findAndCount({
      where: { userId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 12. 用户邀请记录
  // ============================================================
  async getInvites(id: number, query: any) {
    await this.findUserOrThrow(id);
    const { page, pageSize } = this.parsePaging(query);
    const [list, total] = await this.inviteRecordRepo.findAndCount({
      where: { inviterUserId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 13. 恢复藏品（创建审批记录）
  // ============================================================
  async recoverCollectible(
    id: number,
    body: { userCollectibleId: number; reason?: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findUserOrThrow(id);
    if (!body?.userCollectibleId) {
      throw new HttpException(
        '缺少 userCollectibleId 参数',
        HttpStatus.BAD_REQUEST,
      );
    }
    const approval = this.approvalRepo.create({
      type: 'recover_collectible',
      targetId: body.userCollectibleId,
      applicantId: admin.id,
      applicantName: admin.realName,
      content: {
        userId: id,
        userCollectibleId: body.userCollectibleId,
        reason: body.reason || '',
      },
      status: 0,
    });
    await this.approvalRepo.save(approval);
    return approval;
  }

  // ============================================================
  // 14. 恢复盲盒（创建审批记录）
  // ============================================================
  async recoverBlindBox(
    id: number,
    body: { openRecordId: number; reason?: string },
    admin: AuthenticatedAdmin,
  ) {
    await this.findUserOrThrow(id);
    if (!body?.openRecordId) {
      throw new HttpException(
        '缺少 openRecordId 参数',
        HttpStatus.BAD_REQUEST,
      );
    }
    const approval = this.approvalRepo.create({
      type: 'recover_blindbox',
      targetId: body.openRecordId,
      applicantId: admin.id,
      applicantName: admin.realName,
      content: {
        userId: id,
        openRecordId: body.openRecordId,
        reason: body.reason || '',
      },
      status: 0,
    });
    await this.approvalRepo.save(approval);
    return approval;
  }

  // ============================================================
  // 15. 导出用户列表（CSV）
  // ============================================================
  async exportUsersCsv(query: any): Promise<string> {
    const users = await this.findAllForExport(query);
    const header = [
      'ID',
      '手机号',
      '用户名',
      'UID',
      '实名状态',
      '账号状态',
      '注册时间',
    ];
    const rows = users.map((u) => [
      String(u.id),
      u.phone,
      u.username,
      u.uid,
      u.isRealname ? '已实名' : '未实名',
      u.status === 1 ? '正常' : '冻结',
      this.formatDateTime(u.createdAt),
    ]);
    return [header, ...rows]
      .map((r) => r.map((f) => this.csvEscape(f)).join(','))
      .join('\n');
  }

  /** 导出用：按同样条件查询全部（不分页） */
  private async findAllForExport(query: any): Promise<NftUser[]> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.is_delete = 0');

    if (query.keyword) {
      qb.andWhere(
        '(u.phone LIKE :kw OR u.username LIKE :kw OR u.uid LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('u.status = :status', { status: Number(query.status) });
    }
    if (query.isRealname !== undefined && query.isRealname !== '') {
      qb.andWhere('u.is_realname = :isRealname', {
        isRealname: Number(query.isRealname),
      });
    }
    qb.orderBy('u.created_at', 'DESC').limit(10000);
    return qb.getMany();
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /** 查询用户，不存在则抛 404 */
  private async findUserOrThrow(id: number): Promise<NftUser> {
    const user = await this.userRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }
    return user;
  }

  /** 格式化日期时间 */
  private formatDateTime(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /** CSV 字段转义 */
  private csvEscape(field: string): string {
    if (field == null) return '';
    const s = String(field);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }
}
