// [公共] - 请求超时拦截器
// 为所有 HTTP 请求设置最大处理时间，超时后返回 504 Gateway Timeout。
//
// 配置：
//   - 环境变量 REQUEST_TIMEOUT_MS（默认 30000ms = 30秒）
//   - 可通过 @Timeout(ms) 装饰器对特定路由覆盖超时时间
//
// 实现：
//   - 使用 RxJS timeout 操作符，当 Observable 在指定时间内未产出值时抛出 TimeoutError
//   - 捕获 TimeoutError 后转换为 504 异常
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Request } from 'express';

/** 默认请求超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 30000;

/** @Timeout(ms) 装饰器元数据 key */
export const TIMEOUT_KEY = 'request:timeout';

/**
 * @Timeout(ms) 装饰器
 *
 * 对特定路由覆盖全局超时时间。
 *
 * 用法：
 *   @Timeout(60000)  // 60 秒超时（适用于耗时接口如导出）
 *   @Get('export')
 *   async exportData() { ... }
 */
export const Timeout = (ms: number) => SetMetadata(TIMEOUT_KEY, ms);

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 1) 获取路由级超时配置（通过 @Timeout 装饰器）
    const routeTimeout = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2) 回调路径不设超时（支付回调等长轮询场景）
    const request = context.switchToHttp().getRequest<Request>();
    const url: string = request.url || '';
    if (url.includes('callback')) {
      return next.handle();
    }

    // 3) 确定最终超时时间：路由级 > 环境变量 > 默认值
    const timeoutMs =
      routeTimeout ??
      (Number(process.env.REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);

    // 4) 应用超时
    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((err) => {
        if (err?.name === 'TimeoutError') {
          return throwError(
            () =>
              new RequestTimeoutException({
                code: 504,
                data: null,
                message: `请求处理超时（${timeoutMs}ms），请稍后重试`,
              }),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
