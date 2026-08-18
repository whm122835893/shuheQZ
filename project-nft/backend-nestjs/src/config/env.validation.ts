/**
 * 生产环境配置验证
 *
 * 在应用启动时检查所有关键环境变量是否已正确配置。
 * 生产环境（NODE_ENV=production）下，任何缺失或不安全的配置都会阻止应用启动。
 *
 * 使用方式：在 main.ts 的 bootstrap() 最开始调用 validateEnv()
 */

import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

/**
 * 验证结果
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 检查环境变量是否已配置（非空、非占位符）
 */
function isConfigured(value: string | undefined): boolean {
  if (!value || value.trim() === '') return false;
  // 检查是否为占位符
  if (value.includes('<请替换')) return false;
  return true;
}

/**
 * 检查密钥强度（至少 16 字符，不等于已知开发默认值）
 */
function isStrongKey(value: string | undefined, devDefaults: string[]): boolean {
  if (!isConfigured(value)) return false;
  if (value.length < 16) return false;
  if (devDefaults.includes(value)) return false;
  return true;
}

// 已知的开发环境默认值（不应用于生产）
// 包含所有历史使用过的弱密钥，确保生产环境不会误用
const DEV_DEFAULTS = {
  jwtSecret: [
    'shuhe-wenchuang-jwt-secret-2026',
    'shuhe-jwt-secret-2026',
  ],
  jwtRefreshSecret: [
    'shuhe-wenchuang-refresh-secret-2026',
    'shuhe-refresh-secret-2026',
  ],
  jwtAdminSecret: [
    'shuhe-admin-secret-2026',
    'shuhe-admin-dev-only-secret-not-for-production',
  ],
  aesKey: [
    'shuhe-data-aes-key-dev-only-32b!',
    'd5319230b462f52955effdc1f09aa384',
  ],
};

/**
 * 验证生产环境配置
 *
 * 检查项：
 *   1. NODE_ENV 正确设置
 *   2. 数据库连接信息完整
 *   3. Redis 连接信息完整
 *   4. JWT 密钥已配置且非默认值
 *   5. AES 加密密钥已配置且非默认值
 *   6. PAYMENT_DEV_MODE=false（支付验签强制开启）
 *   7. REALNAME_DEV_MODE=false（实名认证强制开启）
 *   8. 支付宝/微信支付公钥已配置
 *   9. CORS 白名单已配置（非 localhost）
 *  10. DB_SYNC=false（禁止自动同步表结构）
 */
