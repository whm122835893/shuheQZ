-- ============================================================
-- 数和文创数字藏品平台 · 索引修复脚本
-- 生成日期: 2026-08-16
-- 说明: 为缺少二级索引的表补充索引
-- ============================================================

USE `shuhe_wenchuang`;

-- nft_artifacts 补充索引
ALTER TABLE nft_artifacts 
  ADD INDEX IF NOT EXISTS idx_category (category),
  ADD INDEX IF NOT EXISTS idx_is_delete (is_delete);

-- nft_refunds 补充缺失字段（实体已定义但表中缺少）
ALTER TABLE nft_refunds 
  ADD COLUMN IF NOT EXISTS refund_no VARCHAR(64) DEFAULT NULL AFTER user_id,
  ADD COLUMN IF NOT EXISTS admin_id BIGINT UNSIGNED DEFAULT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS channel VARCHAR(30) DEFAULT NULL AFTER admin_id,
  ADD COLUMN IF NOT EXISTS trade_no VARCHAR(100) DEFAULT NULL AFTER channel,
  ADD COLUMN IF NOT EXISTS reject_reason VARCHAR(255) DEFAULT NULL AFTER trade_no;
