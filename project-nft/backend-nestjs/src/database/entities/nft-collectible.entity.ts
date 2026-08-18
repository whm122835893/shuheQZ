// [藏品模块] - 数据库表 nft_collectibles
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Index('idx_collectible_category_id', ['categoryId'])
@Index('idx_collectible_status', ['status'])
@Index('idx_collectible_is_delete', ['isDelete'])
@Entity('nft_collectibles')
export class NftCollectible {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'category_id', type: 'bigint', unsigned: true })
  categoryId: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'subtitle', type: 'varchar', length: 100, nullable: true })
  subtitle: string | null;

  @Column({ name: 'image', type: 'varchar', length: 255 })
  image: string;

  @Column({ name: 'gradient', type: 'varchar', length: 100, nullable: true })
  gradient: string | null;

  @Column({ name: 'icon', type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  price: number;

  @Column({ name: 'edition', type: 'int', unsigned: true, default: 0 })
  edition: number;

  @Column({ name: 'circulate', type: 'int', unsigned: true, default: 0 })
  circulate: number;

  @Column({ name: 'sold', type: 'int', unsigned: true, default: 0 })
  sold: number;

  @Column({ name: 'locked_quantity', type: 'int', unsigned: true, default: 0 })
  lockedQuantity: number;

  @Column({ name: 'vol', type: 'int', unsigned: true, default: 0 })
  vol: number;

  @Column({ name: 'status', type: 'tinyint', default: 1 })
  status: number;

  @Column({ name: 'issuer', type: 'varchar', length: 50, default: '数和文创' })
  issuer: string;

  @Column({ name: 'creator', type: 'varchar', length: 50, default: '数和文创' })
  creator: string;

  @Column({ name: 'brand', type: 'varchar', length: 50, default: '数和文创' })
  brand: string;

  @Column({ name: 'album', type: 'varchar', length: 50, nullable: true })
  album: string | null;

  @Column({ name: 'contract_address', type: 'varchar', length: 100, nullable: true })
  contractAddress: string | null;

  @Column({ name: 'chain_type', type: 'tinyint', nullable: true })
  chainType: number | null;

  @Column({ name: 'token_standard', type: 'tinyint', nullable: true })
  tokenStandard: number | null;

  @Column({ name: 'cert_id', type: 'varchar', length: 50, nullable: true })
  certId: string | null;

  @Column({ name: 'cert_serial', type: 'varchar', length: 50, nullable: true })
  certSerial: string | null;

  @Column({ name: 'release_date', type: 'datetime', precision: 3, nullable: true })
  releaseDate: Date | null;

  @Column({ name: 'onsale_at', type: 'datetime', precision: 3, nullable: true })
  onsaleAt: Date | null;

  @Column({ name: 'off_sale_at', type: 'datetime', precision: 3, nullable: true })
  offSaleAt: Date | null;

  @Column({ name: 'tag', type: 'varchar', length: 50, nullable: true })
  tag: string | null;

  @Column({ name: 'is_release', type: 'tinyint', default: 0 })
  isRelease: number;

  @Column({ name: 'featured', type: 'tinyint', default: 0 })
  featured: number;

  @Column({ name: 'is_transferable', type: 'tinyint', default: 1 })
  isTransferable: number;

  @Column({ name: 'is_on_chain', type: 'tinyint', default: 0 })
  isOnChain: number;

  @Column({ name: 'serial_prefix', type: 'varchar', length: 20, default: '#' })
  serialPrefix: string;

  @Column({ name: 'serial_current', type: 'int', unsigned: true, default: 0 })
  serialCurrent: number;

  @Column({ name: 'market_tag', type: 'varchar', length: 50, nullable: true })
  marketTag: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @VersionColumn({ name: 'version', type: 'int', unsigned: true, default: 0 })
  version: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
