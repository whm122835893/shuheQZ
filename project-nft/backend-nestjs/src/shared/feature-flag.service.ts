// [公共] - Feature Flag 灰度开关服务
//
// 基于 Redis 实现，支持三种灰度模式：
//   1. on / off — 全量开/关
//   2. percentage — 按用户 ID 取模灰度（如 20% 用户）
//   3. whitelist — 指定用户 UID 白名单
//
// Key 命名规范：
//   feature:{flagName}          — 存储模式配置 JSON
//
// 使用方式：
//   1. 管理端通过 POST /admin/api/v1/feature-flags 动态修改开关状态（无需重启）
//   2. Controller 方法通过 @FeatureFlag('release_buy') 装饰器自动拦截
//   3. 关闭时返回 503 Service Unavailable + 降级响应
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/** Feature Flag Redis key 前缀 */
const FEATURE_KEY_PREFIX = 'feature:';

/** Feature Flag 配置 */
export interface FeatureFlagConfig {
  /** 模式：on / off / percentage / whitelist */
  mode: 'on' | 'off' | 'percentage' | 'whitelist';
  /** percentage 模式：灰度百分比（0-100） */
  percentage?: number;
  /** whitelist 模式：白名单用户 ID 列表 */
  whitelist?: number[];
  /** 描述信息（可选，管理端标注用途） */
  description?: string;
}

/** Feature Flag 默认配置（Redis 中不存在时使用） */
const DEFAULT_CONFIG: FeatureFlagConfig = { mode: 'on' };

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);
  // 本地缓存，减少 Redis 查询（5s 过期）
  private cache = new Map<string, { config: FeatureFlagConfig; expireAt: number }>();
  private readonly CACHE_TTL = 5000; // 5s

  constructor(private readonly redisService: RedisService) {}

  /**
   * 检查某个功能开关是否对指定用户开启
   *
   * @param flagName 开关名称
   * @param userId 用户 ID（可选，percentage/whitelist 模式需要）
   * @returns true=功能开启，false=功能关闭
   */
  async isEnabled(flagName: string, userId?: number): Promise<boolean> {
    const config = await this.getConfig(flagName);

    switch (config.mode) {
      case 'on':
        return true;
      case 'off':
        return false;
      case 'percentage':
        if (!userId) return false;
        // 按 userId 取模判断是否在灰度范围内
        const pct = config.percentage ?? 0;
        return (userId % 100) < pct;
      case 'whitelist':
        if (!userId) return false;
        return (config.whitelist ?? []).includes(userId);
      default:
        return true;
    }
  }

  /**
   * 获取 Feature Flag 配置（带 5s 本地缓存）
   */
  async getConfig(flagName: string): Promise<FeatureFlagConfig> {
    // 检查本地缓存
    const cached = this.cache.get(flagName);
    if (cached && cached.expireAt > Date.now()) {
      return cached.config;
    }

    // 查询 Redis
    try {
      const raw = await this.redisService.get(`${FEATURE_KEY_PREFIX}${flagName}`);
      const config: FeatureFlagConfig = raw
        ? JSON.parse(raw)
        : DEFAULT_CONFIG;

      // 更新本地缓存
      this.cache.set(flagName, {
        config,
        expireAt: Date.now() + this.CACHE_TTL,
      });
      return config;
    } catch (err) {
      this.logger.warn(
        `Feature Flag Redis 查询失败，降级为开启: ${flagName} — ${err?.message ?? err}`,
      );
      return DEFAULT_CONFIG; // Redis 异常时降级为开启，保证业务可用
    }
  }

  /**
   * 设置 Feature Flag 配置（管理端调用）
   */
  async setConfig(flagName: string, config: FeatureFlagConfig): Promise<void> {
    const key = `${FEATURE_KEY_PREFIX}${flagName}`;
    await this.redisService.set(key, JSON.stringify(config));
    // 清除本地缓存
    this.cache.delete(flagName);
    this.logger.log(
      `Feature Flag 已更新: ${flagName} → ${JSON.stringify(config)}`,
    );
  }

  /**
   * 获取所有 Feature Flag 配置（管理端查询）
   */
  async getAllConfigs(): Promise<Record<string, FeatureFlagConfig>> {
    const pattern = `${FEATURE_KEY_PREFIX}*`;
    const keys = await this.redisService.scanKeys(pattern);
    const result: Record<string, FeatureFlagConfig> = {};
    for (const key of keys) {
      const raw = await this.redisService.get(key);
      if (raw) {
        const flagName = key.replace(FEATURE_KEY_PREFIX, '');
        result[flagName] = JSON.parse(raw);
      }
    }
    return result;
  }

  /**
   * 删除 Feature Flag（恢复默认开启）
   */
  async deleteFlag(flagName: string): Promise<void> {
    await this.redisService.del(`${FEATURE_KEY_PREFIX}${flagName}`);
    this.cache.delete(flagName);
    this.logger.log(`Feature Flag 已删除: ${flagName} (恢复默认开启)`);
  }
}
