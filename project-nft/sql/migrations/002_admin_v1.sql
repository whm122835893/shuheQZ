-- ============================================================
-- 数和文创数字藏品平台 · 管理后台增量迁移脚本 alter_admin_v1
-- 生成日期: 2026-08-16
-- 基于 v4.0 schema 的增量 CREATE / ALTER / 种子数据脚本
-- 可直接在 MySQL 8.0+ / MariaDB 中执行
--
-- 内容概览:
--   第一部分: 新增 18 张表（16 张管理后台业务表 + 2 张链上相关表）
--             使用 CREATE TABLE IF NOT EXISTS
--   第二部分: 对 13 张既有表执行 ALTER TABLE（ADD COLUMN IF NOT EXISTS / MODIFY COLUMN）
--   第三部分: 写入默认种子数据（角色 / 权限 / 管理员 / 链渠道）
--
-- 引擎: InnoDB | 字符集: utf8mb4 | 排序规则: utf8mb4_unicode_ci
--
-- 说明:
--   1. 本脚本对数据库 shuhe_wenchuang 操作，若部署库名不同请同步修改下方 USE 语句。
--   2. 新增表 created_at/updated_at 采用 TIMESTAMP（按需求规约）；
--      链上两张表（nft_chain_channels / nft_onchain_tasks）采用 DATETIME(3)。
--   3. 第二部分 ADD COLUMN IF NOT EXISTS 语法在 MariaDB 原生支持；
--      原生 MySQL 8.0 不支持 ADD COLUMN IF NOT EXISTS，如遇报错请：
--        a) 移除每个 ADD COLUMN 后的 IF NOT EXISTS 关键字后重跑（重复执行会因列已存在报错，需按需跳过）；或
--        b) 使用存储过程 + information_schema 判断后再 ADD COLUMN。
--   4. 外键列类型与父表主键类型对齐（父表 id 为 BIGINT UNSIGNED 时，子表外键列同样使用 BIGINT UNSIGNED），
--      以保证外键约束可正常创建。
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

USE `shuhe_wenchuang`;


-- ############################################################
-- # 第一部分: 新增表（CREATE TABLE IF NOT EXISTS）
-- ############################################################


-- ============================================================
-- 1. nft_admin_roles 管理员角色表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_admin_roles` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`       VARCHAR(50)     NOT NULL COMMENT '角色名称',
  `code`       VARCHAR(50)     NOT NULL COMMENT '角色编码',
  `data_scope` TINYINT         NOT NULL DEFAULT 1 COMMENT '数据权限范围（1=全部数据 2=自定义 3=本人）',
  `status`     TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=启用 0=禁用）',
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员角色表';


-- ============================================================
-- 2. nft_admin_permissions 管理员权限表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_admin_permissions` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`       VARCHAR(50)     NOT NULL COMMENT '权限名称',
  `code`       VARCHAR(100)    NOT NULL COMMENT '权限编码（如 user:list）',
  `module`     VARCHAR(50)     NOT NULL COMMENT '所属模块',
  `type`       TINYINT         NOT NULL COMMENT '类型（1=菜单 2=按钮/操作）',
  `parent_id`  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '父权限ID（0=顶级）',
  `sort_order` INT             NOT NULL DEFAULT 0 COMMENT '排序值（越小越靠前）',
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_module` (`module`),
  INDEX `idx_parent` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员权限表';


-- ============================================================
-- 3. nft_admin_role_permissions 角色-权限关联表
--    外键: role_id -> nft_admin_roles(id)
--          permission_id -> nft_admin_permissions(id)
--    注: 外键列类型对齐父表主键 BIGINT UNSIGNED
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_admin_role_permissions` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_id`       BIGINT UNSIGNED NOT NULL COMMENT '角色ID（对齐 nft_admin_roles.id）',
  `permission_id` BIGINT UNSIGNED NOT NULL COMMENT '权限ID（对齐 nft_admin_permissions.id）',
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_perm` (`role_id`, `permission_id`),
  INDEX `idx_permission` (`permission_id`),
  CONSTRAINT `fk_rp_role`       FOREIGN KEY (`role_id`)       REFERENCES `nft_admin_roles` (`id`)       ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `nft_admin_permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色-权限关联表';


-- ============================================================
-- 4. nft_qualification_configs 资格购配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_qualification_configs` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `collectible_id`           INT UNSIGNED    NOT NULL COMMENT '藏品ID',
  `sale_price`               DECIMAL(10,2)   NOT NULL COMMENT '资格购价格',
  `required_collectible_ids` JSON            NULL DEFAULT NULL COMMENT '需持有的藏品ID数组',
  `required_checkin_days`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '需连续签到天数',
  `required_invite_count`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '需邀请人数',
  `condition_type`           TINYINT         NOT NULL DEFAULT 1 COMMENT '条件类型（1=满足任一 2=满足全部）',
  `valid_start_at`           TIMESTAMP       NULL DEFAULT NULL COMMENT '有效期开始时间',
  `valid_end_at`             TIMESTAMP       NULL DEFAULT NULL COMMENT '有效期结束时间',
  `status`                   TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=启用 0=禁用）',
  `created_at`               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_collectible` (`collectible_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资格购配置表';


