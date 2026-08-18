// [用户模块] - 数据库表 nft_users
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_user_phone', ['phone'], { unique: true })
@Index('idx_user_uid', ['uid'], { unique: true })
@Index('idx_user_is_delete', ['isDelete'])
@Index('idx_user_status', ['status'])
@Entity('nft_users')
export class NftUser {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'phone', type: 'varchar', length: 11 })
  phone: string;

  @Column({ name: 'username', type: 'varchar', length: 50 })
  username: string;

  @Column({ name: 'avatar', type: 'varchar', length: 255, default: '' })
  avatar: string;

  @Column({ name: 'uid', type: 'varchar', length: 10 })
  uid: string;

  @Column({ name: 'login_password', type: 'varchar', length: 255, select: false })
  loginPassword: string;

  @Column({ name: 'transaction_password', type: 'varchar', length: 255, nullable: true, select: false })
  transactionPassword: string | null;

  @Column({ name: 'is_realname', type: 'tinyint', default: 0 })
  isRealname: number;

  @Column({ name: 'real_name', type: 'varchar', length: 255, nullable: true })
  realName: string | null;

  // 身份证号（AES-256-GCM 加密存储，密钥由 DATA_AES_KEY 环境变量管理）
  @Column({ name: 'id_card', type: 'varchar', length: 255, nullable: true })
  idCard: string | null;

  @Column({ name: 'inviter_uid', type: 'varchar', length: 10, nullable: true })
  inviterUid: string | null;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'last_login_at', type: 'datetime', precision: 3, nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'login_count', type: 'int', unsigned: true, default: 0 })
  loginCount: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
