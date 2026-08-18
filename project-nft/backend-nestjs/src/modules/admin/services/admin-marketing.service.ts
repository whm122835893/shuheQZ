// [管理后台-营销活动模块] - AdminMarketingService
// 35 个端点的业务逻辑，分为 6 大模块：优先购(10)、签到(3)、邀请(3)、抽奖(9)、合成(5)、空投(3)、注册奖励(2)
import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { NftPrioritySale } from '../../../database/entities/nft-priority-sale.entity';
import { NftPrioritySaleWhitelist } from '../../../database/entities/nft-priority-sale-whitelist.entity';
import { NftCheckInRecord } from '../../../database/entities/nft-check-in-record.entity';
import { NftInviteActivity } from '../../../database/entities/nft-invite-activity.entity';
import { NftInviteRecord } from '../../../database/entities/nft-invite-record.entity';
import { NftLuckyDrawActivity } from '../../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawPrize } from '../../../database/entities/nft-lucky-draw-prize.entity';
import { NftLuckyDrawRecord } from '../../../database/entities/nft-lucky-draw-record.entity';
import { NftLuckyDrawUserChance } from '../../../database/entities/nft-lucky-draw-user-chance.entity';
import { NftSynthesisActivity } from '../../../database/entities/nft-synthesis-activity.entity';
import { NftSynthesisMaterial } from '../../../database/entities/nft-synthesis-material.entity';
import { NftSynthesisRecord } from '../../../database/entities/nft-synthesis-record.entity';
import { NftAirdropActivity } from '../../../database/entities/nft-airdrop-activity.entity';
import { NftAirdropRecord } from '../../../database/entities/nft-airdrop-record.entity';
import { NftSystemConfig } from '../../../database/entities/nft-system-config.entity';
import { NftUser } from '../../../database/entities/nft-user.entity';
import { NftUserCollectible } from '../../../database/entities/nft-user-collectible.entity';
import { NftWalletTransaction } from '../../../database/entities/nft-wallet-transaction.entity';
import { NftActivityReward } from '../../../database/entities/nft-activity-reward.entity';

@Injectable()
export class AdminMarketingService {
  private readonly logger = new Logger(AdminMarketingService.name);

  constructor(
    @InjectRepository(NftPrioritySale)
    private readonly prioritySaleRepo: Repository<NftPrioritySale>,
    @InjectRepository(NftPrioritySaleWhitelist)
    private readonly priorityWhitelistRepo: Repository<NftPrioritySaleWhitelist>,
    @InjectRepository(NftCheckInRecord)
    private readonly checkinRecordRepo: Repository<NftCheckInRecord>,
    @InjectRepository(NftInviteActivity)
    private readonly inviteActivityRepo: Repository<NftInviteActivity>,
    @InjectRepository(NftInviteRecord)
    private readonly inviteRecordRepo: Repository<NftInviteRecord>,
    @InjectRepository(NftLuckyDrawActivity)
    private readonly luckyDrawRepo: Repository<NftLuckyDrawActivity>,
    @InjectRepository(NftLuckyDrawPrize)
    private readonly luckyDrawPrizeRepo: Repository<NftLuckyDrawPrize>,
    @InjectRepository(NftLuckyDrawRecord)
    private readonly luckyDrawRecordRepo: Repository<NftLuckyDrawRecord>,
    @InjectRepository(NftLuckyDrawUserChance)
    private readonly luckyDrawChanceRepo: Repository<NftLuckyDrawUserChance>,
    @InjectRepository(NftSynthesisActivity)
    private readonly synthesisRepo: Repository<NftSynthesisActivity>,
    @InjectRepository(NftSynthesisMaterial)
    private readonly synthesisMaterialRepo: Repository<NftSynthesisMaterial>,
    @InjectRepository(NftSynthesisRecord)
    private readonly synthesisRecordRepo: Repository<NftSynthesisRecord>,
    @InjectRepository(NftAirdropActivity)
    private readonly airdropRepo: Repository<NftAirdropActivity>,
    @InjectRepository(NftAirdropRecord)
    private readonly airdropRecordRepo: Repository<NftAirdropRecord>,
    @InjectRepository(NftSystemConfig)
    private readonly configRepo: Repository<NftSystemConfig>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftWalletTransaction)
    private readonly walletTxRepo: Repository<NftWalletTransaction>,
    @InjectRepository(NftActivityReward)
    private readonly activityRewardRepo: Repository<NftActivityReward>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 优先购模块 (10 endpoints)
  // ============================================================

