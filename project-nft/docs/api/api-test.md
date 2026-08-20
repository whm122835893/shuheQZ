# API 接口测试手册（cURL）

> 数和文创数字藏品平台 · 14 个模块核心端点 cURL 测试用例
>
> Base URL: `http://localhost:3000`
>
> 本手册使用 cURL 命令对各模块核心端点进行测试，涵盖公开接口、JWT 认证接口、交易密码接口与回调接口四大类。

---

## 前置准备

### 1. 环境变量约定

以下变量在测试命令中反复使用，建议在终端中预先导出：

```bash
# 后端服务地址
export BASE_URL="http://localhost:3000"

# 登录后获取的 JWT Token（请替换为实际值）
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 刷新 Token（登录/注册时下发）
export REFRESH_TOKEN="rft_8f2c1a9e5b7d4e6f0a1b2c3d4e5f6a7b"

# 交易密码（6 位数字）
export TX_PASSWORD="123456"

# 测试手机号
export PHONE="13800008888"
```

### 2. 认证说明

| 认证类型 | 说明 |
|----------|------|
| 公开 | 无需任何 Header，直接请求 |
| JWT | 请求头携带 `Authorization: Bearer <TOKEN>` |
| 交易密码 | 在 JWT 基础上，请求 Body 中额外携带 `transaction_password` 字段 |
| 回调 | 第三方支付平台服务器调用，通过 Body 中的 `signature` 字段验签 |

### 3. 统一响应结构

所有业务接口（回调除外）返回统一格式：

```json
{
  "code": 200,
  "data": { ... },
  "message": "success"
}
```

回调接口返回纯文本：`SUCCESS`

---

## 一、公开接口测试（无需 JWT）

公开接口使用 `@Public()` 装饰器标记，跳过全局 JWT 守卫，任何人均可直接访问。

---

### 1.1 用户模块

#### 1.1.1 发送短信验证码

**端点**: `POST /sms/send`

```bash
curl -X POST "${BASE_URL}/sms/send" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800008888",
    "scene": 1,
    "captcha_key": "ck_a1b2c3d4",
    "captcha_code": "8x3n"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "expire_in": 300
  },
  "message": "验证码已发送"
}
```

**说明**: `scene` 取值 1=注册 2=登录 3=修改密码 4=设置交易密码 5=找回密码。scene 为 1/2/5 时需传图形验证码。

---

#### 1.1.2 用户注册

**端点**: `POST /user/register`

```bash
curl -X POST "${BASE_URL}/user/register" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800008888",
    "code": "123456",
    "captcha_key": "ck_a1b2c3d4",
    "captcha_code": "8x3n",
    "login_password": "abc12345",
    "username": "数藏玩家",
    "inviter_uid": "10000"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "user_id": 10001,
    "phone": "138****8888",
    "username": "数藏玩家",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "rft_8f2c1a9e5b7d4e6f...",
    "expires_in": 604800
  },
  "message": "注册成功"
}
```

**说明**: 密码须为 8-20 位字母与数字组合；`inviter_uid` 为可选项（5 位数字）。注册成功直接返回 Token，无需再次登录。

---

#### 1.1.3 用户登录

**端点**: `POST /user/login`

```bash
# 方式一：密码登录
curl -X POST "${BASE_URL}/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800008888",
    "login_password": "abc12345"
  }'

# 方式二：短信验证码登录
curl -X POST "${BASE_URL}/user/login" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800008888",
    "code": "123456"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "user_id": 10001,
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "rft_8f2c1a9e5b7d4e6f...",
    "expires_in": 604800
  },
  "message": "登录成功"
}
```

**说明**: 验证码与登录密码二选一。登录后请将 `access_token` 保存到 `TOKEN` 环境变量，用于后续 JWT 接口测试。

---

#### 1.1.4 找回密码

**端点**: `POST /user/reset-password`

```bash
curl -X POST "${BASE_URL}/user/reset-password" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "13800008888",
    "code": "123456",
    "new_password": "newabc123"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": null,
  "message": "密码已重置，请重新登录"
}
```

**说明**: 无需登录态，使用短信验证码（scene=5）重置密码。

---

### 1.2 藏品模块

#### 1.2.1 藏品列表

**端点**: `GET /collectibles`

