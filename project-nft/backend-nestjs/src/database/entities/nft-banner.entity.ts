// [轮播图模块] - 数据库表 nft_banners
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_banners')
@Index('idx_banner_status', ['status'])
@Index('idx_banner_is_delete', ['isDelete'])
export class NftBanner {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 100 })
  title: string;

  @Column({ name: 'image', type: 'varchar', length: 255 })
  image: string;

  @Column({ name: 'link_type', type: 'varchar', length: 30, nullable: true })
  linkType: string | null;

  @Column({ name: 'link_url', type: 'varchar', length: 255, nullable: true })
  linkUrl: string | null;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