  /** 1. 优先购列表 */
  async findPriorityList(query: { page?: number; pageSize?: number; status?: number }): Promise<{ list: NftPrioritySale[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.prioritySaleRepo.createQueryBuilder('p').where('p.is_delete = 0');
    if (query.status !== undefined && query.status !== null) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    qb.orderBy('p.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 2. 创建优先购 */
  async createPriority(dto: { collectibleId: number; name: string; startTime: string; endTime: string }): Promise<NftPrioritySale> {
    const sale = new NftPrioritySale();
    sale.collectibleId = dto.collectibleId;
    sale.name = dto.name;
    sale.startTime = new Date(dto.startTime);
    sale.endTime = new Date(dto.endTime);
    sale.status = 1; // 1=待开始
    return this.prioritySaleRepo.save(sale);
  }

  /** 3. 编辑优先购 */
  async updatePriority(id: number, dto: Partial<{ collectibleId: number; name: string; startTime: string; endTime: string; status: number }>): Promise<NftPrioritySale> {
    const sale = await this.prioritySaleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!sale) throw new NotFoundException(`优先购活动 #${id} 不存在`);

    if (dto.collectibleId !== undefined) sale.collectibleId = dto.collectibleId;
    if (dto.name !== undefined) sale.name = dto.name;
    if (dto.startTime !== undefined) sale.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) sale.endTime = new Date(dto.endTime);
    if (dto.status !== undefined) sale.status = dto.status;

    return this.prioritySaleRepo.save(sale);
  }

  /** 4. 删除优先购（软删除） */
  async deletePriority(id: number): Promise<{ deleted: boolean }> {
    const sale = await this.prioritySaleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!sale) throw new NotFoundException(`优先购活动 #${id} 不存在`);

    sale.isDelete = 1;
    sale.deletedAt = new Date();
    await this.prioritySaleRepo.save(sale);
    return { deleted: true };
  }

