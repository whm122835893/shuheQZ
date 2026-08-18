// [管理员模块] - 数据库表 nft_blacklists（用户/地址黑名单）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_blacklists')
@Index('idx_bl_type_target', ['type', 'target'])
export class NftBlacklist {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'type', type: 'tinyint', comment: '1=用户 2=钱包地址 3=IP' })
  type: number;

  @Column({ name: 'target', type: 'varchar', length: 100 })
  target: string;

  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @Column({ name: 'admin_id', type: 'bigint', unsigned: true, nullable: true })
  adminId: number | null;

  @Column({ name: 'expired_at', type: 'datetime', precision: 3, nullable: true, comment: 'null=永久' })
  expiredAt: Date | null;

  @Column({ name: 'status', type: 'tinyint', default: 1, comment: '1=生效中 0=已解除' })
  status: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
