// [管理员模块] - 数据库表 nft_approvals（审批工作流）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_approvals')
@Index('idx_ap_type', ['type'])
@Index('idx_ap_status', ['status'])
@Index('idx_ap_applicant_id', ['applicantId'])
export class NftApproval {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'type', type: 'varchar', length: 50, comment: 'refund/destroy/destroy_record/airdrop 等' })
  type: string;

  @Column({ name: 'target_id', type: 'bigint', unsigned: true })
  targetId: number;

  @Column({ name: 'applicant_id', type: 'bigint', unsigned: true })
  applicantId: number;

  @Column({ name: 'applicant_name', type: 'varchar', length: 50 })
  applicantName: string;

  @Column({ name: 'content', type: 'json', nullable: true })
  content: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待审批 1=已通过 2=已拒绝 3=已撤回' })
  status: number;

  @Column({ name: 'approver_id', type: 'bigint', unsigned: true, nullable: true })
  approverId: number | null;

  @Column({ name: 'approver_name', type: 'varchar', length: 50, nullable: true })
  approverName: string | null;

  @Column({ name: 'approver_remark', type: 'varchar', length: 500, nullable: true })
  approverRemark: string | null;

  @Column({ name: 'approved_at', type: 'datetime', precision: 3, nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
