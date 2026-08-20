# 深度 Code Review 与风险扫描报告

> **项目**: 数和文创数字藏品平台  
> **审查日期**: 2026-08-16  
> **审查范围**: 后端 NestJS + 前端 Vue3 Admin + MariaDB + Redis  
> **审查方法**: 8 维度全量代码审查，覆盖 63 张表、20 个 Admin 模块、50 个前端页面

---

## 🔴 P0 级风险（必须立即修复，否则上线必炸）

### P0-1：JWT 管理员密钥硬编码兜底值，生产环境校验遗漏

**所在位置**：
- `backend-nestjs/src/modules/admin/strategies/admin-jwt.strategy.ts` 第 58-60 行
- `backend-nestjs/src/modules/admin/services/admin-auth.service.ts` 第 643-647 行
- `backend-nestjs/src/modules/admin/admin.module.ts` 第 160 行
- `backend-nestjs/src/config/env.validation.ts`（缺失 `JWT_ADMIN_SECRET` 校验）

**问题描述**：管理员 JWT 密钥在三处均使用硬编码兜底值 `'shuhe-admin-secret-2026'`。`env.validation.ts` 的生产环境校验只检查了 `JWT_SECRET` 和 `JWT_REFRESH_SECRET`，**完全没有校验 `JWT_ADMIN_SECRET`**。生产环境如果未设置该环境变量，应用仍可正常启动并使用默认密钥。攻击者一旦知晓此默认值，即可伪造任意管理员 JWT Token，获得后台完全控制权。

**修复建议**：
```typescript
// env.validation.ts 补充校验
if (isProd && !process.env.JWT_ADMIN_SECRET) {
  throw new Error('[Env] 生产环境必须配置 JWT_ADMIN_SECRET');
}

// admin-jwt.strategy.ts 移除兜底值
secretOrKey: configService.get<string>('JWT_ADMIN_SECRET'); // 不给默认值
```

---

### P0-2：2FA 临时 Token 可绕过两步验证访问所有管理端点

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-auth.service.ts` 第 199-218 行  
**关联文件**：`backend-nestjs/src/modules/admin/strategies/admin-jwt.strategy.ts` 第 72-100 行

**问题描述**：当管理员启用 2FA 后，登录时签发一个携带 `pending2fa: true` 的临时 Token（5 分钟有效）。但 `AdminJwtStrategy.validate()` **不检查 `pending2fa` 字段**，只验证管理员是否存在且未被禁用。因此该临时 Token 通过 `AdminJwtGuard` 校验后，可被用于访问**任何**管理后台端点（退款审批、用户冻结、数据清理等），完全绕过 2FA。攻击者只需获取用户名密码即可在 5 分钟窗口内执行任意管理操作。

**修复建议**：
```typescript
// admin-jwt.strategy.ts validate() 方法内
async validate(payload: any) {
  const admin = await this.adminUserRepo.findOne({ where: { id: payload.id } });
  if (!admin || admin.status !== 1) throw new UnauthorizedException();
  
  // 新增：检查 2FA 临时 Token
  if (payload.pending2fa === true) {
    throw new UnauthorizedException('请先完成两步验证');
  }
  return admin;
}
```

---

### P0-3：退款审批存在 TOCTOU 竞态条件，可导致重复退款

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-refund.service.ts` 第 87-167 行

**问题描述**：状态检查（`refund.status !== 0`）在事务外执行（第 88 行），事务内（第 98 行开始）未使用悲观锁（`FOR UPDATE`）或乐观锁重新校验。两个并发请求可同时通过状态检查，然后各自执行退款逻辑，导致**同一笔退款被执行两次**，用户钱包余额被重复充值。这是直接的资金安全漏洞。

