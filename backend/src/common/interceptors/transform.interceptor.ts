// [公共] - 全局响应拦截器
// 将返回值包装为 { code: 200, data: 原始返回值, message: 'success' }
// 排除回调路径: /payments/callback 和 /wallet/recharge/callback
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { map, Observable } from 'rxjs';
import { BaseResponseVo } from '../dto/base-response.vo';

// 标记原始响应已处理,不再包装的 key
export const RAW_RESPONSE_KEY = 'isRawResponse';

/**
 * 需要跳过包装的回调路径片段
 */
const CALLBACK_PATH_FRAGMENTS = ['/payments/callback', '/wallet/recharge/callback'];

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, BaseResponseVo<T> | T>
{
  constructor(private readonly reflector: Reflector = new Reflector()) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponseVo<T> | T> {
    const request = context.switchToHttp().getRequest<Request>();
    const url: string = request.url || '';

    // 1) 检查 request.url 是否包含 callback,如果包含则直接放行不包装
    if (url.includes('callback')) {
      return next.handle();
    }

    // 2) 检查是否匹配具体回调路径片段
    if (CALLBACK_PATH_FRAGMENTS.some((p) => url.includes(p))) {
      return next.handle();
    }

    // 3) 通过 Reflector 判断 handler 是否标记为原始响应
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // 若返回值已是 BaseResponseVo（控制器已自定义 code/message），直接透传，避免二次包装
        if (data instanceof BaseResponseVo) {
          return data;
        }
        return new BaseResponseVo<T>(200, data, 'success');
      }),
    );
  }
}
