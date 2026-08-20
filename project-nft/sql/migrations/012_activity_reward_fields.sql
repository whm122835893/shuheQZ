-- ============================================================
-- 012_activity_reward_fields.sql
-- 修复: nft_activity_rewards 实体与 SQL 表整表错位
--   实体 NftActivityReward 使用字符串类型的 activity_type/reward_type，
--   以及 user_id/reward_id/reward_name/quantity/status/admin_id 列，
--   但 SQL 表缺少这些列且 activity_type/reward_type 为 TINYINT。
--   仅修改类型 + 补列，不删除已有列 reward_config/planned_quantity/used_quantity。
-- ============================================================

-- 1. 修改 activity_type 类型 TINYINT -> VARCHAR(50)
ALTER TABLE `nft_activity_rewards`
  MODIFY COLUMN `activity_type` VARCHAR(50) NOT NULL COMMENT '活动类型（checkin/lucky_draw/synthesis/airdrop/invite 等）';

-- 2. 修改 activity_id 类型 INT NOT NULL -> BIGINT NULL（实体允许 NULL）
ALTER TABLE `nft_activity_rewards`
  MODIFY COLUMN `activity_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '活动ID';

-- 3. 修改 reward_type 类型 TINYINT -> VARCHAR(30)
ALTER TABLE `nft_activity_rewards`
  MODIFY COLUMN `reward_type` VARCHAR(30) NOT NULL COMMENT '奖励类型（collectible/points/experience 等）';

-- 4. 补缺失列
ALTER TABLE `nft_activity_rewards`
  ADD COLUMN IF NOT EXISTS `user_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用户ID' AFTER `activity_id`,
  ADD COLUMN IF NOT EXISTS `reward_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '奖励关联ID（如藏品ID）' AFTER `reward_type`,
  ADD COLUMN IF NOT EXISTS `reward_name` VARCHAR(100) NULL DEFAULT NULL COMMENT '奖励名称' AFTER `reward_id`,
  ADD COLUMN IF NOT EXISTS `quantity` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '数量' AFTER `reward_name`,
  ADD COLUMN IF NOT EXISTS `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态（0=待发放 1=已发放 2=已失败）' AFTER `quantity`,
  ADD COLUMN IF NOT EXISTS `admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作管理员ID' AFTER `status`;

-- 5. 补索引
ALTER TABLE `nft_activity_rewards`
  ADD INDEX IF NOT EXISTS `idx_arwd_activity_type` (`activity_type`),
  ADD INDEX IF NOT EXISTS `idx_arwd_user_id` (`user_id`),
  ADD INDEX IF NOT EXISTS `idx_arwd_status` (`status`);
