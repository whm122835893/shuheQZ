// [优先购模块] - 数据库表 nft_priority_sale_whitelists
import {
  Entity,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('nft_priority_sale_whitelists')
@Unique('uq_psw_sale_user', ['prioritySaleId', 'userId'])
@Index('idx_psw_priority_sale_id', ['prioritySaleId'])
@Index('idx_psw_user_id', ['userId'])
export class NftPrioritySaleWhitelist {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'priority_sale_id', type: 'bigint', unsigned: true })
  prioritySaleId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'max_quantity', type: 'int', unsigned: true, default: 1 })
  maxQuantity: number;

  @Column({ name: 'used_quantity', type: 'int', unsigned: true, default: 0 })
  usedQuantity: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
