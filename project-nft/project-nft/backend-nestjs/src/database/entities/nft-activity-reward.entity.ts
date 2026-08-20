// [管理员模块] - 数据库表 nft_activity_rewards（活动奖励记录）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_activity_rewards')
@Index('idx_arwd_activity_type', ['activityType'])
@Index('idx_arwd_user_id', ['userId'])
@Index('idx_arwd_status', ['status'])
export class NftActivityReward {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_type', type: 'varchar', length: 50, comment: 'checkin/lucky_draw/synthesis/airdrop/invite 等' })
  activityType: string;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true, nullable: true })
  activityId: number | null;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'reward_type', type: 'varchar', length: 30, comment: 'collectible/points/experience 等' })
  rewardType: string;

  @Column({ name: 'reward_id', type: 'bigint', unsigned: true, nullable: true })
  rewardId: number | null;

  @Column({ name: 'reward_name', type: 'varchar', length: 100 })
  rewardName: string;

  @Column({ name: 'quantity', type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待发放 1=已发放 2=已失败' })
  status: number;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
