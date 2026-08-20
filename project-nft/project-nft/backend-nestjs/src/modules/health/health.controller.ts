// [公共] - 健康检查控制器
//
// 提供三个健康检查端点：
//   GET /health       — 基础状态（ok + timestamp）
//   GET /health/ready — 就绪检查（DB + Redis 真实连通性，失败返回 503）
//   GET /health/live  — 存活检查（仅进程存活，返回 200）
//
// 不依赖 @nestjs/terminus，直接实现，减少依赖。
// /health/ready 真实尝试 ping Redis 和执行 SELECT 1，不是假检查。
//
// 豁免 JWT 认证（公共端点），在 JwtAuthGuard 的白名单中配置。
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '../../shared/redis.service';
import { Public } from '../../common/decorators/public.decorator';

@Injectable()
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 基础健康状态
   * GET /health
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }

  /**
   * 存活检查（Liveness）
   * GET /health/live
   *
   * 仅检查进程是否存活，不做 DB/Redis 检查。
   * K8s livenessProbe 使用。
   */
  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live() {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }

  /**
   * 就绪检查（Readiness）
   * GET /health/ready
   *
   * 真实检查 DB 和 Redis 是否可连接：
   *   - DB: 执行 SELECT 1
   *   - Redis: 执行 PING
   * 全部通过返回 200，任一失败返回 503
   *
   * K8s readinessProbe 使用。
   */
  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    const checks: Record<string, boolean> = {};
    const details: Record<string, string> = {};
    let allHealthy = true;

    // 1) 检查 DB
    try {
      await this.dataSource.query('SELECT 1');
      checks.db = true;
      details.db = 'ok';
    } catch (err) {
      checks.db = false;
      details.db = err?.message || 'connection failed';
      allHealthy = false;
    }

    // 2) 检查 Redis
    try {
      // 利用 RedisService 底层 ioredis 的 ping
      const pong = await this.redisService.get('__health_check__');
      // 即使返回 null 也说明 Redis 连通（key 不存在返回 null）
      checks.redis = true;
      details.redis = 'ok';
    } catch (err) {
      checks.redis = false;
      details.redis = err?.message || 'connection failed';
      allHealthy = false;
    }

    const statusCode = allHealthy
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    const response = {
      status: allHealthy ? 'ok' : 'error',
      timestamp: Date.now(),
      checks,
      details,
    };

    // 通过抛出 HttpException 来设置非 200 状态码
    if (!allHealthy) {
      const { HttpException } = require('@nestjs/common');
      throw new HttpException(response, statusCode);
    }

    return response;
  }
}