**修复建议**：
```typescript
async approve(id: number, adminId: number): Promise<NftRefund> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE');
  try {
    // 事务内加悲观锁重新查询
    const refund = await queryRunner.manager
      .createQueryBuilder(NftRefund, 'r')
      .setLock('pessimistic_write')
      .where('r.id = :id', { id })
      .getOne();
    
    if (!refund || refund.status !== 0) {
      throw new BadRequestException('退款记录不存在或已处理');
    }
    // ... 退款逻辑 ...
    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

### P0-4：Mock 数据残留——21 个视图文件在 API 失败时回退到假数据

**所在位置**：`admin-manager/src/api/mock.ts`（整个文件，281 行）+ 21 个视图文件

**问题描述**：Mock 数据被广泛保留并作为 API 失败时的"降级"方案。生产环境 API 出错时，管理员看到的是 58 条假用户、80 条假订单、35 个假藏品等虚假数据，可能导致运营决策失误。

**受影响文件**：`order/index.vue`、`user/index.vue`、`market/index.vue`、`blindbox/index.vue`、`blindbox/detail.vue`、`blindbox/create.vue`、`collectible/onchain.vue`、`collectible/detail.vue`、`collectible/category.vue`、`transfer/index.vue`、`refund/index.vue`、`realname/index.vue`、`permission/admin.vue`、`permission/log.vue`、`report/index.vue`、`ticket/index.vue`、`airdrop.vue`、`luckydraw.vue`、`checkin.vue`、`synthesis.vue`、`invite.vue`、`register.vue`、`priority.vue`、`system/index.vue`、`decoration.vue`、`platform/index.vue`、`market/listings.vue`

**同时发现 24 处 `setTimeout` 模拟 API 延迟**，分布在上述文件中。

**修复建议**：
```typescript
// 生产环境应移除所有 mock 回退
// 将 catch 块改为：
catch (err) {
  ElMessage.error('数据加载失败: ' + (err as Error).message);
  list.value = []; // 空数组而非 mock 数据
}
```

---

### P0-5：前端全量加载 + 客户端过滤——超过 100 条数据丢失

**所在位置**：
- `admin-manager/src/views/user/index.vue` 第 196-233 行
- `admin-manager/src/views/order/index.vue` 第 331-372 行

**问题描述**：用户列表和订单列表仅请求 `pageSize: 100` 一次性加载，然后用 `Array.filter()` 在前端做搜索/筛选/分页。超过 100 条的数据完全不可见。后端已支持服务端分页参数，但前端完全未利用。

**修复建议**：
```typescript
// 将搜索参数传给后端
const result = await userApi.list({
  page: currentPage.value,
  pageSize: pageSize.value,
  keyword: searchForm.keyword,     // 传给后端
  status: searchForm.status,        // 传给后端
  startDate: searchForm.dateRange?.[0],
  endDate: searchForm.dateRange?.[1],
});
// 移除前端的 getFilteredData() 和 paginate()
```

---

### P0-6：上链任务实体与 SQL Schema 严重不匹配

**所在位置**：
- `backend-nestjs/src/database/entities/nft-onchain-task.entity.ts`
- `sql/migrations/002_admin_v1.sql` 第 398-421 行

**问题描述**：TypeORM 实体定义了 `channelId`、`type`、`targetType`、`targetId`、`payload`、`retryCount`、`maxRetry`、`processedAt`、`confirmedAt` 等字段；但 SQL 建表语句定义的是 `collectible_id`、`user_collectible_id`、`task_type`、`tx_hash`、`block_number`、`token_id`、`operator_id`、`executed_at`、`completed_at`。字段名和语义完全不同，运行时会因列不存在而报错。

**修复建议**：统一实体与 SQL 的字段定义，以实体为准重建 SQL 表结构。

---

### P0-7：订单 pageSize 无上限，可被恶意请求触发 OOM

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-order.service.ts` 第 45-46 行

**问题描述**：
```typescript
const page = Number(query.page) || 1;
const pageSize = Number(query.pageSize) || 20;  // 无 Math.min 上限！
```
对比其他 service 都有 `Math.min(100, ...)` 限制。攻击者可传 `pageSize=999999` 一次性加载全表，导致内存溢出。

