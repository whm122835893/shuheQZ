# 数和文创数字藏品平台 - 项目结构总览

## 目录结构

```
project-nft/
├── backend-nestjs/          # NestJS 后端服务
│   ├── src/
│   │   ├── common/          # 公共模块（装饰器、守卫、拦截器、过滤器）
│   │   ├── config/          # 配置（数据库、JWT、Redis、支付）
│   │   ├── database/
│   │   │   ├── entities/    # TypeORM 实体（63 个表）
│   │   │   └── migrations/  # 数据库迁移
│   │   ├── modules/
│   │   │   ├── admin/       # 管理后台模块（20 个 Controller + 20 个 Service）
│   │   │   ├── user/         # C端用户模块
│   │   │   ├── collectible/  # C端藏品模块
│   │   │   ├── market/       # C端市场模块
│   │   │   ├── payment/      # 支付模块
│   │   │   ├── wallet/       # 钱包模块
│   │   │   └── ...           # 其他C端模块
│   │   ├── shared/           # 共享服务（Redis、SMS、支付渠道）
│   │   ├── app.module.ts     # 根模块
│   │   └── main.ts           # 应用入口
│   ├── .env                  # 环境变量
│   └── package.json
│
├── admin-manager/           # Vue3 管理后台前端
│   ├── src/
│   │   ├── api/              # API 服务层
│   │   │   ├── request.ts    # 请求封装（JWT 自动注入）
│   │   │   ├── index.ts      # 全部 API 方法定义
│   │   │   └── mock.ts       # Mock 数据（降级兜底）
│   │   ├── views/            # 页面视图（48 个页面）
│   │   ├── store/            # Pinia 状态管理
│   │   ├── router/           # 路由配置
│   │   └── layouts/          # 布局组件
│   └── vite.config.ts        # Vite 配置（代理 /admin/api → localhost:3000）
│
├── web-c端/                  # Vue3 C端用户前端
│   └── src/
│       ├── api/              # C端 API
│       ├── components/       # 组件
│       └── composables/      # 组合式函数
│
├── sql/
│   └── migrations/           # SQL 迁移脚本（按版本排序）
│       ├── 000_README.md     # 迁移说明
│       ├── 001_init_v4.0.sql # 基础建表（42 张表）
│       ├── 002_admin_v1.sql  # 管理后台增量（18 张新表 + 13 张扩展）
│       └── 003_fix_indexes.sql # 索引修复
│
├── docs/                     # 文档
│   ├── api/                  # API 设计文档
│   ├── design/               # 设计文档
│   └── reports/              # 验证报告
│
└── archive/                   # 归档
    ├── docs-original/        # 原始需求文档
    └── sql-legacy/            # 旧版 SQL 脚本
```

## 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 后端 | NestJS + TypeORM | NestJS 11 |
| 数据库 | MySQL / MariaDB | 8.0+ / 10.5+ |
| 缓存 | Redis | 7.0+ |
| 管理后台前端 | Vue3 + Element Plus + Vite | Vue 3.5 |
| C端前端 | Vue3 + Vite | Vue 3.5 |
| 认证 | JWT（双 Token 体系） | - |

## 运行端口

| 服务 | 端口 | 说明 |
|------|------|------|
| NestJS 后端 | 3000 | REST API + Swagger (/api/docs) |
| 管理后台前端 | 5180 | Vite dev server |
| MySQL | 3306 | 数据库 |
| Redis | 6379 | 缓存 |

## 管理后台模块清单

| 模块 | Controller | Service | 前端页面数 |
|------|-----------|---------|-----------|
| 认证 | admin-auth | admin-auth | 1 |
| 仪表盘 | admin-dashboard | admin-dashboard | 1 |
| 藏品管理 | admin-collectible | admin-collectible | 7 |
| 用户管理 | admin-user | admin-user | 2 |
| 订单管理 | admin-order | admin-order | 1 |
| 盲盒管理 | admin-blind-box | admin-blind-box | 3 |
| 市场管理 | admin-market | admin-market | 2 |
| 转赠管理 | admin-transfer | admin-transfer | 1 |
| 上链管理 | admin-chain | admin-chain | 1 (3 Tabs) |
| 权限管理 | admin-permission | admin-permission | 3 |
| 安全管理 | admin-security | admin-security | 4 |
| CMS 内容 | admin-cms | admin-cms | 5 |
| 系统配置 | admin-system | admin-system | 4 |
| 钱包管理 | admin-wallet | admin-wallet | 4 |
| 工单管理 | admin-ticket | admin-ticket | 1 |
| 退款管理 | admin-refund | admin-refund | 1 |
| 报表 | admin-report | admin-report | 1 |
| 营销活动 | admin-marketing | admin-marketing | 6 |
| 平台管理 | admin-platform | admin-platform | 1 |
| 奖励管理 | admin-reward | admin-reward | 0 (API only) |
| **合计** | **20** | **20** | **48** |

## API 端点数

共 37+ 个已验证 API 端点，覆盖全部管理后台功能。

## 数据库统计

- 总表数: 63（原始 42 + 管理后台新增 18 + 扩展 3）
- 总索引数: 150+（含主键、唯一索引、二级索引）
- 种子数据: 管理员账户、角色、权限树（80 节点）、上链渠道、系统配置

## 登录凭据

- 管理后台: admin / admin123
- JWT Secret: shuhe-admin-secret-2026
- JWT 有效期: 8 小时
