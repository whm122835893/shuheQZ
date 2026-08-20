-- ============================================================
-- 数和文创数字藏品平台 · 管理员角色/权限表字段补齐迁移
-- 生成日期: 2026-08-20
-- 说明: 为 nft_admin_roles 补充 description/sort/is_delete 列，
--       为 nft_admin_permissions 补充 path/icon/status/is_delete/updated_at 列，
--       使 TypeORM 实体与 SQL 表结构对齐，修复角色列表/权限列表 500。
-- ============================================================

USE `shuhe_wenchuang`;

-- 1. nft_admin_roles 补列
ALTER TABLE `nft_admin_roles`
  ADD COLUMN IF NOT EXISTS `description` VARCHAR(255) NULL DEFAULT NULL COMMENT '角色描述' AFTER `code`,
  ADD COLUMN IF NOT EXISTS `sort` INT NOT NULL DEFAULT 0 COMMENT '排序值' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）' AFTER `sort`;

-- 2. nft_admin_permissions 补列
ALTER TABLE `nft_admin_permissions`
  ADD COLUMN IF NOT EXISTS `path` VARCHAR(200) NULL DEFAULT NULL COMMENT '路由路径' AFTER `parent_id`,
  ADD COLUMN IF NOT EXISTS `icon` VARCHAR(100) NULL DEFAULT NULL COMMENT '图标' AFTER `path`,
  ADD COLUMN IF NOT EXISTS `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态（1=启用 0=禁用）' AFTER `sort_order`,
  ADD COLUMN IF NOT EXISTS `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）' AFTER `status`,
  ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间' AFTER `created_at`;