**修复建议**：
```typescript
const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
```

---

### P0-8：.env 安全配置薄弱

**所在位置**：`backend-nestjs/.env`

**问题描述**：
```env
DB_USERNAME=root          # 使用 root 账号
DB_PASSWORD=              # 空密码
JWT_SECRET=shuhe-jwt-secret-2026   # 弱密钥，可预测
REDIS_PASSWORD=           # 空密码
```
虽然 `env.validation.ts` 会在生产环境阻止启动，但 `.env` 中的默认值容易被直接复制到生产环境。

**修复建议**：生产环境必须使用强随机密钥（至少 32 字符），创建独立数据库账号并授予最小权限。

---

## 🟠 P1 级风险（1 周内修复）

### P1-1：敏感端点缺少专属速率限制

**所在位置**：`backend-nestjs/src/modules/admin/controllers/admin-auth.controller.ts`

**问题描述**：除登录端点有限流（5 次/60 秒）外，以下敏感端点无专属限流：
- `POST /refresh` — 可暴力枚举 refresh token
- `PUT /password` — 可暴力枚举原密码
- `POST /2fa/verify` — 可暴力枚举 6 位 TOTP 码（仅 100 万种组合）

**修复建议**：为上述端点添加 `@Throttle({ default: { limit: 5, ttl: 60000 } })`。

---

### P1-2：区块链渠道 config 字段明文存储敏感配置

**所在位置**：`backend-nestjs/src/database/entities/nft-chain-channel.entity.ts` 第 39-40 行

**问题描述**：`config` JSON 字段用于存储区块链渠道配置（RPC 凭据、合约 ABI、钱包私钥等），以明文 JSON 直接存入数据库。`getChannelList` 在列表 API 中直接返回 `config` 字段，存在敏感信息泄露风险。项目已有 `DATA_AES_KEY` 加密密钥但未使用。

**修复建议**：使用 AES 加密 `config` 字段，列表 API 返回脱敏数据。

---

### P1-3：Token 存储在 localStorage，存在 XSS 风险

**所在位置**：`admin-manager/src/api/request.ts` 第 10, 14-25 行

**问题描述**：JWT Token 存储在 `localStorage`，任何注入的恶意脚本可通过 `localStorage.getItem('admin_token')` 窃取管理员令牌。

**修复建议**：改用 httpOnly + Secure + SameSite cookie 存储 token。

---

### P1-4：89 处 `any` 类型——API 层无类型约束

**所在位置**：`admin-manager/src/api/index.ts`

**问题描述**：API 层大量使用 `Record<string, any>` 作为参数类型，`<any>` 作为返回类型，编译期无法发现字段拼写错误或类型不匹配。全项目共 98 处 `any` 分布在 49 个文件中。

**修复建议**：为每个 API 接口定义 TypeScript 接口类型。

---

### P1-5：前端操作未调用后端接口

**所在位置**：
- `admin-manager/src/views/user/index.vue` 第 266-301 行
- `admin-manager/src/views/order/index.vue` 第 423-455 行

**问题描述**：冻结/解冻/重置密码/强制登出、标记已支付、强制取消、退款等操作仅修改前端 `row` 对象，未调用对应后端接口。管理员点击操作后看到"成功"提示，但数据并未真正变更。

**修复建议**：所有操作必须调用真实 API，成功后刷新列表。

---

### P1-6：11 张表缺失外键约束

**所在位置**：数据库 `shuhe_wenchuang`

**问题描述**：以下表只有索引无外键约束，可插入引用不存在记录的数据：
- `nft_refunds`（order_id, user_id, payment_id）
- `nft_approvals`（requester_id, approver_id）
- `nft_blacklist`（operator_id）
- `nft_destroy_records`（admin_id）
- `nft_risk_alerts`（user_id, handler_id）
- `nft_security_events`（handled_by）
- `nft_support_tickets`（user_id, assignee_id）
- `nft_platform_cleanup_logs`（operator_id）
- `nft_inventory_quotas`（collectible_id）
- `nft_qualification_configs`（collectible_id）
- `nft_audit_logs`（operator_id）