```bash
curl -X GET "${BASE_URL}/collectibles?page=1&page_size=20&category_id=1&status=on_sale"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "敦煌飞天·限量版",
        "cover_image": "https://cdn.example.com/cover/1.jpg",
        "price": "99.00",
        "circulate": 1000,
        "remaining": 320,
        "status": "on_sale",
        "is_on_chain": true
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  },
  "message": "success"
}
```

**说明**: 公开接口，支持分页与分类筛选。

---

#### 1.2.2 藏品详情

**端点**: `GET /collectibles/:id`

```bash
curl -X GET "${BASE_URL}/collectibles/1"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "敦煌飞天·限量版",
    "description": "...",
    "cover_image": "https://cdn.example.com/cover/1.jpg",
    "price": "99.00",
    "circulate": 1000,
    "remaining": 320,
    "status": "on_sale",
    "is_on_chain": true,
    "is_favored": false
  },
  "message": "success"
}
```

**说明**: 公开接口；若已登录（携带 JWT），额外返回 `is_favored` 字段表示是否已关注。

---

#### 1.2.3 藏品分类列表

**端点**: `GET /categories`

```bash
curl -X GET "${BASE_URL}/categories"
```

**期望响应**:

```json
{
  "code": 200,
  "data": [
    { "id": 1, "name": "数字画作", "count": 20 },
    { "id": 2, "name": "3D模型", "count": 15 }
  ],
  "message": "success"
}
```

---

### 1.3 盲盒模块

#### 1.3.1 盲盒列表

**端点**: `GET /blind-boxes`

```bash
curl -X GET "${BASE_URL}/blind-boxes?page=1&page_size=10"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "新春限定盲盒",
        "cover_image": "https://cdn.example.com/box/1.jpg",
        "price": "59.00",
        "status": "active"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 10
  },
  "message": "success"
}
```

---

#### 1.3.2 盲盒详情

**端点**: `GET /blind-boxes/:id`

```bash
curl -X GET "${BASE_URL}/blind-boxes/1"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "name": "新春限定盲盒",
    "cover_image": "https://cdn.example.com/box/1.jpg",
    "price": "59.00",
    "status": "active",
    "prize_pool": [
      { "collectible_id": 10, "name": "稀有藏品A", "rarity": "SSR", "probability": "0.01" },
      { "collectible_id": 11, "name": "普通藏品B", "rarity": "R", "probability": "0.50" }
    ]
  },
  "message": "success"
}
```

---

### 1.4 市场模块

#### 1.4.1 市场在售列表

**端点**: `GET /market/listings`

```bash
curl -X GET "${BASE_URL}/market/listings?page=1&page_size=20&sort=price_asc&min_price=10&max_price=500"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "listing_id": 101,
        "collectible_id": 1,
        "name": "敦煌飞天·限量版",
        "cover_image": "https://cdn.example.com/cover/1.jpg",
        "price": "150.00",
        "seller_uid": 10001,
        "seller_name": "数藏玩家",
        "created_at": "2026-08-06 14:30:00"
      }
    ],
    "total": 30,
    "page": 1,
    "page_size": 20
  },
  "message": "success"
}
```

**说明**: 公开接口，支持价格区间筛选与排序。

---

### 1.5 文物展馆

#### 1.5.1 文物展品列表

**端点**: `GET /artifacts`

```bash
curl -X GET "${BASE_URL}/artifacts?page=1&page_size=12&category=museum"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "三星堆青铜面具",
        "cover_image": "https://cdn.example.com/artifact/1.jpg",
        "era": "商代",
        "summary": "..."
      }
    ],
    "total": 24,
    "page": 1,
    "page_size": 12
  },
  "message": "success"
}
```

---

### 1.6 钱包模块

#### 1.6.1 当前启用支付通道列表

**端点**: `GET /wallet/channels`

```bash
curl -X GET "${BASE_URL}/wallet/channels"
```

**期望响应**:

```json
{
  "code": 200,
  "data": [
    { "code": "alipay", "name": "支付宝", "enabled": true },
    { "code": "wechat", "name": "微信支付", "enabled": true }
  ],
  "message": "success"
}
```

**说明**: 公开接口，前端充值页用来展示可用支付方式。

---

### 1.7 公告新闻