export function validateProductionEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return { valid: true, errors: [], warnings: [] };
  }

  // 1. NODE_ENV
  // （已确认是 production 才走到这里）

  // 2. 数据库配置
  if (!isConfigured(process.env.DB_HOST)) {
    errors.push('[DB] 生产环境未配置 DB_HOST');
  }
  if (!isConfigured(process.env.DB_PASSWORD)) {
    errors.push('[DB] 生产环境未配置 DB_PASSWORD');
  }
  if (process.env.DB_SYNC === 'true') {
    errors.push('[DB] 生产环境禁止 DB_SYNC=true，请使用 migration 管理表结构');
  }
  if (!isConfigured(process.env.DB_DATABASE)) {
    errors.push('[DB] 生产环境未配置 DB_DATABASE');
  }

  // 3. Redis 配置
  if (!isConfigured(process.env.REDIS_HOST)) {
    errors.push('[Redis] 生产环境未配置 REDIS_HOST');
  }
  if (!isConfigured(process.env.REDIS_PASSWORD)) {
    warnings.push('[Redis] 生产环境未配置 REDIS_PASSWORD，建议设置密码');
  }

  // 4. JWT 密钥
  if (!isStrongKey(process.env.JWT_SECRET, DEV_DEFAULTS.jwtSecret)) {
    errors.push(
      '[JWT] 生产环境必须配置 JWT_SECRET（≥16字符，非开发默认值）',
    );
  }
  if (!isStrongKey(process.env.JWT_REFRESH_SECRET, DEV_DEFAULTS.jwtRefreshSecret)) {
    errors.push(
      '[JWT] 生产环境必须配置 JWT_REFRESH_SECRET（≥16字符，非开发默认值）',
    );
  }
  if (!isStrongKey(process.env.JWT_ADMIN_SECRET, DEV_DEFAULTS.jwtAdminSecret)) {
    errors.push(
      '[JWT-Admin] 生产环境必须配置 JWT_ADMIN_SECRET（≥16字符，非开发默认值）',
    );
  }

  // 5. AES 加密密钥
  if (!isStrongKey(process.env.DATA_AES_KEY, DEV_DEFAULTS.aesKey)) {
    errors.push(
      '[AES] 生产环境必须配置 DATA_AES_KEY（32字节，非开发默认值）',
    );
  }
  if (process.env.DATA_AES_KEY && process.env.DATA_AES_KEY.length !== 32) {
    warnings.push(
      `[AES] DATA_AES_KEY 长度为 ${process.env.DATA_AES_KEY.length}，建议使用 32 字节密钥以获得最佳兼容性`,
    );
  }

  // 6. 支付安全
  if (process.env.PAYMENT_DEV_MODE === 'true') {
    errors.push(
      '[Payment] 生产环境禁止 PAYMENT_DEV_MODE=true，必须启用支付回调验签',
    );
  }

  // 7. 实名认证
  if (process.env.REALNAME_DEV_MODE === 'true') {
    errors.push(
      '[KYC] 生产环境禁止 REALNAME_DEV_MODE=true，必须启用实名认证',
    );
  }

  // 8. 支付公钥配置
  if (!isConfigured(process.env.ALIPAY_PUBLIC_KEY)) {
    warnings.push(
      '[Alipay] ALIPAY_PUBLIC_KEY 未配置，支付宝支付回调将无法验签',
    );
  }
  if (!isConfigured(process.env.ALIPAY_APP_ID)) {
    warnings.push('[Alipay] ALIPAY_APP_ID 未配置，支付宝支付功能不可用');
  }
  if (!isConfigured(process.env.WECHAT_PUBLIC_KEY)) {
    warnings.push(
      '[Wechat] WECHAT_PUBLIC_KEY 未配置，微信支付回调将无法验签',
    );
  }
  if (!isConfigured(process.env.WECHAT_API_V3_KEY)) {
    warnings.push(
      '[Wechat] WECHAT_API_V3_KEY 未配置，微信支付回调将无法验签',
    );
  }

  // 9. CORS 白名单
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS || '';
  if (!isConfigured(corsOrigins)) {
    errors.push('[CORS] 生产环境必须配置 CORS_ALLOWED_ORIGINS');
  }
  if (corsOrigins.includes('localhost') || corsOrigins.includes('127.0.0.1')) {
    warnings.push(
      '[CORS] CORS_ALLOWED_ORIGINS 包含 localhost，生产环境建议移除',
    );
  }

  // 10. 短信服务
  if (!isConfigured(process.env.SMS_ACCESS_KEY)) {
    warnings.push('[SMS] SMS_ACCESS_KEY 未配置，短信验证码功能不可用');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 启动时环境变量验证入口
 *
 * 在 main.ts bootstrap() 开头调用。
 * 生产环境下如果有 error 级别问题，直接抛出异常阻止启动。
 */
export function checkEnvOrThrow(): void {
  const result = validateProductionEnv();

  // 输出警告
  if (result.warnings.length > 0) {
    logger.warn('环境变量警告：');
    result.warnings.forEach((w) => logger.warn(`  ${w}`));
  }

  // 有错误则阻止启动
  if (!result.valid) {
    logger.error('生产环境配置验证失败，应用拒绝启动：');
    result.errors.forEach((e) => logger.error(`  ${e}`));
    logger.error('请检查 .env 或环境变量配置后重试。');
    throw new Error(
      `生产环境配置验证失败：${result.errors.length} 个错误`,
    );
  }

  if (result.warnings.length === 0 && result.errors.length === 0) {
    logger.log('生产环境配置验证通过');
  }
}
