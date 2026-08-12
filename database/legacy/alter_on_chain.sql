-- ============================================================
-- 数和文创数字藏品平台 · 可选上链改造脚本 v3.0
-- 生成日期: 2026-08-06
-- 基于现有 v2.0 schema 的增量 ALTER / CREATE 脚本
-- 可直接在 MySQL 8.0+ 中执行
--
-- 表名映射说明（用户提示词 → 实际表名）:
--   nft            → nft_collectibles   （藏品主表）
--   nft_user_hold  → nft_user_collectibles（用户藏品持有表）
--   operation_log  → nft_operation_logs  （操作审计表，新增）
--
-- 改造目标:
--   1. 藏品支持"可选上链"（is_on_chain = 0 不上链 / 1 上链）
--   2. 不上链藏品通过 serial_prefix + serial_current 生成全局唯一编号
--   3. 新增 nft_operation_logs 操作审计表（不上链时防篡改追溯）
-- ============================================================

USE `nft_platform`;


-- ============================================================
-- 一、nft_collectibles 藏品主表修改
-- ============================================================

-- 1.1 新增字段 + 修改链上字段类型 + 重命名 contract → contract_address
ALTER TABLE `nft_collectibles`
  -- —— 新增字段 ——
  ADD COLUMN `is_on_chain`    TINYINT(1)   NOT NULL DEFAULT 0    COMMENT '是否上链：0不上链 1上链' AFTER `is_transferable`,
  ADD COLUMN `serial_prefix`  VARCHAR(20)  NOT NULL DEFAULT '#' COMMENT '藏品编号前缀（默认#，编号格式：#+序号，如#1 #10000；序号范围1~edition）' AFTER `is_on_chain`,
  ADD COLUMN `serial_current` INT UNSIGNED NOT NULL DEFAULT 0    COMMENT '当前已分配编号计数器（事务内自增，范围1~edition，配合 serial_prefix 生成唯一编号）' AFTER `serial_prefix`,
  -- —— 链上字段改为 TINYINT(1) + NULLABLE ——
  MODIFY COLUMN `chain_type`      TINYINT(1)  NULL DEFAULT NULL COMMENT '链类型：1以太坊 2Polygon 3联盟链（不上链为NULL）',
  MODIFY COLUMN `token_standard`  TINYINT(1)  NULL DEFAULT NULL COMMENT '标准：1ERC-721 2ERC-1155（不上链为NULL）',
  CHANGE COLUMN `contract` `contract_address` VARCHAR(100) NULL DEFAULT NULL COMMENT '合约地址（不上链为NULL；0x开头42位十六进制值，前端展示取前8后6中间用*代替）';

-- 1.2 CHECK 约束：上链状态与链上字段一致性
--     is_on_chain=0 时三个链上字段必须为 NULL
--     is_on_chain=1 时三个链上字段必须非空
ALTER TABLE `nft_collectibles`
  ADD CONSTRAINT `chk_collectibles_on_chain` CHECK (
    (`is_on_chain` = 0
       AND `chain_type` IS NULL
       AND `token_standard` IS NULL
       AND `contract_address` IS NULL)
    OR
    (`is_on_chain` = 1
       AND `chain_type` IS NOT NULL
       AND `token_standard` IS NOT NULL
       AND `contract_address` IS NOT NULL)
  );

-- 1.3 新增索引：按上链状态筛选（运营后台"补录上链"批量查询用）
ALTER TABLE `nft_collectibles`
  ADD INDEX `idx_is_on_chain` (`is_on_chain`);


-- ============================================================
-- 二、nft_user_collectibles 用户藏品表修改
-- （对应需求中的 nft_user_hold 表）
-- ============================================================

-- 2.1 字段修改
--   - serial → serial_no（重命名，语义更明确）
--   - mint_status 改为 NULLABLE（不上链藏品为 NULL）
--   - 新增 version 乐观锁（归属变更防并发）
ALTER TABLE `nft_user_collectibles`
  CHANGE COLUMN `serial` `serial_no` VARCHAR(20) NOT NULL COMMENT '藏品编号（格式：#+序号，如#1 #10000；序号范围1~edition，终身不变，转赠/寄售时跟随记录流转，不重新生成）',
  MODIFY COLUMN `mint_status` TINYINT(1) NULL DEFAULT NULL COMMENT '上链状态：1待上链 2上链中 3已上链 4失败（不上链藏品为NULL）',
  ADD COLUMN `version` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（归属变更防并发）' AFTER `mint_status`;

-- 2.2 更新唯一约束：serial → serial_no
--     保障不上链藏品的编号唯一性：UNIQUE(collectible_id, serial_no)
ALTER TABLE `nft_user_collectibles`
  DROP INDEX `uk_collectible_serial`,
  ADD UNIQUE KEY `uk_collectible_serial_no` (`collectible_id`, `serial_no`);

-- 2.3 说明：tx_hash / block_number / token_id 已为 NULL DEFAULT NULL
--     原定义已符合不上链要求，无需修改：
--       tx_hash       VARCHAR(100)    NULL DEFAULT NULL  — 上链交易哈希（不上链为NULL）
--       block_number  BIGINT UNSIGNED NULL DEFAULT NULL  — 区块号（不上链为NULL）
--       token_id      VARCHAR(100)    NULL DEFAULT NULL  — 链上Token ID（不上链为NULL）


