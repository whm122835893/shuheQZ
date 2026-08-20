// [公共] - 全局响应拦截器
// 将返回值包装为 { code: 200, data: 原始返回值, message: 'success', traceId, timestamp }
// 排除回调路径: /payments/callback 和 /wallet/recharge/callback
//
// 增强（v2）：
//   自动注入 traceId 和 timestamp 到所有响应体
//   traceId 从 TraceIdService（AsyncLocalStorage）获取，由 TraceIdMiddleware 注入
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { map, Observable } from 'rxjs';
import { BaseResponseVo } from '../dto/base-response.vo';
import { TraceIdService } from '../../shared/trace-id.service';

// 标记原始响应已处理,不再包装的 key
export const RAW_RESPONSE_KEY = 'isRawResponse';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, BaseResponseVo<T> | T>
{
  constructor(
    private readonly reflector: Reflector = new Reflector(),
    private readonly traceIdService: TraceIdService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponseVo<T> | T> {
    const request = context.switchToHttp().getRequest<Request>();
    const url: string = request.url || '';

    // 1) 检查 request.url 是否包含 callback,如果包含则直接放行不包装
    //    回调路径 /payments/callback 和 /wallet/recharge/callback 均含 callback 子串
    if (url.includes('callback')) {
      return next.handle();
    }

    // 2) 通过 Reflector 判断 handler 是否标记为原始响应
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const traceId = this.traceIdService.getTraceId();
        const timestamp = Date.now();

        // 若返回值已是 BaseResponseVo（控制器已自定义 code/message），补充 traceId 和 timestamp
        if (data instanceof BaseResponseVo) {
          if (traceId) data.traceId = traceId;
          data.timestamp = timestamp;
          return data;
        }
        // 包装为统一格式
        const response = new BaseResponseVo<T>(200, data, 'success');
        if (traceId) response.traceId = traceId;
        response.timestamp = timestamp;
        return response;
      }),
    );
  }
}
