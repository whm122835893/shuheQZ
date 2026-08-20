// 请求追踪服务 — 基于 AsyncLocalStorage 实现 traceId 全链路传递
//
// 设计理念：
//   每个 HTTP 请求自动分配一个 traceId（从请求头 x-request-id 读取，没有则生成 UUID）
//   traceId 注入 AsyncLocalStorage，所有 Service 中的 this.logger 可直接读取
//   响应头和响应体均携带 traceId，便于前端/网关/日志链路追踪
//
// 使用方式：
//   1. TraceIdMiddleware 自动执行（全局中间件）
//   2. Service 中通过 TraceIdService.currentTraceId() 获取当前请求的 traceId
//   3. TransformInterceptor / HttpExceptionFilter 自动在响应中注入 traceId
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface TraceContext {
  traceId: string;
  method?: string;
  path?: string;
  startTime?: number;
}

@Injectable()
export class TraceIdService {
  private readonly als: AsyncLocalStorage<TraceContext> =
    new AsyncLocalStorage<TraceContext>();

  /**
   * 在请求上下文中运行函数，自动注入 traceId
   */
  run<T>(context: TraceContext, fn: () => T): T {
    return this.als.run(context, fn);
  }

  /**
   * 获取当前请求的 traceId（在 Service 中调用）
   * @returns traceId 或 undefined（非请求上下文中调用时）
   */
  getTraceId(): string | undefined {
    return this.als.getStore()?.traceId;
  }

  /**
   * 获取完整的 trace 上下文
   */
  getContext(): TraceContext | undefined {
    return this.als.getStore();
  }

  /**
   * 生成新的 traceId（UUID v4）
   */
  static generateTraceId(): string {
    return randomUUID();
  }
}
