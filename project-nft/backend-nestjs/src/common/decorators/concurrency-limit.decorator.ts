// [公共] - 并发限制装饰器
//
// 标记在 Controller 方法上，限制同时处理的请求数量。
// 配合 ConcurrencyLimiterInterceptor 使用，通过 Redis 原子 INCR/DECR 实现。
//
// 用法：
//   @ConcurrencyLimit(200)  // 最多同时处理 200 个请求
//   @Post('buy/release/:id')
//   async buyFromRelease(...) { ... }
import { SetMetadata } from '@nestjs/common';

export const CONCURRENCY_LIMIT_KEY = 'concurrency_limit';
export const CONCURRENCY_LIMIT_DEFAULT = 500; // 全局默认最大并发

export interface ConcurrencyLimitOptions {
  /** 最大并发数 */
  max: number;
  /** 限流 key 后缀（用于区分不同端点，默认使用 controller-method） */
  keySuffix?: string;
  /** 超限时的提示信息 */
  message?: string;
}

export const ConcurrencyLimit = (max: number, message?: string) =>
  SetMetadata(CONCURRENCY_LIMIT_KEY, { max, message } as ConcurrencyLimitOptions);
