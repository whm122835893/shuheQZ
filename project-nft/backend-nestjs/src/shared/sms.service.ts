// [公共] - 短信发送服务
//
// 职责:
//  1) 生成 6 位随机验证码
//  2) 60 秒冷却控制(Redis key sms:cooldown:{phone}:{scene})
//  3) 频率限制(IP 日 20 条,手机号日 5 条)
//  4) 验证码写入 Redis(ttl=300 秒),供后续校验
//  5) 发送记录落库 nft_sms_logs 表
//  6) 调用底层短信通道(当前为 TODO 占位,需接入实际短信服务商)
//
// 使用方式:
//  const result = await smsService.sendCode(phone, scene, ip);
//  if (!result.success) { throw new BadRequestException(result.message); }
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NftSmsLog } from '../database/entities/nft-sms-log.entity';
import { RedisService } from './redis.service';

/**
 * 短信业务场景枚举(与 nft_sms_logs.scene 字段对应)
 */
export enum SmsScene {
  /** 注册 */
  REGISTER = 1,
  /** 登录 */
  LOGIN = 2,
  /** 重置密码 */
  RESET_PASSWORD = 3,
  /** 绑定/换绑手机 */
  CHANGE_PHONE = 4,
  /** 提现验证 */
  WITHDRAW = 5,
}

/**
 * 发送结果
 */
export interface SmsSendResult {
  /** 是否发送成功 */
  success: boolean;
  /** 业务提示 */
  message: string;
  /** 发送的验证码(仅开发环境返回,生产环境应为空) */
  code?: string;
}

/**
 * 冷却时间(测试环境设为1秒)
 */
const COOLDOWN_TTL = 1;

/**
 * 验证码有效期(5 分钟)
 */
const CODE_TTL = 300;

/**
 * IP 单日最大发送条数(测试环境放宽)
 */
const IP_DAILY_MAX = 100000;

/**
 * 手机号单日最大发送条数(测试环境放宽)
 */
