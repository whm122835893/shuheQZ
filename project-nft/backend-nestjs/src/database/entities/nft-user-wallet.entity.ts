// [钱包模块] - 数据库表 nft_user_wallets
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('nft_user_wallets')
@Index('idx_uw_user_id', ['userId'], { unique: true })
@Index('idx_uw_is_delete', ['isDelete'])
export class NftUserWallet {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'balance', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  balance: number;

  @Column({ name: 'frozen_balance', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  frozenBalance: number;

  @Column({ name: 'total_recharged', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  totalRecharged: number;

  @Column({ name: 'total_consumed', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  totalConsumed: number;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
