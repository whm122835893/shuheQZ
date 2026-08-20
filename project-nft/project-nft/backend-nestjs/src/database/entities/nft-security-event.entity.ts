// [管理员模块] - 数据库表 nft_security_events（安全事件日志）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_security_events')
@Index('idx_se_type', ['type'])
@Index('idx_se_user_id', ['userId'])
@Index('idx_se_admin_id', ['adminId'])
@Index('idx_se_created_at', ['createdAt'])
export class NftSecurityEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'type', type: 'varchar', length: 50, comment: 'login_failed/login_success/password_change/2fa_setup 等' })
  type: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: number | null;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @Column({ name: 'ip', type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'detail', type: 'json', nullable: true })
  detail: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 1, comment: '1=成功 0=失败' })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
