-- ============================================================
-- 数和文创数字藏品平台 · 藏品版税费率字段迁移
-- 生成日期: 2026-08-18
-- 说明: 为藏品表新增 royalty_rate 字段，用于二级市场版税配置
-- ============================================================

USE `shuhe_wenchuang`;

-- nft_collectibles 新增版税费率字段
-- royalty_rate: 二级市场交易时收取的版税费率，单位为百分比（%），默认 0.00
ALTER TABLE `nft_collectibles`
  ADD COLUMN IF NOT EXISTS `royalty_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '二级市场版税费率(%)' AFTER `price`;