**修复建议**：添加 `FOREIGN KEY` 约束或应用层完整性校验。

---

### P1-7：上链任务无死信队列、无自动重试

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-chain.service.ts`

**问题描述**：
- 无自动重试机制——只有手动调用 `retryTask()` API 才能重试
- 无死信队列——失败任务永久停留在 `status=3`
- 无自动告警、无通知机制
- `maxRetry` 硬编码为 3，不可配置

**修复建议**：添加定时任务（`@Cron`）扫描失败任务自动重试，超过 `maxRetry` 后转入死信队列并发送告警。

---

### P1-8：订单无集中式状态机

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-order.service.ts`

**问题描述**：状态转换校验分散在各方法中，无统一 transition map。状态值 1-5 在代码中均为魔法数字。`repairOrder()` 中 2→3 转换直接操作 `collectible.sold` 和 `collectible.serialCurrent`，无乐观锁，存在并发超卖风险。

**修复建议**：
```typescript
const ORDER_TRANSITIONS: Record<number, number[]> = {
  1: [2, 4, 5],  // pending → paid, cancelled, expired
  2: [3],        // paid → delivering
  3: [4],        // delivering → completed
};
function canTransition(from: number, to: number): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
```

---

### P1-9：盲盒概率管理端无校验

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-blind-box.service.ts` 第 255-317 行

**问题描述**：C 端开盒时有概率和校验（`probSum < 0.99 || > 1.01` 时抛异常），但管理端新增/编辑盲盒项时无校验，无取值范围校验。管理员可设置负数或大于 1 的 probability 值，错误只在用户开盒时才暴露。

**修复建议**：在 `addItem()` 和 `updateItem()` 中校验 probability 取值范围和总和。

---

### P1-10：订单列表缺关联查询（N+1 问题）

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-order.service.ts` 第 35-75 行

**问题描述**：`findList` 仅查询订单表，未 join 用户（phone/username）、藏品（name/image）、支付信息。`findOne` 通过 `Promise.all` 单独查询三张表，列表场景大概率也需要这些关联数据。参考 `admin-blind-box.service.ts` 正确使用 `leftJoinAndMapOne`。

**修复建议**：在 `findList` 中添加 `leftJoinAndSelect` 关联用户和藏品表。

---

### P1-11：Redis 未缓存热点数据

**所在位置**：后端全局

**问题描述**：Redis 仅用于 token 存储、限流、幂等锁。以下变更频率低但读取频率高的热数据完全未缓存：藏品列表、Banner/轮播图、系统配置、首页推荐。

**修复建议**：为热点数据添加 Redis 缓存层，设置合理 TTL，数据变更时主动清除缓存。

---

### P1-12：导出方法无分页，全量加载

**所在位置**：
- `backend-nestjs/src/modules/admin/services/admin-user.service.ts` 第 400-422 行（`limit(10000)`）
- `backend-nestjs/src/modules/admin/services/admin-order.service.ts` 第 373-452 行（**完全无 limit**）

**问题描述**：`exportOrders` 完全没有 limit，如果订单表有百万级数据，一次查询会将全部数据载入内存，可能导致 OOM。

**修复建议**：分批查询导出，或使用游标/流式处理。

---

