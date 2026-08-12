// [盲盒模块] - 数据库表 nft_blind_box_open_records
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Index('idx_bbor_user_id', ['userId'])
@Index('idx_bbor_blind_box_id', ['blindBoxId'])
@Index('idx_bbor_is_delete', ['isDelete'])
@Entity('nft_blind_box_open_records')
export class NftBlindBoxOpenRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'blind_box_id', type: 'bigint', unsigned: true })
  blindBoxId: number;

  @Column({ name: 'consumed_user_collectible_id', type: 'bigint', unsigned: true })
  consumedUserCollectibleId: number;

  @Column({ name: 'blind_box_item_id', type: 'bigint', unsigned: true })
  blindBoxItemId: number;

  @Column({ name: 'prize_user_collectible_id', type: 'bigint', unsigned: true })
  prizeUserCollectibleId: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
