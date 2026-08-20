// [公共] - Feature Flag 装饰器
//
// 用法：
//   @FeatureFlag('release_buy')               // 默认开启
//   @FeatureFlag('release_buy', false)         // 默认关闭
//   @Post('buy')
//   async buyFromRelease(...) { ... }
//
// 当功能关闭时，拦截器自动返回 503 Service Unavailable
import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';
export const FEATURE_FLAG_DEFAULT_KEY = 'feature_flag_default';

export interface FeatureFlagOptions {
  name: string;
  defaultValue?: boolean;
}

/**
 * Feature Flag 装饰器
 *
 * @param name 开关名称
 * @param defaultValue 默认值（Redis 中不存在时使用），默认 true（开启）
 */
export const FeatureFlag = (name: string, defaultValue: boolean = true) =>
  SetMetadata(FEATURE_FLAG_KEY, { name, defaultValue } as FeatureFlagOptions);
