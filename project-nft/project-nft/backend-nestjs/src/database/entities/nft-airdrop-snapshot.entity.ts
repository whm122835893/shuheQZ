// [空投模块] - 数据库表 nft_airdrop_snapshots
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_airdrop_snapshots')
@Index('idx_as_activity_id', ['activityId'])
export class NftAirdropSnapshot {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true })
  userCollectibleId: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
