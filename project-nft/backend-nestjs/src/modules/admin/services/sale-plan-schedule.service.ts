// [发售计划定时任务服务] - SalePlanScheduleService
// 定时检查发售计划，自动开始/结束发售
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NftSalePlan } from '../../../database/entities/nft-sale-plan.entity';
import { NftCollectible } from '../../../database/entities/nft-collectible.entity';

@Injectable()
export class SalePlanScheduleService {
  private readonly logger = new Logger(SalePlanScheduleService.name);

  constructor(
    @InjectRepository(NftSalePlan)
    private readonly salePlanRepo: Repository<NftSalePlan>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 每分钟检查一次：
   * - 待开售(status=1) 且已到开始时间 → 改为发售中(status=2)，同步更新藏品 status=2
   * - 发售中(status=2) 且已过结束时间 → 改为已结束(status=3)，同步更新藏品 status=0
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkSalePlans() {
    const now = new Date();

    // 1. 处理应该开始的发售计划
    const plansToStart = await this.salePlanRepo
      .createQueryBuilder('sp')
      .where('sp.status = 1')
      .andWhere('sp.start_time <= :now', { now })
      .andWhere('sp.is_delete = 0')
      .getMany();

    if (plansToStart.length > 0) {
      this.logger.log(`发现 ${plansToStart.length} 个发售计划需要开始`);
      for (const plan of plansToStart) {
        try {
          await this.startSalePlan(plan.id);
          this.logger.log(`发售计划 #${plan.id} 已自动开始`);
        } catch (e) {
          this.logger.error(`自动开始发售计划 #${plan.id} 失败: ${e.message}`);
        }
      }
    }

    // 2. 处理应该结束的发售计划
    const plansToEnd = await this.salePlanRepo
      .createQueryBuilder('sp')
      .where('sp.status = 2')
      .andWhere('sp.end_time <= :now', { now })
      .andWhere('sp.is_delete = 0')
      .getMany();

    if (plansToEnd.length > 0) {
      this.logger.log(`发现 ${plansToEnd.length} 个发售计划需要结束`);
      for (const plan of plansToEnd) {
        try {
          await this.endSalePlan(plan.id);
          this.logger.log(`发售计划 #${plan.id} 已自动结束`);
        } catch (e) {
          this.logger.error(`自动结束发售计划 #${plan.id} 失败: ${e.message}`);
        }
      }
    }
  }

  private async startSalePlan(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const plan = await queryRunner.manager.findOne(NftSalePlan, {
        where: { id, isDelete: 0 },
      });
      if (!plan || plan.status !== 1) return;

      // 更新发售计划状态为发售中
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftSalePlan)
        .set({ status: 2 })
        .where('id = :id AND status = 1', { id })
        .execute();

      // 更新藏品状态为发售中
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ status: 2 })
        .where('id = :cid', { cid: plan.collectibleId })
        .execute();

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  private async endSalePlan(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const plan = await queryRunner.manager.findOne(NftSalePlan, {
        where: { id, isDelete: 0 },
      });
      if (!plan || plan.status !== 2) return;

      // 更新发售计划状态为已结束
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftSalePlan)
        .set({ status: 3 })
        .where('id = :id AND status = 2', { id })
        .execute();

      // 更新藏品状态为下架（C端不可见）
      await queryRunner.manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({ status: 0, offSaleAt: new Date() })
        .where('id = :cid', { cid: plan.collectibleId })
        .execute();

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }
}
