/**
 * 开发环境默认密钥常量
 *
 * 安全策略：
 *   - 所有开发环境默认密钥集中在此文件管理，避免散落在各处代码中
 *   - 生产环境（NODE_ENV=production）禁止使用这些密钥
 *   - env.validation.ts 引用此文件进行生产环境密钥校验
 *   - 各模块通过 isDevKey() 判断当前密钥是否为开发默认值
 *
 * ⚠️ 生产环境必须通过环境变量覆盖所有密钥，否则应用将拒绝启动
 */

/**
 * JWT 密钥开发默认值
 */
export const DEV_JWT_SECRETS = [
  'shuhe-wenchuang-jwt-secret-dev-only',
  'shuhe-wenchuang-jwt-secret-2026',
  'shuhe-jwt-secret-2026',
] as const;

/**
 * JWT 刷新密钥开发默认值
 */
export const DEV_JWT_REFRESH_SECRETS = [
  'shuhe-wenchuang-refresh-secret-dev-only',
  'shuhe-wenchuang-refresh-secret-2026',
  'shuhe-refresh-secret-2026',
] as const;

/**
 * Admin JWT 密钥开发默认值
 */
export const DEV_JWT_ADMIN_SECRETS = [
  'shuhe-admin-dev-only-secret-not-for-production',
  'shuhe-admin-secret-2026',
] as const;

/**
 * AES 加密密钥开发默认值
 */
export const DEV_AES_KEYS = [
  'shuhe-data-aes-key-dev-only-32b!',
  'd5319230b462f52955effdc1f09aa384',
] as const;

/**
 * 开发环境 JWT 密钥（用于未配置环境变量时的回退）
 *
 * ⚠️ 仅在 NODE_ENV !== 'production' 时使用
 */
export const DEV_JWT_SECRET = 'shuhe-wenchuang-jwt-secret-dev-only';
export const DEV_JWT_REFRESH_SECRET = 'shuhe-wenchuang-refresh-secret-dev-only';

/**
 * 检查给定的密钥是否为已知的开发默认值
 */
export function isDevKey(
  value: string | undefined,
  devKeys: readonly string[],
): boolean {
  if (!value) return true;
  return (devKeys as readonly string[]).includes(value);
}
