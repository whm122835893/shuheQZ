// [文物模块] - 数据库表 nft_artifacts
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Index('idx_artifact_is_delete', ['isDelete'])
@Entity('nft_artifacts')
export class NftArtifact {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'dynasty', type: 'varchar', length: 50, nullable: true })
  dynasty: string | null;

  @Column({ name: 'category', type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ name: 'image', type: 'varchar', length: 255 })
  image: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'tags', type: 'json', nullable: true })
  tags: string[] | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
