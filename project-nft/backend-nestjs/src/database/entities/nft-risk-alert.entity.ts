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
@Index('idx_ra_level', ['level'])
@Index('idx_ra_status', ['status'])
@Index('idx_ra_user_id', ['userId'])
export class NftRiskAlert {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'level', type: 'tinyint', comment: '1=低 2=中 3=高 4=紧急' })
  level: number;

  @Column({ name: 'type', type: 'varchar', length: 50, comment: 'batch_register/unusual_transfer/price_manipulation 等' })
  type: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: number | null;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description: string;

  @Column({ name: 'detail', type: 'json', nullable: true })
  detail: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=未处理 1=已确认 2=已忽略 3=已处理' })
  status: number;

  @Column({ name: 'handler_id', type: 'bigint', unsigned: true, nullable: true })
  handlerId: number | null;

  @Column({ name: 'handle_remark', type: 'varchar', length: 500, nullable: true })
  handleRemark: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