-- ============================================================
-- 5. nft_qualification_whitelists 资格购白名单表
--    外键: config_id -> nft_qualification_configs(id)
--    注: 外键列类型对齐父表主键 BIGINT UNSIGNED
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_qualification_whitelists` (
  `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `config_id`  BIGINT UNSIGNED NOT NULL COMMENT '配置ID（对齐 nft_qualification_configs.id）',
  `user_id`    INT UNSIGNED    NULL DEFAULT NULL COMMENT '用户ID',
  `phone`      VARCHAR(20)     NOT NULL COMMENT '手机号',
  `status`     TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=有效 0=无效）',
  `expires_at` TIMESTAMP       NULL DEFAULT NULL COMMENT '过期时间（NULL=永久有效）',
  `created_at` TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_config` (`config_id`),
  INDEX `idx_phone` (`phone`),
  INDEX `idx_user` (`user_id`),
  CONSTRAINT `fk_qw_config` FOREIGN KEY (`config_id`) REFERENCES `nft_qualification_configs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资格购白名单表';


-- ============================================================
-- 6. nft_inventory_quotas 库存配额表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_inventory_quotas` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `collectible_id`   INT UNSIGNED    NOT NULL COMMENT '藏品ID',
  `quota_type`       TINYINT         NOT NULL COMMENT '配额类型（1=发售 2=空投 3=预留 4=销毁）',
  `planned_quantity`  INT UNSIGNED    NOT NULL COMMENT '计划数量',
  `used_quantity`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已使用数量',
  `activity_id`      INT UNSIGNED    NULL DEFAULT NULL COMMENT '关联活动ID',
  `status`           TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=启用 0=禁用）',
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_collectible_type` (`collectible_id`, `quota_type`),
  INDEX `idx_activity` (`activity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存配额表';


-- ============================================================
-- 7. nft_destroy_records 销毁记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_destroy_records` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `target_type` TINYINT         NOT NULL COMMENT '销毁目标类型（1=藏品 2=盲盒 3=用户藏品）',
  `target_id`   INT UNSIGNED    NOT NULL COMMENT '目标ID',
  `target_name` VARCHAR(100)    NULL DEFAULT NULL COMMENT '目标名称',
  `quantity`    INT UNSIGNED    NOT NULL COMMENT '销毁数量',
  `reason`      VARCHAR(500)    NOT NULL COMMENT '销毁原因',
  `admin_id`    INT UNSIGNED    NOT NULL COMMENT '操作管理员ID',
  `operator_ip` VARCHAR(45)     NULL DEFAULT NULL COMMENT '操作IP',
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_target` (`target_type`, `target_id`),
  INDEX `idx_admin` (`admin_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='销毁记录表';


-- ============================================================
-- 8. nft_refunds 退款记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_refunds` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `order_id`       INT UNSIGNED    NOT NULL COMMENT '订单ID',
  `payment_id`     INT UNSIGNED    NULL DEFAULT NULL COMMENT '支付记录ID',
  `user_id`        INT UNSIGNED    NOT NULL COMMENT '用户ID',
  `amount`         DECIMAL(10,2)   NOT NULL COMMENT '退款金额',
  `reason`         VARCHAR(500)    NOT NULL COMMENT '退款原因',
  `status`         TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=待审核 1=已通过 2=已拒绝 3=已退款）',
  `approver_id`    INT UNSIGNED    NULL DEFAULT NULL COMMENT '审核人ID',
  `refund_channel` VARCHAR(50)     NULL DEFAULT NULL COMMENT '退款渠道',
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_order` (`order_id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_payment` (`payment_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';


-- ============================================================
-- 9. nft_approvals 审批工单表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_approvals` (
  `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `action_type`  TINYINT         NOT NULL COMMENT '审批动作类型（1=退款 2=销毁 3=空投 4=下架 5=解封 6=清理）',
  `target_id`    INT UNSIGNED    NULL DEFAULT NULL COMMENT '目标ID',
  `request_data` JSON            NULL DEFAULT NULL COMMENT '请求数据',
  `extra`        JSON            NULL DEFAULT NULL COMMENT '附加数据',
  `requester_id` INT UNSIGNED    NOT NULL COMMENT '发起人ID',
  `approver_id`  INT UNSIGNED    NULL DEFAULT NULL COMMENT '审批人ID',
  `status`       TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=待审批 1=已通过 2=已拒绝 3=已撤回）',
  `comment`      VARCHAR(500)    NULL DEFAULT NULL COMMENT '审批意见',
  `created_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_action_status` (`action_type`, `status`),
  INDEX `idx_requester` (`requester_id`),
  INDEX `idx_approver` (`approver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审批工单表';


-- ============================================================
-- 10. nft_blacklist 黑名单表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_blacklist` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `blacklist_type` TINYINT         NOT NULL COMMENT '黑名单类型（1=用户 2=IP 3=设备 4=手机号）',
  `target_value`   VARCHAR(100)    NOT NULL COMMENT '目标值',
  `reason`         VARCHAR(500)    NOT NULL COMMENT '拉黑原因',
  `evidence`       TEXT            NULL DEFAULT NULL COMMENT '证据材料',
  `operator_id`    INT UNSIGNED    NOT NULL COMMENT '操作人ID',
  `status`         TINYINT         NOT NULL DEFAULT 1 COMMENT '状态（1=生效 0=已解除）',
  `expire_at`      TIMESTAMP       NULL DEFAULT NULL COMMENT '过期时间（NULL=永久）',
  `created_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_type_status` (`blacklist_type`, `status`),
  INDEX `idx_target` (`target_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='黑名单表';


-- ============================================================
-- 11. nft_risk_alerts 风控告警表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_risk_alerts` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `alert_type`  TINYINT         NOT NULL COMMENT '告警类型（1=刷单 2=薅羊毛 3=异常登录 4=高频接口 5=风控规则命中）',
  `severity`    TINYINT         NOT NULL DEFAULT 2 COMMENT '严重等级（1=低 2=中 3=高）',
  `user_id`     INT UNSIGNED    NULL DEFAULT NULL COMMENT '关联用户ID',
  `description` TEXT            NULL DEFAULT NULL COMMENT '告警描述',
  `evidence`    JSON            NULL DEFAULT NULL COMMENT '证据数据',
  `status`      TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=未处理 1=处理中 2=已处理 3=已忽略）',
  `handler_id`  INT UNSIGNED    NULL DEFAULT NULL COMMENT '处理人ID',
  `created_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='风控告警表';


-- ============================================================
-- 12. nft_security_events 安全事件表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_security_events` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `event_type`      TINYINT         NOT NULL COMMENT '事件类型（1=登录失败 2=越权访问 3=注入攻击 4=敏感操作 5=异常请求）',
  `event_level`     TINYINT         NOT NULL DEFAULT 2 COMMENT '事件等级（1=低 2=中 3=高）',
  `ip`              VARCHAR(45)     NULL DEFAULT NULL COMMENT '来源IP',
  `request_path`    VARCHAR(500)    NULL DEFAULT NULL COMMENT '请求路径',
  `request_params`  TEXT            NULL DEFAULT NULL COMMENT '请求参数',
  `response_status` INT             NULL DEFAULT NULL COMMENT '响应状态码',
  `ua`              VARCHAR(500)    NULL DEFAULT NULL COMMENT 'User-Agent',
  `handled_by`      INT UNSIGNED    NULL DEFAULT NULL COMMENT '处理人ID',
  `handled_at`      TIMESTAMP       NULL DEFAULT NULL COMMENT '处理时间',
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_event_type` (`event_type`, `created_at`),
  INDEX `idx_ip` (`ip`),
  INDEX `idx_level` (`event_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全事件表';


-- ============================================================
-- 13. nft_support_tickets 客服工单表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_support_tickets` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ticket_no`        VARCHAR(20)     NOT NULL COMMENT '工单编号',
  `user_id`          INT UNSIGNED    NOT NULL COMMENT '提交用户ID',
  `ticket_type`      TINYINT         NOT NULL COMMENT '工单类型（1=藏品 2=订单 3=支付 4=账户 5=其他）',
  `priority`         TINYINT         NOT NULL DEFAULT 2 COMMENT '优先级（1=低 2=中 3=高 4=紧急）',
  `title`            VARCHAR(200)   NOT NULL COMMENT '标题',
  `content`          TEXT            NOT NULL COMMENT '内容',
  `related_order_id` INT UNSIGNED    NULL DEFAULT NULL COMMENT '关联订单ID',
  `assignee_id`      INT UNSIGNED    NULL DEFAULT NULL COMMENT '受理人ID',
  `status`           TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=待受理 1=处理中 2=已解决 3=已关闭）',
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ticket_no` (`ticket_no`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_assignee_status` (`assignee_id`, `status`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客服工单表';


-- ============================================================
-- 14. nft_ticket_replies 工单回复表
--    外键: ticket_id -> nft_support_tickets(id)
--    注: 外键列类型对齐父表主键 BIGINT UNSIGNED
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_ticket_replies` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ticket_id`     BIGINT UNSIGNED NOT NULL COMMENT '工单ID（对齐 nft_support_tickets.id）',
  `replier_type`  TINYINT         NOT NULL COMMENT '回复人类型（1=用户 2=客服 3=系统）',
  `replier_id`    INT UNSIGNED    NULL DEFAULT NULL COMMENT '回复人ID',
  `content`       TEXT            NOT NULL COMMENT '回复内容',
  `attachments`   JSON            NULL DEFAULT NULL COMMENT '附件数组',
  `is_internal`   TINYINT         NOT NULL DEFAULT 0 COMMENT '是否内部备注（0=否 1=是）',
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_ticket` (`ticket_id`),
  CONSTRAINT `fk_tr_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `nft_support_tickets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='工单回复表';


-- ============================================================
-- 15. nft_platform_cleanup_logs 平台清理日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_platform_cleanup_logs` (
  `id`              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `operator_id`     INT UNSIGNED    NOT NULL COMMENT '操作人ID',
  `operator_ip`     VARCHAR(45)     NULL DEFAULT NULL COMMENT '操作IP',
  `reason`          VARCHAR(500)    NOT NULL COMMENT '清理原因',
  `backup_path`     VARCHAR(500)    NULL DEFAULT NULL COMMENT '备份路径',
  `scope`           JSON            NULL DEFAULT NULL COMMENT '清理范围',
  `affected_users`  INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '受影响用户数',
  `affected_orders` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '受影响订单数',
  `executed_at`     TIMESTAMP       NULL DEFAULT NULL COMMENT '执行时间',
  `status`          TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=待执行 1=执行中 2=成功 3=失败）',
  `created_at`      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  INDEX `idx_operator` (`operator_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_executed` (`executed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台清理日志表';


-- ============================================================
-- 16. nft_activity_rewards 活动奖励配置表
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_activity_rewards` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `activity_id`      INT UNSIGNED    NOT NULL COMMENT '活动ID',
  `activity_type`    TINYINT         NOT NULL COMMENT '活动类型（1=签到 2=邀请 3=空投 4=抽奖 5=合成）',
  `reward_type`      TINYINT         NOT NULL COMMENT '奖励类型（1=藏品 2=积分 3=抽奖机会 4=优先购资格 5=空投资格）',
  `reward_config`    JSON            NULL DEFAULT NULL COMMENT '奖励配置',
  `planned_quantity` INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '计划发放数量',
  `used_quantity`    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '已发放数量',
  `created_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at`       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_activity` (`activity_id`, `activity_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动奖励配置表';


-- ============================================================
-- 17. nft_chain_channels 链渠道配置表 [链上相关表]
--    时间字段使用 DATETIME(3) 毫秒精度
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_chain_channels` (
  `id`               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `name`             VARCHAR(50)     NOT NULL COMMENT '渠道名称',
  `code`             VARCHAR(30)     NOT NULL COMMENT '渠道编码',
  `chain_type`       TINYINT         NOT NULL COMMENT '链类型（1=以太坊 2=Polygon 3=联盟链 4=文昌链 5=蚂蚁链）',
  `token_standard`   TINYINT         NOT NULL DEFAULT 1 COMMENT '代币标准（1=ERC-721 2=ERC-1155）',
  `api_endpoint`     VARCHAR(255)    NULL DEFAULT NULL COMMENT 'API地址',
  `api_key`          VARCHAR(255)    NULL DEFAULT NULL COMMENT 'API Key',
  `api_secret`       VARCHAR(255)    NULL DEFAULT NULL COMMENT 'API Secret',
  `contract_address` VARCHAR(100)   NULL DEFAULT NULL COMMENT '合约地址',
  `is_active`        TINYINT         NOT NULL DEFAULT 1 COMMENT '是否启用（1=是 0=否）',
  `sort_order`       INT             NOT NULL DEFAULT 0 COMMENT '排序值',
  `remark`           VARCHAR(200)    NULL DEFAULT NULL COMMENT '备注',
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='链渠道配置表';


-- ============================================================
-- 18. nft_onchain_tasks 上链任务表 [链上相关表]
--    外键: collectible_id -> nft_collectibles(id) ON DELETE CASCADE
--          channel_id     -> nft_chain_channels(id) ON DELETE SET NULL
--    时间字段使用 DATETIME(3) 毫秒精度
--    注: channel_id 允许 NULL 以支持 ON DELETE SET NULL
-- ============================================================
CREATE TABLE IF NOT EXISTS `nft_onchain_tasks` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `collectible_id`      BIGINT UNSIGNED NOT NULL COMMENT '藏品ID（nft_collectibles.id）',
  `user_collectible_id` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '用户藏品ID',
  `channel_id`          BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '链渠道ID（nft_chain_channels.id）',
  `task_type`           VARCHAR(20)     NOT NULL COMMENT '任务类型（mint/transfer/burn）',
  `status`              TINYINT         NOT NULL DEFAULT 0 COMMENT '状态（0=待处理 1=处理中 2=成功 3=失败）',
  `tx_hash`             VARCHAR(100)    NULL DEFAULT NULL COMMENT '交易哈希',
  `block_number`        BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '区块号',
  `token_id`            VARCHAR(100)    NULL DEFAULT NULL COMMENT '链上Token ID',
  `error_message`       TEXT            NULL DEFAULT NULL COMMENT '错误信息',
  `operator_id`         BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作人ID',
  `executed_at`         DATETIME(3)     NULL DEFAULT NULL COMMENT '执行时间',
  `completed_at`        DATETIME(3)     NULL DEFAULT NULL COMMENT '完成时间',
  `created_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  `updated_at`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_collectible` (`collectible_id`),
  INDEX `idx_user_collectible` (`user_collectible_id`),
  INDEX `idx_channel` (`channel_id`),
  INDEX `idx_status` (`status`),
  CONSTRAINT `fk_oct_collectible` FOREIGN KEY (`collectible_id`) REFERENCES `nft_collectibles` (`id`)    ON DELETE CASCADE   ON UPDATE CASCADE,
  CONSTRAINT `fk_oct_channel`     FOREIGN KEY (`channel_id`)     REFERENCES `nft_chain_channels` (`id`) ON DELETE SET NULL  ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上链任务表';


-- ############################################################
-- # 第二部分: 既有表结构变更（ALTER TABLE）
-- # 语法: ADD COLUMN IF NOT EXISTS（MariaDB 原生支持；MySQL 8.0 需按文件头说明适配）
-- ############################################################


-- ============================================================
-- 2.1 nft_collectibles 藏品主表新增字段
-- ============================================================
ALTER TABLE `nft_collectibles`
  ADD COLUMN IF NOT EXISTS `destroyed_count`          INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '已销毁数量',
  ADD COLUMN IF NOT EXISTS `airdropped_count`         INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '已空投数量',
  ADD COLUMN IF NOT EXISTS `reserved_count`           INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '已预留数量',
  ADD COLUMN IF NOT EXISTS `is_resaleable`             TINYINT       NOT NULL DEFAULT 1    COMMENT '是否可寄售（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `resale_price_min`         DECIMAL(10,2)          DEFAULT NULL COMMENT '寄售价格下限',
  ADD COLUMN IF NOT EXISTS `resale_price_max`         DECIMAL(10,2)          DEFAULT NULL COMMENT '寄售价格上限',
  ADD COLUMN IF NOT EXISTS `resale_price_mode`        TINYINT       NOT NULL DEFAULT 0    COMMENT '寄售价格模式（0=不限 1=固定 2=区间）',
  ADD COLUMN IF NOT EXISTS `sale_mode`                TINYINT       NOT NULL DEFAULT 0    COMMENT '发售模式（0=普通 1=优先购 2=盲盒 3=资格购）',
  ADD COLUMN IF NOT EXISTS `is_qualification_enabled` TINYINT       NOT NULL DEFAULT 0    COMMENT '是否启用资格购（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `qualification_config_id`  INT                   DEFAULT NULL COMMENT '资格购配置ID（nft_qualification_configs.id）',
  ADD COLUMN IF NOT EXISTS `per_user_limit`           INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '每人限购数量（0=不限）';


-- ============================================================
-- 2.2 nft_blind_boxes 盲盒表新增字段
-- ============================================================
ALTER TABLE `nft_blind_boxes`
  ADD COLUMN IF NOT EXISTS `name`              VARCHAR(100)   NOT NULL DEFAULT ''   COMMENT '盲盒名称',
  ADD COLUMN IF NOT EXISTS `image`             VARCHAR(500)            DEFAULT NULL COMMENT '盲盒主图URL',
  ADD COLUMN IF NOT EXISTS `description`        TEXT                    DEFAULT NULL COMMENT '盲盒描述',
  ADD COLUMN IF NOT EXISTS `price`             DECIMAL(10,2)  NOT NULL DEFAULT 0    COMMENT '盲盒价格',
  ADD COLUMN IF NOT EXISTS `edition`            INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '发行总量',
  ADD COLUMN IF NOT EXISTS `sold`               INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '已售数量',
  ADD COLUMN IF NOT EXISTS `circulate`          INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '可售数量',
  ADD COLUMN IF NOT EXISTS `status`             TINYINT        NOT NULL DEFAULT 0    COMMENT '状态（0=未上架 1=上架 2=已售罄 3=已下架）',
  ADD COLUMN IF NOT EXISTS `per_user_limit`     INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '每人限购数量（0=不限）',
  ADD COLUMN IF NOT EXISTS `onsale_at`          DATETIME(3)              DEFAULT NULL COMMENT '上架时间',
  ADD COLUMN IF NOT EXISTS `off_sale_at`       DATETIME(3)              DEFAULT NULL COMMENT '下架时间',
  ADD COLUMN IF NOT EXISTS `destroyed_count`   INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '已销毁数量',
  ADD COLUMN IF NOT EXISTS `airdropped_count`   INT UNSIGNED   NOT NULL DEFAULT 0    COMMENT '已空投数量',
  ADD COLUMN IF NOT EXISTS `is_transferable`    TINYINT        NOT NULL DEFAULT 1    COMMENT '是否可转赠（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `is_resaleable`      TINYINT        NOT NULL DEFAULT 1    COMMENT '是否可寄售（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `resale_price_min`   DECIMAL(10,2)           DEFAULT NULL COMMENT '寄售价格下限',
  ADD COLUMN IF NOT EXISTS `resale_price_max`   DECIMAL(10,2)           DEFAULT NULL COMMENT '寄售价格上限',
  ADD COLUMN IF NOT EXISTS `resale_price_mode`  TINYINT        NOT NULL DEFAULT 0    COMMENT '寄售价格模式（0=不限 1=固定 2=区间）';


-- ============================================================
-- 2.3 nft_admin_users 管理员账号表新增字段
-- ============================================================
ALTER TABLE `nft_admin_users`
  ADD COLUMN IF NOT EXISTS `phone`             VARCHAR(20)    DEFAULT NULL COMMENT '手机号',
  ADD COLUMN IF NOT EXISTS `email`             VARCHAR(100)   DEFAULT NULL COMMENT '邮箱',
  ADD COLUMN IF NOT EXISTS `avatar`            VARCHAR(255)   DEFAULT NULL COMMENT '头像URL',
  ADD COLUMN IF NOT EXISTS `twofa_secret`       VARCHAR(255)   DEFAULT NULL COMMENT '二次验证密钥（加密存储）',
  ADD COLUMN IF NOT EXISTS `ip_whitelist`      JSON           DEFAULT NULL COMMENT 'IP白名单（JSON数组）',
  ADD COLUMN IF NOT EXISTS `last_action_at`     TIMESTAMP      DEFAULT NULL COMMENT '最后操作时间',
  ADD COLUMN IF NOT EXISTS `login_fail_count`  INT            DEFAULT 0    COMMENT '连续登录失败次数',
  ADD COLUMN IF NOT EXISTS `locked_until`      TIMESTAMP NULL DEFAULT NULL COMMENT '锁定截止时间（NULL=未锁定）';


-- ============================================================
-- 2.4 nft_users 用户表新增黑名单字段
-- ============================================================
ALTER TABLE `nft_users`
  ADD COLUMN IF NOT EXISTS `is_blacklisted`  TINYINT      DEFAULT 0    COMMENT '是否黑名单（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `blacklist_reason` VARCHAR(500) DEFAULT NULL COMMENT '拉黑原因',
  ADD COLUMN IF NOT EXISTS `blacklist_at`    TIMESTAMP    NULL DEFAULT NULL COMMENT '拉黑时间',
  ADD COLUMN IF NOT EXISTS `blacklist_by`    INT UNSIGNED DEFAULT NULL COMMENT '拉黑操作人ID';


-- ============================================================
-- 2.5 nft_orders 订单表扩展 source 枚举
--    新增 eligibility（资格购）、blindbox（盲盒）来源
-- ============================================================
ALTER TABLE `nft_orders`
  MODIFY COLUMN `source` ENUM('release','market','eligibility','blindbox') NOT NULL COMMENT '订单来源（发行发售/二级市场/资格购/盲盒）';


-- ============================================================
-- 2.6 nft_resale_listings 寄售挂单表新增系统下架字段
-- ============================================================
ALTER TABLE `nft_resale_listings`
  ADD COLUMN IF NOT EXISTS `is_system_delisted` TINYINT      DEFAULT 0    COMMENT '是否系统下架（0=否 1=是）',
  ADD COLUMN IF NOT EXISTS `system_delisted_at` TIMESTAMP    NULL DEFAULT NULL COMMENT '系统下架时间',
  ADD COLUMN IF NOT EXISTS `delist_reason`      VARCHAR(500) DEFAULT NULL COMMENT '下架原因';


-- ============================================================
-- 2.7 nft_priority_sales 优先购活动表新增字段
-- ============================================================
ALTER TABLE `nft_priority_sales`
  ADD COLUMN IF NOT EXISTS `sale_price`        DECIMAL(10,2)          DEFAULT NULL COMMENT '优先购价格',
  ADD COLUMN IF NOT EXISTS `reserved_quantity`  INT UNSIGNED  NOT NULL DEFAULT 0    COMMENT '预留数量';


-- ============================================================
-- 2.8 nft_priority_sale_whitelists 优先购白名单表新增过期时间
-- ============================================================
ALTER TABLE `nft_priority_sale_whitelists`
  ADD COLUMN IF NOT EXISTS `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT '资格过期时间（NULL=永久有效）';


-- ============================================================
-- 2.9 nft_lucky_draw_prizes 抽奖奖品表新增奖品类型配置
-- ============================================================
ALTER TABLE `nft_lucky_draw_prizes`
  ADD COLUMN IF NOT EXISTS `prize_type`       TINYINT DEFAULT NULL COMMENT '奖品类型（1=藏品 2=积分 3=空资格 4=谢谢参与）',
  ADD COLUMN IF NOT EXISTS `prize_config`     JSON    DEFAULT NULL COMMENT '奖品配置',
  ADD COLUMN IF NOT EXISTS `is_empty_prize`   TINYINT NOT NULL DEFAULT 0 COMMENT '是否空奖/谢谢参与（0=否 1=是）';


-- ============================================================
-- 2.10 nft_check_in_records 签到记录表扩展 reward_type 枚举
--     新增 priority_qualification（优先购资格）、eligibility_qualification（资格购资格）、blindbox（盲盒）
-- ============================================================
ALTER TABLE `nft_check_in_records`
  MODIFY COLUMN `reward_type` ENUM('none','collectible','points','draw_chance','priority_qualification','eligibility_qualification','blindbox') NOT NULL DEFAULT 'none' COMMENT '奖励类型（无/藏品/积分/抽奖机会/优先购资格/资格购资格/盲盒）';


-- ============================================================
-- 2.11 nft_invite_activities 邀请活动表新增奖励类型
-- ============================================================
ALTER TABLE `nft_invite_activities`
  ADD COLUMN IF NOT EXISTS `reward_type` VARCHAR(30) DEFAULT 'collectible' COMMENT '奖励类型（collectible=藏品 points=积分 blindbox=盲盒）';


-- ============================================================
-- 2.12 nft_invite_records 邀请记录表新增奖励类型
-- ============================================================
ALTER TABLE `nft_invite_records`
  ADD COLUMN IF NOT EXISTS `reward_type` VARCHAR(30) DEFAULT 'collectible' COMMENT '奖励类型（collectible=藏品 points=积分 blindbox=盲盒）';


-- ============================================================
-- 2.13 nft_airdrop_records 空投记录表新增奖励类型
-- ============================================================
ALTER TABLE `nft_airdrop_records`
  ADD COLUMN IF NOT EXISTS `reward_type` VARCHAR(30) DEFAULT 'collectible' COMMENT '奖励类型（collectible=藏品 points=积分 blindbox=盲盒）';


-- ############################################################
-- # 第三部分: 默认种子数据
-- ############################################################


-- ============================================================
-- 3.1 默认角色：超级管理员
--     super_admin 角色在后端权限校验中通常直接放行（按 code 判断），无需逐条分配权限。
-- ============================================================
INSERT INTO `nft_admin_roles` (`name`, `code`, `data_scope`, `status`)
VALUES ('超级管理员', 'super_admin', 1, 1)
ON DUPLICATE KEY UPDATE
  `name`       = VALUES(`name`),
  `data_scope` = VALUES(`data_scope`),
  `status`     = VALUES(`status`);


-- ============================================================
-- 3.2 默认权限：为每个模块写入「菜单 + 查看/新增/编辑/删除」共 5 条权限
--     type: 1=菜单 2=按钮/操作
--     parent_id: 0=顶级（菜单与按钮均置为顶级，层级关系可在后台权限管理界面调整）
--     模块顺序: user, collectible, blindbox, order, market, transfer, marketing,
--              wallet, cms, system, permission, security, ticket, report, platform, reward
-- ============================================================
INSERT INTO `nft_admin_permissions` (`name`, `code`, `module`, `type`, `parent_id`, `sort_order`) VALUES
  -- 用户管理
  ('用户管理',   'user:menu',   'user', 1, 0, 0),
  ('查看用户',   'user:list',   'user', 2, 0, 1),
  ('新增用户',   'user:create', 'user', 2, 0, 2),
  ('编辑用户',   'user:update', 'user', 2, 0, 3),
  ('删除用户',   'user:delete', 'user', 2, 0, 4),
  -- 藏品管理
  ('藏品管理',   'collectible:menu',   'collectible', 1, 0, 0),
  ('查看藏品',   'collectible:list',   'collectible', 2, 0, 1),
  ('新增藏品',   'collectible:create', 'collectible', 2, 0, 2),
  ('编辑藏品',   'collectible:update', 'collectible', 2, 0, 3),
  ('删除藏品',   'collectible:delete', 'collectible', 2, 0, 4),
  -- 盲盒管理
  ('盲盒管理',   'blindbox:menu',   'blindbox', 1, 0, 0),
  ('查看盲盒',   'blindbox:list',   'blindbox', 2, 0, 1),
  ('新增盲盒',   'blindbox:create', 'blindbox', 2, 0, 2),
  ('编辑盲盒',   'blindbox:update', 'blindbox', 2, 0, 3),
  ('删除盲盒',   'blindbox:delete', 'blindbox', 2, 0, 4),
  -- 订单管理
  ('订单管理',   'order:menu',   'order', 1, 0, 0),
  ('查看订单',   'order:list',   'order', 2, 0, 1),
  ('新增订单',   'order:create', 'order', 2, 0, 2),
  ('编辑订单',   'order:update', 'order', 2, 0, 3),
  ('删除订单',   'order:delete', 'order', 2, 0, 4),
  -- 寄售市场
  ('寄售市场',   'market:menu',   'market', 1, 0, 0),
  ('查看挂单',   'market:list',   'market', 2, 0, 1),
  ('新增挂单',   'market:create', 'market', 2, 0, 2),
  ('编辑挂单',   'market:update', 'market', 2, 0, 3),
  ('删除挂单',   'market:delete', 'market', 2, 0, 4),
  -- 转赠管理
  ('转赠管理',   'transfer:menu',   'transfer', 1, 0, 0),
  ('查看转赠',   'transfer:list',   'transfer', 2, 0, 1),
  ('新增转赠',   'transfer:create', 'transfer', 2, 0, 2),
  ('编辑转赠',   'transfer:update', 'transfer', 2, 0, 3),
  ('删除转赠',   'transfer:delete', 'transfer', 2, 0, 4),
  -- 营销活动
  ('营销活动',   'marketing:menu',   'marketing', 1, 0, 0),
  ('查看活动',   'marketing:list',   'marketing', 2, 0, 1),
  ('新增活动',   'marketing:create', 'marketing', 2, 0, 2),
  ('编辑活动',   'marketing:update', 'marketing', 2, 0, 3),
  ('删除活动',   'marketing:delete', 'marketing', 2, 0, 4),
  -- 钱包管理
  ('钱包管理',   'wallet:menu',   'wallet', 1, 0, 0),
  ('查看钱包',   'wallet:list',   'wallet', 2, 0, 1),
  ('充值审核',   'wallet:audit',  'wallet', 2, 0, 2),
  ('编辑钱包',   'wallet:update', 'wallet', 2, 0, 3),
  ('删除流水',   'wallet:delete', 'wallet', 2, 0, 4),
  -- 内容管理
  ('内容管理',   'cms:menu',   'cms', 1, 0, 0),
  ('查看内容',   'cms:list',   'cms', 2, 0, 1),
  ('新增内容',   'cms:create', 'cms', 2, 0, 2),
  ('编辑内容',   'cms:update', 'cms', 2, 0, 3),
  ('删除内容',   'cms:delete', 'cms', 2, 0, 4),
  -- 系统设置
  ('系统设置',   'system:menu',   'system', 1, 0, 0),
  ('查看系统配置', 'system:list',   'system', 2, 0, 1),
  ('新增系统配置', 'system:create', 'system', 2, 0, 2),
  ('编辑系统配置', 'system:update', 'system', 2, 0, 3),
  ('删除系统配置', 'system:delete', 'system', 2, 0, 4),
  -- 权限管理
  ('权限管理',   'permission:menu',   'permission', 1, 0, 0),
  ('查看权限',   'permission:list',   'permission', 2, 0, 1),
  ('新增角色',   'permission:create', 'permission', 2, 0, 2),
  ('编辑角色',   'permission:update', 'permission', 2, 0, 3),
  ('删除角色',   'permission:delete', 'permission', 2, 0, 4),
  -- 安全管理
  ('安全管理',   'security:menu',   'security', 1, 0, 0),
  ('查看安全事件', 'security:list',   'security', 2, 0, 1),
  ('新增黑名单',   'security:create', 'security', 2, 0, 2),
  ('处理告警',     'security:update', 'security', 2, 0, 3),
  ('删除黑名单',   'security:delete', 'security', 2, 0, 4),
  -- 工单管理
  ('工单管理',   'ticket:menu',   'ticket', 1, 0, 0),
  ('查看工单',   'ticket:list',   'ticket', 2, 0, 1),
  ('受理工单',   'ticket:create', 'ticket', 2, 0, 2),
  ('回复工单',   'ticket:update', 'ticket', 2, 0, 3),
  ('关闭工单',   'ticket:delete', 'ticket', 2, 0, 4),
  -- 数据报表
  ('数据报表',   'report:menu',   'report', 1, 0, 0),
  ('查看报表',   'report:list',   'report', 2, 0, 1),
  ('导出报表',   'report:export', 'report', 2, 0, 2),
  ('配置报表',   'report:update', 'report', 2, 0, 3),
  ('删除报表',   'report:delete', 'report', 2, 0, 4),
  -- 平台运维
  ('平台运维',   'platform:menu',   'platform', 1, 0, 0),
  ('查看运维',   'platform:list',   'platform', 2, 0, 1),
  ('执行清理',   'platform:create', 'platform', 2, 0, 2),
  ('编辑运维',   'platform:update', 'platform', 2, 0, 3),
  ('删除日志',   'platform:delete', 'platform', 2, 0, 4),
  -- 奖品管理
  ('奖品管理',   'reward:menu',   'reward', 1, 0, 0),
  ('查看奖品',   'reward:list',   'reward', 2, 0, 1),
  ('新增奖品',   'reward:create', 'reward', 2, 0, 2),
  ('编辑奖品',   'reward:update', 'reward', 2, 0, 3),
  ('删除奖品',   'reward:delete', 'reward', 2, 0, 4)
ON DUPLICATE KEY UPDATE
  `name`   = VALUES(`name`),
  `module` = VALUES(`module`),
  `type`   = VALUES(`type`);


-- ============================================================
-- 3.3 默认管理员账号
--   !! 安全提醒 !!
--   以下 password 为占位 bcrypt 哈希（对应明文 '123456'，仅为示例占位）。
--   上线前务必修改为强密码的真实 bcrypt 哈希（如对 'admin123' 或更强密码进行 bcrypt 加密）。
--   重复执行本脚本时不会覆盖已修改的密码（ON DUPLICATE KEY UPDATE 不更新 password）。
-- ============================================================
INSERT INTO `nft_admin_users` (`username`, `password`, `real_name`, `role`, `status`)
VALUES (
  'admin',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- 占位哈希（bcrypt of '123456'），上线前请替换
  '超级管理员',
  1,
  1
)
ON DUPLICATE KEY UPDATE
  `real_name` = VALUES(`real_name`),
  `status`    = VALUES(`status`);
  -- 注意：此处刻意不更新 password，避免覆盖运维已修改的密码


-- ============================================================
-- 3.4 默认链渠道：文昌链、蚂蚁链
-- ============================================================
INSERT INTO `nft_chain_channels` (`name`, `code`, `chain_type`, `token_standard`, `is_active`, `sort_order`, `remark`)
VALUES
  ('文昌链', 'wenchang', 4, 1, 1, 0, '文昌链（联盟链）默认渠道'),
  ('蚂蚁链', 'antchain', 5, 1, 1, 1, '蚂蚁链（联盟链）默认渠道')
ON DUPLICATE KEY UPDATE
  `name`           = VALUES(`name`),
  `chain_type`     = VALUES(`chain_type`),
  `token_standard` = VALUES(`token_standard`),
  `is_active`      = VALUES(`is_active`);


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 脚本执行完毕
-- 后续建议:
--   1. 立即登录后台修改默认 admin 账号密码，并启用二次验证（twofa_secret）。
--   2. 根据业务需要为非超级管理员角色在 nft_admin_role_permissions 中分配权限。
--   3. 链渠道的 api_endpoint / api_key / api_secret / contract_address 需在后台配置后再启用上链。
-- ============================================================
