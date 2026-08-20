// [管理后台-系统配置模块] - AdminSystemService
// 实现支付、安全、短信、OSS、全局等分组配置的读取与批量更新。
//
// 关键设计：
//  - 配置项以 nft_system_configs 的 config_key / config_value 存储
//  - 读取：按 key 前缀批量查询并组装为 { key: value } 映射
//  - 写入：遍历传入的 key-value，存在则更新，不存在则新增（upsert 语义）
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { NftSystemConfig } from '../../../database/entities/nft-system-config.entity';

/** 支付配置 key 前缀 */
const PREFIX_PAYMENT = 'payment_';
/** 安全配置 key 前缀 */
const PREFIX_SECURITY = 'security_';
/** 短信配置 key 前缀 */
const PREFIX_SMS = 'sms_';
/** OSS 配置 key 前缀 */
const PREFIX_OSS = 'oss_';
/** 全局配置 key 前缀 */
const PREFIX_GLOBAL = 'global_';

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectRepository(NftSystemConfig)
    private readonly configRepo: Repository<NftSystemConfig>,
  ) {}

  // ============================================================
  // 内部工具
  // ============================================================

  /** 按前缀批量读取配置，返回 { key: value, ... } 映射 */
  private async readByPrefix(prefix: string): Promise<Record<string, any>> {
    const rows = await this.configRepo.find({
      where: { configKey: Like(`${prefix}%`), isDelete: 0 },
    });
    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.configKey] = this.tryParse(row.configValue);
    }
    return result;
  }

  /** 批量写入配置（存在则更新，不存在则新增） */
  private async writeByPrefix(
    body: Record<string, any>,
  ): Promise<Record<string, any>> {
    if (!body || typeof body !== 'object') {
      return {};
    }
    const keys = Object.keys(body);
    if (!keys.length) {
      return {};
    }

    // 一次性查出已有配置，避免多次查询
    const existing = await this.configRepo.find({
      where: keys.map((k) => ({ configKey: k, isDelete: 0 })),
    });
    const existingMap = new Map(existing.map((r) => [r.configKey, r]));

    const toSave: NftSystemConfig[] = [];
    for (const key of keys) {
      const value = body[key];
      const strValue = typeof value === 'string' ? value : JSON.stringify(value);
      const row = existingMap.get(key);
      if (row) {
        row.configValue = strValue;
        toSave.push(row);
      } else {
        toSave.push(
          this.configRepo.create({
            configKey: key,
            configValue: strValue,
          }),
        );
      }
    }

    if (toSave.length) {
      await this.configRepo.save(toSave);
    }

    // 返回更新后的值映射
    const result: Record<string, any> = {};
    for (const key of keys) {
      result[key] = this.tryParse(
        typeof body[key] === 'string' ? body[key] : JSON.stringify(body[key]),
      );
    }
    return result;
  }

  /** 尝试将字符串解析为 JSON，失败则返回原字符串 */
  private tryParse(value: string): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  // ============================================================
  // 支付配置
  // ============================================================

  getPaymentConfig(): Promise<Record<string, any>> {
    return this.readByPrefix(PREFIX_PAYMENT);
  }

  updatePaymentConfig(body: Record<string, any>): Promise<Record<string, any>> {
    return this.writeByPrefix(body);
  }

  // ============================================================
  // 安全配置
  // ============================================================

  getSecurityConfig(): Promise<Record<string, any>> {
    return this.readByPrefix(PREFIX_SECURITY);
  }

  updateSecurityConfig(body: Record<string, any>): Promise<Record<string, any>> {
    return this.writeByPrefix(body);
  }

  // ============================================================
  // 短信 / OSS 配置
  // ============================================================

  async getSmsConfig(): Promise<Record<string, any>> {
    const [sms, oss] = await Promise.all([
      this.readByPrefix(PREFIX_SMS),
      this.readByPrefix(PREFIX_OSS),
    ]);
    return { ...sms, ...oss };
  }

  updateSmsConfig(body: Record<string, any>): Promise<Record<string, any>> {
    return this.writeByPrefix(body);
  }

  // ============================================================
  // OSS 配置
  // ============================================================

  getOssConfig(): Promise<Record<string, any>> {
    return this.readByPrefix(PREFIX_OSS);
  }

  updateOssConfig(body: Record<string, any>): Promise<Record<string, any>> {
    return this.writeByPrefix(body);
  }

  // ============================================================
  // 全局配置
  // ============================================================

  getGlobalConfig(): Promise<Record<string, any>> {
    return this.readByPrefix(PREFIX_GLOBAL);
  }

  updateGlobalConfig(body: Record<string, any>): Promise<Record<string, any>> {
    return this.writeByPrefix(body);
  }

  /** 读取单个配置（供其他模块使用） */
  async getConfig(key: string): Promise<any> {
    const row = await this.configRepo.findOne({
      where: { configKey: key, isDelete: 0 },
    });
    if (!row) {
      throw new NotFoundException(`配置项 ${key} 不存在`);
    }
    return this.tryParse(row.configValue);
  }
}
