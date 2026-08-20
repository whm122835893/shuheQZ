-- ============================================================
-- 数和文创数字藏品平台 · 抽奖活动字段补充迁移
-- 生成日期: 2026-08-18
-- 说明: 补充抽奖活动表的注册赠送/邀请赠送/持有藏品赠送字段
-- ============================================================

USE `shuhe_wenchuang`;

-- nft_lucky_draw_activities 补充缺失字段
-- register_grant / invite_grant: 实体已定义但表中缺失
-- hold_collectible_id / hold_collectible_grant: 新增字段，支持持有指定藏品触发抽奖次数
ALTER TABLE `nft_lucky_draw_activities`
  ADD COLUMN IF NOT EXISTS `register_grant` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '注册赠送抽奖次数' AFTER `draw_limit_per_user`,
  ADD COLUMN IF NOT EXISTS `invite_grant` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '邀请好友赠送抽奖次数' AFTER `register_grant`,
  ADD COLUMN IF NOT EXISTS `hold_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '持有该藏品ID时触发抽奖次数（NULL=不检测）' AFTER `invite_grant`,
  ADD COLUMN IF NOT EXISTS `hold_collectible_grant` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '持有藏品赠送抽奖次数' AFTER `hold_collectible_id`;

-- 补充索引：hold_collectible_id 查询优化
ALTER TABLE `nft_lucky_draw_activities`
  ADD INDEX IF NOT EXISTS `idx_hold_collectible_id` (`hold_collectible_id`);
