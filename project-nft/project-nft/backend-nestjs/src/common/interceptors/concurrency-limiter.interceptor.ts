// [公共] - 并发限制拦截器
//
// 通过 Redis 原子操作限制同一端点的最大并发处理数。
// 当并发数超过限制时，直接返回 429 Too Many Requests，避免 DB 连接池耗尽。
//
// 原理：
//   1. 请求进入时，Redis INCR 计数器（Lua 脚本保证原子性）
//   2. 若计数 > max，DECR 回滚并返回 429
//   3. 请求处理完毕（成功或异常），DECR 释放并发槽
//   4. 计数器 key 设有 TTL（30s），防止进程崩溃导致计数器永不归零
//
// 性能：
//   - 每次 INCR/DECR 操作 <0.1ms
//   - 两个 Redis 命令的额外开销可忽略不计
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, finalize } from 'rxjs';
import { throwError } from 'rxjs';
import { RedisService } from '../../shared/redis.service';
import {
  CONCURRENCY_LIMIT_KEY,
  CONCURRENCY_LIMIT_DEFAULT,
  ConcurrencyLimitOptions,
} from '../decorators/concurrency-limit.decorator';

/** 并发计数器 key 前缀 */
const CONCURRENCY_KEY_PREFIX = 'concurrency:';

/** 计数器 TTL（秒），防止僵尸计数器 */
const COUNTER_TTL = 30;

/**
 * Lua 脚本：原子获取并发槽
 *
 * KEYS[1] = 计数器 key
 * ARGV[1] = 最大并发数
 * ARGV[2] = TTL（秒）
 *
 * 返回：1 = 获取成功，0 = 并发已满
 */
const ACQUIRE_SCRIPT = `
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[2])
  end
  if current > tonumber(ARGV[1]) then
    redis.call('DECR', KEYS[1])
    return 0
  end
  return 1
`;

@Injectable()
export class ConcurrencyLimiterInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ConcurrencyLimiterInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handler = context.getHandler();
    const controller = context.getClass();

    // 获取 @ConcurrencyLimit 装饰器配置
    const options = this.reflector.get<ConcurrencyLimitOptions>(
      CONCURRENCY_LIMIT_KEY,
      handler,
    );

    // 没有标记 @ConcurrencyLimit 的端点使用默认限制
    const max = options?.max ?? CONCURRENCY_LIMIT_DEFAULT;
    const message = options?.message ?? '系统繁忙，请稍后重试';

    // 构建并发 key：concurrency:ControllerName.methodName
    const keySuffix = options?.keySuffix ?? `${controller.name}.${handler.name}`;
    const concurrencyKey = `${CONCURRENCY_KEY_PREFIX}${keySuffix}`;

    // 1) 原子获取并发槽
    let acquired = false;
    try {
      const result = await this.redis.eval(
        ACQUIRE_SCRIPT,
        [concurrencyKey],
        [max, COUNTER_TTL],
      );
      acquired = result === 1;
    } catch (err) {
      // Redis 异常时降级为放行，保证业务可用性
      this.logger.error(
        `并发限制器 Redis 异常，降级放行 key=${concurrencyKey}: ${err?.message ?? err}`,
      );
      return next.handle();
    }

    if (!acquired) {
      this.logger.warn(
        `并发限制触发 key=${concurrencyKey} max=${max}，请求被拒绝`,
      );
      throw new HttpException(
        {
          code: 429,
          data: null,
          message,
        },
        429,
      );
    }

    // 2) 获取成功，处理请求，完成后释放并发槽
    return next.handle().pipe(
      finalize(async () => {
        try {
          await this.redis.decr(concurrencyKey);
        } catch (err) {
          // 释放失败仅记录日志，TTL 会最终清理
          this.logger.error(
            `并发槽释放失败 key=${concurrencyKey}: ${err?.message ?? err}`,
          );
        }
      }),
    );
  }
}
