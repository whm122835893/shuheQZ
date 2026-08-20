// [发售计划模块] - 数据库表 nft_sale_plans
// 藏品发售计划：管理员选择藏品，设置开售时间、结束时间、价格、限购等
// 上架后藏品在C端展示（is_release=1），到开售时间自动变为发售中（status=2）
import {
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 发售计划状态：
 * 0=草稿（未上架）
 * 1=待开售（已上架，未到开售时间）
 * 2=发售中（在售卖时间窗口内）
 * 3=已结束（到达结束时间）
 * 4=已售罄
 */
export type SalePlanStatus = 0 | 1 | 2 | 3 | 4;

/**
 * 售卖模式：
 * 1=公售
 * 2=资格购
 */
export type SaleMode = 1 | 2;

@Index('idx_collectible_id', ['collectibleId'])
@Index('idx_status', ['status'])
@Index('idx_start_time', ['startTime'])
@Entity('nft_sale_plans')
export class NftSalePlan {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id', unsigned: true })
  id: number;

  @Column({ name: 'collectible_id', type: 'bigint', unsigned: true })
  collectibleId: number;

  @Column({
    name: 'collectible_type',
    type: 'varchar',
    length: 20,
    default: 'collectible',
  })
  collectibleType: string; // collectible / blindbox

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name: string; // 发售计划名称

  @Column({
    name: 'sale_mode',
    type: 'tinyint',
    default: 1,
    comment: '售卖模式：1=公售 2=资格购',
  })
  saleMode: SaleMode;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, default: '0.00' })
  price: number; // 发售价格（可覆盖藏品原价）

  @Column({
    name: 'per_user_limit',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: '每人限购数量，0=不限',
  })
  perUserLimit: number;

  @Column({
    name: 'stock_allocation',
    type: 'int',
    unsigned: true,
    default: 0,
    comment: '本次发售分配库存，0=使用全部可用库存',
  })
  stockAllocation: number;

  @Column({ name: 'start_time', type: 'datetime', precision: 3 })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', precision: 3 })
  endTime: Date;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: 0,
    comment: '状态：0=草稿 1=待开售 2=发售中 3=已结束 4=已售罄',
  })
  status: SalePlanStatus;

  @Column({ name: 'sold_count', type: 'int', unsigned: true, default: 0 })
  soldCount: number;

  @Column({ name: 'is_delete', type: 'tinyint', default: 0 })
  isDelete: number;

  @Column({ name: 'deleted_at', type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt: Date;
}
