// [公共] - 请求日志拦截器（结构化日志 v2）
//
// 增强：
//   1. 结构化 JSON 日志，包含 timestamp, level, msg, traceId, context, method, path, durationMs
//   2. traceId 从 TraceIdService（AsyncLocalStorage）获取，与响应体中的 traceId 一致
//   3. 慢请求分级告警：>500ms warn，>2000ms error，>3000ms 强烈告警
//   4. 兼容原有 requestId（从请求头读取）
//   5. 不记录请求体/响应体内容，避免敏感数据泄露
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { TraceIdService } from '../../shared/trace-id.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  // 慢请求阈值
  private readonly SLOW_REQUEST_WARN = 500;     // >500ms warn
  private readonly SLOW_REQUEST_ERROR = 2000;    // >2000ms error
  private readonly SLOW_REQUEST_CRITICAL = 3000; // >3000ms 强烈告警

  constructor(private readonly traceIdService: TraceIdService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // traceId 从 AsyncLocalStorage 获取（由 TraceIdMiddleware 注入）
    const traceId = this.traceIdService.getTraceId() || '';

    const startTime = Date.now();
    // 记录请求开始时间到 request 对象上，供异常过滤器计算耗时使用
    (request as any).__startTime = startTime;

    const { method, url, ip } = request;
    const clientIp = ip || (request.headers['x-forwarded-for'] as string) || '';

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          const statusCode = response.statusCode;

          // 结构化日志对象
          const logData = {
            timestamp: new Date().toISOString(),
            traceId,
            context: 'HTTP',
            method,
            path: url,
            ip: clientIp,
            statusCode,
            durationMs,
          };

          if (durationMs > this.SLOW_REQUEST_CRITICAL) {
            this.logger.error(
              JSON.stringify({ ...logData, level: 'critical', msg: '极慢请求' }),
            );
          } else if (durationMs > this.SLOW_REQUEST_ERROR) {
            this.logger.error(
              JSON.stringify({ ...logData, level: 'error', msg: '慢请求' }),
            );
          } else if (durationMs > this.SLOW_REQUEST_WARN) {
            this.logger.warn(
              JSON.stringify({ ...logData, level: 'warn', msg: '响应较慢' }),
            );
          } else {
            this.logger.log(
              JSON.stringify({ ...logData, level: 'info', msg: 'request' }),
            );
          }
        },
        error: (err) => {
          const durationMs = Date.now() - startTime;
          const logData = {
            timestamp: new Date().toISOString(),
            traceId,
            context: 'HTTP',
            method,
            path: url,
            ip: clientIp,
            durationMs,
            error: err?.message || String(err),
            level: 'error',
            msg: 'request_error',
          };
          this.logger.error(JSON.stringify(logData));
        },
      }),
    );
  }
}
