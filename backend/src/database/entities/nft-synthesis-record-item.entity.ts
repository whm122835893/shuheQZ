// [合成模块] - 数据库表 nft_synthesis_record_items
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Index('idx_sri_record_id', ['synthesisRecordId'])
@Entity('nft_synthesis_record_items')
export class NftSynthesisRecordItem {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'synthesis_record_id', type: 'bigint', unsigned: true })
  synthesisRecordId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true })
  userCollectibleId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
