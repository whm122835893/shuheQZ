-- ============================================================
-- 数和文创数字藏品平台 · MySQL 建表脚本 v4.0
-- 生成日期: 2026-08-06
-- 引擎: InnoDB | 字符集: utf8mb4 | 排序规则: utf8mb4_unicode_ci
-- 共 42 张表（v4.0 新增优先购功能：nft_priority_sales + nft_priority_sale_whitelists）
-- 额外表: nft_wallet_transactions + nft_feedback（API文档补充）
-- 数据库: shuhe_wenchuang | 含基础种子数据
--
-- v4.0 变更摘要:
--   1. 新增 nft_priority_sales 优先购活动表（多批次优先购时段配置）
--   2. 新增 nft_priority_sale_whitelists 优先购白名单表（资格+限购控制）
--   3. nft_orders 新增 priority_sale_id 字段标记优先购订单
--   4. 优先购库存与普通发售共用 nft_collectibles.circulate / locked_quantity
--
-- v3.0 变更摘要:
--   1. nft_collectibles 新增 is_on_chain / serial_prefix / serial_current
--   2. nft_collectibles 链上字段改为 TINYINT(1) NULL（chain_type / token_standard / contract_address）
--   3. nft_collectibles 新增 CHECK 约束保障上链状态与链上字段一致性
--   4. nft_user_collectibles serial → serial_no，mint_status 改为 NULLABLE，新增 version 乐观锁
--   5. 新增 nft_operation_logs 操作审计表（不上链时防篡改追溯）
--   6. system_config 新增 default_is_on_chain 配置项
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `shuhe_wenchuang`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `shuhe_wenchuang`;


