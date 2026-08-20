# API 接口映射表

> 数和文创数字藏品平台 · 全部 65 个端点 × 14 个模块
>
> 本文档将 API 设计文档端点与后端 NestJS Controller 方法一一对应，标注认证要求与交易密码要求。

---

## 统一说明

| 项目 | 说明 |
|------|------|
| Base URL | `http://localhost:3000` |
| 认证方式 | JWT Bearer Token（Header: `Authorization: Bearer <token>`） |
| 交易密码 | 涉及资产变动的敏感操作需在请求 Body 中携带 `transaction_password` 字段（6 位数字，bcrypt 校验） |
| 公开接口 | 标注 `@Public()` 的端点跳过全局 JWT 守卫，无需登录 |
| 回调接口 | 第三方支付平台服务器调用，通过签名验签保障安全，不走 JWT 认证 |
| 统一响应 | `{ "code": 200, "data": {...}, "message": "success" }` |
| 回调响应 | 纯文本 `SUCCESS` |

### 认证要求缩写

| 缩写 | 含义 |
|------|------|
| 公开 | 无需任何认证 |
| JWT | 需携带有效的 JWT Bearer Token |
| 回调 | 第三方服务器调用，签名验签 |

### 交易密码端点汇总（仅 4 个）

| 端点 | 说明 |
|------|------|
| POST /market/listings | 挂售藏品（寄售） |
| POST /collectibles/:id/buy | 发售购买 |
| POST /market/listings/:id/buy | 市场购买 |
| POST /transfers | 发起转赠 |

> 盲盒开启、抽奖、合成、签到等操作仅 JWT 认证，绝对不涉及交易密码。

---

## 一、用户模块（13 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 1 | 用户模块 | 发送短信验证码 | POST | `/sms/send` | `UserController.sendSms()` | 公开 | 否 | 已实现 |
| 2 | 用户模块 | 用户注册 | POST | `/user/register` | `UserController.register()` | 公开 | 否 | 已实现 |
| 3 | 用户模块 | 用户登录 | POST | `/user/login` | `UserController.login()` | 公开 | 否 | 已实现 |
| 4 | 用户模块 | 刷新 Token（续期） | POST | `/user/refresh-token` | `UserController.refreshToken()` | JWT | 否 | 已实现 |
| 5 | 用户模块 | 退出登录 | POST | `/user/logout` | `UserController.logout()` | JWT | 否 | 已实现 |
| 6 | 用户模块 | 找回密码（未登录态） | POST | `/user/reset-password` | `UserController.resetPassword()` | 公开 | 否 | 已实现 |
| 7 | 用户模块 | 修改登录密码（已登录态） | PUT | `/user/password` | `UserController.updatePassword()` | JWT | 否 | 已实现 |
| 8 | 用户模块 | 实名认证 | POST | `/user/realname` | `UserController.realname()` | JWT | 否 | 已实现 |
| 9 | 用户模块 | 修改资料（头像/昵称） | PATCH | `/user/profile` | `UserController.updateProfile()` | JWT | 否 | 已实现 |
| 10 | 用户模块 | 设置/修改交易密码 | POST | `/user/transaction-password` | `UserController.setTransactionPassword()` | JWT | 否 | 已实现 |
| 11 | 用户模块 | 获取当前用户信息 | GET | `/user/info` | `UserController.getUserInfo()` | JWT | 否 | 已实现 |
| 12 | 用户模块 | 我的藏品列表 | GET | `/user/collectibles` | `UserController.getMyCollectibles()` | JWT | 否 | 已实现 |
| 13 | 用户模块 | 藏品流转历史 | GET | `/user/collectibles/:id/history` | `UserController.getCollectibleHistory()` | JWT | 否 | 已实现 |

---

## 二、藏品模块（5 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 14 | 藏品模块 | 藏品分类列表 | GET | `/categories` | `CollectibleController.getCategories()` | 公开 | 否 | 已实现 |
| 15 | 藏品模块 | 藏品列表 | GET | `/collectibles` | `CollectibleController.getCollectibles()` | 公开 | 否 | 已实现 |
| 16 | 藏品模块 | 藏品详情（含 is_favored） | GET | `/collectibles/:id` | `CollectibleController.getCollectibleDetail()` | 公开 | 否 | 已实现 |
| 17 | 藏品模块 | 关注藏品 | POST | `/collectibles/:id/favorite` | `CollectibleController.favorite()` | JWT | 否 | 已实现 |
| 18 | 藏品模块 | 取消关注 | DELETE | `/collectibles/:id/favorite` | `CollectibleController.unfavorite()` | JWT | 否 | 已实现 |

---

