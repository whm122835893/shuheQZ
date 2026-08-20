// [公共] - 全局异常过滤器
// 捕获所有异常并返回统一格式 { code, data: null, message, traceId, timestamp }
// 日志采用结构化 JSON 格式，记录 method/url/ip/statusCode/code/message/traceId/duration
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-code.enum';
import { TraceIdService } from '../../shared/trace-id.service';

/**
 * HTTP Status Code 与 body code 映射关系
 * 200=成功, 400=参数错误, 401=未认证, 403=无权限, 404=资源不存在,
 * 409=业务冲突, 422=业务校验失败, 429=请求过频, 500=服务器错误
 */
const HTTP_STATUS_TO_CODE: Record<number, ErrorCode> = {
  [HttpStatus.OK]: ErrorCode.SUCCESS,
  [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly traceIdService?: TraceIdService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let bodyCode: ErrorCode = ErrorCode.INTERNAL_ERROR;
    let message = '服务器内部错误';
    // 异常堆栈/追踪信息，5xx 时随结构化日志一起输出，便于排查
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      bodyCode = HTTP_STATUS_TO_CODE[httpStatus] ?? ErrorCode.INTERNAL_ERROR;
      stack = exception.stack;

      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        // 处理 ValidationPipe 抛出的响应体
        const r = res as Record<string, any>;
        // 业务已自定义响应体（含 code/message/data 字段）直接采用
        if (r.code && r.message) {
          bodyCode = r.code;
          message = Array.isArray(r.message) ? r.message.join('; ') : r.message;
        } else if (Array.isArray(r.message)) {
          // class-validator 校验错误数组
          message = r.message.join('; ');
        } else if (typeof r.message === 'string') {
          message = r.message;
        } else if (r.error) {
          message = r.error;
        }
      }
    } else if (exception instanceof Error) {
      // INT-007 修复：5xx 错误不向客户端暴露内部错误细节，防止信息泄露
      // 保留堆栈，仅在服务端结构化日志中记录完整错误信息
      stack = exception.stack;
      // 客户端仅看到通用提示，不暴露堆栈/SQL/文件路径等敏感信息
      message = '服务器内部错误，请稍后重试';
    } else {
      // 未知的异常对象，保留序列化内容作为追踪信息
      stack = `未知异常对象: ${JSON.stringify(exception)}`;
    }

    // 获取 traceId（从 AsyncLocalStorage 或请求头）
    const traceId =
      this.traceIdService?.getTraceId() ||
      (request.headers['x-request-id'] as string) ||
      undefined;

    // 结构化日志（JSON）：记录请求方法/路径/IP/状态码/业务码/消息/traceId/耗时
    const startTime = (request as any).__startTime as number | undefined;
    const logData = {
      method: request.method,
      url: request.url,
      ip: request.headers['x-forwarded-for'] || request.ip || '',
      statusCode: httpStatus,
      code: bodyCode,
      message,
      traceId: traceId || '',
      duration: startTime ? `${Date.now() - startTime}ms` : '',
    };

    // 5xx 错误记录详细日志（含堆栈），4xx 记录告警日志
    if (httpStatus >= 500) {
      this.logger.error(JSON.stringify(logData), stack);
    } else {
      this.logger.warn(JSON.stringify(logData));
    }

    const errorBody: Record<string, any> = {
      code: bodyCode,
      data: null,
      message,
    };

    // 注入 traceId 和 timestamp（与 TransformInterceptor 保持一致）
    if (traceId) errorBody.traceId = traceId;
    errorBody.timestamp = Date.now();

    // 确保响应头也携带 x-request-id
    if (traceId) response.setHeader('x-request-id', traceId);

    response.status(httpStatus).json(errorBody);
  }
}
