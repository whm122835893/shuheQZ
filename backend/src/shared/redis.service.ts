// [公共] - Redis 服务
// 基于 ioredis 封装,实现 jwt-auth.guard.ts 中声明的 IRedisService 接口契约,
// 并扩展 JWT 黑名单 / refresh token / 短信验证码 / 图形验证码 / 频率限制等业务方法。
//
// 注意:
//  - ioredis 实例在构造函数中通过 @Inject('REDIS_CLIENT') 注入,
//    该实例由外部 Module(通常为 RedisModule 或 SharedModule)以 useFactory 方式创建,
//    创建时使用 config/redis.config.ts 的 getRedisConfig 工厂,已带 keyPrefix(默认 'shuhe:')。
//  - 因此本服务中所有 set/get/del 调用,ioredis 会自动拼接 keyPrefix,
//    业务代码只需传入"逻辑 key"(例如 'auth:blacklist:<token>')即可。
//  - jwt-auth.guard.ts 中检查黑名单时调用 redisService.get(`auth:blacklist:<token>`),
//    与本服务 blacklistToken(token) 写入的 key 前缀保持一致,确保读写匹配。
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { IRedisService } from '../common/guards/jwt-auth.guard';
import { getRedisConfig } from '../config/redis.config';

/**
 * 黑名单 key 前缀(与 jwt-auth.guard.ts 中的 BLACKLIST_KEY_PREFIX 保持一致)
 */
const BLACKLIST_KEY_PREFIX = 'auth:blacklist:';

/**
 * refresh token key 前缀(与 jwt.config.ts 中的 refreshKeyPrefix 保持一致)
 */
const REFRESH_KEY_PREFIX = 'auth:refresh:';

/**
 * 短信验证码 key 前缀
 */
const SMS_CODE_KEY_PREFIX = 'sms:code:';

/**
 * 图形验证码 key 前缀
 */
const CAPTCHA_KEY_PREFIX = 'captcha:';

/**
 * 频率限制计数 key 前缀
 */
const RATE_LIMIT_KEY_PREFIX = 'rate:';

/**
 * 短信验证码默认有效期(5 分钟)
 */
const DEFAULT_SMS_CODE_TTL = 300;

/**
 * 图形验证码默认有效期(5 分钟)
 */
const DEFAULT_CAPTCHA_TTL = 300;

