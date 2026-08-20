// [公共] - 共享服务统一导出
//
// 汇总内容:
//  - Redis 服务(实现 jwt-auth.guard.ts 的 IRedisService 接口 + 扩展方法)
//  - 短信发送服务(验证码生成/发送/冷却/限流/落库)
//  - 文件上传服务(Multer 校验/命名/URL)
//  - 支付服务(alipay / wechat / huifu / yeepay)
//  - Passport JWT 策略(从 Authorization 头提取 Bearer token 并校验)
//
// 使用方式:
//  import { RedisService, SmsService, JwtStrategy } from '../shared';
//  或在 Module 中:
//  import { RedisServiceProvider, SmsServiceProvider } from '../shared';

// ============================================================
// Redis 服务
// ============================================================
export {
  RedisService,
  RedisServiceProvider,
} from './redis.service';

// ============================================================
// 短信发送服务
// ============================================================
export {
  SmsService,
  SmsServiceProvider,
  SmsScene,
  SmsSendResult,
} from './sms.service';

// ============================================================
// 文件上传服务
// ============================================================
export {
  UploadService,
  UploadServiceProvider,
  IMulterFile,
} from './upload.service';

// ============================================================
// Passport JWT 策略
// ------------------------------------------------------------
// 注：shared/jwt.strategy.ts 已作为死代码删除（BUG-023）。
// 实际生效的 JWT 策略位于 modules/user/strategies/jwt.strategy.ts，
// 并由 user.module.ts 注册。此处移除重复导出，避免悬空模块引用。
// ============================================================

// ============================================================
// AES 加密工具
// ============================================================
export {
  encrypt,
  decrypt,
  encryptJSON,
  decryptJSON,
  encryptConfig,
  decryptConfig,
  isEncryptedConfig,
} from './aes.util';

// ============================================================
// Cookie 认证工具
// ============================================================
export {
  setAuthCookies,
  setAdminAuthCookies,
  clearAuthCookies,
  clearAdminAuthCookies,
  extractAccessTokenFromCookie,
  extractRefreshTokenFromCookie,
  extractAdminAccessTokenFromCookie,
  extractAdminRefreshTokenFromCookie,
  extractToken,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE,
} from './cookie-auth.util';

// ============================================================
// 支付服务 - 支付宝
// ============================================================
export {
  AlipayService,
  AlipayServiceProvider,
  AlipayOrderResult,
  AlipayCallbackResult,
} from './payment/alipay.service';

// ============================================================
// 支付服务 - 微信支付
// ============================================================
export {
  WechatService,
  WechatServiceProvider,
  WechatOrderResult,
  WechatCallbackResult,
} from './payment/wechat.service';

// ============================================================
// 支付服务 - 汇付天下(coming_soon)
// ============================================================
export {
  HuifuService,
  HuifuServicePlaceholder,
  HuifuServiceProvider,
  HuifuOrderResult,
  HuifuCallbackResult,
  HUIFU_STATUS,
} from './payment/huifu.service';

// ============================================================
// 支付服务 - 易宝支付(coming_soon)
// ============================================================
export {
  YeepayService,
  YeepayServicePlaceholder,
  YeepayServiceProvider,
  YeepayOrderResult,
  YeepayCallbackResult,
  YEEPAY_STATUS,
} from './payment/yeepay.service';
