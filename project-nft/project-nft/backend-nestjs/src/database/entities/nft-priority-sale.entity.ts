// [优先购模块] - 数据库表 nft_priority_sales
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_priority_sales')
@Index('idx_ps_collectible_id', ['collectibleId'])
@Index('idx_ps_status', ['status'])
@Index('idx_ps_is_delete', ['isDelete'])
export class NftPrioritySale {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'start_time', type: 'datetime', precision: 3 })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', precision: 3 })
  endTime: Date;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
