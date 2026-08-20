// [管理后台-奖励管理模块] - AdminRewardService
// 实现活动奖励配置的列表、创建、详情、更新。
//
// 关键设计：
//  - 奖励配置即 NftActivityReward 记录（status=0 待发放视为配置中）
//  - 列表支持按 activityType / rewardType / status 筛选
//  - 创建时设置 adminId 记录创建者
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NftActivityReward } from '../../../database/entities/nft-activity-reward.entity';

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminRewardService {
  constructor(
    @InjectRepository(NftActivityReward)
    private readonly rewardRepo: Repository<NftActivityReward>,
  ) {}

  // ============================================================
  // 奖励配置列表
  // ============================================================

  async getRewardList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<any>> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20));

    const qb = this.rewardRepo.createQueryBuilder('r');

    if (query.activityType) {
      qb.andWhere('r.activity_type = :activityType', {
        activityType: query.activityType,
      });
    }
    if (query.rewardType) {
      qb.andWhere('r.reward_type = :rewardType', {
        rewardType: query.rewardType,
      });
    }
    if (query.status !== undefined && query.status !== null && query.status !== '') {
      qb.andWhere('r.status = :status', { status: Number(query.status) });
    }
    if (query.userId) {
      qb.andWhere('r.user_id = :userId', { userId: Number(query.userId) });
    }
    if (query.activityId) {
      qb.andWhere('r.activity_id = :activityId', {
        activityId: Number(query.activityId),
      });
    }
    if (query.startDate) {
      qb.andWhere('r.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('r.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('r.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();

    return {
      list: list.map((r) => ({
        id: r.id,
        activityType: r.activityType,
        activityId: r.activityId,
        userId: r.userId,
        rewardType: r.rewardType,
        rewardId: r.rewardId,
        rewardName: r.rewardName,
        quantity: r.quantity,
        status: r.status,
        adminId: r.adminId,
        createdAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ============================================================
  // 创建奖励配置
  // ============================================================

  async createReward(
    body: Record<string, any>,
    admin: { id: number; username: string; realName: string },
  ): Promise<NftActivityReward> {
    if (!body.activityType) {
      throw new BadRequestException('activityType 不能为空');
    }
    if (!body.userId) {
      throw new BadRequestException('userId 不能为空');
    }
    if (!body.rewardType) {
      throw new BadRequestException('rewardType 不能为空');
    }
    if (!body.rewardName) {
      throw new BadRequestException('rewardName 不能为空');
    }

    const reward = this.rewardRepo.create({
      activityType: body.activityType,
      activityId: body.activityId ? Number(body.activityId) : null,
      userId: Number(body.userId),
      rewardType: body.rewardType,
      rewardId: body.rewardId ? Number(body.rewardId) : null,
      rewardName: body.rewardName,
      quantity: body.quantity ? Number(body.quantity) : 1,
      status: body.status !== undefined ? Number(body.status) : 0,
      adminId: admin.id,
    });

    return this.rewardRepo.save(reward);
  }

  // ============================================================
  // 奖励详情
  // ============================================================

  async getRewardDetail(id: number): Promise<NftActivityReward> {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException('奖励记录不存在');
    }
    return reward;
  }

  // ============================================================
  // 更新奖励配置
  // ============================================================

  async updateReward(
    id: number,
    body: Record<string, any>,
  ): Promise<NftActivityReward> {
    const reward = await this.rewardRepo.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException('奖励记录不存在');
    }

    const updatableFields = [
      'activityType',
      'activityId',
      'userId',
      'rewardType',
      'rewardId',
      'rewardName',
      'quantity',
      'status',
    ];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'activityId' || field === 'rewardId') {
          reward[field] = body[field] ? Number(body[field]) : null;
        } else if (field === 'userId' || field === 'quantity' || field === 'status') {
          reward[field] = Number(body[field]);
        } else {
          reward[field] = body[field];
        }
      }
    }

    return this.rewardRepo.save(reward);
  }
}
