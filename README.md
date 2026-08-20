# 数和文创数字藏品平台

完整的数字藏品平台，包含 C 端用户系统和管理员后台。

## 项目结构

```
project-nft/
├── backend-nestjs/     # NestJS 后端 API（C 端 + 管理后台共用）
├── web-c端/            # 用户端 Vue 3 移动端前端
├── admin-manager/      # 管理员后台 Vue 3 + Element Plus（当前 mock 数据，待对接后端）
├── sql/                # 数据库建表 SQL 脚本
│   ├── init/           # 初始化 SQL
│   └── scripts/        # 其他 SQL 脚本
└── docs/               # 接口文档、需求文档、分析报告
```

## 技术栈

| 模块 | 技术 |
|------|------|
| 后端 | NestJS 10 + TypeORM + MySQL + Redis |
| C 端前端 | Vue 3 + Vite |
| 管理后台 | Vue 3 + Element Plus + ECharts + Vite |
| 数据库 | MySQL 8.0 (utf8mb4) |

## 快速开始

### 后端

```bash
cd project-nft/backend-nestjs
cp .env.example .env  # 填入数据库等配置
npm install
npm run start:dev     # http://localhost:3000
```

### C 端前端

```bash
cd project-nft/web-c端
npm install
npm run dev           # http://localhost:5173
```

### 管理后台

```bash
cd project-nft/admin-manager
npm install
npm run dev           # http://localhost:5173
# 默认账号: admin / 123456
```

### 数据库初始化

```bash
mysql -u root -p < project-nft/sql/init/init-db.sql
```

## 模块说明

- **后端**: 15 个业务模块，43 张数据表，75 个 API 端点
- **C 端**: 用户注册/登录、藏品浏览/购买、盲盒、二级市场、转赠、钱包、营销活动
- **管理后台**: 藏品管理、盲盒管理、发售计划、市场寄售、公告资讯、营销活动、用户管理、订单管理、权限管理、数据看板等（当前使用 mock 数据）
