/**
 * AES-256-GCM 加密工具
 *
 * 用于敏感数据的加密存储（如链渠道 config 中的私钥、API Key 等）。
 *
 * 算法选择：
 *   - AES-256-GCM 提供机密性 + 完整性（认证加密）
 *   - 每次加密生成随机 IV（12 bytes），防止相同明文产生相同密文
 *   - 输出格式：base64(iv + ciphertext + authTag)
 *
 * 密钥来源：
 *   - 环境变量 DATA_AES_KEY（32 字节 / 256 位）
 *   - 开发环境默认值仅供开发，生产环境必须覆盖
 *
 * 使用方式：
 *   const encrypted = AesUtil.encrypt(JSON.stringify(sensitiveData));
 *   const decrypted = JSON.parse(AesUtil.decrypt(encrypted));
 *
 * 数据库存储格式（config 字段）：
 *   { "_encrypted": "base64..." }  — 加密后的数据
 *   { "key": "value" }            — 未加密的旧数据（兼容读取）
 */
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM 推荐 12 字节
const AUTH_TAG_LENGTH = 16;

// 开发环境默认密钥（仅用于本地开发，生产环境必须通过 DATA_AES_KEY 覆盖）
const DEV_DEFAULT_KEY = 'shuhe-data-aes-key-dev-only-32b!';

/**
 * 获取 AES 密钥（32 字节）
 *
 * 优先从环境变量 DATA_AES_KEY 读取；
 * 如果未配置或长度不足，回退到开发默认值。
 */
function getKey(): Buffer {
  const envKey = process.env.DATA_AES_KEY;
  if (envKey && envKey.length === 32) {
    return Buffer.from(envKey, 'utf8');
  }
  // 开发环境回退
  if (process.env.NODE_ENV !== 'production') {
    return Buffer.from(DEV_DEFAULT_KEY, 'utf8');
  }
  // 生产环境必须有有效密钥
  throw new Error(
    '[AES] 生产环境必须配置 DATA_AES_KEY（32 字节），当前缺失或长度不符',
  );
}

/**
 * AES-256-GCM 加密
 *
 * @param plaintext 待加密的明文字符串
 * @returns base64 编码的密文（格式：iv + ciphertext + authTag）
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // 将 iv + authTag + ciphertext 拼接后 base64 编码
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

/**
 * AES-256-GCM 解密
 *
 * @param ciphertext base64 编码的密文
 * @returns 解密后的明文字符串
 * @throws 如果密钥不匹配或数据被篡改
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const data = Buffer.from(ciphertext, 'base64');

  // 拆分 iv + authTag + ciphertext
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * 加密 JSON 对象
 *
 * @param obj 待加密的对象
 * @returns 加密后的字符串
 */
export function encryptJSON(obj: Record<string, any> | null): string | null {
  if (!obj) return null;
  return encrypt(JSON.stringify(obj));
}

/**
 * 解密为 JSON 对象
 *
 * @param ciphertext 加密的字符串
 * @returns 解密后的对象
 */
export function decryptJSON<T = Record<string, any>>(
  ciphertext: string,
): T | null {
  if (!ciphertext) return null;
  try {
    return JSON.parse(decrypt(ciphertext)) as T;
  } catch (err) {
    // 可能是旧数据（未加密），尝试直接 JSON.parse
    try {
      return JSON.parse(ciphertext) as T;
    } catch {
      throw new Error(
        `[AES] 数据解密失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * 检查 config 字段是否已加密
 *
 * 数据库中存储格式：
 *   - 已加密：{ "_encrypted": "base64..." }
 *   - 未加密：{ "key": "value" }（旧数据）
 */
export function isEncryptedConfig(
  config: Record<string, any> | null,
): config is { _encrypted: string } {
  return (
    config !== null &&
    typeof config === 'object' &&
    '_encrypted' in config &&
    typeof config._encrypted === 'string'
  );
}

/**
 * 加密 config 对象并包装为 { _encrypted: string } 格式
 *
 * @param config 原始 config 对象
 * @returns 包装后的加密 config
 */
export function encryptConfig(
  config: Record<string, any> | null,
): { _encrypted: string } | null {
  if (!config) return null;
  const encrypted = encryptJSON(config);
  return encrypted ? { _encrypted: encrypted } : null;
}

/**
 * 解密 config 对象
 *
 * 支持两种格式：
 *   - 已加密：{ "_encrypted": "base64..." } → 解密返回原始对象
 *   - 未加密：{ "key": "value" } → 直接返回（向后兼容）
 *
 * @param config 数据库中存储的 config
 * @returns 解密后的原始 config 对象
 */
export function decryptConfig(
  config: Record<string, any> | null,
): Record<string, any> | null {
  if (!config) return null;

  if (isEncryptedConfig(config)) {
    return decryptJSON(config._encrypted);
  }

  // 旧数据（未加密），直接返回
  return config;
}
