// [管理后台-认证模块] - 管理员 JWT 策略
// Passport JWT 策略（'admin-jwt'）：从 Authorization: Bearer <token> 提取并校验
// 管理员 JWT 签名/有效期，并在 validate() 中查询 nft_admin_users 表确认管理员仍有效。
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { NftAdminUser } from '../../../database/entities/nft-admin-user.entity';
import { extractToken } from '../../../shared/cookie-auth.util';
import { DEV_JWT_ADMIN_SECRETS } from '../../../config/dev-defaults';

/**
 * 管理员 JWT Payload 结构
 */
export interface AdminJwtPayload {
  /** 管理员 ID */
  id: number;
  /** 用户名 */
  username: string;
  /** 角色（1=超级管理员 2=普通管理员） */
  role: number;
  /** 真实姓名 */
  realName: string;
  /** 2FA 待验证标记（true 表示此 Token 仅用于 2FA 验证流程，不能访问其他端点） */
  pending2fa?: boolean;
  iat?: number;
  exp?: number;
}

/**
 * 管理员认证后的用户信息（挂载到 request.user）
 */
export interface AuthenticatedAdmin {
  id: number;
  username: string;
  role: number;
  realName: string;
  /** 2FA 待验证标记（true 表示此 Token 仅用于 2FA 验证流程） */
  pending2fa?: boolean;
}

/**
 * 管理员 JWT 策略
 *
 * 与前台 JwtStrategy 区别：
 *  - 使用独立的 JWT_ADMIN_SECRET（与用户端隔离）
 *  - 不依赖 Redis token 版本号机制（管理员强制重新登录走黑名单）
 *  - validate() 中查询数据库确认管理员未被删除/禁用
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(NftAdminUser)
    private readonly adminUserRepository: Repository<NftAdminUser>,
  ) {
    super({
      jwtFromRequest: (req: Request): string | null => extractToken(req, true),
      ignoreExpiration: false,
      secretOrKey: ((): string => {
        const secret = configService.get<string>('JWT_ADMIN_SECRET');
        if (!secret) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error(
              '[JWT-Admin] 生产环境必须配置 JWT_ADMIN_SECRET 环境变量',
            );
          }
          // 开发环境兜底，仅限本地
          return DEV_JWT_ADMIN_SECRETS[0];
        }
        return secret;
      })(),
    });
  }

  /**
   * Passport 校验通过后调用，返回值会被挂到 request.user 上
   *
   * 校验流程：
   *  1) JWT 签名/有效期已由 Passport 自动校验
   *  2) 此处查询数据库确认管理员仍然存在且未被软删除/禁用
   *  3) 返回 { id, username, role, realName } 供后续守卫/控制器使用
   */
  async validate(payload: AdminJwtPayload): Promise<AuthenticatedAdmin> {
    const admin = await this.adminUserRepository.findOne({
      where: { id: payload.id, isDelete: 0 },
      select: ['id', 'username', 'realName', 'role', 'status'],
    });

    if (!admin) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '管理员账号不存在或已删除',
      });
    }

    if (admin.status !== 1) {
      throw new UnauthorizedException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '管理员账号已被禁用，请联系超级管理员',
      });
    }

    // 返回 pending2fa 标记，由 AdminJwtGuard 根据路由装饰器决定是否放行
    return {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      realName: admin.realName,
      pending2fa: payload.pending2fa === true ? true : undefined,
    };
  }
}