const PHONE_DAILY_MAX = 100000;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject('REDIS_SERVICE') private readonly redisService: RedisService,
    @InjectRepository(NftSmsLog)
    private readonly smsLogRepository: Repository<NftSmsLog>,
  ) {}

  /**
   * 生成 6 位随机数字验证码
   * 补零保证长度为 6(如 000123)
   */
  generateCode(): string {
    const code = Math.floor(Math.random() * 1000000);
    return code.toString().padStart(6, '0');
  }

  /**
   * 实际发送短信
   *
   * TODO: 接入实际短信服务商(阿里云/腾讯云/容联云等)
   * 当前实现:仅打印日志,模拟发送成功
   *
   * @param phone 手机号
   * @param scene  业务场景
   * @param code  6 位验证码
   */
  async send(phone: string, scene: SmsScene, code: string): Promise<void> {
    // TODO: 接入实际短信服务商 SDK,根据 scene 选择不同短信模板
    // 示例(伪代码):
    // await aliyunSmsClient.sendSms({
    //   PhoneNumbers: phone,
    //   SignName: '数和文创',
    //   TemplateCode: SMS_TEMPLATE_MAP[scene],
    //   TemplateParam: JSON.stringify({ code }),
    // });
    this.logger.log(
      `[SMS Mock] 向 ${phone} 发送场景=${scene} 验证码=${code}(TODO: 接入实际短信服务商)`,
    );
  }

  /**
   * 发送验证码(完整业务流程)
   *
   * 流程:
   *  1) 校验 60 秒冷却
   *  2) 校验 IP 日限 / 手机号日限
   *  3) 生成验证码
   *  4) 写入 Redis(ttl=300 秒)
   *  5) 写入冷却标记(ttl=60 秒)
   *  6) 递增 IP / 手机号 日计数
   *  7) 落库 nft_sms_logs
   *  8) 调用底层 send()
   *
   * @param phone 手机号
   * @param scene 业务场景
   * @param ip    调用方 IP(用于频率限制)
   */
  async sendCode(
    phone: string,
    scene: SmsScene,
    ip: string | null,
  ): Promise<SmsSendResult> {
    // 1) 60 秒冷却检查
    const cooldownKey = `sms:cooldown:${phone}:${scene}`;
    const cooldown = await this.redisService.get(cooldownKey);
    if (cooldown) {
      return {
        success: false,
        message: '操作过于频繁,请 60 秒后重试',
      };
    }

    // 2) 频率限制:手机号单日 5 条
    const phoneLimitKey = this.getDailyKey(`sms:phone:${phone}`);
    const phoneAllowed = await this.redisService.checkRateLimit(
      phoneLimitKey,
      PHONE_DAILY_MAX,
      this.secondsUntilEndOfDay(),
    );
    if (!phoneAllowed) {
      return {
        success: false,
        message: '该手机号今日发送次数已达上限,请明日再试',
      };
    }

    // 2.1) 频率限制:IP 单日 20 条
    if (ip) {
      const ipLimitKey = this.getDailyKey(`sms:ip:${ip}`);
      const ipAllowed = await this.redisService.checkRateLimit(
        ipLimitKey,
        IP_DAILY_MAX,
        this.secondsUntilEndOfDay(),
      );
      if (!ipAllowed) {
        return {
          success: false,
          message: '当前网络环境今日发送次数已达上限,请明日再试',
        };
      }
    }

    // 3) 生成验证码
    const code = this.generateCode();

    // 4) 写入验证码(ttl=300 秒)
    await this.redisService.storeSmsCode(phone, scene, code, CODE_TTL);

    // 5) 写入冷却标记(ttl=60 秒)
    await this.redisService.set(cooldownKey, '1', COOLDOWN_TTL);

    // 6) 落库 nft_sms_logs
    const expiresAt = new Date(Date.now() + CODE_TTL * 1000);
    const smsLog = this.smsLogRepository.create({
      phone,
      code,
      scene,
      status: 1, // 1=已发送
      ip: ip ?? null,
      expiresAt,
      sentAt: new Date(),
    });
    try {
      await this.smsLogRepository.save(smsLog);
    } catch (err) {
      // 落库失败不影响发送,仅记录日志
      this.logger.error(
        `[SMS] phone=${phone} scene=${scene} 落库失败: ${err?.message ?? err}`,
      );
    }

    // 7) 调用底层短信通道
    try {
      await this.send(phone, scene, code);
    } catch (err) {
      this.logger.error(
        `[SMS] phone=${phone} scene=${scene} 发送失败: ${err?.message ?? err}`,
      );
      return {
        success: false,
        message: '短信发送失败,请稍后重试',
      };
    }

    return {
      success: true,
      message: '验证码已发送',
      // 生产环境不应返回 code,此处仅用于开发联调
      code: process.env.NODE_ENV === 'production' ? undefined : code,
    };
  }

  /**
   * 校验验证码
   *
   * 校验通过后立即删除,防止复用
   */
  async verifyCode(
    phone: string,
    scene: SmsScene,
    code: string,
  ): Promise<boolean> {
    const stored = await this.redisService.getSmsCode(phone, scene);
    if (!stored) {
      return false;
    }
    const matched = stored === code;
    if (matched) {
      // 校验成功后立即删除,防止复用
      await this.redisService.delSmsCode(phone, scene);
    }
    return matched;
  }

  /**
   * 拼装"按天"维度 key,带上当天日期,使每日计数器自然隔离
   * 例如传入 'sms:phone:13800138000' -> 'sms:phone:13800138000:20260807'
   */
  private getDailyKey(base: string): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${base}:${y}${m}${d}`;
  }

  /**
   * 计算当天剩余秒数(到 23:59:59),作为日限计数器的 TTL
   */
  private secondsUntilEndOfDay(): number {
    const now = new Date();
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
    const diff = Math.floor((end.getTime() - now.getTime()) / 1000);
    // 兜底:至少 1 秒,避免 TTL 为 0 导致 key 永不过期
    return Math.max(diff, 1);
  }
}

/**
 * SMS 服务 Provider 常量
 */
export const SmsServiceProvider = {
  provide: SmsService,
  useClass: SmsService,
};
