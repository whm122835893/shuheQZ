// [邀请模块] - 数据库表 nft_invite_activities
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_invite_activities')
@Index('idx_ia_status', ['status'])
@Index('idx_ia_is_delete', ['isDelete'])
export class NftInviteActivity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'status', type: 'tinyint', default: 0 })
  status: number;

  @Column({ name: 'start_time', type: 'datetime', precision: 3, nullable: true })
  startTime: Date | null;

  @Column({ name: 'end_time', type: 'datetime', precision: 3, nullable: true })
  endTime: Date | null;

  @Column({ name: 'inviter_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  inviterCollectibleId: number | null;

  @Column({ name: 'invitee_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  inviteeCollectibleId: number | null;

  @Column({
    name: 'airdrop_mode',
    type: 'enum',
    enum: ['realtime', 'batch'],
    default: 'realtime',
  })
  airdropMode: string;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
