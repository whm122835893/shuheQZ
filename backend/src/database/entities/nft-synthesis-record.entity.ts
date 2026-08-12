// [合成模块] - 数据库表 nft_synthesis_records
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Index('idx_sr_activity_id', ['activityId'])
@Index('idx_sr_user_id', ['userId'])
@Entity('nft_synthesis_records')
export class NftSynthesisRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'result_collectible_id', type: 'bigint', unsigned: true })
  resultCollectibleId: number;

  @Column({ name: 'result_user_collectible_id', type: 'bigint', unsigned: true })
  resultUserCollectibleId: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
