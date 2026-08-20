// [管理员模块] - 数据库表 nft_qualification_configs（优先购/活动资格配置）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_qualification_configs')
@Index('idx_qc_activity_type', ['activityType'])
@Index('idx_qc_is_delete', ['isDelete'])
export class NftQualificationConfig {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'activity_type', type: 'varchar', length: 50, comment: 'priority_sale/blind_box/synthesis 等' })
  activityType: string;

  @Column({ name: 'activity_id', type: 'bigint', unsigned: true, nullable: true })
  activityId: number | null;

  @Column({ name: 'rules', type: 'json', nullable: true })
  rules: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
