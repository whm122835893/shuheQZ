-- ============================================================
-- 数和文创数字藏品平台 · 库存配额表字段补齐迁移
-- 生成日期: 2026-08-20
-- 说明: 为 nft_inventory_quotas 补充实体所需的 total_quota/sold_count/
--       reserved_count/max_per_user 列，并为原有 NOT NULL 无默认值列补默认值，
--       使 TypeORM 实体 NftInventoryQuota 与 SQL 表结构对齐，修复藏品详情 500。
-- ============================================================

USE `shuhe_wenchuang`;

-- 1. 为原有 NOT NULL 无默认值列补默认值，避免 INSERT 时缺省报错
ALTER TABLE `nft_inventory_quotas`
  MODIFY COLUMN `quota_type` TINYINT NOT NULL DEFAULT 1 COMMENT '配额类型（1=发售 2=空投 3=预留 4=销毁）',
  MODIFY COLUMN `planned_quantity` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '计划数量';

-- 2. 新增实体所需列
ALTER TABLE `nft_inventory_quotas`
  ADD COLUMN IF NOT EXISTS `total_quota` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总配额' AFTER `collectible_id`,
  ADD COLUMN IF NOT EXISTS `sold_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已售数量' AFTER `total_quota`,
  ADD COLUMN IF NOT EXISTS `reserved_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '预留数量' AFTER `sold_count`,
  ADD COLUMN IF NOT EXISTS `max_per_user` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '每人限购' AFTER `reserved_count`;
