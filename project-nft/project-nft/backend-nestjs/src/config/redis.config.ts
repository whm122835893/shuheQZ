// [配置] - Redis 连接配置
// 从 .env 读取 host/port/password，导出 ioredis 配置对象
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { RedisOptions } from 'ioredis';

const logger = new Logger('RedisConfig');

/**
 * Redis 连接配置接口
 */
export interface RedisConfig extends RedisOptions {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

/**
 * Redis 配置工厂
 *
 * 环境变量：
 *   REDIS_HOST       主机，默认 127.0.0.1
 *   REDIS_PORT       端口，默认 6379
 *   REDIS_PASSWORD   密码，可选
 *   REDIS_DB         数据库索引，默认 0
 *   REDIS_KEY_PREFIX key 前缀，默认 shuhe:
 */
export const getRedisConfig = (configService: ConfigService): RedisConfig => {
  return {
    host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
    port: configService.get<number>('REDIS_PORT', 6379),
    password: configService.get<string>('REDIS_PASSWORD') || undefined,
    db: configService.get<number>('REDIS_DB', 0),
    keyPrefix: configService.get<string>('REDIS_KEY_PREFIX', 'shuhe:'),
    // 连接重试策略：每隔 1s 重试，最多 10 次
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('重连次数超过 10 次，停止重试');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    // 重连时清空订阅
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    // 连接超时
    connectTimeout: 10000,
    // 空闲保活
    keepAlive: 30000,
    // 离线时仍接受命令
    enableReadyCheck: true,
    lazyConnect: false,
  };
};

export default getRedisConfig;
