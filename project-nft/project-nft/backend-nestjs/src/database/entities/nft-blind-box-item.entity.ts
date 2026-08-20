// [盲盒模块] - 数据库表 nft_blind_box_items
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_bbi_blind_box_id', ['blindBoxId'])
@Index('idx_bbi_is_delete', ['isDelete'])
@Entity('nft_blind_box_items')
export class NftBlindBoxItem {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'blind_box_id', type: 'bigint', unsigned: true })
  blindBoxId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'probability', type: 'decimal', precision: 5, scale: 4 })
  probability: number;

  @Column({ name: 'quantity_limit', type: 'int', unsigned: true, nullable: true })
  quantityLimit: number | null;

  @Column({ name: 'quantity_distributed', type: 'int', unsigned: true, default: 0 })
  quantityDistributed: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