#### 1.7.1 公告/新闻列表

**端点**: `GET /announcements`

```bash
curl -X GET "${BASE_URL}/announcements?page=1&page_size=10&type=announcement"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "平台上线公告",
        "cover_image": "https://cdn.example.com/news/1.jpg",
        "summary": "...",
        "published_at": "2026-08-01 10:00:00"
      }
    ],
    "total": 8,
    "page": 1,
    "page_size": 10
  },
  "message": "success"
}
```

---

#### 1.7.2 首页轮播图

**端点**: `GET /banners`

```bash
curl -X GET "${BASE_URL}/banners"
```

**期望响应**:

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "title": "新品首发",
      "image_url": "https://cdn.example.com/banner/1.jpg",
      "link_url": "/collectibles/1",
      "sort": 1
    }
  ],
  "message": "success"
}
```

---

### 1.8 系统模块

#### 1.8.1 网站全局配置

**端点**: `GET /settings`

```bash
curl -X GET "${BASE_URL}/settings"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "site_name": "数和文创",
    "site_logo": "https://cdn.example.com/logo.png",
    "contact_email": "support@shuhe.com",
    "icp": "京ICP备XXXXXXXX号",
    "default_is_on_chain": true
  },
  "message": "success"
}
```

---

#### 1.8.2 获取合规文档

**端点**: `GET /agreements/:code`

```bash
curl -X GET "${BASE_URL}/agreements/user_agreement"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "code": "user_agreement",
    "title": "用户服务协议",
    "content": "一、总则\n...",
    "updated_at": "2026-08-01 00:00:00"
  },
  "message": "success"
}
```

**说明**: `code` 可选值如 `user_agreement`（用户协议）、`privacy_policy`（隐私政策）、`risk_notice`（风险提示）等。

---

## 二、需 JWT 接口测试

以下接口需在请求头中携带 `Authorization: Bearer ${TOKEN}`。请先通过登录接口获取 Token。

---

### 2.1 用户模块

#### 2.1.1 刷新 Token

**端点**: `POST /user/refresh-token`

```bash
curl -X POST "${BASE_URL}/user/refresh-token" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "refresh_token": "'"${REFRESH_TOKEN}"'"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "rft_new_token_here...",
    "expires_in": 604800
  },
  "message": "刷新成功"
}
```

**说明**: 使用 refresh_token 续期，旧 refresh_token 作废。JWT 有效期 7 天，refresh_token 有效期 30 天。

---

#### 2.1.2 退出登录

**端点**: `POST /user/logout`

```bash
curl -X POST "${BASE_URL}/user/logout" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": null,
  "message": "已退出登录"
}
```

**说明**: 登出后当前 Token 加入 Redis 黑名单，立即失效。

---

#### 2.1.3 获取当前用户信息

**端点**: `GET /user/info`

```bash
curl -X GET "${BASE_URL}/user/info" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "id": 10001,
    "phone": "138****8888",
    "username": "数藏玩家",
    "avatar": "https://cdn.example.com/avatar/10001.jpg",
    "is_realname": true,
    "has_transaction_password": true,
    "created_at": "2026-08-01 10:00:00"
  },
  "message": "success"
}
```

---

#### 2.1.4 我的藏品列表

**端点**: `GET /user/collectibles`

```bash
curl -X GET "${BASE_URL}/user/collectibles?page=1&page_size=20&holding_status=1" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "user_collectible_id": 201,
        "collectible_id": 1,
        "name": "敦煌飞天·限量版",
        "cover_image": "https://cdn.example.com/cover/1.jpg",
        "serial_no": "SH-001-0001",
        "acquired_at": "2026-08-02 14:00:00",
        "holding_status": 1
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  },
  "message": "success"
}
```

**说明**: `holding_status` 1=持有 2=已转赠 3=已挂售。

---

#### 2.1.5 实名认证

**端点**: `POST /user/realname`

```bash
curl -X POST "${BASE_URL}/user/realname" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "real_name": "张三",
    "id_card": "110101199001011234"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "is_realname": true
  },
  "message": "实名认证成功"
}
```

---

#### 2.1.6 设置交易密码

**端点**: `POST /user/transaction-password`

```bash
curl -X POST "${BASE_URL}/user/transaction-password" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "code": "123456",
    "transaction_password": "654321"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": null,
  "message": "交易密码设置成功"
}
```

**说明**: 需先发送 scene=4 的短信验证码。交易密码为 6 位纯数字，使用 bcrypt 加密存储。设置后才能进行挂售、购买、转赠等操作。

---

### 2.2 藏品模块

#### 2.2.1 关注藏品

**端点**: `POST /collectibles/:id/favorite`

```bash
curl -X POST "${BASE_URL}/collectibles/1/favorite" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": null,
  "message": "关注成功"
}
```

---

### 2.3 盲盒模块

#### 2.3.1 开启盲盒

**端点**: `POST /blind-boxes/:id/open`

```bash
curl -X POST "${BASE_URL}/blind-boxes/1/open" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "user_collectible_id": 201
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "prize_collectible_id": 10,
    "prize_name": "稀有藏品A",
    "prize_rarity": "SSR",
    "prize_cover_image": "https://cdn.example.com/cover/10.jpg",
    "new_user_collectible_id": 301
  },
  "message": "恭喜！开出了 稀有藏品A"
}
```

**说明**: 仅需 JWT 认证，不涉及交易密码。`user_collectible_id` 为用户持有的盲盒藏品 ID。响应 message 为弹窗友好文案。

---

### 2.4 合成模块

#### 2.4.1 合成活动列表

**端点**: `GET /synthesis/activities`

```bash
curl -X GET "${BASE_URL}/synthesis/activities?page=1&page_size=10" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "三星堆系列合成",
        "cover_image": "https://cdn.example.com/synthesis/1.jpg",
        "status": "active",
        "end_at": "2026-12-31 23:59:59"
      }
    ],
    "total": 3,
    "page": 1,
    "page_size": 10
  },
  "message": "success"
}
```

---

#### 2.4.2 提交合成

**端点**: `POST /synthesis/activities/:id/synthesize`

```bash
curl -X POST "${BASE_URL}/synthesis/activities/1/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "material_user_collectible_ids": [101, 102, 103]
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "result_collectible": {
      "id": 50,
      "name": "三星堆青铜面具·合成版",
      "cover_image": "https://cdn.example.com/cover/50.jpg",
      "rarity": "SSR"
    },
    "new_user_collectible_id": 401,
    "consumed_ids": [101, 102, 103]
  },
  "message": "合成成功！获得了三星堆青铜面具·合成版"
}
```

**说明**: 仅需 JWT 认证，不涉及交易密码。材料藏品 ID 数组须匹配合成配方数量。

---

### 2.5 签到模块

#### 2.5.1 每日签到

**端点**: `POST /check-in`

```bash
curl -X POST "${BASE_URL}/check-in" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "continuous_days": 7,
    "reward": {
      "type": "lucky_draw_chance",
      "amount": 1,
      "description": "获得 1 次抽奖机会"
    }
  },
  "message": "签到成功，连续签到 7 天"
}
```

**说明**: 仅需 JWT 认证，不涉及交易密码。每日仅可签到一次，重复签到返回提示。

---

### 2.6 抽奖模块

#### 2.6.1 参与抽奖

**端点**: `POST /lucky-draw/activities/:id/draw`

```bash
curl -X POST "${BASE_URL}/lucky-draw/activities/1/draw" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应（中奖）**:

