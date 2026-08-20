// [管理员模块] - 数据库表 nft_onchain_tasks（上链任务队列）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_onchain_tasks')
@Index('idx_ot_channel_id', ['channelId'])
@Index('idx_ot_status', ['status'])
@Index('idx_ot_task_type', ['taskType'])
@Index('idx_ot_collectible', ['collectibleId'])
@Index('idx_ot_user_collectible', ['userCollectibleId'])
export class NftOnchainTask {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true, nullable: true })
  userCollectibleId: number | null;

  @Column({ name: 'channel_id', type: 'bigint', unsigned: true, nullable: true })
  channelId: number | null;

  @Column({ name: 'task_type', type: 'varchar', length: 50, comment: 'mint/transfer/burn/sync 等' })
  taskType: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50, nullable: true, comment: '目标类型（user_collectible/collectible）' })
  targetType: string | null;

  @Column({ name: 'target_id', type: 'bigint', unsigned: true, nullable: true, comment: '目标ID' })
  targetId: number | null;

  @Column({ name: 'payload', type: 'json', nullable: true, comment: '任务附加参数' })
  payload: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待处理 1=处理中 2=已成功 3=已失败 4=已回滚 5=死信(死信队列,超过最大重试次数)' })
  status: number;

  @Column({ name: 'tx_hash', type: 'varchar', length: 100, nullable: true })
  txHash: string | null;

  @Column({ name: 'block_number', type: 'bigint', unsigned: true, nullable: true })
  blockNumber: number | null;

  @Column({ name: 'token_id', type: 'varchar', length: 100, nullable: true, comment: '链上Token ID' })
  tokenId: string | null;

  @Column({ name: 'retry_count', type: 'int', unsigned: true, default: 0 })
  retryCount: number;

  @Column({ name: 'max_retry', type: 'int', unsigned: true, default: 3 })
  maxRetry: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'operator_id', type: 'bigint', unsigned: true, nullable: true, comment: '操作人ID' })
  operatorId: number | null;

  @Column({ name: 'executed_at', type: 'datetime', precision: 3, nullable: true })
  executedAt: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
