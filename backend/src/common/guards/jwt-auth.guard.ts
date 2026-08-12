// [公共] - JWT 认证守卫
// 继承 AuthGuard('jwt')，支持 @Public() 装饰器跳过认证，并检查 Redis 黑名单
import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * Redis 黑名单服务接口（注入 token 'REDIS_SERVICE'）
 * 实际项目中由 redis.service.ts 实现，这里仅声明接口契约。
 */
export interface IRedisService {
  /**
   * 判断给定 token 是否已在黑名单中
   */
  get(key: string): Promise<string | null>;
}

/**
 * 黑名单 key 前缀
 */
const BLACKLIST_KEY_PREFIX = 'auth:blacklist:';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject('REDIS_SERVICE') private readonly redisService: IRedisService,
  ) {
    super();
  }

  /**
   * 入口：先判断是否公开接口，再交由 Passport JWT 策略校验
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) 通过 Reflector 判断是否为公开接口（@Public()）
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2) 交由 Passport JWT 策略校验 token 的有效性（签名/有效期）
    const passportOk = (await super.canActivate(context)) as boolean;
    if (!passportOk) {
      return false;
    }

    // 3) 校验通过后，检查 Redis 黑名单（登出/踢人场景）
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (token) {
      const isBlacklisted = await this.redisService.get(
        `${BLACKLIST_KEY_PREFIX}${token}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          data: null,
          message: 'Token 已加入黑名单，请重新登录',
        });
      }
    }

    return true;
  }

  /**
   * 处理未认证错误，统一返回 401 业务码
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    // 公开接口直接放行
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return user as TUser;
    }

    if (err || !user) {
      const message =
        info?.message === 'jwt expired'
          ? '登录已过期，请重新登录'
          : info?.message === 'No auth token'
            ? '缺少认证信息，请先登录'
            : '认证失败，请重新登录';
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message,
      });
    }

    return user as TUser;
  }

  /**
   * 从 Authorization 头部提取 Bearer token
   */
  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization || '';
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token) {
      return token;
    }
    return null;
  }
}
