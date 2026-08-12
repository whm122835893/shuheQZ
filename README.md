# 数和文创数字藏品平台

> Vue 前端 + NestJS 后端 + MySQL + Redis 全栈项目

---

## 项目简介

数和文创是一个数字藏品（NFT）交易平台，提供藏品发售、二级市场交易、盲盒、合成、抽奖、转赠、优先购等完整的数字藏品业务功能。后端基于 NestJS 框架构建，采用 TypeScript 强类型开发，提供 65 个 RESTful API 端点，覆盖 14 个业务模块。平台支持支付宝、微信支付、余额支付等多种支付方式，内置 JWT 认证、交易密码保护、Redis 缓存、定时任务、全局限流等企业级特性。

### 核心功能

- **用户体系**：手机号注册登录、短信验证码、实名认证、交易密码、JWT 续期
- **藏品交易**：一级市场发售购买、二级市场挂售/购买、藏品转赠
- **趣味玩法**：盲盒开启、藏品合成、每日签到、幸运抽奖
- **支付钱包**：余额充值、多通道支付（支付宝/微信）、支付回调
- **优先购买**：白名单资格校验、限购控制、时段窗口
- **内容展示**：文物展馆、公告新闻、首页轮播图
- **系统支撑**：文件上传、合规文档、全局配置、意见反馈

---

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | Vue 3 | 3.x | 渐进式 JavaScript 框架 |
| 前端构建 | Vite | 5.x | 下一代前端构建工具 |
| 前端状态 | Pinia | 2.x | Vue 官方推荐状态管理 |
| 前端请求 | Axios | 1.x | HTTP 请求库 |
| 后端框架 | NestJS | 10.x | 企业级 Node.js 框架 |
| 后端语言 | TypeScript | 5.x | JavaScript 超集，强类型 |
| ORM | TypeORM | 0.3.x | TypeScript 优先的 ORM |
| 数据库 | MySQL | 8.0 | 关系型数据库 |
| 缓存 | Redis | 6.0+ | 内存缓存（Token 黑名单、限流） |
| 认证 | JWT + Passport | - | JSON Web Token 认证 |
| API 文档 | Swagger UI | 7.x | 自动生成接口文档 |
| 密码加密 | bcrypt | 5.x | 密码哈希加密 |
| 日志 | Winston | 3.x | 生产级日志库 |
| 定时任务 | @nestjs/schedule | 4.x | Cron 定时任务 |
| 限流 | @nestjs/throttler | 5.x | API 请求限流 |
| 测试 | Jest + Supertest | 29.x | 单元测试与端到端测试 |

---

## 目录结构

```
shuhe-wenchuang-platform/
├── backend/                          # 后端项目（NestJS）
│   ├── src/
│   │   ├── common/                   # 公共模块
│   │   │   ├── decorators/           # 装饰器（@Public、@CurrentUser、@TxPassword）
│   │   │   ├── dto/                  # 公共 DTO（统一响应 BaseResponseVo、分页 PaginationDto）
│   │   │   ├── enums/                # 枚举（错误码 ErrorCode）
│   │   │   ├── filters/             # 异常过滤器（HttpExceptionFilter）
│   │   │   ├── guards/              # 守卫（JwtAuthGuard、TxPasswordGuard）
│   │   │   ├── interceptors/        # 拦截器（TransformInterceptor 统一响应包装）
│   │   │   └── pipes/               # 管道（ParseIntWithDefaultPipe）
│   │   ├── config/                  # 配置文件
│   │   │   ├── database.config.ts   # TypeORM 数据库配置
│   │   │   ├── jwt.config.ts        # JWT 配置
│   │   │   ├── payment.config.ts    # 支付配置
│   │   │   └── redis.config.ts      # Redis 配置
│   │   ├── database/
│   │   │   └── entities/            # TypeORM 实体（42 张表）
│   │   ├── modules/                 # 业务模块（14 个）
│   │   │   ├── user/                # 用户模块（13 端点）
│   │   │   ├── collectible/         # 藏品模块（5 端点）
│   │   │   ├── market/              # 市场模块（6 端点）
│   │   │   ├── blindbox/            # 盲盒模块（3 端点）
│   │   │   ├── synthesis/           # 合成模块（4 端点）
│   │   │   ├── checkin/             # 签到模块（2 端点）
│   │   │   ├── luckydraw/           # 抽奖模块（5 端点）
│   │   │   ├── transfer/            # 转赠模块（5 端点）
│   │   │   ├── payment/             # 支付模块（5 端点）
│   │   │   ├── priority/            # 优先购模块（3 端点）
│   │   │   ├── artifact/            # 文物展馆（2 端点）
│   │   │   ├── wallet/              # 钱包模块（5 端点）
│   │   │   ├── announcement/        # 公告新闻（3 端点）
│   │   │   └── system/              # 系统模块（4 端点）
│   │   ├── shared/                  # 共享服务
│   │   │   ├── redis.service.ts     # Redis 服务
│   │   │   ├── sms.service.ts       # 短信服务
│   │   │   ├── upload.service.ts    # 文件上传服务
│   │   │   ├── jwt.strategy.ts      # JWT 策略
│   │   │   └── payment/             # 支付渠道（支付宝/微信/汇付/易宝）
│   │   ├── app.module.ts            # 应用根模块
│   │   └── main.ts                  # 应用入口
│   ├── test/                        # 测试目录
│   ├── .env.example                 # 环境变量模板
│   ├── nest-cli.json                # NestJS CLI 配置
│   ├── tsconfig.json                # TypeScript 配置
│   └── package.json                 # 后端依赖
├── database/
│   └── init/
│       └── init-db.sql              # 数据库初始化脚本（42 张表 + 种子数据）
├── scripts/
│   └── init-db.sql                  # 数据库脚本副本
├── docs/                            # 项目文档
│   ├── api-mapping.md               # API 接口映射表
│   └── api-test.md                  # API 接口测试手册
└── README.md                        # 项目说明（本文件）
```

