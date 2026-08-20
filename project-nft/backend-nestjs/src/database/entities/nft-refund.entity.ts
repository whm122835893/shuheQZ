// [管理员模块] - 数据库表 nft_refunds（退款记录）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_refunds')
@Index('idx_rf_order_id', ['orderId'])
@Index('idx_rf_payment_id', ['paymentId'])
@Index('idx_rf_status', ['status'])
export class NftRefund {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'payment_id', type: 'bigint', unsigned: true, nullable: true })
  paymentId: number | null;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'refund_no', type: 'varchar', length: 64 })
  refundNo: string;

  @Column({ name: 'amount', type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待审核 1=已通过 2=已拒绝 3=已退款 4=失败' })
  status: number;

  @Column({ name: 'channel', type: 'varchar', length: 30, nullable: true })
  channel: string | null;

  @Column({ name: 'trade_no', type: 'varchar', length: 100, nullable: true })
  tradeNo: string | null;

  @Column({ name: 'reject_reason', type: 'varchar', length: 255, nullable: true })
  rejectReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
