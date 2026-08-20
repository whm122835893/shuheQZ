// [寄售模块] - 数据库表 nft_resale_listings
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Index('idx_rl_seller_id', ['sellerId'])
@Index('idx_rl_collectible_id', ['collectibleId'])
@Index('idx_rl_status', ['status'])
@Index('idx_rl_is_delete', ['isDelete'])
@Entity('nft_resale_listings')
export class NftResaleListing {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'seller_id', type: 'bigint', unsigned: true })
  sellerId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true })
  userCollectibleId: number;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'listed_at', type: 'datetime', precision: 3 })
  listedAt: Date;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
