// [管理员模块] - 数据库表 nft_support_tickets（工单/客服支持）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_support_tickets')
@Index('idx_st_user_id', ['userId'])
@Index('idx_st_status', ['status'])
@Index('idx_st_priority', ['priority'])
export class NftSupportTicket {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'ticket_no', type: 'varchar', length: 32 })
  ticketNo: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'category', type: 'varchar', length: 50, comment: 'order/payment/collectible/account/other' })
  category: string;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'priority', type: 'tinyint', default: 1, comment: '1=低 2=中 3=高 4=紧急' })
  priority: number;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待处理 1=处理中 2=已解决 3=已关闭' })
  status: number;

  @Column({ name: 'assignee_id', type: 'bigint', unsigned: true, nullable: true })
  assigneeId: number | null;

  @Column({ name: 'resolved_at', type: 'datetime', precision: 3, nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
