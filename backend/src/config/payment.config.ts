// [配置] - 支付通道配置
// 包含 alipay/wechat/huifu/yeepay 的配置项，huifu 和 yeepay 标记为 coming_soon
import { ConfigService } from '@nestjs/config';

/**
 * 支付通道状态
 */
export type PaymentChannelStatus = 'active' | 'coming_soon' | 'disabled';

/**
 * 单个支付通道基础配置
 */
export interface PaymentChannelConfig {
  /** 通道状态 */
  status: PaymentChannelStatus;
  /** 是否启用 */
  enabled: boolean;
  /** 通道显示名称 */
  displayName: string;
}

/**
 * 支付宝配置
 */
export interface AlipayConfig extends PaymentChannelConfig {
  appId: string;
  /** 应用私钥 */
  privateKey: string;
  /** 支付宝公钥 */
  alipayPublicKey: string;
  /** 网关地址 */
  gateway: string;
  /** 异步回调地址 */
  notifyUrl: string;
  /** 同步返回地址 */
  returnUrl: string;
  /** 签名类型 */
  signType: 'RSA2' | 'RSA';
  /** 沙箱模式 */
  sandbox: boolean;
}

/**
 * 微信支付配置
 */
export interface WechatPayConfig extends PaymentChannelConfig {
  /** 商户号 */
  mchId: string;
  /** 商户 API 密钥 */
  apiKey: string;
  /** API v3 密钥 */
  apiV3Key: string;
  /** 商户证书序列号 */
  serialNumber: string;
  /** 商户私钥文件路径 */
  privateKeyPath: string;
  /** 异步回调地址 */
  notifyUrl: string;
  /** 应用 ID */
  appId: string;
  /** 沙箱模式 */
  sandbox: boolean;
}

/**
 * 汇付天下配置（即将上线）
 */
export interface HuifuConfig extends PaymentChannelConfig {
  /** 商户号 */
  huifuId: string;
  /** 产品 ID */
  productId: string;
  /** 网关地址 */
  gateway: string;
  /** 异步回调地址 */
  notifyUrl: string;
  /** 私钥 */
  privateKey: string;
  /** 汇付公钥 */
  huifuPublicKey: string;
}

/**
 * 易宝支付配置（即将上线）
 */
export interface YeepayConfig extends PaymentChannelConfig {
  /** 商户编号 */
  merchantId: string;
  /** 商户私钥 */
  privateKey: string;
  /** 易宝公钥 */
  yeepayPublicKey: string;
  /** 网关地址 */
  gateway: string;
  /** 异步回调地址 */
  notifyUrl: string;
  /** 产品编号 */
  productCode: string;
}

/**
 * 全量支付配置
 */
export interface PaymentConfig {
  alipay: AlipayConfig;
  wechat: WechatPayConfig;
  huifu: HuifuConfig;
  yeepay: YeepayConfig;
}

/**
 * 支付配置工厂
 */