### P1-13：forceLogout 方法是空壳 stub

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-user.service.ts` 第 189-196 行

**问题描述**：此方法仅记录日志后返回成功，实际并未执行任何下线操作。用户 token 仍然有效，"强制下线"功能形同虚设。注意 `user.service.ts` 第 1350 行已有 `incrTokenVersion` 方法可用，但此处未调用。

**修复建议**：调用 `this.userWalletService.incrTokenVersion(id)` 或直接操作 Redis 递增 token 版本号。

---

### P1-14：33 处 TODO 标记的未实现功能

**所在位置**：后端全局

**问题描述**：全项目共 33 处 `// TODO` 注释，涉及核心业务功能未实现：
- 支付通道未接入（`payment.service.ts` 第 237 行）
- 上链 mint 未实现（`payment.service.ts` 第 442-443 行）
- 链上 transferFrom 未实现（`transfer.service.ts` 第 327 行）
- 短信服务商未接入（`user.service.ts` 第 211 行）
- 实名认证未实现（`user.service.ts` 第 625 行）
- OSS 上传未实现（`system.service.ts` 第 91 行）
- 积分/抽奖发放未实现（`checkin.service.ts` 第 126 行）

**修复建议**：上线前评估每个 TODO 的影响范围，核心支付和上链功能必须在上线前实现。

---

### P1-15：console 绕过 Winston 结构化日志

**所在位置**：`user.service.ts`、`redis.config.ts`、`env.validation.ts`、`jwt.config.ts` 等文件

**问题描述**：`main.ts` 已配置 `nest-winston` 作为全局日志器，但多文件仍直接使用 `console.warn/error/log`，绕过了 Winston 的结构化日志格式。

**修复建议**：统一使用 NestJS `Logger` 类替换所有 `console.*` 调用。

---

### P1-16：无请求日志拦截器

**所在位置**：`backend-nestjs/src/common/interceptors/`（仅有 `transform.interceptor.ts`）

**问题描述**：缺失 LoggingInterceptor，无法记录请求耗时、请求路径/方法、请求体/响应体审计、慢请求告警、Request ID 链路追踪。

**修复建议**：实现 `LoggingInterceptor` 并全局注册。

---

