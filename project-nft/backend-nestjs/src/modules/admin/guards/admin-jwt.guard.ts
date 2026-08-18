// [管理后台-认证模块] - 管理员 JWT 认证守卫
// 继承 AuthGuard('admin-jwt')，保护所有管理后台端点。
//
// 与全局 JwtAuthGuard 的协作：
//  - 全局 JwtAuthGuard 使用 @Public() 跳过（IS_PUBLIC_KEY）
//  - 本守卫使用 @AdminPublic() 跳过（ADMIN_PUBLIC_KEY）
//  - 管理后台所有端点都标记 @Public() 以跳过全局用户端守卫
//  - 需要管理员认证的端点额外标记 @UseGuards(AdminJwtGuard)
//  - 登录端点同时标记 @Public() + @AdminPublic() 以跳过两个守卫
//
// 登出/踢人场景：检查 Redis 黑名单实现 token 即时失效
import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { ADMIN_PUBLIC_KEY } from '../decorators/admin-public.decorator';
import { ALLOW_PENDING_2FA_KEY } from '../decorators/allow-pending-2fa.decorator';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { IRedisService } from '../../../common/guards/jwt-auth.guard';
import { extractToken } from '../../../shared/cookie-auth.util';

/**
 * 管理员黑名单 key 前缀（与 admin-auth.service.ts 中写入的 key 保持一致）
 */
const ADMIN_BLACKLIST_KEY_PREFIX = 'admin:auth:blacklist:';

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {
  constructor(
    private readonly reflector: Reflector,
    @Inject('REDIS_SERVICE') private readonly redisService: IRedisService,
  ) {
    super();
  }

  /**
   * 入口：先判断是否为管理后台公开接口，再交由 Passport admin-jwt 策略校验，
   * 最后检查 Redis 黑名单
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) 通过 Reflector 判断是否为管理后台公开接口（@AdminPublic()）
    const isAdminPublic = this.reflector.getAllAndOverride<boolean>(
      ADMIN_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isAdminPublic) {
      return true;
    }

    // 2) 交由 Passport admin-jwt 策略校验 token 的有效性
    const passportOk = (await super.canActivate(context)) as boolean;
    if (!passportOk) {
      return false;
    }

    // 3) 校验通过后，检查 Redis 黑名单（登出/踢人场景）
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (token) {
      const isBlacklisted = await this.redisService.get(
        `${ADMIN_BLACKLIST_KEY_PREFIX}${token}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          data: null,
          message: '管理员 Token 已失效，请重新登录',
        });
      }
    }

    // 4) 检查 pending2fa 临时 Token 访问限制
    const user = request.user as { pending2fa?: boolean } | undefined;
    if (user?.pending2fa === true) {
      const allowPending2fa = this.reflector.getAllAndOverride<boolean>(
        ALLOW_PENDING_2FA_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!allowPending2fa) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          data: null,
          message: '请先完成两步验证（2FA）',
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
    const isAdminPublic = this.reflector.getAllAndOverride<boolean>(
      ADMIN_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAdminPublic) {
      return user as TUser;
    }

    if (err || !user) {
      const message =
        info?.message === 'jwt expired'
          ? '管理员登录已过期，请重新登录'
          : info?.message === 'No auth token'
            ? '缺少管理员认证信息，请先登录'
            : '管理员认证失败，请重新登录';
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message,
      });
    }

    return user as TUser;
  }

  /**
   * 从 Cookie 或 Authorization 头部提取管理员 Bearer token
   * 优先从 httpOnly Cookie 提取，回退到 Authorization 头
   */
  private extractToken(request: Request): string | null {
    return extractToken(request, true);
  }
}
