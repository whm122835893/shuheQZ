// [签到模块] - 数据库表 nft_check_in_records
import {
  Entity,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Unique('uq_cir_user_date', ['userId', 'checkInDate'])
@Index('idx_cir_user_id', ['userId'])
@Entity('nft_check_in_records')
export class NftCheckInRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'consecutive_days', type: 'int', unsigned: true, default: 1 })
  consecutiveDays: number;

  @Column({
    name: 'reward_type',
    type: 'enum',
    enum: ['none', 'collectible', 'points', 'draw_chance'],
    default: 'none',
  })
  rewardType: string;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
