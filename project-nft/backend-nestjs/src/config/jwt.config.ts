// [配置] - JWT 配置
// 从 .env 读取 secret/expiresIn/refreshSecret/refreshExpiresIn，导出配置对象
//
// 安全策略:
//   - 生产环境(NODE_ENV=production)强制要求 JWT_SECRET 和 JWT_REFRESH_SECRET 已配置
//   - 未配置时抛出异常阻止启动,不允许使用默认密钥
//   - Access Token 默认 2h(原 7d 过长,已修正)
//   - Refresh Token 默认 7d(原 30d 过长,已修正)
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { JwtModuleOptions } from '@nestjs/jwt';

const logger = new Logger('JwtConfig');

/**
 * JWT 配置接口
 */
export interface JwtConfig extends JwtModuleOptions {
  /** 访问令牌密钥 */
  secret: string;
  /** 访问令牌过期时间 */
  expiresIn: string;
  /** 刷新令牌密钥 */
  refreshSecret: string;
  /** 刷新令牌过期时间 */
  refreshExpiresIn: string;
  /** 刷新令牌在 Redis 中的 key 前缀 */
  refreshKeyPrefix: string;
  /** 黑名单 key 前缀 */
  blacklistKeyPrefix: string;
}

/**
 * 开发环境默认密钥（仅限开发使用，生产环境禁止使用）
 */
const DEV_SECRET = 'shuhe-wenchuang-jwt-secret-dev-only';
const DEV_REFRESH_SECRET = 'shuhe-wenchuang-refresh-secret-dev-only';

/**
 * JWT 配置工厂
 *
 * 环境变量：
 *   JWT_SECRET              访问令牌密钥（生产环境必须配置）
 *   JWT_EXPIRES_IN          访问令牌过期时间，默认 2h
 *   JWT_REFRESH_SECRET      刷新令牌密钥（生产环境必须配置）
 *   JWT_REFRESH_EXPIRES_IN  刷新令牌过期时间，默认 7d
 */
export const getJwtConfig = (configService: ConfigService): JwtConfig => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const secret = configService.get<string>('JWT_SECRET');
  const refreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

  // 生产环境强制校验密钥已配置
  if (isProduction) {
    if (!secret) {
      throw new Error(
        '[JWT] 生产环境必须配置 JWT_SECRET 环境变量，禁止使用默认密钥',
      );
    }
    if (!refreshSecret) {
      throw new Error(
        '[JWT] 生产环境必须配置 JWT_REFRESH_SECRET 环境变量，禁止使用默认密钥',
      );
    }
  }

  if (!secret) {
    logger.warn('JWT_SECRET 未配置，使用开发默认值（仅限开发环境）');
  }
  if (!refreshSecret) {
    logger.warn('JWT_REFRESH_SECRET 未配置，使用开发默认值（仅限开发环境）');
  }

  return {
    secret: secret || DEV_SECRET,
    // Access Token 默认 2h（原 7d 过长，存在 token 被盗用的风险窗口）
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '2h'),
    refreshSecret: refreshSecret || DEV_REFRESH_SECRET,
    // Refresh Token 默认 7d（原 30d 过长）
    refreshExpiresIn: configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    refreshKeyPrefix: 'auth:refresh:',
    blacklistKeyPrefix: 'auth:blacklist:',
  };
};

export default getJwtConfig;
