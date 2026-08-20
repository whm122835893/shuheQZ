// [系统模块] - 数据库表 nft_feedback
// 用户意见反馈表，记录用户提交的 bug/建议/投诉等反馈
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_feedback')
@Index('idx_fb_user_id', ['userId'])
@Index('idx_fb_status', ['status'])
@Index('idx_fb_is_delete', ['isDelete'])
export class NftFeedback {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['bug', 'suggestion', 'complaint', 'other'],
  })
  type: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'images', type: 'json', nullable: true })
  images: string[] | null;

  @Column({ name: 'contact', type: 'varchar', length: 100, nullable: true })
  contact: string | null;

  @Column({ name: 'ticket_id', type: 'varchar', length: 30 })
  ticketId: string;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
