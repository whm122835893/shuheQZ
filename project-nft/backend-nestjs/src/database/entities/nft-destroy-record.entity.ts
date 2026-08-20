// [管理员模块] - 数据库表 nft_destroy_records（藏品销毁/燃烧记录）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_destroy_records')
@Index('idx_dr_user_collectible_id', ['userCollectibleId'])
@Index('idx_dr_user_id', ['userId'])
@Index('idx_dr_admin_id', ['adminId'])
export class NftDestroyRecord {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_collectible_id', type: 'bigint', unsigned: true })
  userCollectibleId: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @Column({ name: 'reason', type: 'varchar', length: 255 })
  reason: string;

  @Column({ name: 'tx_hash', type: 'varchar', length: 100, nullable: true })
  txHash: string | null;

  @Column({ name: 'status', type: 'tinyint', default: 0, comment: '0=待处理 1=已销毁 2=失败' })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
