// [合成模块] - 数据库表 nft_synthesis_activities
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_sa_status', ['status'])
@Index('idx_sa_is_delete', ['isDelete'])
@Entity('nft_synthesis_activities')
export class NftSynthesisActivity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'result_collectible_id', type: 'bigint', unsigned: true })
  resultCollectibleId: number;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['limit', 'permanent'],
  })
  type: string;

  @Column({ name: 'total_limit', type: 'int', unsigned: true, nullable: true })
  totalLimit: number | null;

  @Column({ name: 'used_count', type: 'int', unsigned: true, default: 0 })
  usedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', unsigned: true, default: 1 })
  perUserLimit: number;

  @Column({ name: 'start_time', type: 'datetime', precision: 3, nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'datetime', precision: 3, nullable: true })
  endTime: Date | null;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
