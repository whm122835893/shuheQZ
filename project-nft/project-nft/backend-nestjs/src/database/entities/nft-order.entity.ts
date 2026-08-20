// [订单模块] - 数据库表 nft_orders
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Index('idx_order_order_no', ['orderNo'], { unique: true })
@Index('idx_order_user_id', ['userId'])
@Index('idx_order_collectible_id', ['collectibleId'])
@Index('idx_order_status', ['status'])
@Index('idx_order_is_delete', ['isDelete'])
@Entity('nft_orders')
export class NftOrder {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'resale_listing_id', type: 'bigint', unsigned: true, nullable: true })
  resaleListingId: number | null;

  @Column({ name: 'priority_sale_id', type: 'bigint', unsigned: true, nullable: true })
  prioritySaleId: number | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'quantity', type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({
    name: 'source',
    type: 'enum',
    enum: ['release', 'market'],
  })
  source: string;

  @Column({ name: 'paid_at', type: 'datetime', precision: 3, nullable: true })
  paidAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', precision: 3, nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 100, nullable: true })
  cancelReason: string | null;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt: Date;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
