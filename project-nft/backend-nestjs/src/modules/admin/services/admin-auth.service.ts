// [管理后台-认证模块] - 管理员认证业务服务
// 实现管理员登录、密码验证、JWT 签发/刷新、密码修改、2FA 设置/验证等核心认证逻辑。
//
// 关键设计：
//  - Access Token 有效期 8h，使用 JWT_ADMIN_SECRET（与前台隔离）
//  - Refresh Token 有效期 7d，存储在 Redis 中实现单点登录与强制下线
//  - 密码使用 bcrypt 哈希（12 轮）
//  - 2FA 使用 TOTP（RFC 6238），secret 存储在 Redis 中
//  - 登出时将 access token 加入 Redis 黑名单，实现即时失效
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { ErrorCode } from '../../../common/enums/error-code.enum';
import { RedisService } from '../../../shared/redis.service';
import { NftAdminUser } from '../../../database/entities/nft-admin-user.entity';
import { DEV_JWT_ADMIN_SECRETS } from '../../../config/dev-defaults';
import {
  AdminJwtPayload,
  AuthenticatedAdmin,
} from '../strategies/admin-jwt.strategy';

import { AdminLoginDto } from '../dto/admin-auth.dto';
import { AdminChangePasswordDto } from '../dto/admin-auth.dto';
import { AdminRefreshTokenDto } from '../dto/admin-auth.dto';
import { Admin2faVerifyDto } from '../dto/admin-auth.dto';

// ============================================================
// 常量
// ============================================================

/** bcrypt 加密轮数 */
const BCRYPT_ROUNDS = 12;

/** Access Token 有效期 */
const ACCESS_TOKEN_EXPIRES_IN = '8h';

/** Refresh Token 有效期（秒），7 天 */
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

/** 管理员黑名单 key 前缀（与 admin-jwt.guard.ts 保持一致） */
const ADMIN_BLACKLIST_KEY_PREFIX = 'admin:auth:blacklist:';

/** 管理员 refresh token key 前缀 */
const ADMIN_REFRESH_KEY_PREFIX = 'admin:auth:refresh:';

/** 2FA 待确认 secret key 前缀（setup 阶段临时存储，5 分钟有效） */
const ADMIN_2FA_PENDING_PREFIX = 'admin:2fa:pending:';

/** 2FA 已启用 secret key 前缀（verify 后永久存储） */
const ADMIN_2FA_SECRET_PREFIX = 'admin:2fa:secret:';

/** 2FA 待确认 secret TTL（5 分钟） */
const ADMIN_2FA_PENDING_TTL = 300;

/** TOTP 时间步长（秒） */
const TOTP_TIME_STEP = 30;

/** TOTP 位数 */
const TOTP_DIGITS = 6;

/** TOTP 验证窗口（前后各 1 个时间步） */
const TOTP_WINDOW = 1;

/** Base32 编码字符表（RFC 4648） */
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ============================================================
// TOTP 工具函数
// ============================================================

/**
 * Base32 编码（RFC 4648）
 */
function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

/**
 * Base32 解码
 */
function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/=+$/, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleanStr) {
    const index = BASE32_CHARS.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * 生成指定时间步的 TOTP 码（RFC 6238）
 */
function generateTOTPAtCounter(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** TOTP_DIGITS)
    .toString()
    .padStart(TOTP_DIGITS, '0');
}

/**
 * 验证 TOTP 码（允许前后各 TOTP_WINDOW 个时间步的偏差）
 */
function verifyTOTP(secret: string, code: string): boolean {
  const currentCounter = Math.floor(Date.now() / 1000 / TOTP_TIME_STEP);
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const expected = generateTOTPAtCounter(secret, currentCounter + i);
    if (expected === code) {
      return true;
    }
  }
  return false;
}

/**
 * 生成随机 Base32 密钥
 */
function generateBase32Secret(length: number = 20): string {
  const bytes = crypto.randomBytes(length);
  return base32Encode(bytes);
}