### P1-17：退款拒绝操作无事务保护

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-refund.service.ts` 第 172-190 行

**问题描述**：拒绝操作既无事务也无乐观锁，并发请求可同时通过状态检查。拒绝原因被追加到 `reason` 字段而非独立字段。

**修复建议**：添加事务包裹，使用独立的 `reject_reason` 字段。

---

### P1-18：追溯铸造与离线标识生成无事务保护

**所在位置**：`backend-nestjs/src/modules/admin/services/admin-chain.service.ts` 第 407, 453-458 行

**问题描述**：`retroactiveMint` 批量保存任务时未使用事务（对比 `batchMint` 使用了事务）。离线标识生成使用 `Promise.all` 并行更新，无事务包裹，且使用 `Math.random()` 生成安全标识（不安全）。

**修复建议**：使用 `dataSource.transaction()` 包裹，用 `crypto.randomBytes()` 替代 `Math.random()`。

---

## 🟡 P2 级风险（1 个月内优化）

### P2-1：修改密码后未吊销当前 Access Token
**位置**：`admin-auth.service.ts` 第 495-499 行  
**说明**：修改密码后只删除了 Refresh Token，Access Token 在 8 小时有效期内仍可使用。

### P2-2：bcrypt 轮数偏低
**位置**：`admin-auth.service.ts` 第 44 行  
**说明**：`BCRYPT_ROUNDS = 10` 满足最低要求，但管理后台建议使用 12 轮。

### P2-3：操作日志不在同一事务中
**位置**：`admin-collectible.service.ts` 多处  
**说明**：`release`、`relist`、`forceSoldout`、`softDelete`、`resaleToggle`、`priceControl` 等方法使用 `logOperation` 而非 `logOperationWith`，数据变更已提交但操作日志写入可能失败。

### P2-4：异常处理泄露内部错误信息
**位置**：`admin-refund.service.ts` 第 160 行、`admin-collectible.service.ts` 多处  
**说明**：将原始 `err.message` 拼接到 HTTP 响应中，可能泄露数据库表名、字段名等。

### P2-5：请求无超时控制
**位置**：`admin-manager/src/api/request.ts` 第 74-78 行  
**说明**：未设置 `AbortController`/`signal`，网络异常时请求永久挂起。

### P2-6：订单状态 5（已过期）无处理逻辑
**位置**：`admin-order.service.ts` 第 127 行  
**说明**：`cancelOrder()` 仅允许 status=1 取消，过期订单无法处理。

### P2-7：盲盒 probability 无取值范围校验
**位置**：`admin-blind-box.service.ts`  
**说明**：不检查 probability 是否在 [0, 1] 区间，可传入负数或大于 1 的值。

### P2-8：配置文件双重导出导致逻辑重复
**位置**：`jwt.config.ts`、`redis.config.ts`、`payment.config.ts`  
**说明**：同时导出工厂函数和静态对象，逻辑完全重复，修改一处而遗漏另一处会导致配置不一致。

### P2-9：TransformInterceptor 回调判断冗余
**位置**：`transform.interceptor.ts` 第 37-44 行  
**说明**：第一个条件已涵盖第二个条件，第二个检查永远不会执行到。

### P2-10：异常过滤器日志缺少结构化字段
**位置**：`http-exception.filter.ts` 第 86-93 行  
**说明**：日志为拼接字符串，未记录请求体、用户 ID、请求 IP、响应耗时、Request ID。

### P2-11：渠道编码唯一性检查存在竞态
**位置**：`admin-chain.service.ts` 第 116-137 行  
**说明**：唯一性检查与插入之间无事务隔离，依赖数据库唯一索引兜底。

### P2-12：Vite 代理 localhost 硬编码
**位置**：`admin-manager/vite.config.ts` 第 13 行  
**说明**：`target: 'http://localhost:3000'`，生产环境需通过环境变量配置。

### P2-13：maxRetry 硬编码为 3
**位置**：`admin-chain.service.ts` 第 319, 403 行  
**说明**：不可通过配置调整重试次数。

---

## ✅ 已确认安全项

1. **SQL 注入防护**：所有 `createQueryBuilder` 的 WHERE 子句均使用参数化查询（`:param` 语法），未发现字符串拼接注入风险。`getRepoByTable` 使用 switch 白名单限制可操作表名。

2. **CORS 配置正确**：使用白名单模式，未使用 `origin: '*'`。生产环境强制要求配置 `CORS_ALLOWED_ORIGINS`。

3. **管理员守卫全覆盖**：全部 20 个管理后台控制器均注册了 `@UseGuards(AdminJwtGuard)`。仅 `login` 和 `refresh` 端点使用 `@AdminPublic()` 跳过守卫，符合预期。

4. **ALTER TABLE 无 NOT NULL + 无 DEFAULT 问题**：联调过程中所有 ALTER TABLE 添加的字段，NOT NULL 列均正确设置了 DEFAULT 值。

5. **管理员密码使用 bcrypt**：`BCRYPT_ROUNDS = 10`，满足最低要求。

6. **全局异常过滤器已配置**：`http-exception.filter.ts` 统一处理异常，返回标准格式 `{ code, message, data }`。

7. **全局响应拦截器已配置**：`transform.interceptor.ts` 统一包装响应格式，正确处理支付回调透传。

8. **Winston 日志已集成**：`main.ts` 已正确配置 `nest-winston` 作为全局日志器。

9. **环境变量校验机制**：`env.validation.ts` 在生产环境会阻止弱密钥启动，CORS 和敏感配置有强制校验。

10. **盲盒 C 端概率和校验**：开盒时校验概率和是否为 1（±0.01 容差），防止概率配置错误。

11. **上链任务重试上限**：`retryTask()` 有 `maxRetry` 检查，不会无限重试。

12. **盲盒列表查询使用 LEFT JOIN**：`admin-blind-box.service.ts` 正确使用 `leftJoinAndMapOne` 关联藏品表，是其他 service 的参考模式。
