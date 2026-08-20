// [公共] - Feature Flag 守卫
//
// 在 Controller 方法上配合 @FeatureFlag 装饰器使用。
// 检查 Redis 中的功能开关状态，关闭时返回 503。
//
// 执行流程：
//   1. 通过 Reflector 读取 @FeatureFlag 装饰器配置
//   2. 如果没有标记 @FeatureFlag，直接放行
//   3. 从 AuthenticatedUser 获取 userId（用于 percentage/whitelist 模式）
//   4. 调用 FeatureFlagService.isEnabled() 检查开关状态
//   5. 关闭时抛出 503 Service Unavailable
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  FEATURE_FLAG_KEY,
  FeatureFlagOptions,
} from '../decorators/feature-flag.decorator';
import { FeatureFlagService } from '../../shared/feature-flag.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 读取 @FeatureFlag 装饰器配置
    const options = this.reflector.get<FeatureFlagOptions>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );

    // 没有标记 @FeatureFlag 的端点直接放行
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = request.user?.id;

    let enabled: boolean;
    try {
      enabled = await this.featureFlagService.isEnabled(options.name, userId);
    } catch {
      // Redis 异常时降级为 defaultValue，保证业务可用性
      enabled = options.defaultValue ?? true;
    }

    if (!enabled) {
      throw new HttpException(
        {
          code: 503,
          data: null,
          message: '功能维护中，请稍后重试',
        },
        503,
      );
    }

    return true;
  }
}
