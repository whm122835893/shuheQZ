/**
 * httpOnly Cookie 认证工具
 *
 * 将 Access Token 和 Refresh Token 设置到 httpOnly Cookie 中，
 * 防止 XSS 攻击窃取 Token（JavaScript 无法读取 httpOnly Cookie）。
 *
 * 兼容策略：
 *   - 浏览器客户端：自动通过 Cookie 传输 Token（XSS 安全）
 *   - API / 移动端客户端：仍可通过 Authorization: Bearer <token> 传输
 *   - JWT 策略优先从 Cookie 提取，回退到 Authorization 头
 *
 * Cookie 配置：
 *   - httpOnly: true（禁止 JavaScript 访问）
 *   - secure: 生产环境 true（仅 HTTPS 传输）
 *   - sameSite: 生产环境 'none'（跨域），开发环境 'lax'
 *   - path: '/'
 *
 * 环境变量：
 *   - COOKIE_DOMAIN: Cookie 作用域名（如 .example.com），默认不设置
 *   - COOKIE_SECURE: 是否强制 secure，生产环境自动 true
 *   - COOKIE_SAMESITE: sameSite 策略，默认生产 'none'，开发 'lax'
 */
import { Request, Response } from 'express';

/** Cookie 名称常量 */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** 管理后台 Cookie 名称（与用户端隔离） */
export const ADMIN_ACCESS_TOKEN_COOKIE = 'admin_access_token';
export const ADMIN_REFRESH_TOKEN_COOKIE = 'admin_refresh_token';

/** 默认 Access Token 有效期（秒），与 JWT 保持一致 */
const DEFAULT_ACCESS_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 天
const DEFAULT_REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // 30 天

/**
 * 获取 Cookie 配置
 */
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const secure = process.env.COOKIE_SECURE === 'true' || isProduction;
  const sameSite = (process.env.COOKIE_SAMESITE as 'none' | 'lax' | 'strict') || (isProduction ? 'none' : 'lax');

  return {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    path: '/',
  };
}

/**
 * 设置用户端认证 Cookie
 *
 * @param res Express Response 对象
 * @param accessToken JWT Access Token
 * @param refreshToken Refresh Token
 * @param accessTokenMaxAge Access Token 有效期（秒）
 * @param refreshTokenMaxAge Refresh Token 有效期（秒）
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessTokenMaxAge?: number,
  refreshTokenMaxAge?: number,
): void {
  const baseOptions = getCookieOptions();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: (accessTokenMaxAge ?? DEFAULT_ACCESS_TOKEN_MAX_AGE) * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: (refreshTokenMaxAge ?? DEFAULT_REFRESH_TOKEN_MAX_AGE) * 1000,
  });
}

/**
 * 设置管理后台认证 Cookie
 *
 * @param res Express Response 对象
 * @param accessToken JWT Access Token
 * @param refreshToken Refresh Token
 * @param accessTokenMaxAge Access Token 有效期（秒）
 * @param refreshTokenMaxAge Refresh Token 有效期（秒）
 */
export function setAdminAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessTokenMaxAge?: number,
  refreshTokenMaxAge?: number,
): void {
  const baseOptions = getCookieOptions();

  res.cookie(ADMIN_ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions,
    maxAge: (accessTokenMaxAge ?? DEFAULT_ACCESS_TOKEN_MAX_AGE) * 1000,
  });

  res.cookie(ADMIN_REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions,
    maxAge: (refreshTokenMaxAge ?? DEFAULT_REFRESH_TOKEN_MAX_AGE) * 1000,
  });
}

/**
 * 清除用户端认证 Cookie
 */
export function clearAuthCookies(res: Response): void {
  const baseOptions = getCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, baseOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseOptions);
}

/**
 * 清除管理后台认证 Cookie
 */
export function clearAdminAuthCookies(res: Response): void {
  const baseOptions = getCookieOptions();
  res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE, baseOptions);
  res.clearCookie(ADMIN_REFRESH_TOKEN_COOKIE, baseOptions);
}

/**
 * 从 Cookie 中提取 Access Token
 *
 * 优先从 Cookie 提取，如果 Cookie 中没有则返回 null（由调用方回退到 Authorization 头）
 *
 * @param req Express Request 对象
 * @returns Access Token 或 null
 */
export function extractAccessTokenFromCookie(req: Request): string | null {
  const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : null;
}

/**
 * 从 Cookie 中提取 Refresh Token
 */
export function extractRefreshTokenFromCookie(req: Request): string | null {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : null;
}

/**
 * 从 Cookie 中提取管理员 Access Token
 */
export function extractAdminAccessTokenFromCookie(req: Request): string | null {
  const token = req.cookies?.[ADMIN_ACCESS_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : null;
}

/**
 * 从 Cookie 中提取管理员 Refresh Token
 */
export function extractAdminRefreshTokenFromCookie(req: Request): string | null {
  const token = req.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : null;
}

/**
 * 统一 Token 提取：优先 Cookie，回退 Authorization 头
 *
 * 供 JWT 策略和守卫使用。
 *
 * @param req Express Request 对象
 * @param isAdmin 是否提取管理员 Token（默认 false）
 * @returns Access Token 或 null
 */
export function extractToken(req: Request, isAdmin = false): string | null {
  // 1) 优先从 Cookie 提取
  const cookieToken = isAdmin
    ? extractAdminAccessTokenFromCookie(req)
    : extractAccessTokenFromCookie(req);
  if (cookieToken) return cookieToken;

  // 2) 回退到 Authorization: Bearer <token>
  const authHeader = req.headers.authorization || '';
  const [type, token] = authHeader.split(' ');
  if (type === 'Bearer' && token) return token;

  return null;
}
