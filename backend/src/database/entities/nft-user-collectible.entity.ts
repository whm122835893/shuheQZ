// [用户藏品模块] - 数据库表 nft_user_collectibles
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Index('idx_uc_serial_no', ['serialNo'], { unique: true })
@Index('idx_uc_user_id', ['userId'])
@Index('idx_uc_collectible_id', ['collectibleId'])
@Index('idx_uc_status', ['status'])
@Index('idx_uc_is_delete', ['isDelete'])
@Entity('nft_user_collectibles')
export class NftUserCollectible {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true, nullable: true })
  orderId: number | null;

  @Column({ name: 'blind_box_item_id', type: 'bigint', unsigned: true, nullable: true })
  blindBoxItemId: number | null;

  @Column({ name: 'airdrop_record_id', type: 'bigint', unsigned: true, nullable: true })
  airdropRecordId: number | null;

  @Column({ name: 'serial_no', type: 'varchar', length: 20 })
  serialNo: string;

  @Column({
    name: 'source',
    type: 'enum',
    enum: ['purchase', 'blindbox', 'transfer', 'airdrop', 'synthesis', 'lucky_draw'],
  })
  source: string;

  @Column({ name: 'acquired_price', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  acquiredPrice: number;

  @Column({ name: 'acquired_at', type: 'datetime', precision: 3 })
  acquiredAt: Date;

  @Column({ name: 'is_consigned', type: 'tinyint', default: 0 })
  isConsigned: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'tx_hash', type: 'varchar', length: 100, nullable: true })
  txHash: string | null;

  @Column({ name: 'block_number', type: 'bigint', unsigned: true, nullable: true })
  blockNumber: number | null;

  @Column({ name: 'token_id', type: 'varchar', length: 100, nullable: true })
  tokenId: string | null;

  @Column({ name: 'mint_status', type: 'tinyint', nullable: true })
  mintStatus: number | null;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