```json
{
  "code": 200,
  "data": {
    "is_win": true,
    "prize_collectible_id": 10,
    "prize_name": "稀有藏品A",
    "prize_rarity": "SSR",
    "prize_cover_image": "https://cdn.example.com/cover/10.jpg",
    "new_user_collectible_id": 501
  },
  "message": "恭喜中奖！获得了 稀有藏品A"
}
```

**期望响应（未中奖）**:

```json
{
  "code": 200,
  "data": {
    "is_win": false
  },
  "message": "很遗憾，未中奖"
}
```

**说明**: 仅需 JWT 认证，绝对不涉及交易密码。响应 message 为弹窗友好文案。

---

### 2.7 转赠模块

#### 2.7.1 确认接收转赠

**端点**: `PUT /transfers/:id/confirm`

```bash
curl -X PUT "${BASE_URL}/transfers/101/confirm" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "transfer_id": 101,
    "status": "completed",
    "collectible_name": "敦煌飞天·限量版"
  },
  "message": "已成功接收转赠"
}
```

**说明**: 仅需 JWT 认证，确认接收方不需要交易密码。只有发起转赠时才需要交易密码。

---

### 2.8 支付模块

#### 2.8.1 创建支付（余额支付）

**端点**: `POST /payments`

```bash
curl -X POST "${BASE_URL}/payments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "order_id": 1,
    "payment_method": "balance"
  }'
```