## 三、市场模块（6 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 19 | 市场模块 | 市场在售列表 | GET | `/market/listings` | `MarketController.getListings()` | 公开 | 否 | 已实现 |
| 20 | 市场模块 | 挂售藏品（寄售） | POST | `/market/listings` | `MarketController.createListing()` | JWT | 是 | 已实现 |
| 21 | 市场模块 | 取消寄售 | PUT | `/market/listings/:id/cancel` | `MarketController.cancelListing()` | JWT | 否 | 已实现 |
| 22 | 市场模块 | 购买市场藏品（创建订单） | POST | `/market/listings/:id/buy` | `MarketController.buyFromMarket()` | JWT | 是 | 已实现 |
| 23 | 市场模块 | 发售购买（创建订单） | POST | `/collectibles/:id/buy` | `MarketController.buyFromRelease()` | JWT | 是 | 已实现 |
| 24 | 市场模块 | 我的寄售挂单列表 | GET | `/market/my-listings` | `MarketController.getMyListings()` | JWT | 否 | 已实现 |

---

## 四、盲盒模块（3 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 25 | 盲盒模块 | 盲盒列表（分页） | GET | `/blind-boxes` | `BlindBoxController.getList()` | 公开 | 否 | 已实现 |
| 26 | 盲盒模块 | 盲盒详情（含奖品池） | GET | `/blind-boxes/:id` | `BlindBoxController.getDetail()` | 公开 | 否 | 已实现 |
| 27 | 盲盒模块 | 开启盲盒 | POST | `/blind-boxes/:id/open` | `BlindBoxController.open()` | JWT | 否 | 已实现 |

---

## 五、合成模块（4 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 28 | 合成模块 | 合成活动列表（分页） | GET | `/synthesis/activities` | `SynthesisController.getActivities()` | JWT | 否 | 已实现 |
| 29 | 合成模块 | 合成公式详情（含我的持有情况） | GET | `/synthesis/activities/:id` | `SynthesisController.getActivityDetail()` | JWT | 否 | 已实现 |
| 30 | 合成模块 | 提交合成 | POST | `/synthesis/activities/:id/synthesize` | `SynthesisController.synthesize()` | JWT | 否 | 已实现 |
| 31 | 合成模块 | 我的合成记录（分页） | GET | `/synthesis/records` | `SynthesisController.getRecords()` | JWT | 否 | 已实现 |

---

## 六、签到模块（2 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 32 | 签到模块 | 每日签到 | POST | `/check-in` | `CheckInController.checkIn()` | JWT | 否 | 已实现 |
| 33 | 签到模块 | 签到记录查询 | GET | `/check-in/records` | `CheckInController.getRecords()` | JWT | 否 | 已实现 |

---

## 七、抽奖模块（5 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 34 | 抽奖模块 | 抽奖活动列表 | GET | `/lucky-draw/activities` | `LuckyDrawController.getActivities()` | JWT | 否 | 已实现 |
| 35 | 抽奖模块 | 抽奖规则与奖品池 | GET | `/lucky-draw/activities/:id` | `LuckyDrawController.getActivityDetail()` | JWT | 否 | 已实现 |
| 36 | 抽奖模块 | 我的抽奖次数来源明细 | GET | `/lucky-draw/activities/:id/chances` | `LuckyDrawController.getChances()` | JWT | 否 | 已实现 |
| 37 | 抽奖模块 | 参与抽奖 | POST | `/lucky-draw/activities/:id/draw` | `LuckyDrawController.draw()` | JWT | 否 | 已实现 |
| 38 | 抽奖模块 | 我的抽奖记录 | GET | `/lucky-draw/records` | `LuckyDrawController.getRecords()` | JWT | 否 | 已实现 |

---

## 八、转赠模块（5 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 39 | 转赠模块 | 发起转赠 | POST | `/transfers` | `TransferController.createTransfer()` | JWT | 是 | 已实现 |
| 40 | 转赠模块 | 确认接收转赠 | PUT | `/transfers/:id/confirm` | `TransferController.confirmTransfer()` | JWT | 否 | 已实现 |
| 41 | 转赠模块 | 拒绝转赠 | PUT | `/transfers/:id/reject` | `TransferController.rejectTransfer()` | JWT | 否 | 已实现 |
| 42 | 转赠模块 | 取消转赠（发起方） | PUT | `/transfers/:id/cancel` | `TransferController.cancelTransfer()` | JWT | 否 | 已实现 |
| 43 | 转赠模块 | 转赠记录 | GET | `/transfers` | `TransferController.getTransfers()` | JWT | 否 | 已实现 |

---

## 九、支付模块（5 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 44 | 支付模块 | 我的订单列表 | GET | `/orders` | `PaymentController.getOrders()` | JWT | 否 | 已实现 |
| 45 | 支付模块 | 订单详情 | GET | `/orders/:id` | `PaymentController.getOrderDetail()` | JWT | 否 | 已实现 |
| 46 | 支付模块 | 创建支付 | POST | `/payments` | `PaymentController.createPayment()` | JWT | 否 | 已实现 |
| 47 | 支付模块 | 支付回调 | POST | `/payments/callback` | `PaymentController.handleCallback()` | 回调 | 否 | 已实现 |
| 48 | 支付模块 | 取消订单 | PUT | `/orders/:id/cancel` | `PaymentController.cancelOrder()` | JWT | 否 | 已实现 |

---

