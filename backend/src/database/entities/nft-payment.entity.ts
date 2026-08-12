// [支付模块] - 数据库表 nft_payments
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_payment_order_id', ['orderId'])
@Index('idx_payment_user_id', ['userId'])
@Index('idx_payment_status', ['status'])
@Index('idx_payment_is_delete', ['isDelete'])
@Entity('nft_payments')
export class NftPayment {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  orderId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['balance', 'alipay', 'wechat'],
  })
  paymentMethod: string;

  @Column({ name: 'transaction_no', type: 'varchar', length: 64, nullable: true })
  transactionNo: string | null;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'paid_at', type: 'datetime', precision: 3, nullable: true })
  paidAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
