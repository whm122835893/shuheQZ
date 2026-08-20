// [公共] - 交易密码守卫
// 从请求 body 中提取 transaction_password 字段，注入 UserService 校验 bcrypt
// 仅用于 @TxPassword() 标记的端点（转赠、挂单、购买、优先购、充值等）
//
// 安全机制：
//   1. bcrypt 密码校验
//   2. Redis 失败计数：连续 5 次错误后锁定 30 分钟
//   3. 锁定期间直接拒绝，不执行 bcrypt 比较（防止时序攻击）
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { TX_PASSWORD_KEY } from '../decorators/tx-password.decorator';
import { ErrorCode } from '../enums/error-code.enum';
import { AuthenticatedUser } from '../decorators/current-user.decorator';
import { RedisService } from '../../shared/redis.service';

/**
 * 最大连续失败次数，超过后锁定
 */
const MAX_TX_PASSWORD_FAILURES = 5;

/**
 * 锁定时长（秒）：30 分钟
 */
const LOCK_DURATION = 1800;

/**
 * 失败计数 Redis key 前缀
 */
const TX_PWD_FAIL_PREFIX = 'tx-pwd-fail:';

/**
 * 锁定标记 Redis key 前缀
 */
const TX_PWD_LOCK_PREFIX = 'tx-pwd-lock:';

/**
 * 用户服务接口（注入 token 'USER_SERVICE'）
 * 实际项目中由 user.service.ts 实现，这里仅声明接口契约。
 */
export interface IUserService {
  /**
   * 根据用户 id 查询用户记录，至少需包含 transaction_password 字段
   */
  findOneById(userId: number): Promise<{
    id: number;
    transaction_password: string | null;
  } | null>;
}

/**
 * 交易密码守卫
 *
 * - 未设置交易密码 -> 422 业务校验失败
 * - 密码错误 / 未提供 -> 403 无权限
 * - 连续 5 次错误 -> 429 锁定 30 分钟
 */
@Injectable()
export class TxPasswordGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject('USER_SERVICE') private readonly userService: IUserService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) 通过 Reflector 判断是否需要交易密码验证
    const required = this.reflector.getAllAndOverride<boolean>(TX_PASSWORD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    // 未登录用户理论上已被 JwtAuthGuard 拦截，这里做兜底保护
    if (!user || !user.id) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '请先登录',
      });
    }

    // 2) 检查是否已被锁定
    const lockKey = `${TX_PWD_LOCK_PREFIX}${user.id}`;
    const lockedUntil = await this.redisService.get(lockKey);
    if (lockedUntil) {
      const remaining = await this.redisService.ttl(lockKey);
      throw new HttpException(
        {
          code: ErrorCode.TOO_MANY_REQUESTS,
          data: { remaining_seconds: remaining > 0 ? remaining : LOCK_DURATION },
          message: `交易密码错误次数过多，已锁定，请 ${Math.ceil((remaining > 0 ? remaining : LOCK_DURATION) / 60)} 分钟后再试`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3) 从请求 body 中提取 transaction_password 字段
    const body = (request.body || {}) as { transaction_password?: string };
    const txPassword = body.transaction_password;

    if (!txPassword) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '请输入交易密码',
      });
    }

    // 4) 注入 UserService 查询用户记录
    const userRecord = await this.userService.findOneById(user.id);

    if (!userRecord) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '用户不存在',
      });
    }

    // 5) 未设置交易密码返回 422
    if (
      !userRecord.transaction_password ||
      userRecord.transaction_password.trim() === ''
    ) {
      throw new UnprocessableEntityException({
        code: ErrorCode.VALIDATION_FAILED,
        data: null,
        message: '尚未设置交易密码，请先前往设置',
      });
    }

    // 6) bcrypt 校验
    const matched = await bcrypt.compare(
      txPassword,
      userRecord.transaction_password,
    );

    if (!matched) {
      // 7) 失败计数 + 锁定逻辑
      const failKey = `${TX_PWD_FAIL_PREFIX}${user.id}`;
      const failCount = await this.redisService.incr(failKey);
      // 第一次失败时设置计数过期时间（30 分钟窗口）
      if (failCount === 1) {
        await this.redisService.expire(failKey, LOCK_DURATION);
      }

      if (failCount >= MAX_TX_PASSWORD_FAILURES) {
        // 达到阈值，设置锁定标记
        await this.redisService.set(lockKey, '1', LOCK_DURATION);
        // 清除失败计数
        await this.redisService.del(failKey);
        throw new HttpException(
          {
            code: ErrorCode.TOO_MANY_REQUESTS,
            data: { remaining_seconds: LOCK_DURATION },
            message: `交易密码连续错误 ${MAX_TX_PASSWORD_FAILURES} 次，已锁定 30 分钟`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const remaining = MAX_TX_PASSWORD_FAILURES - failCount;
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: { remaining_attempts: remaining },
        message: `交易密码错误，还可尝试 ${remaining} 次`,
      });
    }

    // 8) 校验成功，清除失败计数
    await this.redisService.del(`${TX_PWD_FAIL_PREFIX}${user.id}`);

    return true;
  }
}
