// [抽奖模块] - 数据库表 nft_lucky_draw_records
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Index('idx_ldr_user_id', ['userId'])
@Entity('nft_lucky_draw_records')
export class NftLuckyDrawRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'prize_id', type: 'bigint', unsigned: true })
  prizeId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'result_user_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  resultUserCollectibleId: number | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