-- ============================================================
-- 1. nft_users 用户表
-- ============================================================
CREATE TABLE `nft_users` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `phone`                VARCHAR(11)     NOT NULL COMMENT '手机号',
  `username`             VARCHAR(50)     NOT NULL COMMENT '用户名/昵称',
  `avatar`               VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '头像URL',
  `uid`                  VARCHAR(10)     NOT NULL COMMENT '用户UID（5位数字）',
  `login_password`       VARCHAR(255)    NOT NULL COMMENT '登录密码（后端加密存储，禁止明文入库，bcrypt/scrypt 哈希）',
  `transaction_password` VARCHAR(255)    NULL DEFAULT NULL COMMENT '交易密码（后端加密存储，禁止明文入库，bcrypt/scrypt 哈希）',
  `is_realname`          TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否实名（0=未实名 1=已实名）',
  `real_name`            VARCHAR(255)    NULL DEFAULT NULL COMMENT '真实姓名（加密存储）',
  `id_card`              VARCHAR(255)    NULL DEFAULT NULL COMMENT '身份证号（加密存储）',
  `inviter_uid`          VARCHAR(10)     NULL DEFAULT NULL COMMENT '邀请人UID',
  `status`               TINYINT         NOT NULL DEFAULT 1 COMMENT '账号状态（1=正常 0=禁用）',
  `last_login_at`        DATETIME(3)     NULL DEFAULT NULL COMMENT '最后登录时间',
  `login_count`          INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '登录次数',
  `is_delete`            TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`           DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_uid` (`uid`),
  INDEX `idx_inviter_uid` (`inviter_uid`),
  INDEX `idx_status_delete` (`status`, `is_delete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';


-- ============================================================
-- 2. nft_categories 藏品分类表
-- ============================================================
CREATE TABLE `nft_categories` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(20)     NOT NULL COMMENT '分类名称',
  `code`        VARCHAR(20)     NOT NULL COMMENT '分类编码',
  `sort_order`  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '排序值（越小越靠前）',
  `icon`        VARCHAR(50)     NULL DEFAULT NULL COMMENT '分类图标',
  `is_delete`   TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`  DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='藏品分类表';


-- ============================================================
-- 3. nft_collectibles 藏品主表
--    v3.0: 新增 is_on_chain / serial_prefix / serial_current
--          链上字段改为 TINYINT(1) NULL，新增 CHECK 约束
-- ============================================================
CREATE TABLE `nft_collectibles` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category_id`      BIGINT UNSIGNED NOT NULL COMMENT '分类ID',
  `name`             VARCHAR(100)    NOT NULL COMMENT '藏品名称',
  `subtitle`         VARCHAR(100)    NULL DEFAULT NULL COMMENT '副标题',
  `image`            VARCHAR(255)    NOT NULL COMMENT '主图URL',
  `gradient`         VARCHAR(100)    NULL DEFAULT NULL COMMENT '渐变背景色',
  `icon`             VARCHAR(50)     NULL DEFAULT NULL COMMENT '图标',
  `price`            DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT '发售价格',
  `edition`          INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '发行总量',
  `circulate`        INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '可售数量',
  `sold`             INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已售数量',
  `locked_quantity`  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '待支付锁定数量',
  `vol`              INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '成交量',
  `status`           TINYINT         NOT NULL DEFAULT 1 COMMENT '发售状态（1=即将发售 2=发售中 3=已售罄）',
  `issuer`           VARCHAR(50)     NOT NULL DEFAULT '数和文创' COMMENT '发行方',
  `creator`          VARCHAR(50)     NOT NULL DEFAULT '数和文创' COMMENT '创作者',
  `brand`            VARCHAR(50)     NOT NULL DEFAULT '数和文创' COMMENT '品牌方',
  `album`            VARCHAR(50)     NULL DEFAULT NULL COMMENT '所属系列',
  `contract_address` VARCHAR(100)    NULL DEFAULT NULL COMMENT '合约地址（不上链为NULL；0x开头42位十六进制值，前端展示取前8后6中间用*代替）',
  `chain_type`       TINYINT(1)      NULL DEFAULT NULL COMMENT '链类型：1以太坊 2Polygon 3联盟链（不上链为NULL）',
  `token_standard`   TINYINT(1)      NULL DEFAULT NULL COMMENT '标准：1ERC-721 2ERC-1155（不上链为NULL）',
  `cert_id`          VARCHAR(50)     NULL DEFAULT NULL COMMENT '数字藏品凭证编号（不上链为NULL）',
  `cert_serial`      VARCHAR(50)     NULL DEFAULT NULL COMMENT '藏品凭证序号（产品级编号，区别于用户实例编号serial_no）',
  `release_date`     DATETIME(3)     NULL DEFAULT NULL COMMENT '发行日期',
  `onsale_at`        DATETIME(3)     NULL DEFAULT NULL COMMENT '上架时间',
  `off_sale_at`      DATETIME(3)     NULL DEFAULT NULL COMMENT '下架时间',
  `tag`              VARCHAR(50)     NULL DEFAULT NULL COMMENT '标签',
  `is_release`       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否发布（0=未发布 1=已发布）',
  `featured`         TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否推荐（0=否 1=是）',
  `is_transferable`  TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '是否可转赠（0=不可 1=可）',
  `is_on_chain`      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否上链：0不上链 1上链',
  `serial_prefix`    VARCHAR(20)     NOT NULL DEFAULT '#' COMMENT '藏品编号前缀（默认#，编号格式：#+序号，如#1 #10000；序号范围1~edition）',
  `serial_current`   INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '当前已分配编号计数器（事务内自增，范围1~edition，配合 serial_prefix 生成唯一编号）',
  `market_tag`       VARCHAR(50)     NULL DEFAULT NULL COMMENT '市场标签',
  `description`      TEXT            NULL COMMENT '藏品描述',
  `version`          INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（抢购/锁定藏品防并发冲突）',
  `is_delete`        TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`       DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status_release` (`status`, `is_release`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_is_delete` (`is_delete`),
  INDEX `idx_is_on_chain` (`is_on_chain`),
  CONSTRAINT `chk_collectibles_on_chain` CHECK (
    (`is_on_chain` = 0 AND `chain_type` IS NULL AND `token_standard` IS NULL AND `contract_address` IS NULL)
    OR
    (`is_on_chain` = 1 AND `chain_type` IS NOT NULL AND `token_standard` IS NOT NULL AND `contract_address` IS NOT NULL)
  ),
  CONSTRAINT `fk_collectibles_category` FOREIGN KEY (`category_id`) REFERENCES `nft_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='藏品主表';


-- ============================================================
-- 4. nft_user_collectibles 用户藏品表
--    v3.0: serial → serial_no，mint_status 改为 NULLABLE，新增 version 乐观锁
-- ============================================================
CREATE TABLE `nft_user_collectibles` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT '持有用户ID',
  `collectible_id`    BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `order_id`          BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '购买订单ID',
  `blind_box_item_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '盲盒奖品项ID',
  `airdrop_record_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '空投记录ID',
  `serial_no`         VARCHAR(20)     NOT NULL COMMENT '藏品编号（格式：#+序号，如#1 #10000；序号范围1~edition，终身不变，转赠/寄售时跟随记录流转，不重新生成）',
  `source`            ENUM('purchase','blindbox','transfer','airdrop','synthesis','lucky_draw') NOT NULL COMMENT '获取来源（购买/盲盒/转赠/空投/合成/抽奖）',
  `acquired_price`    DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT '获取价格',
  `acquired_at`       DATETIME(3)     NOT NULL COMMENT '获取时间',
  `is_consigned`      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否寄售（0=否 1=是）',
  `status`            TINYINT         NOT NULL DEFAULT 1 COMMENT '生命周期状态（1=持有 2=寄售中 3=冻结 4=已转出 5=已消耗）',
  `tx_hash`           VARCHAR(100)    NULL DEFAULT NULL COMMENT '上链交易哈希（不上链为NULL；前端展示需脱敏：取前8后6，中间用*代替）',
  `block_number`      BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '区块号（不上链为NULL）',
  `token_id`          VARCHAR(100)    NULL DEFAULT NULL COMMENT '链上Token ID（不上链为NULL；0x开头42位十六进制值，前端展示取前8后6中间用*代替）',
  `mint_status`       TINYINT(1)      NULL DEFAULT NULL COMMENT '上链状态：1待上链 2上链中 3已上链 4失败（不上链藏品为NULL）',
  `version`           INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（归属变更防并发）',
  `is_delete`         TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_collectible_serial_no` (`collectible_id`, `serial_no`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_user_collectible` (`user_id`, `collectible_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_blind_box_item_id` (`blind_box_item_id`),
  INDEX `idx_airdrop_record_id` (`airdrop_record_id`),
  CONSTRAINT `fk_user_collectibles_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_collectibles_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户藏品表';
-- FK user_collectibles.order_id -> nft_orders(id) 在文件末尾统一添加（循环依赖）
-- FK user_collectibles.blind_box_item_id -> nft_blind_box_items(id) 在文件末尾统一添加（循环依赖）
-- FK user_collectibles.airdrop_record_id -> nft_airdrop_records(id) 在文件末尾统一添加（循环依赖）


-- ============================================================
-- 5. nft_blind_boxes 盲盒表
-- ============================================================
CREATE TABLE `nft_blind_boxes` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '关联藏品ID（盲盒本身作为藏品）',
  `is_delete`      TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_collectible_id` (`collectible_id`),
  CONSTRAINT `fk_blind_boxes_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盲盒表';


-- ============================================================
-- 6. nft_blind_box_items 盲盒奖品池配置表
-- ============================================================
CREATE TABLE `nft_blind_box_items` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `blind_box_id`         BIGINT UNSIGNED NOT NULL COMMENT '盲盒ID',
  `collectible_id`       BIGINT UNSIGNED NOT NULL COMMENT '奖品藏品ID',
  `probability`          DECIMAL(5,4)    NOT NULL COMMENT '中奖概率（0.0000-1.0000）',
  `quantity_limit`       INT UNSIGNED    NULL DEFAULT NULL COMMENT '数量限制（NULL=不限）',
  `quantity_distributed` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已发放数量',
  `is_delete`            TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`           DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_blind_box_id` (`blind_box_id`),
  INDEX `idx_collectible_id` (`collectible_id`),
  CONSTRAINT `fk_blind_box_items_blind_box` FOREIGN KEY (`blind_box_id`) REFERENCES `nft_blind_boxes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_blind_box_items_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盲盒奖品池配置表';


-- ============================================================
-- 7. nft_orders 订单表
-- ============================================================
CREATE TABLE `nft_orders` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_no`          VARCHAR(20)     NOT NULL COMMENT '订单号',
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT '下单用户ID',
  `collectible_id`    BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `resale_listing_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '寄售挂单ID（市场购买时关联）',
  `priority_sale_id`  BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '优先购活动ID（优先购订单非空，普通订单为NULL）',
  `unit_price`        DECIMAL(10,2)   NOT NULL COMMENT '单价',
  `quantity`          INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '购买数量',
  `total_price`       DECIMAL(10,2)   NOT NULL COMMENT '订单总价',
  `status`            TINYINT         NOT NULL DEFAULT 1 COMMENT '订单状态（1=待支付 2=已完成 3=已取消）',
  `source`            ENUM('release','market') NOT NULL COMMENT '订单来源（发行发售/二级市场）',
  `paid_at`           DATETIME(3)     NULL DEFAULT NULL COMMENT '支付时间',
  `completed_at`      DATETIME(3)     NULL DEFAULT NULL COMMENT '完成时间',
  `cancelled_at`      DATETIME(3)     NULL DEFAULT NULL COMMENT '取消时间',
  `cancel_reason`     VARCHAR(100)    NULL DEFAULT NULL COMMENT '取消原因',
  `expires_at`        DATETIME(3)     NOT NULL COMMENT '订单过期时间',
  `version`           INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（防重复购买）',
  `is_delete`         TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_resale_listing` (`resale_listing_id`),
  INDEX `idx_priority_sale` (`priority_sale_id`),
  INDEX `idx_expires` (`expires_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';


-- ============================================================
-- 8. nft_payments 支付记录表
-- ============================================================
CREATE TABLE `nft_payments` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id`        BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
  `user_id`         BIGINT UNSIGNED NOT NULL COMMENT '支付用户ID',
  `amount`          DECIMAL(10,2)   NOT NULL COMMENT '支付金额',
  `payment_method`  ENUM('balance','alipay','wechat') NOT NULL COMMENT '支付方式（余额/支付宝/微信）',
  `transaction_no`  VARCHAR(64)     NULL DEFAULT NULL COMMENT '第三方交易流水号',
  `status`          TINYINT         NOT NULL DEFAULT 1 COMMENT '支付状态（1=待支付 2=成功 3=失败 4=已退款）',
  `paid_at`         DATETIME(3)     NULL DEFAULT NULL COMMENT '支付时间',
  `is_delete`       TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_id` (`order_id`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_transaction_no` (`transaction_no`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `nft_orders` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';


-- ============================================================
-- 9. nft_resale_listings 寄售挂单表
-- ============================================================
CREATE TABLE `nft_resale_listings` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `seller_id`           BIGINT UNSIGNED NOT NULL COMMENT '卖家用户ID',
  `collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '用户藏品ID',
  `price`               DECIMAL(10,2)   NOT NULL COMMENT '挂单价格',
  `status`              TINYINT         NOT NULL DEFAULT 1 COMMENT '挂单状态（1=寄售中 2=已售出 3=已取消）',
  `listed_at`           DATETIME(3)     NOT NULL COMMENT '挂单时间',
  `version`             INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（抢购防并发）',
  `is_delete`           TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_collectible_status` (`collectible_id`, `status`),
  INDEX `idx_seller_status` (`seller_id`, `status`),
  INDEX `idx_user_collectible` (`user_collectible_id`),
  CONSTRAINT `fk_resale_listings_seller` FOREIGN KEY (`seller_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_resale_listings_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_resale_listings_user_collectible` FOREIGN KEY (`user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='寄售挂单表';


-- ============================================================
-- 10. nft_transfers 转赠记录表
-- ============================================================
CREATE TABLE `nft_transfers` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `from_user_id`        BIGINT UNSIGNED NOT NULL COMMENT '转出用户ID',
  `to_user_id`          BIGINT UNSIGNED NOT NULL COMMENT '接收用户ID',
  `to_phone`            VARCHAR(11)     NOT NULL COMMENT '接收方手机号',
  `to_nickname`         VARCHAR(50)     NULL DEFAULT NULL COMMENT '接收方昵称',
  `collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '用户藏品ID',
  `status`              TINYINT         NOT NULL DEFAULT 1 COMMENT '转赠状态（1=待确认 2=已接受 3=已拒绝 4=已取消）',
  `confirmed_at`        DATETIME(3)     NULL DEFAULT NULL COMMENT '确认时间',
  `is_delete`           TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_from_user` (`from_user_id`),
  INDEX `idx_to_user` (`to_user_id`),
  INDEX `idx_status_created` (`status`, `created_at`),
  CONSTRAINT `fk_transfers_from_user` FOREIGN KEY (`from_user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_to_user` FOREIGN KEY (`to_user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_user_collectible` FOREIGN KEY (`user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='转赠记录表';


-- ============================================================
-- 11. nft_synthesis_activities 合成活动表
-- ============================================================
CREATE TABLE `nft_synthesis_activities` (
  `id`                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`                  VARCHAR(100)    NOT NULL COMMENT '活动名称',
  `result_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '合成结果藏品ID',
  `type`                  ENUM('limit','permanent') NOT NULL COMMENT '活动类型（限时/常驻）',
  `total_limit`           INT UNSIGNED    NULL DEFAULT NULL COMMENT '合成总次数限制（NULL=不限）',
  `used_count`            INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已合成次数',
  `per_user_limit`        INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '每用户合成次数限制',
  `start_time`            DATETIME(3)     NULL DEFAULT NULL COMMENT '活动开始时间',
  `end_time`              DATETIME(3)     NULL DEFAULT NULL COMMENT '活动结束时间',
  `status`                TINYINT         NOT NULL DEFAULT 1 COMMENT '活动状态（1=草稿 2=进行中 3=已结束）',
  `description`           TEXT            NULL COMMENT '活动描述',
  `is_delete`             TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`            DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_result_collectible` (`result_collectible_id`),
  CONSTRAINT `fk_synthesis_activities_result_collectible` FOREIGN KEY (`result_collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合成活动表';


-- ============================================================
-- 12. nft_synthesis_materials 合成材料子表
-- ============================================================
CREATE TABLE `nft_synthesis_materials` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`       BIGINT UNSIGNED NOT NULL COMMENT '合成活动ID',
  `collectible_id`    BIGINT UNSIGNED NOT NULL COMMENT '材料藏品ID',
  `required_quantity` INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '所需数量',
  `is_delete`         TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_activity_id` (`activity_id`),
  INDEX `idx_collectible_id` (`collectible_id`),
  CONSTRAINT `fk_synthesis_materials_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_synthesis_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_materials_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合成材料子表';


-- ============================================================
-- 13. nft_synthesis_records 合成记录表（纯日志表，无 updated_at）
-- ============================================================
CREATE TABLE `nft_synthesis_records` (
  `id`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`                BIGINT UNSIGNED NOT NULL COMMENT '合成活动ID',
  `user_id`                    BIGINT UNSIGNED NOT NULL COMMENT '合成用户ID',
  `result_collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '合成结果藏品ID',
  `result_user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '合成结果用户藏品ID',
  `is_delete`                  TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`                 DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_activity` (`user_id`, `activity_id`),
  CONSTRAINT `fk_synthesis_records_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_synthesis_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_records_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_records_result_collectible` FOREIGN KEY (`result_collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_records_result_user_collectible` FOREIGN KEY (`result_user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合成记录表';


-- ============================================================
-- 14. nft_synthesis_record_items 合成消耗明细表（纯日志表，无 updated_at）
-- ============================================================
CREATE TABLE `nft_synthesis_record_items` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `synthesis_record_id` BIGINT UNSIGNED NOT NULL COMMENT '合成记录ID',
  `user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '被消耗的用户藏品ID',
  `collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '被消耗的藏品ID',
  `is_delete`           TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_synthesis_record` (`synthesis_record_id`),
  CONSTRAINT `fk_synthesis_record_items_synthesis_record` FOREIGN KEY (`synthesis_record_id`) REFERENCES `nft_synthesis_records` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_record_items_user_collectible` FOREIGN KEY (`user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_synthesis_record_items_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合成消耗明细表';


-- ============================================================
-- 15. nft_lucky_draw_prizes 抽奖奖品池表
-- ============================================================
CREATE TABLE `nft_lucky_draw_prizes` (
  `id`                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`          BIGINT UNSIGNED NOT NULL COMMENT '抽奖活动ID',
  `collectible_id`       BIGINT UNSIGNED NOT NULL COMMENT '奖品藏品ID',
  `name`                 VARCHAR(100)    NOT NULL COMMENT '奖品名称',
  `probability`          DECIMAL(5,4)    NOT NULL COMMENT '中奖概率（0.0000-1.0000）',
  `quantity_limit`       INT UNSIGNED    NULL DEFAULT NULL COMMENT '数量限制（NULL=不限）',
  `quantity_distributed` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已发放数量',
  `is_delete`            TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`           DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_activity_id` (`activity_id`),
  INDEX `idx_collectible_id` (`collectible_id`),
  CONSTRAINT `fk_lucky_draw_prizes_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖奖品池表';
-- FK lucky_draw_prizes.activity_id -> nft_lucky_draw_activities(id) 在文件末尾统一添加（循环依赖）


-- ============================================================
-- 16. nft_lucky_draw_records 抽奖记录表（纯日志表，无 updated_at）
-- ============================================================
CREATE TABLE `nft_lucky_draw_records` (
  `id`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `prize_id`                   BIGINT UNSIGNED NOT NULL COMMENT '奖品ID',
  `user_id`                    BIGINT UNSIGNED NOT NULL COMMENT '抽奖用户ID',
  `result_user_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '中奖所得用户藏品ID（未中奖时为空）',
  `is_delete`                  TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`                 DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_prize_id` (`prize_id`),
  CONSTRAINT `fk_lucky_draw_records_prize` FOREIGN KEY (`prize_id`) REFERENCES `nft_lucky_draw_prizes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lucky_draw_records_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lucky_draw_records_result_user_collectible` FOREIGN KEY (`result_user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖记录表';


-- ============================================================
-- 16.5 nft_lucky_draw_user_chances 抽奖用户次数表（API文档补充）
--     记录用户在各抽奖活动中的可用次数（按来源分组）
--     来源：hold_collectible / invite_friend / register / check_in / system
-- ============================================================
CREATE TABLE `nft_lucky_draw_user_chances` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id` BIGINT UNSIGNED NOT NULL COMMENT '抽奖活动ID',
  `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `source`      ENUM('hold_collectible','invite_friend','register','check_in','system') NOT NULL COMMENT '次数来源',
  `chances`     INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已发放次数',
  `used_chances` INT UNSIGNED   NOT NULL DEFAULT 0 COMMENT '已使用次数',
  `expires_at`  DATETIME(3)     NULL DEFAULT NULL COMMENT '过期时间（NULL=不过期）',
  `is_delete`   TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_user_source` (`activity_id`, `user_id`, `source`),
  INDEX `idx_activity_user` (`activity_id`, `user_id`),
  INDEX `idx_user` (`user_id`),
  CONSTRAINT `fk_lduc_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_lucky_draw_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lduc_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖用户次数表';


-- ============================================================
-- 17. nft_check_in_records 签到记录表（纯日志表，无 updated_at）
-- ============================================================
CREATE TABLE `nft_check_in_records` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`          BIGINT UNSIGNED NOT NULL COMMENT '签到用户ID',
  `check_in_date`    DATE            NOT NULL COMMENT '签到日期',
  `consecutive_days` INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '连续签到天数',
  `reward_type`      ENUM('none','collectible','points','draw_chance') NOT NULL DEFAULT 'none' COMMENT '奖励类型（无/藏品/积分/抽奖机会）',
  `is_delete`        TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`, `check_in_date`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_check_in_records_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='签到记录表';


-- ============================================================
-- 18. nft_artifacts 文物表
-- ============================================================
CREATE TABLE `nft_artifacts` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`        VARCHAR(100)    NOT NULL COMMENT '文物名称',
  `dynasty`     VARCHAR(50)     NULL DEFAULT NULL COMMENT '朝代',
  `category`    VARCHAR(50)     NULL DEFAULT NULL COMMENT '文物类别',
  `image`       VARCHAR(255)    NOT NULL COMMENT '文物图片URL',
  `description` TEXT            NULL COMMENT '文物描述',
  `tags`        JSON            NULL DEFAULT NULL COMMENT '标签数组',
  `is_delete`   TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`  DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文物表';


-- ============================================================
-- 19. nft_announcements 公告/新闻合并表
-- ============================================================
CREATE TABLE `nft_announcements` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `title`       VARCHAR(200)    NOT NULL COMMENT '标题',
  `summary`     VARCHAR(500)    NULL DEFAULT NULL COMMENT '摘要',
  `content`     TEXT            NULL COMMENT '正文内容',
  `cover_image` VARCHAR(255)    NULL DEFAULT NULL COMMENT '封面图URL',
  `type`        ENUM('notice','news') NOT NULL COMMENT '类型（公告/新闻）',
  `subtype`     VARCHAR(20)     NULL DEFAULT NULL COMMENT '子类型',
  `tag_color`   VARCHAR(20)     NULL DEFAULT NULL COMMENT '标签颜色',
  `is_top`      TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否置顶（0=否 1=是）',
  `is_delete`   TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`  DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_type_created` (`type`, `created_at`),
  INDEX `idx_is_top` (`is_top`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='公告/新闻合并表';


-- ============================================================
-- 20. nft_banners 轮播图表
-- ============================================================
CREATE TABLE `nft_banners` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `title`      VARCHAR(100)    NOT NULL COMMENT '标题',
  `image`      VARCHAR(255)    NOT NULL COMMENT '图片URL',
  `link_type`  VARCHAR(30)     NULL DEFAULT NULL COMMENT '跳转类型',
  `link_url`   VARCHAR(255)    NULL DEFAULT NULL COMMENT '跳转链接',
  `sort_order` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '排序值（越小越靠前）',
  `status`     TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=显示 0=隐藏）',
  `is_delete`  TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at` DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status_sort` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轮播图表';


-- ============================================================
-- 21. nft_user_favorites 用户关注表
-- ============================================================
CREATE TABLE `nft_user_favorites` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`        BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `is_delete`      TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`     DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_collectible` (`user_id`, `collectible_id`),
  CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_fav_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注表';

-- ============================================================
-- 22. nft_user_addresses 收货地址表
-- ============================================================
CREATE TABLE `nft_user_addresses` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`    BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `name`       VARCHAR(50) NOT NULL COMMENT '收货人姓名',
  `phone`      VARCHAR(11) NOT NULL COMMENT '收货人手机号',
  `province`   VARCHAR(50) NOT NULL COMMENT '省份',
  `city`       VARCHAR(50) NOT NULL COMMENT '城市',
  `district`   VARCHAR(50) NOT NULL COMMENT '区/县',
  `detail`     VARCHAR(255) NOT NULL COMMENT '详细地址',
  `is_default` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否默认地址（0=否 1=是）',
  `is_delete`  TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  CONSTRAINT `fk_addr_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收货地址表';

-- ============================================================
-- 23. nft_system_configs 系统参数表
-- ============================================================
CREATE TABLE `nft_system_configs` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_key`   VARCHAR(50) NOT NULL COMMENT '参数键名',
  `config_value` TEXT NOT NULL COMMENT '参数值',
  `config_desc`  VARCHAR(200) NULL DEFAULT NULL COMMENT '参数描述',
  `is_delete`    TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统参数表';

-- ============================================================
-- 24. nft_airdrop_activities 空投活动表
-- ============================================================
CREATE TABLE `nft_airdrop_activities` (
  `id`                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`                    VARCHAR(100) NOT NULL COMMENT '活动名称',
  `type`                    ENUM('direct','hold','checkin','register','login','invite') NOT NULL COMMENT '空投类型（direct=直发 hold=持有 checkin=签到 register=注册 login=登录 invite=邀请）',
  `status`                  TINYINT NOT NULL DEFAULT 1 COMMENT '活动状态（1=草稿 2=进行中 3=暂停 4=结束）',
  `airdrop_mode`            ENUM('realtime','batch') NOT NULL DEFAULT 'realtime' COMMENT '空投模式（realtime=实时 batch=批量）',
  `collectible_id`          BIGINT UNSIGNED NOT NULL COMMENT '空投藏品ID',
  `quantity_per_user`       INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '每用户发放数量',
  `total_limit`             INT UNSIGNED NULL DEFAULT NULL COMMENT '发放总量上限',
  `issued_count`            INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '已发放数量',
  `start_time`              DATETIME(3) NULL DEFAULT NULL COMMENT '活动开始时间',
  `end_time`                DATETIME(3) NULL DEFAULT NULL COMMENT '活动结束时间',
  `snapshot_at`             DATETIME(3) NULL DEFAULT NULL COMMENT '快照时间',
  `snapshot_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '快照藏品ID',
  `checkin_days`            INT UNSIGNED NULL DEFAULT NULL COMMENT '签到天数要求',
  `condition_config`        JSON NULL DEFAULT NULL COMMENT '条件配置（JSON）',
  `description`             TEXT NULL DEFAULT NULL COMMENT '活动描述',
  `is_delete`               TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`              DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`              DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_start_end` (`start_time`, `end_time`),
  INDEX `idx_collectible_id` (`collectible_id`),
  CONSTRAINT `fk_aa_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_aa_snapshot_collectible` FOREIGN KEY (`snapshot_collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='空投活动表';

-- ============================================================
-- 25. nft_airdrop_snapshots 持有藏品快照表
-- ============================================================
CREATE TABLE `nft_airdrop_snapshots` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`         BIGINT UNSIGNED NOT NULL COMMENT '空投活动ID',
  `user_id`             BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '用户藏品ID',
  `is_delete`           TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_user_collectible` (`activity_id`, `user_id`, `user_collectible_id`),
  INDEX `idx_activity` (`activity_id`),
  CONSTRAINT `fk_as_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_airdrop_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_as_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_as_user_collectible` FOREIGN KEY (`user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='持有藏品快照表';

-- ============================================================
-- 26. nft_airdrop_records 空投记录表
-- ============================================================
CREATE TABLE `nft_airdrop_records` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`         BIGINT UNSIGNED NOT NULL COMMENT '空投活动ID',
  `user_id`             BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '藏品ID',
  `user_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '用户藏品ID（发放后回填，循环依赖FK在末尾添加）',
  `phone`               VARCHAR(11) NOT NULL COMMENT '用户手机号',
  `quantity`            INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '发放数量',
  `status`              TINYINT NOT NULL DEFAULT 1 COMMENT '发放状态（1=待发放 2=已发放 3=失败）',
  `issued_at`           DATETIME(3) NULL DEFAULT NULL COMMENT '发放时间',
  `is_delete`           TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_activity` (`activity_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_user_collectible` (`user_collectible_id`),
  CONSTRAINT `fk_ar_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_airdrop_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ar_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ar_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='空投记录表';

-- ============================================================
-- 27. nft_airdrop_eligibilities 空投资格记录表
-- ============================================================
CREATE TABLE `nft_airdrop_eligibilities` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`       BIGINT UNSIGNED NOT NULL COMMENT '空投活动ID',
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `phone`             VARCHAR(11) NOT NULL COMMENT '用户手机号',
  `task_type`         ENUM('hold','checkin','register','login','invite') NOT NULL COMMENT '任务类型（hold=持有 checkin=签到 register=注册 login=登录 invite=邀请）',
  `task_completed_at` DATETIME(3) NOT NULL COMMENT '任务完成时间',
  `status`            TINYINT NOT NULL DEFAULT 1 COMMENT '资格状态（1=待发放 2=已发放）',
  `airdrop_record_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '关联空投记录ID',
  `is_delete`         TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_phone` (`activity_id`, `phone`),
  INDEX `idx_activity_status` (`activity_id`, `status`),
  INDEX `idx_user` (`user_id`),
  CONSTRAINT `fk_ae_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_airdrop_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ae_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ae_airdrop_record` FOREIGN KEY (`airdrop_record_id`) REFERENCES `nft_airdrop_records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='空投资格记录表';

-- ============================================================
-- 28. nft_invite_activities 邀请活动配置表
-- ============================================================
CREATE TABLE `nft_invite_activities` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`                   VARCHAR(100) NOT NULL COMMENT '活动名称',
  `status`                 TINYINT NOT NULL DEFAULT 0 COMMENT '活动开关（0=禁用 1=启用）',
  `start_time`             DATETIME(3) NULL DEFAULT NULL COMMENT '活动开始时间',
  `end_time`               DATETIME(3) NULL DEFAULT NULL COMMENT '活动结束时间',
  `inviter_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '邀请人奖励藏品ID',
  `invitee_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '被邀请人奖励藏品ID',
  `airdrop_mode`           ENUM('realtime','batch') NOT NULL DEFAULT 'realtime' COMMENT '空投模式（realtime=实时 batch=批量）',
  `is_delete`              TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`             DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_ia_inviter_collectible` FOREIGN KEY (`inviter_collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ia_invitee_collectible` FOREIGN KEY (`invitee_collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请活动配置表';

-- ============================================================
-- 29. nft_invite_records 邀请记录表
-- ============================================================
CREATE TABLE `nft_invite_records` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `inviter_user_id` BIGINT UNSIGNED NOT NULL COMMENT '邀请人用户ID',
  `invitee_user_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '被邀请人用户ID',
  `invitee_phone`   VARCHAR(11) NOT NULL COMMENT '被邀请人手机号',
  `invite_code`     VARCHAR(20) NULL DEFAULT NULL COMMENT '邀请码',
  `status`          TINYINT NOT NULL DEFAULT 1 COMMENT '邀请状态（1=待注册 2=已注册 3=已奖励）',
  `registered_at`   DATETIME(3) NULL DEFAULT NULL COMMENT '注册时间',
  `rewarded_at`     DATETIME(3) NULL DEFAULT NULL COMMENT '奖励发放时间',
  `is_delete`       TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_inviter` (`inviter_user_id`),
  INDEX `idx_invitee_phone` (`invitee_phone`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_ir_inviter` FOREIGN KEY (`inviter_user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ir_invitee` FOREIGN KEY (`invitee_user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请记录表';

-- ============================================================
-- 30. nft_site_settings 网站全局配置表
-- ============================================================
CREATE TABLE `nft_site_settings` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `setting_key`   VARCHAR(50) NOT NULL COMMENT '配置键名',
  `setting_value` TEXT NOT NULL COMMENT '配置值',
  `setting_group` ENUM('basic','theme','button','seo') NOT NULL DEFAULT 'basic' COMMENT '配置分组（basic=基础 theme=主题 button=按钮 seo=SEO）',
  `setting_desc`  VARCHAR(200) NULL DEFAULT NULL COMMENT '配置描述',
  `is_delete`     TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_setting_key` (`setting_key`),
  INDEX `idx_group` (`setting_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站全局配置表';

-- ============================================================
-- 31. nft_lucky_draw_activities 抽奖活动表
-- ============================================================
CREATE TABLE `nft_lucky_draw_activities` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`                VARCHAR(100) NOT NULL COMMENT '活动名称',
  `status`              TINYINT NOT NULL DEFAULT 1 COMMENT '活动状态（1=草稿 2=进行中 3=已结束）',
  `draw_limit_per_user` INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '每用户抽奖次数上限',
  `start_time`          DATETIME(3) NULL DEFAULT NULL COMMENT '活动开始时间',
  `end_time`            DATETIME(3) NULL DEFAULT NULL COMMENT '活动结束时间',
  `is_delete`           TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`          DATETIME(3) NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_start_end` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽奖活动表';

-- ============================================================
-- 32. nft_audit_logs 审计日志表
--    （纯日志表：无 updated_at —— is_delete 统一保留以符合全局规范）
-- ============================================================
CREATE TABLE `nft_audit_logs` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `operator_id`   BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作人ID（管理员）',
  `operator_type` VARCHAR(20) NOT NULL DEFAULT 'admin' COMMENT '操作人类型（admin=管理员 system=系统自动）',
  `user_id`       BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '关联用户ID',
  `action`        VARCHAR(50) NOT NULL COMMENT '操作类型',
  `target_type`   VARCHAR(30) NOT NULL COMMENT '操作对象类型',
  `target_id`     BIGINT UNSIGNED NOT NULL COMMENT '操作对象ID',
  `detail`        JSON NULL DEFAULT NULL COMMENT '变更详情（前后值对比）',
  `ip`            VARCHAR(45) NULL DEFAULT NULL COMMENT '操作IP',
  `user_agent`    VARCHAR(255) NULL DEFAULT NULL COMMENT '用户代理',
  `is_delete`     TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '操作时间',
  PRIMARY KEY (`id`),
  INDEX `idx_operator_created` (`operator_id`, `created_at`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_action_created` (`action`, `created_at`),
  INDEX `idx_target` (`target_type`, `target_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- ============================================================
-- 33. nft_user_wallets 用户钱包表
-- ============================================================
CREATE TABLE `nft_user_wallets` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`         BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `balance`         DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '可用余额',
  `frozen_balance`  DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '冻结余额',
  `total_recharged` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '累计充值金额',
  `total_consumed`  DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '累计消费金额',
  `version`         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（余额并发扣减防超扣）',
  `is_delete`       TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  CONSTRAINT `fk_uw_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包表';

-- ============================================================
-- 34. nft_blind_box_open_records 盲盒开启记录表
--    （纯日志表：无 updated_at）
-- ============================================================
CREATE TABLE `nft_blind_box_open_records` (
  `id`                           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`                      BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `blind_box_id`                 BIGINT UNSIGNED NOT NULL COMMENT '盲盒ID',
  `consumed_user_collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '消耗的用户藏品ID',
  `blind_box_item_id`            BIGINT UNSIGNED NOT NULL COMMENT '盲盒奖品项ID',
  `prize_user_collectible_id`    BIGINT UNSIGNED NOT NULL COMMENT '获得的奖品用户藏品ID',
  `is_delete`                    TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`                   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_blind_box` (`blind_box_id`),
  UNIQUE KEY `uk_consumed` (`consumed_user_collectible_id`),
  CONSTRAINT `fk_bbor_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bbor_blind_box` FOREIGN KEY (`blind_box_id`) REFERENCES `nft_blind_boxes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bbor_consumed_uc` FOREIGN KEY (`consumed_user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bbor_blind_box_item` FOREIGN KEY (`blind_box_item_id`) REFERENCES `nft_blind_box_items` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bbor_prize_uc` FOREIGN KEY (`prize_user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='盲盒开启记录表';

-- ============================================================
-- 35. nft_sms_logs 短信记录表
--    （纯日志表：无 updated_at）
-- ============================================================
CREATE TABLE `nft_sms_logs` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `phone`           VARCHAR(11) NOT NULL COMMENT '接收手机号',
  `code`            VARCHAR(10) NOT NULL COMMENT '验证码',
  `scene`           TINYINT NOT NULL COMMENT '发送场景（1=注册 2=登录 3=修改密码 4=设置支付密码 5=找回密码）',
  `status`          TINYINT NOT NULL DEFAULT 1 COMMENT '发送状态（1=待发送 2=已发送 3=发送失败 4=已使用 5=已过期）',
  `provider`        VARCHAR(30) NULL DEFAULT NULL COMMENT '短信服务商',
  `provider_msg_id` VARCHAR(64) NULL DEFAULT NULL COMMENT '服务商消息ID',
  `ip`              VARCHAR(45) NULL DEFAULT NULL COMMENT '请求IP',
  `expires_at`      DATETIME(3) NOT NULL COMMENT '过期时间',
  `sent_at`         DATETIME(3) NULL DEFAULT NULL COMMENT '发送时间',
  `used_at`         DATETIME(3) NULL DEFAULT NULL COMMENT '使用时间',
  `is_delete`       TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_phone_created` (`phone`, `created_at`),
  INDEX `idx_phone_scene_status` (`phone`, `scene`, `status`),
  INDEX `idx_ip_created` (`ip`, `created_at`),
  INDEX `idx_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信记录表';

-- ============================================================
-- 36. nft_agreements 合规文档表
-- ============================================================
CREATE TABLE `nft_agreements` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `title`        VARCHAR(100) NOT NULL COMMENT '文档标题',
  `code`         VARCHAR(50) NOT NULL COMMENT '文档代码（user_agreement/privacy_policy/disclaimer）',
  `content`      LONGTEXT NOT NULL COMMENT '文档内容（富文本/HTML）',
  `version`      VARCHAR(20) NOT NULL COMMENT '版本号',
  `status`       TINYINT NOT NULL DEFAULT 1 COMMENT '状态（1=生效中 0=已停用）',
  `effective_at` DATETIME(3) NOT NULL COMMENT '生效时间',
  `is_delete`    TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_code_status` (`code`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合规文档表';

-- ============================================================
-- 37. nft_admin_users 管理员账号表
-- ============================================================
CREATE TABLE `nft_admin_users` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username`      VARCHAR(50) NOT NULL COMMENT '登录账号',
  `password`      VARCHAR(255) NOT NULL COMMENT '登录密码（后端加密存储，禁止明文入库，bcrypt/scrypt 哈希）',
  `real_name`     VARCHAR(50) NOT NULL COMMENT '管理员真实姓名',
  `role`          TINYINT NOT NULL DEFAULT 2 COMMENT '角色（1=超级管理员 2=运营管理员 3=财务管理员 4=客服）',
  `status`        TINYINT NOT NULL DEFAULT 1 COMMENT '账号状态（1=正常 0=禁用）',
  `last_login_at` DATETIME(3) NULL DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP',
  `login_count`   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '登录次数',
  `is_delete`     TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  INDEX `idx_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员账号表';

-- ============================================================
-- 38. nft_operation_logs 操作审计表 [v3.0 新增]
--     不上链时用于防篡改追溯
--     所有 nft_user_collectibles 归属变更必须写入此表
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
-- 39. nft_priority_sales 优先购活动表 [v4.0 新增]
--     支持多批次优先购：同一藏品可配置多个优先购时段
--     库存与普通发售共用 nft_collectibles.circulate / locked_quantity
-- ============================================================
CREATE TABLE `nft_priority_sales` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '优先购活动ID',
  `collectible_id` BIGINT UNSIGNED NOT NULL COMMENT '关联藏品ID（nft_collectibles.id）',
  `name`           VARCHAR(100)    NOT NULL COMMENT '活动名称（如"创世会员优先购"）',
  `start_time`     DATETIME(3)     NOT NULL COMMENT '优先购开始时间（如14:30）',
  `end_time`       DATETIME(3)     NOT NULL COMMENT '优先购结束时间（通常等于公售开始时间15:00）',
  `status`         TINYINT         NOT NULL DEFAULT 1 COMMENT '活动状态（1=待开始 2=进行中 3=已结束 4=已取消）',
  `is_delete`      TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`     DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_collectible` (`collectible_id`),
  INDEX `idx_status_time` (`status`, `start_time`, `end_time`),
  CONSTRAINT `fk_ps_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优先购活动配置表';


-- ============================================================
-- 40. nft_priority_sale_whitelists 优先购白名单表 [v4.0 新增]
--     控制优先购资格与限购数量
--     支付成功后 used_quantity += quantity，达上限自动 status=2
-- ============================================================
CREATE TABLE `nft_priority_sale_whitelists` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '白名单ID',
  `priority_sale_id` BIGINT UNSIGNED NOT NULL COMMENT '关联优先购活动ID',
  `user_id`          BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `max_quantity`     INT UNSIGNED    NOT NULL DEFAULT 1 COMMENT '该用户本次优先购可购买数量上限',
  `used_quantity`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已购买数量',
  `status`           TINYINT         NOT NULL DEFAULT 1 COMMENT '资格状态（1=有效 2=已用完 3=已取消资格）',
  `version`          INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '乐观锁版本号（并发扣减防超购）',
  `is_delete`        TINYINT         NOT NULL DEFAULT 0 COMMENT '是否删除（0=正常 1=软删除）',
  `deleted_at`       DATETIME(3)     NULL DEFAULT NULL COMMENT '删除时间（审计用）',
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_priority_user` (`priority_sale_id`, `user_id`),
  INDEX `idx_user` (`user_id`),
  CONSTRAINT `fk_psw_priority_sale` FOREIGN KEY (`priority_sale_id`) REFERENCES `nft_priority_sales` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_psw_user` FOREIGN KEY (`user_id`) REFERENCES `nft_users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优先购白名单表';



-- ============================================================
-- 41. nft_wallet_transactions 钱包流水表（API文档补充）
--     记录用户钱包所有资金变动（充值/消费/冻结/解冻）
-- ============================================================
CREATE TABLE `nft_wallet_transactions` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`           BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `type`              ENUM('recharge','consume','freeze','unfreeze') NOT NULL COMMENT '流水类型',
  `amount`            DECIMAL(10,2) NOT NULL COMMENT '变动金额',
  `balance_after`     DECIMAL(10,2) NOT NULL COMMENT '变动后余额',
  `direction`         ENUM('in','out') NOT NULL COMMENT '资金方向(in=收入,out=支出)',
  `related_order_no`  VARCHAR(20) NULL DEFAULT NULL COMMENT '关联订单号',
  `remark`            VARCHAR(200) NULL DEFAULT NULL COMMENT '备注',
  `created_at`        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_user_type` (`user_id`, `type`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='钱包流水表';


-- ============================================================
-- 42. nft_feedback 用户意见反馈表（API文档补充）
--     用户提交bug/建议/投诉等反馈
-- ============================================================
CREATE TABLE `nft_feedback` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id`     BIGINT UNSIGNED NOT NULL COMMENT '提交用户ID',
  `type`        ENUM('bug','suggestion','complaint','other') NOT NULL COMMENT '反馈类型',
  `content`     TEXT NOT NULL COMMENT '反馈内容',
  `images`      JSON NULL DEFAULT NULL COMMENT '截图URL数组',
  `contact`     VARCHAR(100) NULL DEFAULT NULL COMMENT '联系方式',
  `ticket_id`   VARCHAR(30) NOT NULL COMMENT '工单号',
  `status`      TINYINT NOT NULL DEFAULT 1 COMMENT '状态(1=待处理 2=处理中 3=已解决)',
  `is_delete`   TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除',
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ticket_id` (`ticket_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户意见反馈表';


-- ============================================================
-- 循环依赖外键约束（所有表创建后统一添加）
-- ============================================================

-- nft_user_collectibles → nft_orders
ALTER TABLE `nft_user_collectibles`
  ADD CONSTRAINT `fk_uc_order` FOREIGN KEY (`order_id`) REFERENCES `nft_orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_orders → nft_resale_listings（循环依赖：orders ↔ resale_listings ↔ user_collectibles）
ALTER TABLE `nft_orders`
  ADD CONSTRAINT `fk_orders_resale_listing` FOREIGN KEY (`resale_listing_id`) REFERENCES `nft_resale_listings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_user_collectibles → nft_blind_box_items
ALTER TABLE `nft_user_collectibles`
  ADD CONSTRAINT `fk_uc_blind_box_item` FOREIGN KEY (`blind_box_item_id`) REFERENCES `nft_blind_box_items` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_user_collectibles → nft_airdrop_records
ALTER TABLE `nft_user_collectibles`
  ADD CONSTRAINT `fk_uc_airdrop_record` FOREIGN KEY (`airdrop_record_id`) REFERENCES `nft_airdrop_records` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_airdrop_records → nft_user_collectibles
ALTER TABLE `nft_airdrop_records`
  ADD CONSTRAINT `fk_ar_user_collectible` FOREIGN KEY (`user_collectible_id`) REFERENCES `nft_user_collectibles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_lucky_draw_prizes → nft_lucky_draw_activities
ALTER TABLE `nft_lucky_draw_prizes`
  ADD CONSTRAINT `fk_ldp_activity` FOREIGN KEY (`activity_id`) REFERENCES `nft_lucky_draw_activities` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- nft_audit_logs → nft_admin_users
ALTER TABLE `nft_audit_logs`
  ADD CONSTRAINT `fk_al_operator` FOREIGN KEY (`operator_id`) REFERENCES `nft_admin_users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- nft_orders → nft_priority_sales（优先购订单关联）
ALTER TABLE `nft_orders`
  ADD CONSTRAINT `fk_orders_priority_sale` FOREIGN KEY (`priority_sale_id`) REFERENCES `nft_priority_sales` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- 初始化系统配置数据
-- ============================================================
INSERT INTO `nft_system_configs` (`config_key`, `config_value`, `config_desc`) VALUES
  ('default_is_on_chain', '0', '新创建藏品默认是否上链（0=不上链 1=上链），单藏品级别可覆盖此默认值')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);



-- ============================================================
-- 基础种子数据
-- ============================================================

-- 藏品分类
INSERT INTO `nft_categories` (`name`, `code`, `sort_order`) VALUES
('数字画作', 'digital_art', 1),
('3D艺术', '3d_art', 2);

-- 网站全局配置
INSERT INTO `nft_site_settings` (`setting_key`, `setting_value`, `setting_group`, `setting_desc`) VALUES
('site_name', '数和文创', 'basic', '网站名称'),
('site_logo', 'https://cdn.shuhe-wenchuang.com/logo.png', 'basic', '网站Logo'),
('contact_email', 'support@shuhe-wenchuang.com', 'basic', '联系邮箱'),
('primary_color', '#4f46e5', 'theme', '主题色'),
('buy_text', '立即购买', 'button', '购买按钮文案');

-- 合规文档
INSERT INTO `nft_agreements` (`title`, `code`, `content`, `version`, `status`, `effective_at`) VALUES
('用户协议', 'user_agreement', '<p>欢迎使用数和文创平台...</p>', 'v2.1', 1, '2026-07-01 00:00:00'),
('隐私政策', 'privacy_policy', '<p>我们重视您的隐私...</p>', 'v2.0', 1, '2026-07-01 00:00:00');

-- 轮播图
INSERT INTO `nft_banners` (`title`, `image`, `link_type`, `link_url`, `sort_order`, `status`) VALUES
('千里江山图·首发', 'https://cdn.shuhe-wenchuang.com/banner1.jpg', 'collectible', '/collectibles/1', 1, 1);

-- 公告
INSERT INTO `nft_announcements` (`title`, `summary`, `content`, `cover_image`, `type`, `is_top`) VALUES
('平台8月活动公告', '8月系列数字藏品发售...', '<p>8月系列数字藏品发售...</p>', 'https://cdn.shuhe-wenchuang.com/announce1.jpg', 'notice', 1);

-- 藏品（status=2 发售中，circulate=500 > 0）
INSERT INTO `nft_collectibles` (`category_id`, `name`, `image`, `price`, `edition`, `circulate`, `status`, `is_release`, `serial_prefix`, `description`) VALUES
(1, '千里江山图·数字版', 'https://cdn.shuhe-wenchuang.com/collectible1.jpg', 99.00, 1000, 500, 2, 1, '#', '北宋王希孟创作的长卷');


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 业务规则说明（供后端/前端开发参考）
-- ============================================================
--
-- 【藏品编号规则】
--   格式：  serial_prefix + 序号，默认前缀 '#'，如 #1 #9999 #10000
--   范围：  序号从 1 到 edition（发行总量），最大值 = edition
--   生成：  用户购买/获得藏品时，事务内执行：
--             UPDATE nft_collectibles
--               SET serial_current = serial_current + 1,
--                   version        = version + 1
--               WHERE id = ? AND version = ? AND serial_current < edition;
--           若 affected_rows = 0 说明并发冲突或已售罄，回滚重试。
--   编号：  CONCAT(serial_prefix, serial_current) → 如 #10000
--           写入 nft_user_collectibles.serial_no，终身不变。
--   约束：  UNIQUE(collectible_id, serial_no) 数据库兜底保障唯一性。
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
--
-- 【优先购流程】
--   场景：藏品15:00公售，VIP用户14:30可优先购，高级用户14:45可优先购
--   配置：运营为同一藏品创建多个 nft_priority_sales 记录（不同时段/不同群体）
--
--   下单校验（priority_sale_id IS NOT NULL 时）：
--     ① 时间窗口：NOW() >= priority_sale.start_time AND NOW() <= priority_sale.end_time
--     ② 活动状态：priority_sale.status = 2（进行中）
--     ③ 白名单：用户在 nft_priority_sale_whitelists 中 AND status = 1（有效）
--     ④ 限购：  used_quantity + order.quantity <= max_quantity
--     ⑤ 库存：  circulate - locked_quantity > 0（与普通发售共用，不单独拆分）
--
--   支付成功后：
--     - 白名单扣减（乐观锁防并发）：
--         UPDATE nft_priority_sale_whitelists
--           SET used_quantity = used_quantity + ?, version = version + 1
--           WHERE id = ? AND version = ? AND status = 1
--               AND used_quantity + ? <= max_quantity;
--       若 affected_rows = 0 说明并发冲突或已用完，回滚重试。
--     - 若 used_quantity >= max_quantity，自动更新 status = 2（已用完）
--     - orders.source = 'release'（发行发售），通过 priority_sale_id IS NOT NULL 区分优先购
--     - 优先购销量计入总销量统计
--
--   公售衔接：
--     - priority_sale.end_time 到达后，白名单外用户自动进入公售流程
--     - 公售检查：NOW() >= nft_collectibles.onsale_at
--     - 无需额外操作，优先购和公售读取同一库存字段
--
--   多批次支持：
--     - 同一 collectible_id 可关联多个 priority_sale（不同 start_time、不同白名单）
--     - 各批次白名单独立，用户可同时出现在多个批次白名单中
-- ============================================================

-- ============================================================
-- 建表完成
-- 共 42 张表 · v4.0 · 2026-08-06
-- v3.0 变更: 藏品支持可选上链 + 操作审计表
-- v4.0 变更: 优先购功能（priority_sales + whitelists + orders标记）
-- ============================================================
