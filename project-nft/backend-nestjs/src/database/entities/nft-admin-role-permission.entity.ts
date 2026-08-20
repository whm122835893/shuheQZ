// [管理员模块] - 数据库表 nft_admin_role_permissions（角色-权限关联）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('nft_admin_role_permissions')
@Index('idx_arp_role_id', ['roleId'])
@Index('idx_arp_permission_id', ['permissionId'])
export class NftAdminRolePermission {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'role_id', type: 'bigint', unsigned: true })
  roleId: number;

  @Column({ name: 'permission_id', type: 'bigint', unsigned: true })
  permissionId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;
}
