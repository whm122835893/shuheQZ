/**
 * 乐观锁退避重试工具
 *
 * 在高并发场景下，乐观锁版本冲突是预期行为。
 * 直接抛 ConflictException 会导致大量请求失败。
 * 本工具提供自动重试机制，采用指数退避 + 随机抖动策略。
 *
 * 策略：
 * 1. 首次失败后等待 baseDelay * 1 + jitter
 * 2. 第二次失败后等待 baseDelay * 2 + jitter
 * 3. 第三次失败后等待 baseDelay * 4 + jitter
 * 4. 超过 maxRetries 后抛出原始异常
 *
 * 使用方式：
 *   const result = await withOptimisticRetry(
 *     () => this.luckyDrawService.draw(userId, activityId),
 *     3,    // maxRetries
 *     10,   // baseDelay ms
 *   );
 */

import { ConflictException } from '@nestjs/common';

/**
 * 乐观锁重试执行器
 *
 * @param fn 需要重试的业务函数
 * @param maxRetries 最大重试次数（默认3次）
 * @param baseDelay 基础延迟毫秒（默认10ms）
 * @returns fn 的返回值
 * @throws ConflictException 超过重试次数后抛出
 */
export async function withOptimisticRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 10,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 仅对 ConflictException 重试
      const isConflict =
        error instanceof ConflictException ||
        (error as { status?: number })?.status === 409 ||
        (error as { code?: number })?.code === 409;

      if (!isConflict || attempt >= maxRetries) {
        throw error;
      }

      // 指数退避 + 随机抖动 (0~10ms)
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 10;
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * 睡眠工具
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
