// [管理员模块] - 数据库表 nft_inventory_quotas（藏品库存配额）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_inventory_quotas')
@Index('idx_iq_collectible_id', ['collectibleId'], { unique: true })
export class NftInventoryQuota {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'total_quota', type: 'int', unsigned: true, default: 0 })
  totalQuota: number;

  @Column({ name: 'sold_count', type: 'int', unsigned: true, default: 0 })
  soldCount: number;

  @Column({ name: 'reserved_count', type: 'int', unsigned: true, default: 0 })
  reservedCount: number;

  @Column({ name: 'max_per_user', type: 'int', unsigned: true, default: 1 })
  maxPerUser: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
