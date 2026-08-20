// TraceId 中间件 — 每个请求自动分配 traceId
//
// 执行流程：
//   1. 从请求头 x-request-id 读取（前端/网关传入），没有则生成 UUID
//   2. 注入到 AsyncLocalStorage（TraceIdService）
//   3. 设置到 response 头 x-request-id（前端可读取）
//   4. 后续 TransformInterceptor / HttpExceptionFilter 从 TraceIdService 读取
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { TraceIdService } from '../../shared/trace-id.service';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly traceIdService: TraceIdService) {}

  use(req: Request, res: Response, next: () => void): void {
    // 从请求头读取或生成 traceId
    const traceId =
      (req.headers['x-request-id'] as string) ||
      TraceIdService.generateTraceId();

    // 设置响应头
    res.setHeader('x-request-id', traceId);

    // 注入 AsyncLocalStorage，后续所有 Service 可通过 TraceIdService.getTraceId() 获取
    this.traceIdService.run(
      {
        traceId,
        method: req.method,
        path: req.originalUrl || req.url,
        startTime: Date.now(),
      },
      () => next(),
    );
  }
}