**期望响应（余额支付，同步完成）**:

```json
{
  "code": 200,
  "data": {
    "order_id": 1,
    "order_no": "ORD20260806143052001",
    "payment_status": "paid",
    "paid_amount": "99.00",
    "paid_at": "2026-08-06 14:31:00"
  },
  "message": "支付成功"
}
```

**期望响应（支付宝，返回支付链接）**:

```json
{
  "code": 200,
  "data": {
    "order_id": 1,
    "order_no": "ORD20260806143052001",
    "payment_status": "pending",
    "pay_url": "https://openapi.alipay.com/gateway.do?...",
    "expires_at": "2026-08-06 14:46:00"
  },
  "message": "请前往支付"
}
```

**说明**: `payment_method` 支持 `balance`（余额）、`alipay`（支付宝）、`wechat`（微信）。余额支付同步完成，第三方支付返回支付链接，订单 15 分钟超时自动取消。

---

#### 2.8.2 我的订单列表

**端点**: `GET /orders`

```bash
curl -X GET "${BASE_URL}/orders?page=1&page_size=10&status=paid" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "order_no": "ORD20260806143052001",
        "collectible_name": "敦煌飞天·限量版",
        "amount": "99.00",
        "status": "paid",
        "payment_method": "balance",
        "created_at": "2026-08-06 14:30:52",
        "paid_at": "2026-08-06 14:31:00"
      }
    ],
    "total": 3,
    "page": 1,
    "page_size": 10
  },
  "message": "success"
}
```

---

### 2.9 优先购模块

#### 2.9.1 优先购活动列表

**端点**: `GET /priority-sales`

```bash
curl -X GET "${BASE_URL}/priority-sales?page=1&page_size=10" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "VIP 优先购·敦煌系列",
        "collectible_id": 1,
        "collectible_name": "敦煌飞天·限量版",
        "start_at": "2026-08-10 10:00:00",
        "end_at": "2026-08-10 12:00:00",
        "status": "upcoming",
        "my_eligible": true
      }
    ],
    "total": 2,
    "page": 1,
    "page_size": 10
  },
  "message": "success"
}
```

---

#### 2.9.2 查询我的优先购资格

**端点**: `GET /priority-sales/:id/eligibility`

```bash
curl -X GET "${BASE_URL}/priority-sales/1/eligibility" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "is_eligible": true,
    "remaining_quota": 2,
    "used_quota": 0,
    "sale_window_start": "2026-08-10 10:00:00",
    "sale_window_end": "2026-08-10 12:00:00",
    "is_in_window": false
  },
  "message": "success"
}
```

---

### 2.10 钱包模块

#### 2.10.1 钱包信息

**端点**: `GET /wallet`

```bash
curl -X GET "${BASE_URL}/wallet" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "wallet_id": 1,
    "balance": "500.00",
    "frozen_balance": "0.00",
    "total_recharged": "1000.00",
    "total_consumed": "500.00",
    "updated_at": "2026-08-06 14:31:00"
  },
  "message": "success"
}
```

---

#### 2.10.2 钱包流水列表

**端点**: `GET /wallet/transactions`

```bash
curl -X GET "${BASE_URL}/wallet/transactions?page=1&page_size=20&type=recharge" \
  -H "Authorization: Bearer ${TOKEN}"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "type": "recharge",
        "amount": "100.00",
        "balance_after": "600.00",
        "description": "支付宝充值",
        "transaction_no": "RCH20260806143052001",
        "created_at": "2026-08-06 14:30:52"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  },
  "message": "success"
}
```

---

### 2.11 系统模块

#### 2.11.1 文件上传

**端点**: `POST /upload`

```bash
curl -X POST "${BASE_URL}/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@/path/to/avatar.jpg" \
  -F "type=avatar"
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "url": "https://cdn.example.com/uploads/avatar_10001_20260806.jpg",
    "file_size": 102400,
    "mime_type": "image/jpeg"
  },
  "message": "上传成功"
}
```

