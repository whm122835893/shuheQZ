// [抽奖模块] - 数据库表 nft_lucky_draw_prizes
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_ldp_activity_id', ['activityId'])
@Entity('nft_lucky_draw_prizes')
export class NftLuckyDrawPrize {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
