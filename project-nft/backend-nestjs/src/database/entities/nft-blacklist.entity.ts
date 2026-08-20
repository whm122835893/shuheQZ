// [管理员模块] - 数据库表 nft_blacklist（用户/地址黑名单）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_blacklist')
@Index('idx_bl_type_target', ['blacklistType', 'targetValue'])
export class NftBlacklist {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'blacklist_type', type: 'tinyint', comment: '1=用户 2=IP 3=设备 4=手机号' })
  blacklistType: number;

  @Column({ name: 'target_value', type: 'varchar', length: 100 })
  targetValue: string;

  @Column({ name: 'reason', type: 'varchar', length: 500 })
  reason: string;

  @Column({ name: 'evidence', type: 'text', nullable: true })
  evidence: string | null;

  @Column({ name: 'operator_id', type: 'int', unsigned: true })
  operatorId: number;

  @Column({ name: 'status', type: 'tinyint', default: 1, comment: '1=生效中 0=已解除' })
  status: number;

  @Column({ name: 'expire_at', type: 'datetime', precision: 3, nullable: true, comment: 'null=永久' })
  expireAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