**说明**: 使用 `multipart/form-data` 格式上传。`type` 可选 `avatar`（头像）或 `feedback`（反馈图片），默认 `avatar`。支持 jpg/png，单文件不超过 2MB。

---

#### 2.11.2 意见反馈

**端点**: `POST /feedback`

```bash
curl -X POST "${BASE_URL}/feedback" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "type": "bug",
    "content": "购买藏品时页面加载缓慢",
    "images": ["https://cdn.example.com/uploads/feedback_1.jpg"],
    "contact": "user@example.com"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "ticket_id": "FB20260806143000001",
    "status": 1
  },
  "message": "反馈已提交，我们会尽快处理"
}
```

**说明**: `type` 可选 `bug`/`suggestion`/`complaint`/`other`。`content` 不能为空，最多 1000 字符。`images` 和 `contact` 为可选字段。

---

## 三、交易密码接口测试

以下接口在 JWT 认证基础上，请求 Body 中必须携带 `transaction_password` 字段（6 位数字）。后端通过 `@TxPassword()` 装饰器标记，由 `TxPasswordGuard` 守卫拦截校验（bcrypt 比对）。交易密码校验为业务逻辑第一步。

> **前置条件**: 测试前需确保当前用户已设置交易密码（参见 2.1.6 设置交易密码）。

---

### 3.1 市场模块

#### 3.1.1 挂售藏品（寄售）

**端点**: `POST /market/listings`

```bash
curl -X POST "${BASE_URL}/market/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "user_collectible_id": 201,
    "price": 150.00,
    "transaction_password": "'"${TX_PASSWORD}"'"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "listing_id": 101,
    "collectible_name": "敦煌飞天·限量版",
    "price": "150.00",
    "status": "on_sale",
    "created_at": "2026-08-06 14:30:00"
  },
  "message": "挂售成功"
}
```

**说明**: `user_collectible_id` 为用户持有的藏品 ID（`nft_user_collectibles.id`）。挂售后藏品进入冻结状态，取消寄售后恢复持有。

**交易密码错误时的响应**:

```json
{
  "code": 403,
  "data": null,
  "message": "交易密码错误"
}
```

**未设置交易密码时的响应**:

```json
{
  "code": 422,
  "data": null,
  "message": "尚未设置交易密码，请先前往设置"
}
```

---

#### 3.1.2 市场购买

**端点**: `POST /market/listings/:id/buy`

```bash
curl -X POST "${BASE_URL}/market/listings/101/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "transaction_password": "'"${TX_PASSWORD}"'",
    "payment_method": "balance"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "order_id": 5,
    "order_no": "ORD20260806143500001",
    "amount": "150.00",
    "payment_status": "paid",
    "collectible_name": "敦煌飞天·限量版",
    "new_user_collectible_id": 302
  },
  "message": "购买成功"
}
```

**说明**: `payment_method` 可选 `balance`/`alipay`/`wechat`，默认 `balance`。余额支付同步完成并转移藏品归属；第三方支付返回支付链接。

---

#### 3.1.3 发售购买

**端点**: `POST /collectibles/:id/buy`

```bash
curl -X POST "${BASE_URL}/collectibles/1/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "quantity": 1,
    "transaction_password": "'"${TX_PASSWORD}"'",
    "payment_method": "balance"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "order_id": 6,
    "order_no": "ORD20260806143600001",
    "amount": "99.00",
    "quantity": 1,
    "payment_status": "paid",
    "collectible_name": "敦煌飞天·限量版"
  },
  "message": "购买成功"
}
```

**说明**: 从官方发售购买（一级市场）。`quantity` 默认 1。可选传 `priority_sale_id` 用于优先购下单。

---

### 3.2 转赠模块

#### 3.2.1 发起转赠

**端点**: `POST /transfers`

```bash
curl -X POST "${BASE_URL}/transfers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "user_collectible_id": 201,
    "to_phone": "13900006666",
    "transaction_password": "'"${TX_PASSWORD}"'"
  }'
```

**期望响应**:

