// [管理员模块] - 数据库表 nft_qualification_whitelists（资格白名单）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_qualification_whitelists')
@Index('idx_qw_config_id', ['configId'])
@Index('idx_qw_user_id', ['userId'])
export class NftQualificationWhitelist {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'config_id', type: 'bigint', unsigned: true })
  configId: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'remark', type: 'varchar', length: 255, nullable: true })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
