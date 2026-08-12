// [空投模块] - 数据库表 nft_airdrop_eligibilities
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_airdrop_eligibilities')
@Index('idx_ae_activity_id', ['activityId'])
@Index('idx_ae_user_id', ['userId'])
export class NftAirdropEligibility {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'phone', type: 'varchar', length: 11 })
  phone: string;

  @Column({
    name: 'task_type',
    type: 'enum',
    enum: ['hold', 'checkin', 'register', 'login', 'invite'],
  })
  taskType: string;

  @Column({ name: 'task_completed_at', type: 'datetime', precision: 3 })
  taskCompletedAt: Date;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'airdrop_record_id', type: 'bigint', unsigned: true, nullable: true })
  airdropRecordId: number | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