```json
{
  "code": 200,
  "data": {
    "transfer_id": 101,
    "collectible_name": "敦煌飞天·限量版",
    "to_user_phone": "139****6666",
    "status": "pending",
    "expires_at": "2026-08-06 15:00:00"
  },
  "message": "转赠已发起，等待对方确认"
}
```

**说明**: 发起转赠需交易密码校验。`to_phone` 为接收方手机号。转赠发起后藏品进入冻结状态，接收方确认后归属转移；接收方确认/拒绝/取消均不需要交易密码。

---

## 四、回调接口测试

回调接口由第三方支付平台服务器调用，不走 JWT 认证，通过 Body 中的 `signature` 字段验签。幂等键为 `transaction_no`，重复回调直接返回 `SUCCESS`。回调接口返回纯文本 `SUCCESS`（非 JSON 格式）。

---

### 4.1 支付回调

**端点**: `POST /payments/callback`

```bash
curl -X POST "${BASE_URL}/payments/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "order_no": "ORD20260806143052001",
    "transaction_no": "2026080622001400001",
    "status": "success",
    "amount": 99.00,
    "signature": "a1b2c3d4e5f6..."
  }'
```

**期望响应**（纯文本）:

```
SUCCESS
```

**说明**:
- `order_no`: 业务订单号（用户下单时生成）
- `transaction_no`: 第三方交易号（幂等键，已处理直接返回 SUCCESS）
- `status`: `success`=成功 `failed`=失败
- `amount`: 实付金额（元）
- `signature`: 签名（用于验签）

回调成功后后端会更新订单状态、转移藏品归属、写入操作审计日志。若获得新藏品，异步检测 hold_collectible 抽奖规则并发放抽奖次数。

---

### 4.2 充值回调

**端点**: `POST /wallet/recharge/callback`

```bash
curl -X POST "${BASE_URL}/wallet/recharge/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_no": "RCH20260806143052001",
    "amount": 100.00,
    "status": "success",
    "signature": "a1b2c3d4e5f6..."
  }'
```

**期望响应**（纯文本）:

```
SUCCESS
```

**说明**:
- `transaction_no`: 第三方交易号（幂等键）
- `amount`: 充值金额（元）
- `status`: `success`=成功 `failed`=失败
- `signature`: 签名（用于验签）

回调成功后后端增加用户钱包余额，写入钱包流水记录。

---

## 附录：测试流程建议

### 完整测试链路

以下是一个端到端的测试流程，按依赖顺序执行：

```
1. POST /sms/send          (scene=1)     → 获取注册验证码
2. POST /user/register                   → 注册并获取 Token
3. POST /user/transaction-password       → 设置交易密码
4. GET  /user/info                       → 验证登录状态
5. GET  /collectibles                    → 浏览藏品列表
6. POST /collectibles/:id/buy            → 发售购买（需交易密码）
7. GET  /orders                          → 查看订单
8. POST /payments (balance)              → 余额支付
9. GET  /user/collectibles               → 查看我的藏品
10. POST /market/listings                → 挂售藏品（需交易密码）
11. GET  /market/listings                → 查看市场在售列表
12. POST /transfers                      → 发起转赠（需交易密码）
13. POST /check-in                       → 每日签到
14. POST /blind-boxes/:id/open           → 开启盲盒
15. POST /synthesis/activities/:id/synthesize → 合成藏品
16. POST /lucky-draw/activities/:id/draw      → 参与抽奖
17. POST /user/logout                    → 退出登录
```

### 注意事项

1. **限流策略**: 全局限流为 60 秒窗口内最多 100 次请求，测试时避免高频请求触发 429。
2. **JWT 有效期**: access_token 有效期 7 天，refresh_token 有效期 30 天。修改登录密码或交易密码后该用户所有 Token 即时失效（Redis 黑名单）。
3. **订单超时**: 订单 `expires_at` 为 15 分钟，超时未支付自动取消并释放库存。
4. **交易密码**: 仅 4 个端点需要交易密码（挂售、发售购买、市场购买、发起转赠），其余操作仅 JWT 认证。
5. **乐观锁**: 所有涉及库存/余额变动的操作基于 `version` 字段乐观锁控制并发。
6. **审计日志**: 所有涉及藏品归属变更的操作（购买/转赠/合成/盲盒/抽奖）均写入 `nft_operation_logs` 审计表。
