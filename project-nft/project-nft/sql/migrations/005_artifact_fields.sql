-- ============================================================
-- 数和文创数字藏品平台 · 文物字段补充迁移
-- 生成日期: 2026-08-18
-- 说明: 为 nft_artifacts 表补充 size（文物尺寸）和 origin（出土/产地）字段
--       前端文物详情页与管理后台已引用，但数据库缺失，本次补齐
-- ============================================================

USE `shuhe_wenchuang`;

-- nft_artifacts 补充缺失字段
-- size: 文物尺寸（如 "高 24.5cm"，前端文物详情页引用）
-- origin: 出土/产地（如 "河南安阳殷墟"，前端文物详情页引用）
ALTER TABLE `nft_artifacts`
  ADD COLUMN IF NOT EXISTS `size` VARCHAR(100) NULL DEFAULT NULL COMMENT '文物尺寸' AFTER `description`,
  ADD COLUMN IF NOT EXISTS `origin` VARCHAR(200) NULL DEFAULT NULL COMMENT '出土/产地' AFTER `size`;
