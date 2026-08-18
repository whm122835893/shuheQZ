// [管理员模块] - 数据库表 nft_chain_channels（区块链渠道配置）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_chain_channels')
@Index('idx_cc_code', ['code'], { unique: true })
@Index('idx_cc_is_delete', ['isDelete'])
export class NftChainChannel {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'code', type: 'varchar', length: 30 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'chain_type', type: 'varchar', length: 30, comment: 'ethereum/polygon/bnb_chain 等' })
  chainType: string;

  @Column({ name: 'rpc_url', type: 'varchar', length: 255 })
  rpcUrl: string;

  @Column({ name: 'explorer_url', type: 'varchar', length: 255, nullable: true })
  explorerUrl: string | null;

  @Column({ name: 'contract_address', type: 'varchar', length: 100, nullable: true })
  contractAddress: string | null;

  @Column({ name: 'wallet_address', type: 'varchar', length: 100, nullable: true })
  walletAddress: string | null;

  @Column({ name: 'config', type: 'json', nullable: true })
  config: Record<string, any> | null;

  @Column({ name: 'status', type: 'tinyint', default: 1, comment: '1=启用 0=停用' })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