---

## 环境要求

在开始之前，请确保你的电脑上已安装以下软件。如果你是第一次接触这些工具，请按照下面的说明逐一安装。

### 1. Node.js（必须，版本 18 或以上）

Node.js 是运行 JavaScript 代码的环境，后端项目依赖它。

- **检查是否已安装**：打开终端（Windows 用"命令提示符"或"PowerShell"，Mac/Linux 用"终端"），输入：
  ```bash
  node -v
  ```
  如果显示类似 `v18.19.0` 或更高版本，说明已安装。如果提示"命令未找到"，请前往 [Node.js 官网](https://nodejs.org/) 下载 LTS（长期支持版）并安装。

- **推荐版本**：v18.x 或 v20.x LTS

### 2. MySQL 数据库（必须，版本 8.0）

MySQL 是存储项目数据的关系型数据库。

- **检查是否已安装**：在终端输入：
  ```bash
  mysql --version
  ```
  如果显示 `8.0.x` 说明已安装。如未安装，请前往 [MySQL 官网](https://dev.mysql.com/downloads/) 下载安装。

- **安装替代方案**：也可以使用 [Docker](https://www.docker.com/) 快速启动一个 MySQL 容器：
  ```bash
  docker run -d --name mysql8 -p 3306:3306 -e MYSQL_ROOT_PASSWORD=your_password mysql:8.0
  ```

### 3. Redis 缓存（必须，版本 6.0 或以上）

Redis 是一个内存数据库，本项目用它存储 JWT 黑名单、限流计数等。

- **检查是否已安装**：在终端输入：
  ```bash
  redis-cli ping
  ```
  如果返回 `PONG` 说明已安装且运行中。如未安装：
  - Mac：`brew install redis && brew services start redis`
  - Linux：`sudo apt install redis-server && sudo systemctl start redis`
  - Windows：前往 [Redis Windows 版](https://github.com/tporadowski/redis/releases) 下载
  - Docker：`docker run -d --name redis6 -p 6379:6379 redis:6`

### 4. npm 或 yarn（npm 随 Node.js 一起安装）

npm 是 Node.js 的包管理工具，用来安装项目依赖。

- **检查**：
  ```bash
  npm -v
  ```
  如果显示版本号即可。你也可以选择使用 [yarn](https://yarnpkg.com/)，两者皆可。

---

## 快速开始

以下步骤将引导你从零开始把项目跑起来。请按顺序执行每一步。

### 第一步：配置环境变量

环境变量文件 `.env` 存放数据库密码、JWT 密钥等敏感信息，**不应该提交到代码仓库**。项目提供了一个模板文件 `.env.example`，你需要复制一份并填入实际值。

1. 打开终端，进入后端目录：
   ```bash
   cd backend
   ```

2. 复制环境变量模板：
   ```bash
   # Mac / Linux
   cp .env.example .env

   # Windows (PowerShell)
   Copy-Item .env.example .env
   ```

3. 用文本编辑器（如 VS Code、记事本）打开 `.env` 文件，根据你的实际情况修改以下内容：

   ```ini
   # ---------- 数据库配置 ----------
   DB_HOST=localhost               # 数据库地址，本地开发填 localhost
   DB_PORT=3306                    # 数据库端口，默认 3306
   DB_USERNAME=root                # 数据库用户名，默认 root
   DB_PASSWORD=你的MySQL密码        # ← 必改！填入你安装 MySQL 时设置的密码
   DB_DATABASE=shuhe_wenchuang     # 数据库名（注意：须与 init-db.sql 中的库名一致）
   DB_SYNC=false                   # 开发环境可设 true 自动同步表结构（生产环境必须 false）

   # ---------- Redis 配置 ----------
   REDIS_HOST=localhost            # Redis 地址，本地填 localhost
   REDIS_PORT=6379                 # Redis 端口，默认 6379
   REDIS_PASSWORD=                 # Redis 密码，没设密码就留空

   # ---------- JWT 配置 ----------
   JWT_SECRET=替换为一串随机字符串   # ← 必改！建议填入 32 位以上的随机字符串
   JWT_EXPIRES_IN=7d               # JWT 有效期，7 天
   JWT_REFRESH_SECRET=另一串随机字符串  # ← 必改！与上面不同的随机字符串
   JWT_REFRESH_EXPIRES_IN=30d      # 刷新 Token 有效期，30 天

   # ---------- 短信服务配置 ----------
   SMS_ACCESS_KEY=                 # 短信服务商 AccessKey（开发环境可留空）
   SMS_SECRET=                     # 短信服务商 Secret（开发环境可留空）

   # ---------- 支付宝配置 ----------
   ALIPAY_APP_ID=                  # 支付宝 App ID（开发环境可留空）
   ALIPAY_PRIVATE_KEY=             # 支付宝私钥
   ALIPAY_PUBLIC_KEY=              # 支付宝公钥

   # ---------- 微信支付配置 ----------
   WECHAT_MCH_ID=                  # 微信商户号
   WECHAT_APP_ID=                  # 微信 App ID

   # ---------- 文件存储配置 ----------
   UPLOAD_ENDPOINT=                # 文件上传端点
   UPLOAD_BUCKET=                  # 存储桶名称
   UPLOAD_ACCESS_KEY=              # 上传 AccessKey
   UPLOAD_SECRET_KEY=              # 上传 SecretKey

   # ---------- 站点配置 ----------
   SITE_URL=http://localhost:3000  # 站点地址
   ```

   **重要提示**：
   - `DB_PASSWORD` 必须填入你实际的 MySQL 密码，否则无法连接数据库。
   - `DB_DATABASE` 建议填 `shuhe_wenchuang`（与数据库初始化脚本中的库名一致）。
   - `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 请填入不同的随机字符串，可以用以下命令生成：
     ```bash
     # 在终端运行，生成随机字符串
     openssl rand -hex 32
     ```
   - 短信、支付宝、微信、文件存储等第三方配置在开发阶段可以先留空，不影响本地启动。

---

### 第二步：初始化数据库

项目提供了一个完整的 SQL 脚本，包含 42 张表的建表语句和基础种子数据。

1. 首先登录 MySQL（在终端输入以下命令，然后输入你的 MySQL 密码）：
   ```bash
   mysql -u root -p
   ```

2. 执行初始化脚本。在 MySQL 命令行中输入：
   ```sql
   SOURCE /workspace/shuhe-wenchuang-platform/database/init/init-db.sql;
   ```

   > **注意**：请将路径替换为你项目中 `init-db.sql` 的实际绝对路径。Windows 用户路径格式类似 `C:/Users/你的用户名/项目路径/database/init/init-db.sql`（用正斜杠 `/`）。

   该脚本会自动完成以下操作：
   - 创建数据库 `shuhe_wenchuang`（utf8mb4 字符集）
   - 创建 42 张业务表（用户、藏品、订单、钱包、盲盒、合成、抽奖等）
   - 插入基础种子数据（分类、系统配置、示例藏品等）

3. 验证数据库是否创建成功：
   ```sql
   USE shuhe_wenchuang;
   SHOW TABLES;
   ```
   如果看到 42 张表名列表，说明初始化成功。输入 `exit` 退出 MySQL 命令行。

> **替代方式**：也可以在终端直接执行（不进入 MySQL 交互模式）：
> ```bash
> mysql -u root -p < database/init/init-db.sql
> ```

---

### 第三步：安装后端依赖

依赖是项目运行所需的第三方代码库，需要通过 npm 下载安装。

1. 确保你在 `backend` 目录下：
   ```bash
   cd backend
   ```

2. 安装依赖（首次安装可能需要几分钟，请耐心等待）：
   ```bash
   npm install
   ```

   如果你使用 yarn：
   ```bash
   yarn install
   ```

3. 安装完成后，`backend` 目录下会多出一个 `node_modules` 文件夹，里面是所有依赖包。**不要手动修改或删除这个文件夹**。

> **常见问题**：如果安装速度很慢，可以切换为国内镜像源：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```
> 然后重新运行 `npm install`。

---

### 第四步：启动开发服务器

开发服务器会以"热重载"模式运行，你修改代码后服务会自动重启。

1. 确保你在 `backend` 目录下，且已完成上述三步（配置 .env、初始化数据库、安装依赖）。

2. 确保 MySQL 和 Redis 服务已启动（如果它们是手动启动的）。

3. 启动开发服务器：
   ```bash
   npm run start:dev
   ```

4. 看到类似以下输出说明启动成功：
   ```
   2026-08-07 10:00:00 [App] info: Nest application successfully started
   2026-08-07 10:00:00 [App] info: Application is running on: http://localhost:3000
   ```

5. 服务启动后，后端 API 将在 `http://localhost:3000` 上运行。

> **常见问题**：如果启动报错，请检查：
> - MySQL 是否已启动且密码正确（检查 `.env` 中的 `DB_PASSWORD`）
> - Redis 是否已启动
> - `.env` 文件是否存在且配置正确
> - 数据库 `shuhe_wenchuang` 是否已创建

---

### 第五步：查看 API 文档

项目内置了 Swagger UI 交互式 API 文档，你可以在浏览器中查看所有接口的详细说明，并直接在页面上测试。

1. 确保后端开发服务器正在运行（第四步）。

2. 打开浏览器，访问：
   ```
   http://localhost:3000/api/docs
   ```

3. 你将看到 Swagger UI 页面，包含所有 14 个模块的 API 接口文档。每个接口都可以展开查看请求参数、响应格式，并点击"Try it out"直接测试。

> **提示**：需要 JWT 认证的接口旁边有一个锁图标。点击后输入 `Bearer 你的Token` 即可授权（注意 `Bearer` 和 Token 之间有一个空格）。

---

### 第六步：运行测试

项目包含端到端（e2e）测试，用于验证 API 接口的正确性。

1. 确保你在 `backend` 目录下。

2. 运行全部测试：
   ```bash
   npm run test:e2e
   ```

3. 运行单元测试：
   ```bash
   npm test
   ```

4. 测试结果会显示在终端中，绿色 `√` 表示通过，红色 `×` 表示失败。

> **提示**：运行测试前请确保数据库和 Redis 已启动。测试可能会操作数据库，建议在开发环境中运行。

---

## 前端启动

前端项目基于 Vue 3 + Vite 构建，以下是从零启动前端的步骤。

1. 进入前端目录（如果前端代码在 `frontend` 文件夹中）：
   ```bash
   cd frontend
   ```

   > 如果项目中还没有 `frontend` 目录，请先创建一个 Vue 3 项目：
   > ```bash
   > npm create vite@latest frontend -- --template vue
   > cd frontend
   > npm install
   > npm install pinia axios vue-router
   > ```

2. 安装前端依赖：
   ```bash
   npm install
   ```

3. 配置后端 API 地址。在前端项目根目录创建 `.env` 文件：
   ```ini
   VITE_API_BASE_URL=http://localhost:3000
   ```

4. 启动前端开发服务器：
   ```bash
   npm run dev
   ```

5. 启动成功后，终端会显示类似信息：
   ```
   VITE v5.x  ready in 300 ms
   ➜  Local:   http://localhost:5173/
   ```

6. 打开浏览器访问 `http://localhost:5173` 即可看到前端页面。

---

## 生产部署

将项目部署到生产环境时，需要编译代码并使用生产模式运行。

### 后端部署

1. 编译 TypeScript 代码为 JavaScript：
   ```bash
   cd backend
   npm run build
   ```

   编译后的代码会输出到 `backend/dist` 目录。

2. 以生产模式启动：
   ```bash
   npm run start:prod
   ```

   生产模式下，`NODE_ENV` 应设为 `production`，数据库的 `synchronize` 会自动设为 `false`（不会自动修改表结构）。

3. 推荐使用 [PM2](https://pm2.keymetrics.io/) 进程管理工具保持服务持续运行：
   ```bash
   # 全局安装 PM2
   npm install -g pm2

   # 用 PM2 启动后端
   NODE_ENV=production pm2 start dist/main.js --name shuhe-backend

   # 设置开机自启
   pm2 startup
   pm2 save
   ```

### 前端部署

1. 编译前端代码：
   ```bash
   cd frontend
   npm run build
   ```

   编译后的静态文件输出到 `frontend/dist` 目录。

2. 将 `dist` 目录部署到 Nginx 或其他静态文件服务器，配置反向代理将 `/api` 请求转发到后端 3000 端口。Nginx 配置示例：

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # 前端静态文件
       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }

       # API 反向代理到后端
       location /api/ {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

---

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| 后端 API | 3000 | NestJS 服务监听端口，所有 API 请求地址前缀 |
| MySQL | 3306 | 数据库默认端口 |
| Redis | 6379 | 缓存服务默认端口 |
| 前端开发 | 5173 | Vite 开发服务器默认端口 |
| Swagger 文档 | 3000 | 后端 API 文档，路径 `/api/docs` |

> **注意**：如果某个端口被其他程序占用，可以在对应配置文件中修改端口号。后端端口在 `backend/src/main.ts` 的 `app.listen(3000)` 处修改；MySQL 端口在 `.env` 的 `DB_PORT` 处修改；Redis 端口在 `.env` 的 `REDIS_PORT` 处修改。

---

## 常见问题

### Q1：启动时报错 "ECONNREFUSED 127.0.0.1:3306"，怎么办？

这说明 MySQL 服务没有启动。请先启动 MySQL：
- Mac：`brew services start mysql`
- Linux：`sudo systemctl start mysql`
- Windows：在"服务"中找到 MySQL 并启动
- Docker：`docker start mysql8`

然后检查 `.env` 文件中的 `DB_PASSWORD` 是否正确。

### Q2：启动时报错 "ECONNREFUSED 127.0.0.1:6379"，怎么办？

这说明 Redis 服务没有启动。请先启动 Redis：
- Mac：`brew services start redis`
- Linux：`sudo systemctl start redis`
- Windows：运行 Redis 安装目录下的 `redis-server.exe`
- Docker：`docker start redis6`

### Q3：启动时报错 "ER_BAD_DB_ERROR: Unknown database 'shuhe_wenchuang'"，怎么办？

说明数据库还没有创建。请执行第二步"初始化数据库"，运行 `init-db.sql` 脚本。或者确认 `.env` 中的 `DB_DATABASE` 与实际数据库名一致。

### Q4：npm install 安装很慢或失败，怎么办？

切换为国内镜像源：
```bash
npm config set registry https://registry.npmmirror.com
```
然后删除 `node_modules` 和 `package-lock.json`，重新安装：
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q5：访问 API 返回 401 Unauthorized，怎么办？

这说明接口需要 JWT 认证但你没有提供 Token，或者 Token 已过期。请先调用 `POST /user/login` 登录获取 `access_token`，然后在请求头中添加：
```
Authorization: Bearer 你的access_token
```

### Q6：调用交易接口返回 "尚未设置交易密码"，怎么办？

涉及资产变动（挂售、购买、转赠）的接口需要交易密码。请先调用 `POST /sms/send`（scene=4）获取验证码，再调用 `POST /user/transaction-password` 设置交易密码。

### Q7：调用接口返回 429 Too Many Requests，怎么办？

全局限流策略为 60 秒内最多 100 次请求。请降低请求频率，等待一分钟后重试。

### Q8：修改密码后之前的 Token 还能用吗？

不能。修改登录密码或交易密码后，该用户之前所有的 Token 会立即失效（加入 Redis 黑名单），需要重新登录获取新 Token。

### Q9：订单多久会自动取消？

订单创建后 15 分钟内未支付会自动取消，并释放锁定的库存。后端定时任务每 5 分钟扫描一次超时未支付的订单。

### Q10：如何查看后端日志？

开发模式下日志直接输出到终端控制台。生产模式下如果使用 PM2，可以通过 `pm2 logs shuhe-backend` 查看日志。

### Q11：DB_SYNC 设为 true 有什么影响？

`DB_SYNC=true` 时，TypeORM 会根据实体类自动创建/修改数据库表结构。这在开发阶段很方便，但**生产环境必须设为 false**，否则可能导致数据丢失。建议开发阶段也尽量使用 SQL 脚本管理表结构，`DB_SYNC` 仅用于快速原型开发。

### Q12：.env.example 中 DB_DATABASE 写的是 nft_platform，但 init-db.sql 创建的是 shuhe_wenchuang，用哪个？

以 `init-db.sql` 为准，使用 `shuhe_wenchuang`。`database.config.ts` 中的默认值也是 `shuhe_wenchuang`。请在 `.env` 中将 `DB_DATABASE` 设为 `shuhe_wenchuang`。

---

## API 接口概览

本项目共提供 **65 个 API 端点**，覆盖 **14 个业务模块**。以下是各模块的简要说明：

| # | 模块 | 端点数 | 需JWT | 需交易密码 | 说明 |
|---|------|--------|-------|-----------|------|
| 1 | 用户模块 | 13 | 9 | 0 | 短信验证码、注册、登录、Token 刷新、登出、找回密码、修改密码、实名认证、修改资料、设置交易密码、用户信息、我的藏品、藏品流转历史 |
| 2 | 藏品模块 | 5 | 2 | 0 | 藏品分类、藏品列表、藏品详情、关注藏品、取消关注 |
| 3 | 市场模块 | 6 | 5 | 3 | 市场在售列表、挂售藏品、取消寄售、市场购买、发售购买、我的挂单 |
| 4 | 盲盒模块 | 3 | 1 | 0 | 盲盒列表、盲盒详情、开启盲盒 |
| 5 | 合成模块 | 4 | 3 | 0 | 合成活动列表、合成公式详情、提交合成、合成记录 |
| 6 | 签到模块 | 2 | 2 | 0 | 每日签到、签到记录 |
| 7 | 抽奖模块 | 5 | 4 | 0 | 抽奖活动列表、抽奖规则、抽奖次数明细、参与抽奖、中奖记录 |
| 8 | 转赠模块 | 5 | 5 | 1 | 发起转赠、确认接收、拒绝转赠、取消转赠、转赠记录 |
| 9 | 支付模块 | 5 | 4 | 0 | 订单列表、订单详情、创建支付、支付回调、取消订单 |
| 10 | 优先购模块 | 3 | 3 | 0 | 优先购活动列表、资格查询、优先购买 |
| 11 | 文物展馆 | 2 | 0 | 0 | 文物展品列表、文物展品详情 |
| 12 | 钱包模块 | 5 | 3 | 0 | 钱包信息、支付通道、钱包流水、钱包充值、充值回调 |
| 13 | 公告新闻 | 3 | 0 | 0 | 公告列表、公告详情、首页轮播图 |
| 14 | 系统模块 | 4 | 2 | 0 | 合规文档、文件上传、全局配置、意见反馈 |
| - | **合计** | **65** | **43** | **4** | 覆盖全部前端业务场景 |

### 认证说明

- **公开接口**（20 个）：无需登录，任何人可直接访问，如藏品列表、市场列表、公告等。
- **JWT 接口**（43 个）：需在请求头携带 `Authorization: Bearer <token>`，如用户信息、我的藏品、签到、抽奖等。
- **交易密码接口**（4 个）：在 JWT 基础上额外需要交易密码，仅涉及资产变动的操作：挂售藏品、发售购买、市场购买、发起转赠。
- **回调接口**（2 个）：第三方支付平台服务器调用，通过签名验签，不走 JWT 认证。

### 统一响应格式

所有业务接口返回统一的 JSON 格式：

```json
{
  "code": 200,
  "data": { ... },
  "message": "success"
}
```

- `code`：业务状态码，200 表示成功，与 HTTP 状态码一致
- `data`：业务数据，可能是对象、数组或 null
- `message`：提示信息

回调接口返回纯文本 `SUCCESS`。

### 相关文档

- [API 接口映射表](docs/api-mapping.md) - 65 个端点的完整映射，含 Controller 方法、认证要求、交易密码标识
- [API 接口测试手册](docs/api-test.md) - 各模块核心端点的 cURL 测试用例
- [Swagger 在线文档](http://localhost:3000/api/docs) - 交互式 API 文档（需启动后端服务）

---

## 可用脚本命令

在 `backend` 目录下可使用以下命令：

| 命令 | 说明 |
|------|------|
| `npm run start:dev` | 以开发模式启动（热重载，修改代码自动重启） |
| `npm run build` | 编译 TypeScript 代码到 `dist/` 目录 |
| `npm run start:prod` | 以生产模式运行编译后的代码 |
| `npm test` | 运行单元测试 |
| `npm run test:e2e` | 运行端到端测试 |
