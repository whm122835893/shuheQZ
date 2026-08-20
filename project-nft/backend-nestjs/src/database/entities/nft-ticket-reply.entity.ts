// [管理员模块] - 数据库表 nft_ticket_replies（工单回复）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_ticket_replies')
@Index('idx_tr_ticket_id', ['ticketId'])
export class NftTicketReply {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'ticket_id', type: 'bigint', unsigned: true })
  ticketId: number;

  @Column({ name: 'replier_id', type: 'bigint', unsigned: true })
  replierId: number;

  @Column({ name: 'replier_type', type: 'varchar', length: 10, default: 'admin', comment: 'user/admin' })
  replierType: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'attachments', type: 'json', nullable: true })
  attachments: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