// ============================================================
// 服务
// ============================================================

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRepository(NftAdminUser)
    private readonly adminUserRepo: Repository<NftAdminUser>,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
  ) {}

  // ============================================================
  // 登录 / 认证
  // ============================================================

  /**
   * 管理员登录
   * @param dto 用户名 + 密码
   * @param ip   登录 IP
   * @returns { token, refreshToken, admin }
   */
  async login(dto: AdminLoginDto, ip?: string): Promise<{
    token: string;
    refreshToken: string;
    admin: Record<string, any>;
  }> {
    const admin = await this.validateAdmin(dto.username, dto.password);

    // 检查 2FA 是否已启用
    const twoFactorEnabled = await this.is2faEnabled(admin.id);
    if (twoFactorEnabled) {
      // 2FA 已开启：签发一个短时临时 token 供 2FA 验证使用
      const tempToken = this.jwtService.sign(
        { id: admin.id, username: admin.username, role: admin.role, realName: admin.realName, pending2fa: true },
        {
          secret: this.getJwtSecret(),
          expiresIn: '5m',
        },
      );
      return {
        token: tempToken,
        refreshToken: '',
        admin: {
          id: admin.id,
          username: admin.username,
          realName: admin.realName,
          role: admin.role,
          requires2fa: true,
        },
      };
    }

    const token = this.generateToken(admin);
    const refreshToken = this.generateRefreshToken(admin);

    // 存储 refresh token 到 Redis（单点登录：后登录踢掉前登录）
    await this.redis.set(
      `${ADMIN_REFRESH_KEY_PREFIX}${admin.id}`,
      refreshToken,
      REFRESH_TOKEN_TTL,
    );

    // 更新登录信息
    await this.adminUserRepo.update(admin.id, {
      lastLoginAt: new Date(),
      lastLoginIp: ip || null,
      loginCount: admin.loginCount + 1,
    });

    return {
      token,
      refreshToken,
      admin: {
        id: admin.id,
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
        requires2fa: false,
      },
    };
  }

  /**
   * 验证管理员用户名和密码
   * @throws UnauthorizedException 用户名不存在 / 密码错误
   * @throws ForbiddenException 账号已被禁用 / 已删除
   */
  async validateAdmin(username: string, password: string): Promise<NftAdminUser> {
    const admin = await this.adminUserRepo.findOne({
      where: { username },
      select: ['id', 'username', 'password', 'realName', 'role', 'status', 'loginCount', 'isDelete'],
    });

    if (!admin || admin.isDelete === 1) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '用户名或密码错误',
      });
    }

    if (admin.status !== 1) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '管理员账号已被禁用，请联系超级管理员',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '用户名或密码错误',
      });
    }

    return admin;
  }

  /**
   * 签发 Access Token（有效期 8h）
   */
  generateToken(admin: NftAdminUser): string {
    const payload: AdminJwtPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      realName: admin.realName,
    };
    return this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });
  }

  /**
   * 签发 Refresh Token（有效期 7d）
   */
  generateRefreshToken(admin: NftAdminUser): string {
    return this.jwtService.sign(
      { id: admin.id, username: admin.username, type: 'refresh' },
      {
        secret: this.getJwtSecret(),
        expiresIn: REFRESH_TOKEN_TTL + 's',
      },
    );
  }

  /**
   * 刷新 Token
   * @param dto 包含 refresh_token
   * @returns 新的 { token, refreshToken, admin }
   */
  async refreshToken(dto: AdminRefreshTokenDto): Promise<{
    token: string;
    refreshToken: string;
    admin: Record<string, any>;
  }> {
    // 1) 校验 refresh token 的签名和有效期
    let payload: { id: number; username: string; type?: string };
    try {
      payload = this.jwtService.verify(dto.refresh_token, {
        secret: this.getJwtSecret(),
      });
    } catch {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: 'Refresh Token 无效或已过期，请重新登录',
      });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: 'Token 类型错误，请使用 refresh_token',
      });
    }

    // 2) 校验 Redis 中存储的 refresh token 是否匹配（防止旧 token 被复用）
    const isValid = await this.redis.get(`${ADMIN_REFRESH_KEY_PREFIX}${payload.id}`);
    if (!isValid || isValid !== dto.refresh_token) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: 'Refresh Token 已失效，请重新登录',
      });
    }

    // 3) 查询管理员确认仍然有效
    const admin = await this.adminUserRepo.findOne({
      where: { id: payload.id, isDelete: 0 },
      select: ['id', 'username', 'password', 'realName', 'role', 'status', 'loginCount', 'isDelete'],
    });

    if (!admin || admin.status !== 1) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '管理员账号不存在或已被禁用',
      });
    }

    // 4) 签发新 token
    const newToken = this.generateToken(admin);
    const newRefreshToken = this.generateRefreshToken(admin);

    await this.redis.set(
      `${ADMIN_REFRESH_KEY_PREFIX}${admin.id}`,
      newRefreshToken,
      REFRESH_TOKEN_TTL,
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      admin: {
        id: admin.id,
        username: admin.username,
        realName: admin.realName,
        role: admin.role,
      },
    };
  }

  /**
   * 管理员登出
   * @param adminId 管理员 ID
   * @param token   当前 access token（加入黑名单）
   */
  async logout(adminId: number, token: string): Promise<void> {
    // 1) 将 access token 加入黑名单（剩余有效期作为 TTL）
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.set(
          `${ADMIN_BLACKLIST_KEY_PREFIX}${token}`,
          '1',
          ttl,
        );
      }
    }

    // 2) 吊销 refresh token
    await this.redis.del(`${ADMIN_REFRESH_KEY_PREFIX}${adminId}`);
  }

  // ============================================================
  // 管理员信息
  // ============================================================

  /**
   * 获取当前管理员信息
   */
  async getAdminInfo(adminId: number): Promise<Record<string, any>> {
    const admin = await this.adminUserRepo.findOne({
      where: { id: adminId, isDelete: 0 },
      select: ['id', 'username', 'realName', 'role', 'status', 'lastLoginAt', 'lastLoginIp', 'loginCount', 'createdAt'],
    });

    if (!admin) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '管理员不存在',
      });
    }

    const twoFactorEnabled = await this.is2faEnabled(adminId);

    return {
      ...admin,
      twoFactorEnabled,
    };
  }

  // ============================================================
  // 密码修改
  // ============================================================

  /**
   * 修改管理员密码
   * @throws BadRequestException 新旧密码相同
   * @throws UnauthorizedException 原密码错误
   */
  async changePassword(
    adminId: number,
    dto: AdminChangePasswordDto,
    token?: string,
  ): Promise<void> {
    if (dto.old_password === dto.new_password) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '新密码不能与原密码相同',
      });
    }

    const admin = await this.adminUserRepo.findOne({
      where: { id: adminId, isDelete: 0 },
      select: ['id', 'username', 'password', 'loginCount'],
    });

    if (!admin) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '管理员不存在',
      });
    }

    const isOldPasswordValid = await bcrypt.compare(
      dto.old_password,
      admin.password,
    );
    if (!isOldPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '原密码错误',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS);
    await this.adminUserRepo.update(adminId, { password: hashedPassword });

    // 修改密码后吊销 refresh token，强制重新登录
    await this.redis.del(`${ADMIN_REFRESH_KEY_PREFIX}${adminId}`);

    // 同时将当前 access token 加入黑名单，防止密码修改后旧 token 继续使用
    if (token) {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(
            `${ADMIN_BLACKLIST_KEY_PREFIX}${token}`,
            '1',
            ttl,
          );
        }
      }
    }
  }

  // ============================================================
  // 2FA（两步验证）
  // ============================================================

  /**
   * 设置 2FA：生成密钥和二维码
   * @param adminId  管理员 ID
   * @param password 当前密码（验证身份）
   * @returns { secret, qrCodeUrl, otpauthUrl }
   */
  async setup2fa(
    adminId: number,
    password: string,
  ): Promise<{
    secret: string;
    qrCodeUrl: string;
    otpauthUrl: string;
  }> {
    // 验证密码确认身份
    const admin = await this.adminUserRepo.findOne({
      where: { id: adminId, isDelete: 0 },
      select: ['id', 'username', 'password'],
    });

    if (!admin) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '管理员不存在',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '密码验证失败',
      });
    }

    // 生成密钥
    const secret = generateBase32Secret(20);

    // 构建 otpauth URI（供 Google Authenticator 等应用扫描）
    const issuer = encodeURIComponent('数和文创管理后台');
    const label = encodeURIComponent(admin.username);
    const otpauthUrl = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_TIME_STEP}`;

    // 生成二维码 Data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
    });

    // 将密钥临时存储到 Redis（5 分钟内需要 verify 确认）
    await this.redis.set(
      `${ADMIN_2FA_PENDING_PREFIX}${adminId}`,
      secret,
      ADMIN_2FA_PENDING_TTL,
    );

    return { secret, qrCodeUrl, otpauthUrl };
  }

  /**
   * 验证 2FA：确认密钥并启用
   * @param adminId 管理员 ID
   * @param dto     包含 secret 和 code
   */
  async verify2fa(adminId: number, dto: Admin2faVerifyDto): Promise<void> {
    // 1) 校验 pending secret 是否匹配
    const pendingSecret = await this.redis.get(
      `${ADMIN_2FA_PENDING_PREFIX}${adminId}`,
    );
    if (!pendingSecret || pendingSecret !== dto.secret) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '密钥无效或已过期，请重新设置 2FA',
      });
    }

    // 2) 校验 TOTP 验证码
    if (!verifyTOTP(dto.secret, dto.code)) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '验证码错误，请重试',
      });
    }

    // 3) 永久存储 secret 并标记为已启用
    await this.redis.set(`${ADMIN_2FA_SECRET_PREFIX}${adminId}`, dto.secret);
    await this.redis.del(`${ADMIN_2FA_PENDING_PREFIX}${adminId}`);
  }

  /**
   * 检查 2FA 是否已启用
   */
  async is2faEnabled(adminId: number): Promise<boolean> {
    const secret = await this.redis.get(`${ADMIN_2FA_SECRET_PREFIX}${adminId}`);
    return secret !== null;
  }

  /**
   * 关闭 2FA
   */
  async disable2fa(adminId: number, password: string): Promise<void> {
    const admin = await this.adminUserRepo.findOne({
      where: { id: adminId, isDelete: 0 },
      select: ['id', 'password'],
    });

    if (!admin) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '管理员不存在',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '密码验证失败',
      });
    }

    await this.redis.del(`${ADMIN_2FA_SECRET_PREFIX}${adminId}`);
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 获取 JWT 密钥
   */
  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_ADMIN_SECRET');
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          '[JWT-Admin] 生产环境必须配置 JWT_ADMIN_SECRET 环境变量',
        );
      }
      return DEV_JWT_ADMIN_SECRETS[0];
    }
    return secret;
  }
}
