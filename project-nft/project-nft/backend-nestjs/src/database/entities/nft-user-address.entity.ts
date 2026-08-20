// [收货地址模块] - 数据库表 nft_user_addresses
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_user_addresses')
@Index('idx_ua_user_id', ['userId'])
@Index('idx_ua_is_delete', ['isDelete'])
export class NftUserAddress {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: number;

  @Column({ name: 'name', type: 'varchar', length: 50 })
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 11 })
  phone: string;

  @Column({ name: 'province', type: 'varchar', length: 50 })
  province: string;

  @Column({ name: 'city', type: 'varchar', length: 50 })
  city: string;

  @Column({ name: 'district', type: 'varchar', length: 50 })
  district: string;

  @Column({ name: 'detail', type: 'varchar', length: 255 })
  detail: string;

  @Column({ name: 'is_default', type: 'tinyint', default: 0 })
  isDefault: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
