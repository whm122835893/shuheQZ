// [用户模块] - JWT 策略
// Passport JWT 策略：从 Authorization: Bearer <token> 提取并校验 JWT 签名/有效期，
// 并在 validate() 中比对 Redis 中的 token 版本号，实现"使该用户所有 Token 即时失效"。
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { IRedisService } from '../../../common/guards/jwt-auth.guard';
import { extractToken } from '../../../shared/cookie-auth.util';
import { DEV_JWT_SECRET } from '../../../config/dev-defaults';

/**
 * JWT Payload 结构
 */
export interface JwtPayload {
  /** 用户ID */
  id: number;
  /** 用户名 */
  username?: string;
  /** 手机号 */
  phone?: string;
  /** Token 版本号（用于批量失效） */
  ver: number;
  iat?: number;
  exp?: number;
}

/**
 * Redis 中存储 token 版本号的 key
 */
export const TOKEN_VERSION_KEY = (userId: number): string =>
  `auth:token_version:${userId}`;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_SERVICE') private readonly redisService: IRedisService,
  ) {
    super({
      jwtFromRequest: (req: Request): string | null => extractToken(req, false),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        DEV_JWT_SECRET,
    });
  }

  /**
   * Passport 校验通过后调用，返回值会被挂到 request.user 上
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // 比对 Redis 中的当前 token 版本号；不一致说明该用户的 Token 已被批量失效
    const verStr = await this.redisService.get(TOKEN_VERSION_KEY(payload.id));
    const currentVer = verStr ? parseInt(verStr, 10) : 0;

    if (payload.ver !== currentVer) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '登录状态已失效，请重新登录',
      });
    }

    return {
      id: payload.id,
      username: payload.username,
      phone: payload.phone,
    };
  }
}
