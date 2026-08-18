// [钱包模块] - 数据库表 nft_wallet_transactions
// 钱包流水记录表，记录所有余额变动（充值/消费/冻结/解冻）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_wallet_transactions')
@Index('idx_wt_user_id', ['userId'])
@Index('idx_wt_type', ['type'])
export class NftWalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['recharge', 'consume', 'freeze', 'unfreeze'],
  })
  type: string;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 10, scale: 2 })
  balanceAfter: number;

  @Column({
    name: 'direction',
    type: 'enum',
    enum: ['in', 'out'],
  })
  direction: string;

  @Column({ name: 'related_order_no', type: 'varchar', length: 32, nullable: true })
  relatedOrderNo: string | null;

  @Column({ name: 'remark', type: 'varchar', length: 200, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