## 十、优先购模块（3 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 49 | 优先购模块 | 优先购活动列表 | GET | `/priority-sales` | `PriorityController.getPrioritySales()` | JWT | 否 | 已实现 |
| 50 | 优先购模块 | 查询我的优先购资格 | GET | `/priority-sales/:id/eligibility` | `PriorityController.getEligibility()` | JWT | 否 | 已实现 |
| 51 | 优先购模块 | 优先购下单 | POST | `/priority-sales/:id/buy` | `PriorityController.buy()` | JWT | 否 | 已实现 |

---

## 十一、文物展馆（2 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 52 | 文物展馆 | 文物展品列表 | GET | `/artifacts` | `ArtifactController.getArtifacts()` | 公开 | 否 | 已实现 |
| 53 | 文物展馆 | 文物展品详情 | GET | `/artifacts/:id` | `ArtifactController.getArtifactById()` | 公开 | 否 | 已实现 |

---

## 十二、钱包模块（5 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 54 | 钱包模块 | 钱包信息 | GET | `/wallet` | `WalletController.getWallet()` | JWT | 否 | 已实现 |
| 55 | 钱包模块 | 当前启用支付通道列表 | GET | `/wallet/channels` | `WalletController.getChannels()` | 公开 | 否 | 已实现 |
| 56 | 钱包模块 | 钱包流水列表 | GET | `/wallet/transactions` | `WalletController.getTransactions()` | JWT | 否 | 已实现 |
| 57 | 钱包模块 | 钱包充值 | POST | `/wallet/recharge` | `WalletController.recharge()` | JWT | 否 | 已实现 |
| 58 | 钱包模块 | 充值回调 | POST | `/wallet/recharge/callback` | `WalletController.handleRechargeCallback()` | 回调 | 否 | 已实现 |

---

## 十三、公告新闻（3 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 59 | 公告新闻 | 公告/新闻列表 | GET | `/announcements` | `AnnouncementController.getListings()` | 公开 | 否 | 已实现 |
| 60 | 公告新闻 | 公告/新闻详情 | GET | `/announcements/:id` | `AnnouncementController.getDetail()` | 公开 | 否 | 已实现 |
| 61 | 公告新闻 | 首页轮播图 | GET | `/banners` | `AnnouncementController.getBanners()` | 公开 | 否 | 已实现 |

---

## 十四、系统模块（4 端点）

| # | 模块 | 文档端点 | HTTP Method | URL | 后端 Controller 方法 | 认证要求 | 交易密码 | 是否已实现 |
|---|------|----------|-------------|-----|---------------------|----------|----------|-----------|
| 62 | 系统模块 | 获取合规文档 | GET | `/agreements/:code` | `SystemController.getAgreement()` | 公开 | 否 | 已实现 |
| 63 | 系统模块 | 文件上传（头像/反馈图片等） | POST | `/upload` | `SystemController.uploadFile()` | JWT | 否 | 已实现 |
| 64 | 系统模块 | 网站全局配置 | GET | `/settings` | `SystemController.getSettings()` | 公开 | 否 | 已实现 |
| 65 | 系统模块 | 意见反馈 | POST | `/feedback` | `SystemController.createFeedback()` | JWT | 否 | 已实现 |

---

## 汇总统计

| # | 模块 | 端点数 | 需 JWT | 需交易密码 | 关键端点 |
|---|------|--------|--------|-----------|----------|
| 1 | 用户模块 | 13 | 9 | 0 | 短信/注册/登录/刷新Token/登出/找回密码/改密码/实名/资料/交易密码/用户信息/我的藏品/藏品流转 |
| 2 | 藏品模块 | 5 | 2 | 0 | 分类/列表/详情/关注/取消关注 |
| 3 | 市场模块 | 6 | 5 | 3 | 在售列表/挂售/取消/市场购买/发售购买/我的挂单 |
| 4 | 盲盒模块 | 3 | 1 | 0 | 列表/详情/开启 |
| 5 | 合成模块 | 4 | 3 | 0 | 活动列表/公式/合成/记录 |
| 6 | 签到模块 | 2 | 2 | 0 | 签到/记录 |
| 7 | 抽奖模块 | 5 | 4 | 0 | 活动列表/规则/抽奖/记录/次数明细 |
| 8 | 转赠模块 | 5 | 5 | 1 | 发起/确认/拒绝/记录/取消 |
| 9 | 支付模块 | 5 | 4 | 0 | 订单列表/详情/创建支付/回调/取消 |
| 10 | 优先购模块 | 3 | 3 | 0 | 活动列表/资格查询/优先购买 |
| 11 | 文物展馆 | 2 | 0 | 0 | 列表/详情 |
| 12 | 钱包模块 | 5 | 3 | 0 | 余额/支付通道/充值/回调/钱包流水 |
| 13 | 公告新闻 | 3 | 0 | 0 | 列表/详情/轮播图 |
| 14 | 系统模块 | 4 | 2 | 0 | 合规文档/上传/配置/意见反馈 |
| - | **合计** | **65** | **43** | **4** | 覆盖全部前端业务场景 |

> **说明**：需 JWT 端点 43 个（其中 4 个额外需交易密码），公开端点 20 个，回调端点 2 个。
