// [抽奖模块] - 数据库表 nft_lucky_draw_user_chances
// 说明: 该表为 API 文档补充表，init.sql 中未定义，根据 API 文档描述创建
import {
  Entity,
  Index,
  Unique,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Unique('uq_lduc_activity_user_source', ['activityId', 'userId', 'source'])
@Index('idx_lduc_activity_id', ['activityId'])
@Index('idx_lduc_user_id', ['userId'])
@Entity('nft_lucky_draw_user_chances')
export class NftLuckyDrawUserChance {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true })
  activityId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({
    name: 'source',
    type: 'enum',
    enum: ['hold_collectible', 'invite_friend', 'register', 'check_in', 'system'],
  })
  source: string;

  @Column({ name: 'chances', type: 'int', default: 0 })
  chances: number;

  @Column({ name: 'used_chances', type: 'int', default: 0 })
  usedChances: number;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
