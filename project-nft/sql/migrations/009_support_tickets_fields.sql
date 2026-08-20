-- ============================================================
-- 009_support_tickets_fields.sql
-- 修复 D010: nft_support_tickets 实体与 SQL 表列不匹配
--   实体 NftSupportTicket 使用 category / resolved_at / is_delete，
--   但 SQL 表缺少这三列，导致 API 500。
--   仅补列，不删除已有列 ticket_type / related_order_id。
-- ============================================================

-- 1. 补 category 列（实体使用 varchar，与 SQL 已有 ticket_type TINYINT 并存）
ALTER TABLE `nft_support_tickets`
  ADD COLUMN IF NOT EXISTS `category` VARCHAR(50) NULL DEFAULT NULL COMMENT '工单分类（order/payment/collectible/account/other）' AFTER `user_id`;

-- 2. 补 resolved_at 列（关闭工单时写入）
ALTER TABLE `nft_support_tickets`
  ADD COLUMN IF NOT EXISTS `resolved_at` DATETIME(3) NULL DEFAULT NULL COMMENT '解决时间' AFTER `assignee_id`;

-- 3. 补 is_delete 列（软删除标记，服务层 where is_delete=0）
ALTER TABLE `nft_support_tickets`
  ADD COLUMN IF NOT EXISTS `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）' AFTER `resolved_at`;

-- 4. 补索引
ALTER TABLE `nft_support_tickets`
  ADD INDEX IF NOT EXISTS `idx_st_is_delete` (`is_delete`);
