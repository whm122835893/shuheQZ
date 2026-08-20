// [管理员模块] - 数据库表 nft_platform_cleanup_logs（平台数据清理日志）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_platform_cleanup_logs')
@Index('idx_pcl_target_table', ['targetTable'])
@Index('idx_pcl_admin_id', ['adminId'])
@Index('idx_pcl_created_at', ['createdAt'])
export class NftPlatformCleanupLog {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'target_table', type: 'varchar', length: 50 })
  targetTable: string;

  @Column({ name: 'target_ids', type: 'json', nullable: true })
  targetIds: number[] | null;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true })
  adminId: number;

  @Column({ name: 'admin_name', type: 'varchar', length: 50 })
  adminName: string;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'affected_count', type: 'int', unsigned: true, default: 0 })
  affectedCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
