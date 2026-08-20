// [藏品分类模块] - 数据库表 nft_categories
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_category_code', ['code'], { unique: true })
@Index('idx_category_is_delete', ['isDelete'])
@Entity('nft_categories')
export class NftCategory {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 20 })
  name: string;

  @Column({ name: 'code', type: 'varchar', length: 20 })
  code: string;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ name: 'icon', type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
