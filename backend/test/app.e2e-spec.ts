// 注意：运行测试前请确保 MySQL 和 Redis 已启动，且已执行 init-db.sql
//
// 运行方式：
//   cd backend && npm run test:e2e
//
// 前置条件：
//   1. MySQL 已启动并执行 init-db.sql（含种子数据：发售藏品、盲盒、轮播图、公告等）
//   2. Redis 已启动（用于 JWT 黑名单、短信验证码缓存、签到计数等）
//   3. 测试账号手机号 13800000001 在首次运行前不应已注册（重复运行需先清理或重置数据）
//   4. 测试环境下需配置短信验证码绕过或使用固定测试验证码（见下方 TEST_SMS_CODE）
//   5. 图形验证码在测试环境下建议配置绕过（见下方 TEST_CAPTCHA_*）
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('数和文创平台 E2E 测试', () => {
  let app: INestApplication;

  // ============================================================
  // 测试常量（需根据 init-db.sql 中的种子数据调整）
  // ------------------------------------------------------------
  const TEST_PHONE = '13800000001';
  const TEST_PASSWORD = 'abc12345';
  const TEST_USERNAME = 'e2e测试用户';
  // TODO: 测试环境下需配置短信验证码绕过或使用固定测试验证码
  const TEST_SMS_CODE = '123456';
  // TODO: 测试环境下图形验证码建议绕过，以下为占位值
  const TEST_CAPTCHA_KEY = 'test-captcha-key';
  const TEST_CAPTCHA_CODE = '1234';
  // 交易密码（TxPasswordGuard 从请求 body 中读取 transaction_password 字段）
  const TEST_TX_PASSWORD = '123456';

  // 以下 ID 需与 init-db.sql 种子数据一致
  const RELEASE_COLLECTIBLE_ID = 1; // 发售中的藏品ID（用于发售购买）
  const BLIND_BOX_ID = 1; // 盲盒ID（用于开启盲盒）
  const LISTING_PRICE = 150.0; // 挂售价格

  // ============================================================
  // 跨用例共享状态
  // ------------------------------------------------------------
  let accessToken: string; // 登录后获取的 JWT
  let orderId: number; // 发售购买创建的订单ID
  let userCollectibleId: number; // 购买后获得的用户藏品ID（用于挂售/开盲盒）
  let listingId: number; // 创建的寄售挂单ID

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 注册全局 ValidationPipe（与 main.ts 一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    // 注册全局响应拦截器（AppModule 已通过 APP_INTERCEPTOR 注册，
    // 此处再次注册是安全的：TransformInterceptor 内部对已是 BaseResponseVo
    // 的返回值会直接透传，避免二次包装）
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  /** 从登录响应体中提取 JWT access_token */
  const extractToken = (body: any): string => body?.data?.access_token;

  /** 构造带 JWT 的请求头 */
  const authHeaders = (): Record<string, string> => {
    if (!accessToken) {
      throw new Error('accessToken 未就绪：请确保登录用例已成功执行');
    }
    return { Authorization: `Bearer ${accessToken}` };
  };

  // ============================================================
  // 1. 公开接口测试（无需认证）
  // ============================================================
  describe('公开接口测试（无需认证）', () => {
    it('GET /settings - 应返回网站全局配置', async () => {
      const res = await request(app.getHttpServer()).get('/settings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toBeDefined();
      // 全局配置应包含基础信息与主题配置
      expect(res.body.data).toHaveProperty('basic');
      expect(res.body.data).toHaveProperty('theme');
    });

    it('GET /banners - 应返回首页轮播图列表', async () => {
      const res = await request(app.getHttpServer()).get('/banners');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('list');
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('GET /announcements - 应返回公告/新闻分页列表', async () => {
      const res = await request(app.getHttpServer()).get(
        '/announcements?page=1&page_size=10',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('GET /artifacts - 应返回文物展品分页列表', async () => {
      const res = await request(app.getHttpServer()).get(
        '/artifacts?page=1&page_size=10',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('GET /wallet/channels - 应返回当前启用的支付通道列表', async () => {
      const res = await request(app.getHttpServer()).get('/wallet/channels');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('list');
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('GET /agreements/user_agreement - 应返回用户协议文档', async () => {
      const res = await request(app.getHttpServer()).get(
        '/agreements/user_agreement',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('title');
      expect(res.body.data).toHaveProperty('content');
      expect(res.body.data).toHaveProperty('version');
      expect(res.body.data).toHaveProperty('effective_at');
    });
  });

  // ============================================================
  // 2. 用户注册 → 登录 → 获取信息
  // ============================================================
  describe('用户注册 → 登录 → 获取信息', () => {
    it('POST /sms/send - 发送注册短信验证码', async () => {
      const res = await request(app.getHttpServer())
        .post('/sms/send')
        .send({
          phone: TEST_PHONE,
          scene: 1, // 1=注册
          captcha_key: TEST_CAPTCHA_KEY,
          captcha_code: TEST_CAPTCHA_CODE,
        });

      // 请求参数：phone、scene、captcha_key、captcha_code
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toHaveProperty('expire_in');
    });

    it('POST /user/register - 注册新用户', async () => {
      const res = await request(app.getHttpServer())
        .post('/user/register')
        .send({
          phone: TEST_PHONE,
          code: TEST_SMS_CODE,
          captcha_key: TEST_CAPTCHA_KEY,
          captcha_code: TEST_CAPTCHA_CODE,
          login_password: TEST_PASSWORD,
          username: TEST_USERNAME,
        });

      // 请求参数：phone、code、captcha_key、captcha_code、login_password、username
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      // 若账号已存在（重复运行），此处可能返回业务错误码，需重置测试数据
    });

    it('POST /user/login - 使用手机号 + 密码登录', async () => {
      const res = await request(app.getHttpServer())
        .post('/user/login')
        .send({
          phone: TEST_PHONE,
          login_password: TEST_PASSWORD,
        });

      // 请求参数：phone、login_password
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toHaveProperty('access_token');

      // 提取 JWT 供后续用例使用
      accessToken = extractToken(res.body);
      expect(accessToken).toBeTruthy();
    });

    it('GET /user/info - 携带 JWT 获取当前用户信息', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/info')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('phone', TEST_PHONE);
    });

    it('GET /user/info - 未携带 JWT 应被全局守卫拦截（401）', async () => {
      const res = await request(app.getHttpServer()).get('/user/info');

      // 未认证访问受保护接口，应返回 401
      expect(res.status).toBe(401);
    });
  });

  // ============================================================
  // 3. 发售购买（使用余额支付）→ 查询我的藏品
  // ============================================================
  describe('发售购买（使用余额支付）→ 查询我的藏品', () => {
    it('POST /collectibles/:id/buy - 发售购买（创建订单）', async () => {
      // 交易密码通过 body 传递（TxPasswordGuard 从 body.transaction_password 读取）
      const res = await request(app.getHttpServer())
        .post(`/collectibles/${RELEASE_COLLECTIBLE_ID}/buy`)
        .set(authHeaders())
        .send({
          quantity: 1,
          transaction_password: TEST_TX_PASSWORD,
          payment_method: 'balance',
        });

      // 请求参数：quantity、transaction_password、payment_method
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();

      // 订单创建成功后保存订单ID，用于后续支付
      orderId = res.body.data?.order_id ?? res.body.data?.id;
    });

    it('POST /payments - 使用余额支付完成付款', async () => {
      // 前置：发售购买已生成 orderId
      if (!orderId) {
        // 兜底：若上一步未拿到 orderId，尝试用 1 作为占位
        orderId = 1;
      }

      const res = await request(app.getHttpServer())
        .post('/payments')
        .set(authHeaders())
        .send({
          order_id: orderId,
          payment_method: 'balance',
        });

      // 请求参数：order_id、payment_method
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();

      // 余额支付为同步完成，支付成功后记录用户藏品ID
      userCollectibleId =
        res.body.data?.user_collectible_id ?? res.body.data?.id;
    });

    it('GET /user/collectibles - 查询我的藏品列表', async () => {
      const res = await request(app.getHttpServer())
        .get('/user/collectibles?page=1&page_size=20&holding_status=1')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('page');
      expect(res.body.data).toHaveProperty('page_size');
      expect(Array.isArray(res.body.data.list)).toBe(true);

      // 若上一步未拿到 userCollectibleId，则从藏品列表中取第一条作为兜底
      if (!userCollectibleId && res.body.data.list.length > 0) {
        userCollectibleId =
          res.body.data.list[0].id ?? res.body.data.list[0].user_collectible_id;
      }
    });
  });

  // ============================================================
  // 4. 挂售藏品（需交易密码）→ 查询市场列表 → 取消寄售
  // ============================================================
  describe('挂售藏品（需交易密码）→ 查询市场列表 → 取消寄售', () => {
    it('POST /market/listings - 挂售藏品（寄售）', async () => {
      // 前置：需持有可挂售的用户藏品ID
      if (!userCollectibleId) {
        userCollectibleId = 1;
      }

      // 交易密码通过 body 传递
      const res = await request(app.getHttpServer())
        .post('/market/listings')
        .set(authHeaders())
        .send({
          user_collectible_id: userCollectibleId,
          price: LISTING_PRICE,
          transaction_password: TEST_TX_PASSWORD,
        });

      // 请求参数：user_collectible_id、price、transaction_password
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();

      // 保存挂单ID用于后续取消
      listingId = res.body.data?.id ?? res.body.data?.listing_id;
    });

    it('GET /market/listings - 查询市场在售列表', async () => {
      const res = await request(app.getHttpServer()).get(
        '/market/listings?page=1&page_size=10',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toBeDefined();
    });

    it('GET /market/my-listings - 查询我的寄售挂单', async () => {
      const res = await request(app.getHttpServer())
        .get('/market/my-listings?page=1&page_size=10')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();

      // 若上一步未拿到 listingId，则从我的挂单中取第一条作为兜底
      const list = res.body.data?.list ?? res.body.data;
      if (!listingId && Array.isArray(list) && list.length > 0) {
        listingId = list[0].id ?? list[0].listing_id;
      }
    });

    it('PUT /market/listings/:id/cancel - 取消寄售', async () => {
      if (!listingId) {
        listingId = 1;
      }

      const res = await request(app.getHttpServer())
        .put(`/market/listings/${listingId}/cancel`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
    });
  });

  // ============================================================
  // 5. 盲盒开启（无需交易密码）
  // ============================================================
  describe('盲盒开启（无需交易密码）', () => {
    it('GET /blind-boxes - 查询盲盒列表', async () => {
      const res = await request(app.getHttpServer()).get(
        '/blind-boxes?page=1&page_size=10',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();
    });

    it('POST /blind-boxes/:id/open - 开启盲盒（仅需 JWT）', async () => {
      // 盲盒开启仅需 JWT，不需要交易密码
      // body 仅需 user_collectible_id（用户持有的盲盒藏品ID）
      const res = await request(app.getHttpServer())
        .post(`/blind-boxes/${BLIND_BOX_ID}/open`)
        .set(authHeaders())
        .send({
          user_collectible_id: userCollectibleId || 1,
        });

      // 请求参数：user_collectible_id（无 transaction_password）
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();
      // 开启盲盒应返回中奖奖品
      expect(res.body.data).toHaveProperty('prize');
    });
  });

  // ============================================================
  // 6. 签到 → 查询签到记录
  // ============================================================
  describe('签到 → 查询签到记录', () => {
    it('POST /check-in - 每日签到', async () => {
      // 签到仅需 JWT，不需要交易密码
      const res = await request(app.getHttpServer())
        .post('/check-in')
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body.data).toBeDefined();
    });

    it('GET /check-in/records - 查询签到记录', async () => {
      // 参数 month 格式 YYYY-MM
      const now = new Date();
      const month = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;

      const res = await request(app.getHttpServer())
        .get(`/check-in/records?month=${month}`)
        .set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('code', 200);
      expect(res.body).toHaveProperty('message', 'success');
      expect(res.body.data).toBeDefined();
    });
  });
});
