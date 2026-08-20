// [空投模块] - 数据库表 nft_airdrop_records
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_airdrop_records')
@Index('idx_ar_activity_id', ['activityId'])
@Index('idx_ar_user_id', ['userId'])
export class NftAirdropRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  userCollectibleId: number | null;

  @Column({ name: 'phone', type: 'varchar', length: 11 })
  phone: string;

  @Column({ name: 'quantity', type: 'int', unsigned: true, default: 1 })
  quantity: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'issued_at', type: 'datetime', precision: 3, nullable: true })
  issuedAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
