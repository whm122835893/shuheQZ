// [网站配置模块] - 数据库表 nft_site_settings
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('nft_site_settings')
@Index('idx_ss_setting_key', ['settingKey'], { unique: true })
@Index('idx_ss_is_delete', ['isDelete'])
export class NftSiteSetting {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'setting_key', type: 'varchar', length: 50 })
  settingKey: string;

  @Column({ name: 'setting_value', type: 'text' })
  settingValue: string;

  @Column({
    name: 'setting_group',
    type: 'enum',
    enum: ['basic', 'theme', 'button', 'seo'],
    default: 'basic',
  })
  settingGroup: string;

  @Column({ name: 'setting_desc', type: 'varchar', length: 200, nullable: true })
  settingDesc: string | null;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 })
  updatedAt: Date;
}