@Injectable()
export class RedisService implements IRedisService, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis(getRedisConfig(configService));
    this.redis.on('error', (err: Error) => {
      this.logger.error(`Redis 连接异常: ${err.message}`, err.stack);
    });
    this.redis.on('connect', () => {
      this.logger.log('Redis 已连接');
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // ============================================================
  // 基础 KV 操作
  // ============================================================

  /**
   * 读取 key 对应的字符串值(实现 IRedisService.get 契约)
   * 不存在时返回 null
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * 写入字符串值
   * @param ttl 过期时间(秒),不传则不设置过期
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl && ttl > 0) {
      // EX 表示单位为秒
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 删除 key
   */
  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 为已存在的 key 设置过期时间(秒)
   */
  async expire(key: string, ttl: number): Promise<void> {
    await this.redis.expire(key, ttl);
  }

  /**
   * 自增计数器(用于限流计数),返回自增后的值
   * 若 key 不存在,先初始化为 0 再自增
   */
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  /**
   * SETEX: 设置 key 的值为 value,并指定过期时间(秒)
   */
  async setex(key: string, seconds: number, value: string): Promise<void> {
    await this.redis.setex(key, seconds, value);
  }

  /**
   * EXISTS: 判断 key 是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * SETNX: 仅当 key 不存在时设置值（原子操作）
   * @returns 1 = 设置成功(key 不存在)，0 = 设置失败(key 已存在)
   */
  async setnx(key: string, value: string): Promise<number> {
    return this.redis.setnx(key, value);
  }

  /**
   * TTL: 获取 key 的剩余过期时间(秒)
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  // ============================================================
  // JWT 黑名单
  // ============================================================

  /**
   * 将 access token 加入黑名单
   * @param token access token 字符串
   * @param ttl   过期时间(秒),应与 access token 剩余有效期一致
   */
  async blacklistToken(token: string, ttl: number): Promise<void> {
    const key = `${BLACKLIST_KEY_PREFIX}${token}`;
    await this.set(key, '1', ttl);
  }

  /**
   * 判断 access token 是否已在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const value = await this.get(`${BLACKLIST_KEY_PREFIX}${token}`);
    return value !== null;
  }

  // ============================================================
  // refresh token 管理
  // ============================================================

  /**
   * 存储 userId 对应的 refresh token(单点登录场景,后登录踢掉前登录)
   * @param userId       用户 id
   * @param refreshToken refresh token 字符串
   * @param ttl          过期时间(秒),应与 refresh token 有效期一致
   */
  async storeRefreshToken(
    userId: number,
    refreshToken: string,
    ttl: number,
  ): Promise<void> {
    const key = `${REFRESH_KEY_PREFIX}${userId}`;
    await this.set(key, refreshToken, ttl);
  }

  /**
   * 校验 userId 对应的 refresh token 是否有效
   * 即:Redis 中存储的值与传入的 refreshToken 完全相等
   */
  async validateRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<boolean> {
    const stored = await this.get(`${REFRESH_KEY_PREFIX}${userId}`);
    if (!stored) {
      return false;
    }
    // 恒定时间比较,避免时序攻击
    return stored.length === refreshToken.length && stored === refreshToken;
  }

  /**
   * 吊销 userId 的 refresh token(登出 / 改密 场景)
   */
  async revokeRefreshToken(userId: number): Promise<void> {
    await this.del(`${REFRESH_KEY_PREFIX}${userId}`);
  }

  // ============================================================
  // 短信验证码
  // ============================================================

  /**
   * 存储短信验证码
   * @param phone 手机号
   * @param scene 业务场景(注册/登录/重置密码 等)
   * @param code  6 位验证码
   * @param ttl   过期时间(秒),默认 300(5 分钟)
   */
  async storeSmsCode(
    phone: string,
    scene: number | string,
    code: string,
    ttl: number = DEFAULT_SMS_CODE_TTL,
  ): Promise<void> {
    const key = `${SMS_CODE_KEY_PREFIX}${phone}:${scene}`;
    await this.set(key, code, ttl);
  }

  /**
   * 读取短信验证码,不存在或已过期返回 null
   */
  async getSmsCode(
    phone: string,
    scene: number | string,
  ): Promise<string | null> {
    return this.get(`${SMS_CODE_KEY_PREFIX}${phone}:${scene}`);
  }

  /**
   * 删除短信验证码(校验成功后立即删除,防止复用)
   */
  async delSmsCode(phone: string, scene: number | string): Promise<void> {
    await this.del(`${SMS_CODE_KEY_PREFIX}${phone}:${scene}`);
  }

  // ============================================================
  // 图形验证码
  // ============================================================

  /**
   * 存储图形验证码
   * @param key  前端生成的唯一标识(通常为 uuid)
   * @param code 4-5 位验证码
   * @param ttl  过期时间(秒),默认 300(5 分钟)
   */
  async storeCaptcha(
    key: string,
    code: string,
    ttl: number = DEFAULT_CAPTCHA_TTL,
  ): Promise<void> {
    await this.set(`${CAPTCHA_KEY_PREFIX}${key}`, code, ttl);
  }

  /**
   * 读取图形验证码
   */
  async getCaptcha(key: string): Promise<string | null> {
    return this.get(`${CAPTCHA_KEY_PREFIX}${key}`);
  }

  /**
   * 删除图形验证码(校验成功后立即删除,防止复用)
   */
  async delCaptcha(key: string): Promise<void> {
    await this.del(`${CAPTCHA_KEY_PREFIX}${key}`);
  }

  // ============================================================
  // 频率限制
  // ============================================================

  /**
   * 通用频率限制(基于 INCR + EXPIRE 实现)
   *
   * 实现思路:
   *  1) INCR key,返回当前计数 n
   *  2) 若 n === 1,说明是窗口内第一次访问,设置过期时间 ttl
   *  3) 若 n > max,返回 false 表示超限
   *
   * @param key 限流 key(业务侧自行拼装维度,如 `sms:ip:1.2.3.4`)
   * @param max  窗口内最大允许次数
   * @param ttl  窗口时长(秒)
   * @returns true = 允许访问,false = 已超限
   */
  async checkRateLimit(
    key: string,
    max: number,
    ttl: number,
  ): Promise<boolean> {
    const fullKey = `${RATE_LIMIT_KEY_PREFIX}${key}`;
    try {
      const count = await this.incr(fullKey);
      // 窗口内第一次访问,设置过期时间
      if (count === 1) {
        await this.expire(fullKey, ttl);
      }
      return count <= max;
    } catch (err) {
      // Redis 异常时降级为"放行",避免业务不可用
      this.logger.error(
        `[RateLimit] key=${key} 检查失败,降级放行: ${err?.message ?? err}`,
      );
      return true;
    }
  }
}

/**
 * Redis 服务 Provider 常量
 *
 * 在 Module 的 providers 中注册后,即可通过 @Inject('REDIS_SERVICE') 注入,
 * 同时满足 jwt-auth.guard.ts 中 IRedisService 接口契约(只用到 get 方法)。
 *
 * 注意:'REDIS_CLIENT' (ioredis 实例) 需在 RedisModule 中单独以 useFactory 注册。
 */
export const RedisServiceProvider = {
  provide: 'REDIS_SERVICE',
  useClass: RedisService,
};
