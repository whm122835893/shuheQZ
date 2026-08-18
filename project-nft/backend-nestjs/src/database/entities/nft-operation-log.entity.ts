// [操作审计模块] - 数据库表 nft_operation_logs
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_operation_logs')
@Index('idx_ol_created_at', ['createdAt'])
export class NftOperationLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @Column({ name: 'target_table', type: 'varchar', length: 50 })
  targetTable: string;

  @Column({ name: 'target_id', type: 'bigint', unsigned: true })
  targetId: number;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue: Record<string, any> | null;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue: Record<string, any> | null;

  @Column({ name: 'ip', type: 'varchar', length: 50, nullable: true })
  ip: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
