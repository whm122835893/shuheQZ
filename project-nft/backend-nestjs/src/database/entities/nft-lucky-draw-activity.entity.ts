// [抽奖模块] - 数据库表 nft_lucky_draw_activities
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_lda_status', ['status'])
@Index('idx_lda_is_delete', ['isDelete'])
@Entity('nft_lucky_draw_activities')
export class NftLuckyDrawActivity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'draw_limit_per_user', type: 'int', unsigned: true, default: 1 })
  drawLimitPerUser: number;

  @Column({ name: 'register_grant', type: 'int', unsigned: true, default: 0 })
  registerGrant: number;

  @Column({ name: 'invite_grant', type: 'int', unsigned: true, default: 0 })
  inviteGrant: number;

  @Column({ name: 'hold_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  holdCollectibleId: number | null;

  @Column({ name: 'hold_collectible_grant', type: 'int', unsigned: true, default: 0 })
  holdCollectibleGrant: number;

  @Column({ name: 'start_time', type: 'datetime', precision: 3, nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'datetime', precision: 3, nullable: true })
  endTime: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
