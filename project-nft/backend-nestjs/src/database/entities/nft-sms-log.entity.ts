// [短信模块] - 数据库表 nft_sms_logs
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_sms_logs')
@Index('idx_sms_phone', ['phone'])
@Index('idx_sms_scene', ['scene'])
export class NftSmsLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'phone', type: 'varchar', length: 11 })
  phone: string;

  @Column({ name: 'code', type: 'varchar', length: 10 })
  code: string;

  @Column({ name: 'scene', type: 'tinyint' })
  scene: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'provider', type: 'varchar', length: 30, nullable: true })
  provider: string | null;

  @Column({ name: 'provider_msg_id', type: 'varchar', length: 64, nullable: true })
  providerMsgId: string | null;

  @Column({ name: 'ip', type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'expires_at', type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ name: 'sent_at', type: 'datetime', precision: 3, nullable: true })
  sentAt: Date | null;

  @Column({ name: 'used_at', type: 'datetime', precision: 3, nullable: true })
  usedAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
