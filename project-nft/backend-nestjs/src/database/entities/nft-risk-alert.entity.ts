// [管理员模块] - 数据库表 nft_risk_alerts（风险预警）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_risk_alerts')
@Index('idx_ra_severity', ['severity'])
@Index('idx_ra_status', ['status'])
@Index('idx_ra_user_id', ['userId'])
export class NftRiskAlert {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'alert_type', type: 'tinyint', comment: '告警类型（1=刷单 2=薅羊毛 3=异常登录 4=高频接口 5=风控规则命中）' })
  alertType: number;

  @Column({ name: 'severity', type: 'tinyint', default: 2, comment: '严重等级（1=低 2=中 3=高）' })
  severity: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true })
  userId: number | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'evidence', type: 'json', nullable: true })
  evidence: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=未处理 1=处理中 2=已处理 3=已忽略' })
  status: number;

  @Column({ name: 'handler_id', type: 'int', unsigned: true, nullable: true })
  handlerId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
