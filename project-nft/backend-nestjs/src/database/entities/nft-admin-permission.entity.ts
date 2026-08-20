// [管理员模块] - 数据库表 nft_admin_permissions（管理员权限）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_admin_permissions')
@Index('idx_ap_code', ['code'], { unique: true })
@Index('idx_ap_parent_id', ['parentId'])
@Index('idx_ap_is_delete', ['isDelete'])
export class NftAdminPermission {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'code', type: 'varchar', length: 100 })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'parent_id', type: 'bigint', unsigned: true, default: 0 })
  parentId: number;

  @Column({ name: 'type', type: 'tinyint', default: 1, comment: '1=菜单 2=按钮 3=接口' })
  type: number;

  @Column({ name: 'path', type: 'varchar', length: 200, nullable: true })
  path: string | null;

  @Column({ name: 'icon', type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ name: 'sort', type: 'int', default: 0 })
  sort: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
