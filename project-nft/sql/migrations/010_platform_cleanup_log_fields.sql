-- ============================================================
-- 010_platform_cleanup_log_fields.sql
-- 修复 D011: nft_platform_cleanup_logs 实体与 SQL 表整表错位
--   实体 NftPlatformCleanupLog 使用 target_table/target_ids/admin_id/admin_name/affected_count，
--   但 SQL 表缺少这些列，导致 API 500。
--   仅补列，不删除已有列 operator_id/operator_ip/backup_path/scope 等。
-- ============================================================

ALTER TABLE `nft_platform_cleanup_logs`
  ADD COLUMN IF NOT EXISTS `target_table` VARCHAR(50) NULL DEFAULT NULL COMMENT '清理目标表名' AFTER `id`,
  ADD COLUMN IF NOT EXISTS `target_ids` JSON NULL DEFAULT NULL COMMENT '清理目标ID列表' AFTER `target_table`,
  ADD COLUMN IF NOT EXISTS `admin_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作管理员ID' AFTER `target_ids`,
  ADD COLUMN IF NOT EXISTS `admin_name` VARCHAR(50) NULL DEFAULT NULL COMMENT '操作管理员名称' AFTER `admin_id`,
  ADD COLUMN IF NOT EXISTS `affected_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '受影响记录数' AFTER `admin_name`;

-- 补索引
ALTER TABLE `nft_platform_cleanup_logs`
  ADD INDEX IF NOT EXISTS `idx_pcl_target_table` (`target_table`),
  ADD INDEX IF NOT EXISTS `idx_pcl_admin_id` (`admin_id`);
