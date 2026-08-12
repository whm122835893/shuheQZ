// [用户关注模块] - 数据库表 nft_user_favorites
import {
  Entity,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_user_favorites')
@Unique('uq_uf_user_collectible', ['userId', 'collectibleId'])
@Index('idx_uf_user_id', ['userId'])
export class NftUserFavorite {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;
}