export const getPaymentConfig = (configService: ConfigService): PaymentConfig => {
  return {
    alipay: {
      status: 'active',
      enabled: true,
      displayName: '支付宝',
      appId: configService.get<string>('ALIPAY_APP_ID', ''),
      privateKey: configService.get<string>('ALIPAY_PRIVATE_KEY', ''),
      alipayPublicKey: configService.get<string>('ALIPAY_PUBLIC_KEY', ''),
      gateway: configService.get<string>(
        'ALIPAY_GATEWAY',
        'https://openapi.alipay.com/gateway.do',
      ),
      notifyUrl: configService.get<string>(
        'ALIPAY_NOTIFY_URL',
        '/payments/callback/alipay',
      ),
      returnUrl: configService.get<string>(
        'ALIPAY_RETURN_URL',
        '/payments/return/alipay',
      ),
      signType: 'RSA2',
      sandbox: configService.get<string>('ALIPAY_SANDBOX', 'false') === 'true',
    },
    wechat: {
      status: 'active',
      enabled: true,
      displayName: '微信支付',
      mchId: configService.get<string>('WECHAT_MCH_ID', ''),
      apiKey: configService.get<string>('WECHAT_API_KEY', ''),
      apiV3Key: configService.get<string>('WECHAT_API_V3_KEY', ''),
      serialNumber: configService.get<string>('WECHAT_SERIAL_NUMBER', ''),
      privateKeyPath: configService.get<string>(
        'WECHAT_PRIVATE_KEY_PATH',
        '',
      ),
      notifyUrl: configService.get<string>(
        'WECHAT_NOTIFY_URL',
        '/payments/callback/wechat',
      ),
      appId: configService.get<string>('WECHAT_APP_ID', ''),
      sandbox: configService.get<string>('WECHAT_SANDBOX', 'false') === 'true',
    },
    huifu: {
      status: 'coming_soon',
      enabled: false,
      displayName: '汇付天下（即将上线）',
      huifuId: configService.get<string>('HUIFU_ID', ''),
      productId: configService.get<string>('HUIFU_PRODUCT_ID', ''),
      gateway: configService.get<string>(
        'HUIFU_GATEWAY',
        'https://api.huifu.com',
      ),
      notifyUrl: configService.get<string>(
        'HUIFU_NOTIFY_URL',
        '/payments/callback/huifu',
      ),
      privateKey: configService.get<string>('HUIFU_PRIVATE_KEY', ''),
      huifuPublicKey: configService.get<string>('HUIFU_PUBLIC_KEY', ''),
    },
    yeepay: {
      status: 'coming_soon',
      enabled: false,
      displayName: '易宝支付（即将上线）',
      merchantId: configService.get<string>('YEEPAY_MERCHANT_ID', ''),
      privateKey: configService.get<string>('YEEPAY_PRIVATE_KEY', ''),
      yeepayPublicKey: configService.get<string>('YEEPAY_PUBLIC_KEY', ''),
      gateway: configService.get<string>(
        'YEEPAY_GATEWAY',
        'https://openapi.yeepay.com',
      ),
      notifyUrl: configService.get<string>(
        'YEEPAY_NOTIFY_URL',
        '/payments/callback/yeepay',
      ),
      productCode: configService.get<string>('YEEPAY_PRODUCT_CODE', ''),
    },
  };
};

/**
 * 同步获取支付配置对象（基于 process.env，用于无法注入 ConfigService 的场景）
 */
export const paymentConfig: PaymentConfig = {
  alipay: {
    status: 'active',
    enabled: true,
    displayName: '支付宝',
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || '/payments/callback/alipay',
    returnUrl: process.env.ALIPAY_RETURN_URL || '/payments/return/alipay',
    signType: 'RSA2',
    sandbox: process.env.ALIPAY_SANDBOX === 'true',
  },
  wechat: {
    status: 'active',
    enabled: true,
    displayName: '微信支付',
    mchId: process.env.WECHAT_MCH_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
    apiV3Key: process.env.WECHAT_API_V3_KEY || '',
    serialNumber: process.env.WECHAT_SERIAL_NUMBER || '',
    privateKeyPath: process.env.WECHAT_PRIVATE_KEY_PATH || '',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || '/payments/callback/wechat',
    appId: process.env.WECHAT_APP_ID || '',
    sandbox: process.env.WECHAT_SANDBOX === 'true',
  },
  huifu: {
    status: 'coming_soon',
    enabled: false,
    displayName: '汇付天下（即将上线）',
    huifuId: process.env.HUIFU_ID || '',
    productId: process.env.HUIFU_PRODUCT_ID || '',
    gateway: process.env.HUIFU_GATEWAY || 'https://api.huifu.com',
    notifyUrl: process.env.HUIFU_NOTIFY_URL || '/payments/callback/huifu',
    privateKey: process.env.HUIFU_PRIVATE_KEY || '',
    huifuPublicKey: process.env.HUIFU_PUBLIC_KEY || '',
  },
  yeepay: {
    status: 'coming_soon',
    enabled: false,
    displayName: '易宝支付（即将上线）',
    merchantId: process.env.YEEPAY_MERCHANT_ID || '',
    privateKey: process.env.YEEPAY_PRIVATE_KEY || '',
    yeepayPublicKey: process.env.YEEPAY_PUBLIC_KEY || '',
    gateway: process.env.YEEPAY_GATEWAY || 'https://openapi.yeepay.com',
    notifyUrl: process.env.YEEPAY_NOTIFY_URL || '/payments/callback/yeepay',
    productCode: process.env.YEEPAY_PRODUCT_CODE || '',
  },
};

export default paymentConfig;
