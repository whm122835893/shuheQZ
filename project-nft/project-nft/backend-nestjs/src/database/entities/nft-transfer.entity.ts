// [转赠模块] - 数据库表 nft_transfers
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_transfer_from_user_id', ['fromUserId'])
@Index('idx_transfer_to_user_id', ['toUserId'])
@Index('idx_transfer_user_collectible_id', ['userCollectibleId'])
@Index('idx_transfer_status', ['status'])
@Entity('nft_transfers')
export class NftTransfer {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'from_user_id', type: 'bigint', unsigned: true })
  fromUserId: number;

  @Column({ name: 'to_user_id', type: 'bigint', unsigned: true })
  toUserId: number;

  @Column({ name: 'to_phone', type: 'varchar', length: 11 })
  toPhone: string;

  @Column({ name: 'to_nickname', type: 'varchar', length: 50, nullable: true })
  toNickname: string | null;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true })
  userCollectibleId: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'confirmed_at', type: 'datetime', precision: 3, nullable: true })
  confirmedAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
