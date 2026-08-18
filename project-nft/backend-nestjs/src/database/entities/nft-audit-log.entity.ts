// [审计日志模块] - 数据库表 nft_audit_logs
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Index('idx_al_user_id', ['userId'])
@Index('idx_al_operator_id', ['operatorId'])
@Index('idx_al_action', ['action'])
@Index('idx_al_target', ['targetType', 'targetId'])
@Index('idx_al_created_at', ['createdAt'])
@Entity('nft_audit_logs')
export class NftAuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'operator_id', type: 'bigint', unsigned: true, nullable: true })
  operatorId: number | null;

  @Column({ name: 'operator_type', type: 'varchar', length: 20, default: 'admin' })
  operatorType: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: number | null;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'target_type', type: 'varchar', length: 30 })
  targetType: string;

  @Column({ name: 'target_id', type: 'bigint', unsigned: true })
  targetId: number;

  @Column({ name: 'detail', type: 'json', nullable: true })
  detail: Record<string, any> | null;

  @Column({ name: 'ip', type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
