-- ============================================================
-- 011_chain_channel_fields.sql
-- 修复: nft_chain_channels 实体与 SQL 表整表错位
--   实体 NftChainChannel 使用 rpc_url/explorer_url/wallet_address/config/status/is_delete，
--   且 chain_type 为 VARCHAR(30)，但 SQL 表缺少这些列且 chain_type 为 TINYINT。
--   仅补列 + 修改 chain_type 类型，不删除已有列 api_endpoint/api_key/api_secret/is_active 等。
-- ============================================================

-- 1. 修改 chain_type 类型 TINYINT -> VARCHAR(30)（实体期望字符串：ethereum/polygon/bnb_chain 等）
ALTER TABLE `nft_chain_channels`
  MODIFY COLUMN `chain_type` VARCHAR(30) NOT NULL COMMENT '链类型（ethereum/polygon/bnb_chain 等）';

-- 2. 补缺失列
ALTER TABLE `nft_chain_channels`
  ADD COLUMN IF NOT EXISTS `rpc_url` VARCHAR(255) NULL DEFAULT NULL COMMENT 'RPC 地址' AFTER `chain_type`,
  ADD COLUMN IF NOT EXISTS `explorer_url` VARCHAR(255) NULL DEFAULT NULL COMMENT '区块浏览器地址' AFTER `rpc_url`,
  ADD COLUMN IF NOT EXISTS `wallet_address` VARCHAR(100) NULL DEFAULT NULL COMMENT '钱包地址' AFTER `contract_address`,
  ADD COLUMN IF NOT EXISTS `config` JSON NULL DEFAULT NULL COMMENT '渠道配置（加密存储）' AFTER `wallet_address`,
  ADD COLUMN IF NOT EXISTS `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态（1=启用 0=停用）' AFTER `config`,
  ADD COLUMN IF NOT EXISTS `is_delete` TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）' AFTER `status`;

-- 3. 补索引
ALTER TABLE `nft_chain_channels`
  ADD INDEX IF NOT EXISTS `idx_cc_is_delete` (`is_delete`);
