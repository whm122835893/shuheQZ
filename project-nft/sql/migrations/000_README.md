# SQL 迁移脚本目录

本目录包含数和文创数字藏品平台的全部 SQL 迁移脚本，按版本顺序排列。

## 执行顺序

| 序号 | 文件 | 说明 |
|------|------|------|
| 001 | `001_init_v4.0.sql` | 基础建表脚本（42 张表），含种子数据 |
| 002 | `002_admin_v1.sql` | 管理后台增量迁移（18 张新表 + 13 张表扩展），含管理员种子数据 |
| 003 | `003_fix_indexes.sql` | 索引修复 + 缺失字段补充 |

## 数据库信息

- 数据库名: `shuhe_wenchuang`
- 引擎: InnoDB
- 字符集: utf8mb4 / utf8mb4_unicode_ci
- 兼容: MySQL 8.0+ / MariaDB 10.5+

## 总表数: 63

### 原始表（v4.0，42 张）
nft_users, nft_user_wallets, nft_wallet_transactions, nft_collectibles, nft_categories,
nft_user_collectibles, nft_orders, nft_payments, nft_transfers, nft_resale_listings,
nft_blind_boxes, nft_blind_box_items, nft_blind_box_open_records, nft_check_in_records,
nft_invite_activities, nft_invite_records, nft_lucky_draw_activities, nft_lucky_draw_prizes,
nft_lucky_draw_records, nft_lucky_draw_user_chances, nft_airdrop_activities, nft_airdrop_snapshots,
nft_airdrop_eligibilities, nft_airdrop_records, nft_synthesis_activities, nft_synthesis_materials,
nft_synthesis_records, nft_synthesis_record_items, nft_priority_sales, nft_priority_sale_whitelists,
nft_qualification_configs, nft_qualification_whitelists, nft_inventory_quotas,
nft_feedback, nft_support_tickets, nft_ticket_replies, nft_operation_logs, nft_audit_logs,
nft_sms_logs, nft_site_settings, nft_destroy_records, nft_user_favorites

### 管理后台新增表（admin_v1，18 张）
nft_admin_users, nft_admin_roles, nft_admin_permissions, nft_admin_role_permissions,
nft_admin_operation_logs, nft_admin_login_logs, nft_chain_channels, nft_chain_collectibles,
nft_chain_tasks, nft_chain_task_logs, nft_chain_offchain_tokens,
nft_system_configs, nft_announcements, nft_banners, nft_agreements, nft_artifacts,
nft_decoration_configs, nft_security_approvals

### 扩展表（admin_v1 对既有表 ALTER）
nft_collectibles (新增 is_on_chain, contract_address 等字段)
nft_orders (新增 chain_tx_hash 字段)
nft_users (新增 realname_status 字段)
nft_blind_boxes (新增 chain_channel_id 字段)
... 等 13 张表

## 索引情况

所有表均包含以下索引:
- PRIMARY KEY (主键)
- UNIQUE 索引 (唯一约束，如 uk_code, uk_username 等)
- 二级索引 (查询优化，如 idx_status, idx_user_id 等)

仅 nft_artifacts 表曾缺少二级索引，已在 003_fix_indexes.sql 中补充。

## 种子数据

- 超级管理员: admin / admin123
- 默认角色: 超级管理员 (code: super_admin)
- 权限树: 80 个权限节点
- 上链渠道: 文昌链、蚂蚁链
- 系统配置: 5 条默认配置