-- ============================================================
-- 三、新增 nft_operation_logs 操作审计表
--     不上链时用于防篡改追溯
--     所有 nft_user_collectibles 归属变更（user_id 修改、status 变更）必须写入此表
-- ============================================================
CREATE TABLE `nft_operation_logs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `admin_id`     BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作管理员ID（系统自动操作时为NULL）',
  `target_table` VARCHAR(50)     NOT NULL COMMENT '目标表名（如 nft_user_collectibles）',
  `target_id`    BIGINT UNSIGNED NOT NULL COMMENT '目标记录ID',
  `action`       VARCHAR(50)     NOT NULL COMMENT '操作类型：INSERT/UPDATE/DELETE',
  `old_value`    JSON            NULL DEFAULT NULL COMMENT '变更前数据快照（JSON）',
  `new_value`    JSON            NULL DEFAULT NULL COMMENT '变更后数据快照（JSON）',
  `ip`           VARCHAR(50)     NULL DEFAULT NULL COMMENT '操作IP',
  `is_delete`    TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间',
  PRIMARY KEY (`id`),
  INDEX `idx_target` (`target_table`, `target_id`),
  INDEX `idx_admin` (`admin_id`),
  INDEX `idx_created` (`created_at`),
  CONSTRAINT `fk_ol_admin` FOREIGN KEY (`admin_id`) REFERENCES `nft_admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志（不上链时用于防篡改追溯）';


-- ============================================================
-- 四、系统配置项新增
-- ============================================================
INSERT INTO `nft_system_configs` (`config_key`, `config_value`, `config_desc`)
VALUES ('default_is_on_chain', '0', '新创建藏品默认是否上链（0=不上链 1=上链），单藏品级别可覆盖此默认值')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);


-- ============================================================
-- 五、业务规则说明（供后端/前端开发参考）
-- ============================================================
--
-- 【藏品编号规则】
--   1. 运营创建藏品时配置 serial_prefix（默认 '#'）和 is_on_chain
--   2. 用户购买/获得藏品时，在事务内执行（乐观锁防并发）：
--        UPDATE nft_collectibles
--          SET serial_current = serial_current + 1,
--              version        = version + 1
--          WHERE id = ? AND version = ? AND serial_current < edition;
--      若 affected_rows = 0 说明并发冲突或已售罄，回滚重试。
--   3. 生成编号格式：
--        CONCAT(serial_prefix, serial_current) → 如 #1 #9999 #10000
--      序号范围：1 ~ edition（发行总量），最大值 = edition
--   4. 编号写入 nft_user_collectibles.serial_no，终身不变。
--      转赠、寄售时编号跟随记录流转，不重新生成。
--   5. 数据库唯一约束 UNIQUE(collectible_id, serial_no) 兜底保障。
--
-- 【链上标识脱敏规则】
--   适用字段：contract_address / token_id / tx_hash
--   原始格式：0x 开头的42位十六进制值（如 0x1234...abcd）
--   展示格式：取前8位 + * + 后6位，中间部分用 * 代替
--   示例：    0xab12cd34...5678ef → 0xab12cd****5678ef
--   注意：    数据库存储完整值，仅前端展示时脱敏；
--             不上链藏品这三个字段为 NULL，前端不展示。
--
-- 【发售流程】
--   - 运营创建藏品时选择 is_on_chain（0 或 1），可覆盖 system_config.default_is_on_chain
--   - 前端藏品列表、详情页不得以 tx_hash IS NOT NULL 或 mint_status 作为展示条件
--   - 用户下单统一检查：circulate - locked_quantity > 0（与是否上链无关）
--
-- 【购买流程】
--   支付成功后生成 nft_user_collectibles 记录：
--   - 上链藏品：  mint_status = 1（待上链），tx_hash = NULL，token_id = NULL
--                 → 触发异步上链队列
--   - 不上链藏品：mint_status = NULL，tx_hash = NULL，token_id = NULL，block_number = NULL
--                 → 直接结束，无链上操作
--   - 用户仓库必须立即展示藏品，上链异步任务不得阻塞购买成功后的页面跳转
--
-- 【转赠流程】
--   - 上链藏品：  转赠确认后触发链上 transferFrom 交易，更新 tx_hash
--   - 不上链藏品：仅更新 nft_user_collectibles.user_id 和 source = 'transfer'
--                 serial_no 不变，无需任何链上操作
--   - 两种模式均须写入 nft_operation_logs 审计记录
--
-- 【寄售流程】
--   - 上链与不上链藏品挂售、成交逻辑完全一致
--   - 仅数据库事务内变更 nft_user_collectibles 归属和 status
--   - 成交时同步写入 nft_operation_logs
--
-- 【补录上链】
--   - 对历史不上链藏品（is_on_chain=0），后台可发起批量上链任务
--   - 上链完成后回填：tx_hash、token_id、block_number、mint_status = 3（已上链）
--   - 补录操作须写入 nft_operation_logs
--
-- 【安全与审计】
--   - 所有 nft_user_collectibles 的归属变更（user_id 修改、status 变更）
--     必须同步写入 nft_operation_logs（old_value + new_value JSON 快照）
--   - 不上链藏品完全依赖：
--       ① UNIQUE(collectible_id, serial_no) 唯一约束
--       ② version 乐观锁
--     保障唯一性和防并发
--   - 前端展示统一使用 serial_no，不得展示或依赖 tx_hash、token_id 等链上字段
-- ============================================================
