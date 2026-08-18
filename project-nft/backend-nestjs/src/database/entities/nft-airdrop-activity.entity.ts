// [空投模块] - 数据库表 nft_airdrop_activities
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_airdrop_activities')
@Index('idx_aa_status', ['status'])
@Index('idx_aa_is_delete', ['isDelete'])
export class NftAirdropActivity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['direct', 'hold', 'checkin', 'register', 'login', 'invite'],
  })
  type: string;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({
    name: 'airdrop_mode',
    type: 'enum',
    enum: ['realtime', 'batch'],
    default: 'realtime',
  })
  airdropMode: string;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'quantity_per_user', type: 'int', unsigned: true, default: 1 })
  quantityPerUser: number;

  @Column({ name: 'total_limit', type: 'int', unsigned: true, nullable: true })
  totalLimit: number | null;

  @Column({ name: 'issued_count', type: 'int', unsigned: true, default: 0 })
  issuedCount: number;

  @Column({ name: 'start_time', type: 'datetime', precision: 3, nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'datetime', precision: 3, nullable: true })
  endTime: Date | null;

  @Column({ name: 'snapshot_at', type: 'datetime', precision: 3, nullable: true })
  snapshotAt: Date | null;

  @Column({ name: 'snapshot_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  snapshotCollectibleId: number | null;

  @Column({ name: 'checkin_days', type: 'int', unsigned: true, nullable: true })
  checkinDays: number | null;

  @Column({ name: 'condition_config', type: 'json', nullable: true })
  conditionConfig: Record<string, any> | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
