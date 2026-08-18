// [邀请模块] - 数据库表 nft_invite_records
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_invite_records')
@Index('idx_ir_inviter_user_id', ['inviterUserId'])
@Index('idx_ir_invitee_user_id', ['inviteeUserId'])
@Index('idx_ir_status', ['status'])
export class NftInviteRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'inviter_user_id', type: 'bigint', unsigned: true })
  inviterUserId: number;

  @Column({ name: 'invitee_user_id', type: 'bigint', unsigned: true, nullable: true })
  inviteeUserId: number | null;

  @Column({ name: 'invitee_phone', type: 'varchar', length: 11 })
  inviteePhone: string;

  @Column({ name: 'invite_code', type: 'varchar', length: 20, nullable: true })
  inviteCode: string | null;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'registered_at', type: 'datetime', precision: 3, nullable: true })
  registeredAt: Date | null;

  @Column({ name: 'rewarded_at', type: 'datetime', precision: 3, nullable: true })
  rewardedAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
