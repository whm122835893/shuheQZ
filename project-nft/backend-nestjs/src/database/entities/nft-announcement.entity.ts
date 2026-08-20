// [公告模块] - 数据库表 nft_announcements
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_ann_is_delete', ['isDelete'])
@Entity('nft_announcements')
export class NftAnnouncement {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'summary', type: 'varchar', length: 500, nullable: true })
  summary: string | null;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'cover_image', type: 'varchar', length: 255, nullable: true })
  coverImage: string | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: ['notice', 'news'],
  })
  type: string;

  @Column({ name: 'subtype', type: 'varchar', length: 20, nullable: true })
  subtype: string | null;

  @Column({ name: 'tag_color', type: 'varchar', length: 20, nullable: true })
  tagColor: string | null;

  @Column({ name: 'is_top', type: 'tinyint', default: 0 })
  isTop: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