  /** 5. 优先购白名单列表 */
  async findPriorityWhitelist(id: number, query: { page?: number; pageSize?: number }): Promise<{ list: any[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.priorityWhitelistRepo
      .createQueryBuilder('w')
      .where('w.is_delete = 0')
      .andWhere('w.priority_sale_id = :id', { id })
      .orderBy('w.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    // 批量查询用户信息
    const userIds = [...new Set(list.map((w) => w.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const resultList = list.map((w) => ({
      ...w,
      user: userMap.get(w.userId)
        ? { id: userMap.get(w.userId)!.id, username: userMap.get(w.userId)!.username, phone: userMap.get(w.userId)!.phone, uid: userMap.get(w.userId)!.uid }
        : null,
    }));

    return { list: resultList, total, page, pageSize };
  }

  /** 6. 导入白名单（JSON数组输入） */
  async importPriorityWhitelist(id: number, data: Array<{ userId: number; maxQuantity?: number }>): Promise<{ imported: number }> {
    const sale = await this.prioritySaleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!sale) throw new NotFoundException(`优先购活动 #${id} 不存在`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let imported = 0;
      for (const item of data) {
        // 检查是否已存在
        const existing = await queryRunner.manager.findOne(NftPrioritySaleWhitelist, {
          where: { prioritySaleId: id, userId: item.userId, isDelete: 0 },
        });
        if (existing) continue;

        const entry = new NftPrioritySaleWhitelist();
        entry.prioritySaleId = id;
        entry.userId = item.userId;
        entry.maxQuantity = item.maxQuantity || 1;
        entry.usedQuantity = 0;
        entry.status = 1;
        await queryRunner.manager.save(entry);
        imported++;
      }

      await queryRunner.commitTransaction();
      return { imported };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`导入白名单失败: ${err.message}`, err.stack);
      throw new HttpException('导入白名单失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  /** 7. 导出白名单（CSV） */
  async exportPriorityWhitelist(id: number): Promise<string> {
    const whitelist = await this.priorityWhitelistRepo.find({
      where: { prioritySaleId: id, isDelete: 0 },
      order: { createdAt: 'DESC' },
    });

    const userIds = [...new Set(whitelist.map((w) => w.userId))];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const header = ['ID', '优先购ID', '用户ID', '用户名', '手机号', 'UID', '最大可购数量', '已购数量', '状态', '创建时间'];
    const rows = whitelist.map((w) => {
      const user = userMap.get(w.userId);
      return [
        w.id, w.prioritySaleId, w.userId,
        user?.username || '', user?.phone || '', user?.uid || '',
        w.maxQuantity, w.usedQuantity, w.status,
        w.createdAt ? new Date(w.createdAt).toISOString() : '',
      ];
    });

    return [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /** 8. 删除白名单条目 */
  async deletePriorityWhitelistEntry(id: number, wid: number): Promise<{ deleted: boolean }> {
    const entry = await this.priorityWhitelistRepo.findOne({
      where: { id: wid, prioritySaleId: id, isDelete: 0 },
    });
    if (!entry) throw new NotFoundException(`白名单条目 #${wid} 不存在`);

    entry.isDelete = 1;
    entry.deletedAt = new Date();
    await this.priorityWhitelistRepo.save(entry);
    return { deleted: true };
  }

  /** 9. 开始优先购 */
  async startPriority(id: number): Promise<NftPrioritySale> {
    const sale = await this.prioritySaleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!sale) throw new NotFoundException(`优先购活动 #${id} 不存在`);
    if (sale.status === 2) throw new BadRequestException('优先购活动已在进行中');

    sale.status = 2; // 2=进行中
    return this.prioritySaleRepo.save(sale);
  }

  /** 10. 结束优先购 */
  async endPriority(id: number): Promise<NftPrioritySale> {
    const sale = await this.prioritySaleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!sale) throw new NotFoundException(`优先购活动 #${id} 不存在`);
    if (sale.status !== 2) throw new BadRequestException('优先购活动未在进行中，无法结束');

    sale.status = 3; // 3=已结束
    return this.prioritySaleRepo.save(sale);
  }

  // ============================================================
  // 签到模块 (3 endpoints)
  // ============================================================

  /** 11. 获取签到配置 */
  async getCheckinConfig(): Promise<any[]> {
    const configs = await this.configRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0')
      .andWhere('c.config_key LIKE :pattern', { pattern: 'checkin_%' })
      .getMany();

    return configs.map((c) => ({
      id: c.id,
      configKey: c.configKey,
      configValue: c.configValue,
      configDesc: c.configDesc,
    }));
  }

  /** 12. 更新签到配置 */
  async updateCheckinConfig(items: Array<{ configKey: string; configValue: string; configDesc?: string }>): Promise<any[]> {
    const results: NftSystemConfig[] = [];
    for (const item of items) {
      let config = await this.configRepo.findOne({ where: { configKey: item.configKey, isDelete: 0 } });
      if (config) {
        config.configValue = item.configValue;
        if (item.configDesc !== undefined) config.configDesc = item.configDesc;
      } else {
        config = new NftSystemConfig();
        config.configKey = item.configKey;
        config.configValue = item.configValue;
        config.configDesc = item.configDesc || null;
      }
      results.push(await this.configRepo.save(config));
    }
    return results.map((c) => ({ id: c.id, configKey: c.configKey, configValue: c.configValue, configDesc: c.configDesc }));
  }

  /** 13. 签到记录列表 */
  async findCheckinRecords(query: { page?: number; pageSize?: number; userId?: number; startDate?: string; endDate?: string }): Promise<{ list: NftCheckInRecord[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.checkinRecordRepo.createQueryBuilder('c').where('c.is_delete = 0');
    if (query.userId) qb.andWhere('c.user_id = :userId', { userId: query.userId });
    if (query.startDate) qb.andWhere('c.check_in_date >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('c.check_in_date <= :endDate', { endDate: query.endDate });
    qb.orderBy('c.check_in_date', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 邀请模块 (3 endpoints)
  // ============================================================

  /** 14. 邀请活动列表 */
  async findInviteActivities(query: { page?: number; pageSize?: number; status?: number }): Promise<{ list: NftInviteActivity[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.inviteActivityRepo.createQueryBuilder('a').where('a.is_delete = 0');
    if (query.status !== undefined && query.status !== null) qb.andWhere('a.status = :status', { status: query.status });
    qb.orderBy('a.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 15. 创建邀请活动 */
  async createInviteActivity(dto: { name: string; startTime?: string; endTime?: string; inviterCollectibleId?: number; inviteeCollectibleId?: number; airdropMode?: string }): Promise<NftInviteActivity> {
    const activity = new NftInviteActivity();
    activity.name = dto.name;
    activity.status = 0;
    activity.startTime = dto.startTime ? new Date(dto.startTime) : null;
    activity.endTime = dto.endTime ? new Date(dto.endTime) : null;
    activity.inviterCollectibleId = dto.inviterCollectibleId || null;
    activity.inviteeCollectibleId = dto.inviteeCollectibleId || null;
    activity.airdropMode = (dto.airdropMode as any) || 'realtime';
    return this.inviteActivityRepo.save(activity);
  }

  /** 16. 邀请记录列表 */
  async findInviteRecords(query: { page?: number; pageSize?: number; inviterUserId?: number; status?: number }): Promise<{ list: NftInviteRecord[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.inviteRecordRepo.createQueryBuilder('r').where('r.is_delete = 0');
    if (query.inviterUserId) qb.andWhere('r.inviter_user_id = :inviterUserId', { inviterUserId: query.inviterUserId });
    if (query.status !== undefined && query.status !== null) qb.andWhere('r.status = :status', { status: query.status });
    qb.orderBy('r.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 抽奖模块 (9 endpoints)
  // ============================================================

  /** 17. 抽奖活动列表 */
  async findLuckyDrawList(query: { page?: number; pageSize?: number; status?: number }): Promise<{ list: NftLuckyDrawActivity[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.luckyDrawRepo.createQueryBuilder('a').where('a.is_delete = 0');
    if (query.status !== undefined && query.status !== null) qb.andWhere('a.status = :status', { status: query.status });
    qb.orderBy('a.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 18. 创建抽奖活动 */
  async createLuckyDraw(dto: { name: string; drawLimitPerUser?: number; registerGrant?: number; inviteGrant?: number; startTime?: string; endTime?: string }): Promise<NftLuckyDrawActivity> {
    const activity = new NftLuckyDrawActivity();
    activity.name = dto.name;
    activity.status = 1;
    activity.drawLimitPerUser = dto.drawLimitPerUser || 1;
    activity.registerGrant = dto.registerGrant || 0;
    activity.inviteGrant = dto.inviteGrant || 0;
    activity.startTime = dto.startTime ? new Date(dto.startTime) : null;
    activity.endTime = dto.endTime ? new Date(dto.endTime) : null;
    return this.luckyDrawRepo.save(activity);
  }

  /** 19. 编辑抽奖活动 */
  async updateLuckyDraw(id: number, dto: Partial<{ name: string; drawLimitPerUser: number; registerGrant: number; inviteGrant: number; startTime: string; endTime: string; status: number }>): Promise<NftLuckyDrawActivity> {
    const activity = await this.luckyDrawRepo.findOne({ where: { id, isDelete: 0 } });
    if (!activity) throw new NotFoundException(`抽奖活动 #${id} 不存在`);

    if (dto.name !== undefined) activity.name = dto.name;
    if (dto.drawLimitPerUser !== undefined) activity.drawLimitPerUser = dto.drawLimitPerUser;
    if (dto.registerGrant !== undefined) activity.registerGrant = dto.registerGrant;
    if (dto.inviteGrant !== undefined) activity.inviteGrant = dto.inviteGrant;
    if (dto.startTime !== undefined) activity.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) activity.endTime = new Date(dto.endTime);
    if (dto.status !== undefined) activity.status = dto.status;

    return this.luckyDrawRepo.save(activity);
  }

  /** 20. 奖品列表 */
  async findLuckyDrawPrizes(id: number): Promise<NftLuckyDrawPrize[]> {
    return this.luckyDrawPrizeRepo.find({ where: { activityId: id, isDelete: 0 } });
  }

  /** 21. 添加奖品 */
  async addLuckyDrawPrize(id: number, dto: { collectibleId: number; name: string; probability: number; quantityLimit?: number }): Promise<NftLuckyDrawPrize> {
    const activity = await this.luckyDrawRepo.findOne({ where: { id, isDelete: 0 } });
    if (!activity) throw new NotFoundException(`抽奖活动 #${id} 不存在`);

    const prize = new NftLuckyDrawPrize();
    prize.activityId = id;
    prize.collectibleId = dto.collectibleId;
    prize.name = dto.name;
    prize.probability = dto.probability;
    prize.quantityLimit = dto.quantityLimit || null;
    prize.quantityDistributed = 0;
    return this.luckyDrawPrizeRepo.save(prize);
  }

  /** 22. 编辑奖品 */
  async updateLuckyDrawPrize(id: number, pid: number, dto: Partial<{ collectibleId: number; name: string; probability: number; quantityLimit: number }>): Promise<NftLuckyDrawPrize> {
    const prize = await this.luckyDrawPrizeRepo.findOne({ where: { id: pid, activityId: id, isDelete: 0 } });
    if (!prize) throw new NotFoundException(`奖品 #${pid} 不存在`);

    if (dto.collectibleId !== undefined) prize.collectibleId = dto.collectibleId;
    if (dto.name !== undefined) prize.name = dto.name;
    if (dto.probability !== undefined) prize.probability = dto.probability;
    if (dto.quantityLimit !== undefined) prize.quantityLimit = dto.quantityLimit;

    return this.luckyDrawPrizeRepo.save(prize);
  }

  /** 23. 删除奖品 */
  async deleteLuckyDrawPrize(id: number, pid: number): Promise<{ deleted: boolean }> {
    const prize = await this.luckyDrawPrizeRepo.findOne({ where: { id: pid, activityId: id, isDelete: 0 } });
    if (!prize) throw new NotFoundException(`奖品 #${pid} 不存在`);

    prize.isDelete = 1;
    prize.deletedAt = new Date();
    await this.luckyDrawPrizeRepo.save(prize);
    return { deleted: true };
  }

  /** 24. 抽奖记录列表 */
  async findLuckyDrawRecords(id: number, query: { page?: number; pageSize?: number; userId?: number }): Promise<{ list: NftLuckyDrawRecord[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.luckyDrawRecordRepo
      .createQueryBuilder('r')
      .where('r.is_delete = 0')
      .innerJoin(NftLuckyDrawPrize, 'p', 'p.id = r.prize_id AND p.activity_id = :id', { id });

    if (query.userId) qb.andWhere('r.user_id = :userId', { userId: query.userId });
    qb.orderBy('r.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 25. 手动发放抽奖次数 */
  async grantLuckyDrawChances(id: number, dto: { userId: number; chances: number; source?: string }): Promise<NftLuckyDrawUserChance> {
    const activity = await this.luckyDrawRepo.findOne({ where: { id, isDelete: 0 } });
    if (!activity) throw new NotFoundException(`抽奖活动 #${id} 不存在`);

    const source = (dto.source as any) || 'system';

    // 查找是否已有该来源的记录
    let chance = await this.luckyDrawChanceRepo.findOne({
      where: { activityId: id, userId: dto.userId, source, isDelete: 0 },
    });

    if (chance) {
      chance.chances = chance.chances + dto.chances;
    } else {
      chance = new NftLuckyDrawUserChance();
      chance.activityId = id;
      chance.userId = dto.userId;
      chance.source = source;
      chance.chances = dto.chances;
      chance.usedChances = 0;
    }

    return this.luckyDrawChanceRepo.save(chance);
  }

  // ============================================================
  // 合成模块 (5 endpoints)
  // ============================================================

  /** 26. 合成活动列表 */
  async findSynthesisList(query: { page?: number; pageSize?: number; status?: number }): Promise<{ list: NftSynthesisActivity[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.synthesisRepo.createQueryBuilder('a').where('a.is_delete = 0');
    if (query.status !== undefined && query.status !== null) qb.andWhere('a.status = :status', { status: query.status });
    qb.orderBy('a.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 27. 创建合成活动 */
  async createSynthesis(dto: { name: string; resultCollectibleId: number; type: string; totalLimit?: number; perUserLimit?: number; startTime?: string; endTime?: string; description?: string }): Promise<NftSynthesisActivity> {
    const activity = new NftSynthesisActivity();
    activity.name = dto.name;
    activity.resultCollectibleId = dto.resultCollectibleId;
    activity.type = dto.type;
    activity.totalLimit = dto.totalLimit || null;
    activity.perUserLimit = dto.perUserLimit || 1;
    activity.startTime = dto.startTime ? new Date(dto.startTime) : null;
    activity.endTime = dto.endTime ? new Date(dto.endTime) : null;
    activity.description = dto.description || null;
    activity.status = 1;
    activity.usedCount = 0;
    return this.synthesisRepo.save(activity);
  }

  /** 28. 编辑合成活动 */
  async updateSynthesis(id: number, dto: Partial<{ name: string; resultCollectibleId: number; type: string; totalLimit: number; perUserLimit: number; startTime: string; endTime: string; description: string; status: number }>): Promise<NftSynthesisActivity> {
    const activity = await this.synthesisRepo.findOne({ where: { id, isDelete: 0 } });
    if (!activity) throw new NotFoundException(`合成活动 #${id} 不存在`);

    if (dto.name !== undefined) activity.name = dto.name;
    if (dto.resultCollectibleId !== undefined) activity.resultCollectibleId = dto.resultCollectibleId;
    if (dto.type !== undefined) activity.type = dto.type;
    if (dto.totalLimit !== undefined) activity.totalLimit = dto.totalLimit;
    if (dto.perUserLimit !== undefined) activity.perUserLimit = dto.perUserLimit;
    if (dto.startTime !== undefined) activity.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) activity.endTime = new Date(dto.endTime);
    if (dto.description !== undefined) activity.description = dto.description;
    if (dto.status !== undefined) activity.status = dto.status;

    return this.synthesisRepo.save(activity);
  }

  /** 29. 合成材料列表 */
  async findSynthesisMaterials(id: number): Promise<NftSynthesisMaterial[]> {
    return this.synthesisMaterialRepo.find({ where: { activityId: id, isDelete: 0 } });
  }

  /** 30. 合成记录列表 */
  async findSynthesisRecords(id: number, query: { page?: number; pageSize?: number; userId?: number }): Promise<{ list: NftSynthesisRecord[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.synthesisRecordRepo
      .createQueryBuilder('r')
      .where('r.is_delete = 0')
      .andWhere('r.activity_id = :id', { id });

    if (query.userId) qb.andWhere('r.user_id = :userId', { userId: query.userId });
    qb.orderBy('r.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  // ============================================================
  // 空投模块 (3 endpoints)
  // ============================================================

  /** 31. 空投活动列表 */
  async findAirdropList(query: { page?: number; pageSize?: number; status?: number; type?: string }): Promise<{ list: NftAirdropActivity[]; total: number; page: number; pageSize: number }> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const qb = this.airdropRepo.createQueryBuilder('a').where('a.is_delete = 0');
    if (query.status !== undefined && query.status !== null) qb.andWhere('a.status = :status', { status: query.status });
    if (query.type) qb.andWhere('a.type = :type', { type: query.type });
    qb.orderBy('a.created_at', 'DESC').skip(skip).take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 32. 创建空投活动 */
  async createAirdrop(dto: { name: string; type: string; collectibleId: number; quantityPerUser?: number; totalLimit?: number; startTime?: string; endTime?: string; airdropMode?: string; conditionConfig?: Record<string, any>; description?: string }): Promise<NftAirdropActivity> {
    const activity = new NftAirdropActivity();
    activity.name = dto.name;
    activity.type = dto.type;
    activity.status = 1;
    activity.airdropMode = (dto.airdropMode as any) || 'batch';
    activity.collectibleId = dto.collectibleId;
    activity.quantityPerUser = dto.quantityPerUser || 1;
    activity.totalLimit = dto.totalLimit || null;
    activity.issuedCount = 0;
    activity.startTime = dto.startTime ? new Date(dto.startTime) : null;
    activity.endTime = dto.endTime ? new Date(dto.endTime) : null;
    activity.conditionConfig = dto.conditionConfig || null;
    activity.description = dto.description || null;
    return this.airdropRepo.save(activity);
  }

  /** 33. 执行空投 */
  async executeAirdrop(id: number, adminId: number): Promise<{ executed: number }> {
    const activity = await this.airdropRepo.findOne({ where: { id, isDelete: 0 } });
    if (!activity) throw new NotFoundException(`空投活动 #${id} 不存在`);

    if (activity.type !== 'direct') {
      throw new BadRequestException(`空投类型为 ${activity.type}，仅 direct 类型支持手动执行`);
    }

    // 查找所有符合条件的用户（status=1 正常用户）
    const users = await this.userRepo.find({ where: { status: 1, isDelete: 0 } });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let executed = 0;
      const now = new Date();

      for (const user of users) {
        // 检查是否已空投过
        const existing = await queryRunner.manager.findOne(NftAirdropRecord, {
          where: { activityId: id, userId: user.id, isDelete: 0 },
        });
        if (existing) continue;

        // 检查总数限制
        if (activity.totalLimit && executed >= activity.totalLimit) break;

        // 创建用户藏品
        const userCollectible = new NftUserCollectible();
        userCollectible.userId = user.id;
        userCollectible.collectibleId = activity.collectibleId;
        userCollectible.airdropRecordId = null; // 先设为null，后面更新
        userCollectible.serialNo = `AD${now.getTime()}${executed}`;
        userCollectible.source = 'airdrop';
        userCollectible.acquiredPrice = 0;
        userCollectible.acquiredAt = now;
        userCollectible.status = 1;
        await queryRunner.manager.save(userCollectible);

        // 创建空投记录
        const record = new NftAirdropRecord();
        record.activityId = id;
        record.userId = user.id;
        record.collectibleId = activity.collectibleId;
        record.userCollectibleId = userCollectible.id;
        record.phone = user.phone;
        record.quantity = activity.quantityPerUser;
        record.status = 1; // 已发放
        record.issuedAt = now;
        await queryRunner.manager.save(record);

        // 更新 user_collectible 的 airdropRecordId
        userCollectible.airdropRecordId = record.id;
        await queryRunner.manager.save(userCollectible);

        // 创建活动奖励记录
        const reward = new NftActivityReward();
        reward.activityType = 'airdrop';
        reward.activityId = id;
        reward.userId = user.id;
        reward.rewardType = 'collectible';
        reward.rewardId = activity.collectibleId;
        reward.rewardName = activity.name;
        reward.quantity = activity.quantityPerUser;
        reward.status = 1; // 已发放
        reward.adminId = adminId;
        await queryRunner.manager.save(reward);

        executed++;
      }

      // 更新空投活动已发放数量
      activity.issuedCount = activity.issuedCount + executed;
      activity.snapshotAt = now;
      await queryRunner.manager.save(activity);

      await queryRunner.commitTransaction();
      return { executed };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`执行空投失败: ${err.message}`, err.stack);
      throw new HttpException('执行空投失败，请稍后重试', HttpStatus.INTERNAL_SERVER_ERROR);
    } finally {
      await queryRunner.release();
    }
  }

  // ============================================================
  // 注册奖励模块 (2 endpoints)
  // ============================================================

  /** 34. 获取注册奖励配置 */
  async getRegisterConfig(): Promise<any[]> {
    const configs = await this.configRepo
      .createQueryBuilder('c')
      .where('c.is_delete = 0')
      .andWhere('c.config_key LIKE :pattern', { pattern: 'register_%' })
      .getMany();

    return configs.map((c) => ({
      id: c.id,
      configKey: c.configKey,
      configValue: c.configValue,
      configDesc: c.configDesc,
    }));
  }

  /** 35. 更新注册奖励配置 */
  async updateRegisterConfig(items: Array<{ configKey: string; configValue: string; configDesc?: string }>): Promise<any[]> {
    const results: NftSystemConfig[] = [];
    for (const item of items) {
      let config = await this.configRepo.findOne({ where: { configKey: item.configKey, isDelete: 0 } });
      if (config) {
        config.configValue = item.configValue;
        if (item.configDesc !== undefined) config.configDesc = item.configDesc;
      } else {
        config = new NftSystemConfig();
        config.configKey = item.configKey;
        config.configValue = item.configValue;
        config.configDesc = item.configDesc || null;
      }
      results.push(await this.configRepo.save(config));
    }
    return results.map((c) => ({ id: c.id, configKey: c.configKey, configValue: c.configValue, configDesc: c.configDesc }));
  }
}
