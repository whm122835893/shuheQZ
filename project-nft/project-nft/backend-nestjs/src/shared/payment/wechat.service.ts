// [支付] - 微信支付服务
//
// 职责:
//  1) createOrder - 创建支付订单,返回支付页面 URL(Native 支付下单 code_url 或 JSAPI 支付参数)
//  2) verifyCallback - 验签(微信支付 v3 回调签名校验)
//  3) parseCallback - 解析回调业务字段(transaction_no / order_id / amount)
//
// 验签实现:
//  - 微信支付 v3 使用 RSA-SHA256 签名
//  - 需要配置微信支付平台证书公钥
//  - 若未配置公钥,拒绝所有回调(安全优先)
//  - 开发环境可设置 PAYMENT_DEV_MODE=true 跳过验签(仅限联调)
//
// 配置来源:config/payment.config.ts 中的 WechatPayConfig
//   环境变量:WECHAT_MCH_ID / WECHAT_API_KEY / WECHAT_API_V3_KEY /
//            WECHAT_SERIAL_NUMBER / WECHAT_PRIVATE_KEY_PATH /
//            WECHAT_NOTIFY_URL / WECHAT_APP_ID / WECHAT_SANDBOX
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { WechatPayConfig } from '../../config/payment.config';

/**
 * 微信支付订单创建结果
 */
export interface WechatOrderResult {
  /** 支付页面 URL(Native 支付为 code_url,JSAPI 支付为 mweb_url 或 prepay_id 拼装) */
  pay_url: string;
}

/**
 * 微信支付异步回调解析结果
 */
export interface WechatCallbackResult {
  /** 微信支付交易号(transaction_id) */
  transaction_no: string;
  /** 业务订单 id(out_trade_no) */
  order_id: number;
  /** 实付金额(分,需 / 100 转换为元) */
  amount: number;
}

@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);

  /**
   * 微信支付配置(从环境变量读取)
   */
  private readonly config: WechatPayConfig;

  /** 是否为开发模式（跳过验签，仅限联调） */
  private readonly devMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      status: 'active',
      enabled: true,
      displayName: '微信支付',
      mchId: this.configService.get<string>('WECHAT_MCH_ID', ''),
      apiKey: this.configService.get<string>('WECHAT_API_KEY', ''),
      apiV3Key: this.configService.get<string>('WECHAT_API_V3_KEY', ''),
      serialNumber: this.configService.get<string>('WECHAT_SERIAL_NUMBER', ''),
      privateKeyPath: this.configService.get<string>(
        'WECHAT_PRIVATE_KEY_PATH',
        '',
      ),
      notifyUrl: this.configService.get<string>(
        'WECHAT_NOTIFY_URL',
        '/payments/callback/wechat',
      ),
      appId: this.configService.get<string>('WECHAT_APP_ID', ''),
      sandbox: this.configService.get<string>('WECHAT_SANDBOX', 'false') === 'true',
    };
    this.devMode = this.configService.get<string>('PAYMENT_DEV_MODE', 'false') === 'true';
  }

  /**
   * 创建支付订单
   *
   * TODO: 接入微信支付 SDK(wechatpay-node-v3)
   *   const pay = new WechatPay({ appid, mchid, privateKey, serial, apiV3Key });
   *   const result = await pay.transactions_native({
   *     out_trade_no: orderNo,
   *     description,
   *     amount: { total: Math.round(amount * 100) }, // 单位:分
   *     notify_url: this.config.notifyUrl,
   *   });
   *   return { pay_url: result.code_url };
   *
   * @param orderNo     业务订单号(对应 out_trade_no)
   * @param amount      金额(元)
   * @param description 订单描述
   */
  async createOrder(
    orderNo: string,
    amount: number,
    description: string,
  ): Promise<WechatOrderResult> {
    this.logger.log(
      `[Wechat] 创建订单 orderNo=${orderNo} amount=${amount} description=${description}`,
    );

    // 占位:返回 weixin:// 假协议 URL,实际应由 SDK 返回 code_url
    // 接入真实 SDK 后替换此实现
    const payUrl = `weixin://wxpay/bizpayurl?pr=${orderNo}&amount=${Math.round(
      amount * 100,
    )}`;

    return { pay_url: payUrl };
  }

  /**
   * 验签 - 微信支付 v3 异步回调签名校验
   *
   * 验签流程（微信支付 v3 API）:
   *  1. 从回调中提取 Wechatpay-Timestamp, Wechatpay-Nonce, Wechatpay-Serial, Wechatpay-Signature
   *  2. 构造验签字符串: timestamp\nnonce\ndata\n
   *  3. 使用微信支付平台证书公钥进行 RSA-SHA256 验签
   *
   * 注意:
   *  - 微信支付 v3 回调数据是加密的（AES-256-GCM），需要用 apiV3Key 解密
   *  - 解密后的明文才是 parseCallback 处理的业务数据
   *  - 当前实现仅做验签，解密逻辑需接入 SDK 后补充
   *
   * 安全策略:
   *  - 若未配置微信支付平台证书,拒绝所有回调(返回 false)
   *  - 若 PAYMENT_DEV_MODE=true,跳过验签(仅限开发联调)
   *
   * @param data 微信支付 v3 异步回调数据（含 headers 和 body）
   * @returns 验签通过返回 true,否则 false
   */
  verifyCallback(data: Record<string, any>): boolean {
    // 开发模式跳过验签（仅限联调，生产环境必须关闭）
    if (this.devMode) {
      this.logger.warn(
        '[Wechat] PAYMENT_DEV_MODE=true，跳过验签（仅限开发联调，生产环境必须设置为 false）',
      );
      return true;
    }

    // 微信支付 v3 需要从 headers 提取签名信息
    const timestamp = data?.['Wechatpay-Timestamp'] || data?.timestamp;
    const nonce = data?.['Wechatpay-Nonce'] || data?.nonce;
    const signature = data?.['Wechatpay-Signature'] || data?.signature;
    const serial = data?.['Wechatpay-Serial'] || data?.serial;

    if (!timestamp || !nonce || !signature) {
      this.logger.warn('[Wechat] 回调数据缺少签名相关字段，验签失败');
      return false;
    }

    // 检查 API v3 密钥是否配置
    if (!this.config.apiV3Key) {
      this.logger.error(
        '[Wechat] WECHAT_API_V3_KEY 未配置，拒绝所有支付回调。请配置微信支付 API v3 密钥或设置 PAYMENT_DEV_MODE=true 进行联调。',
      );
      return false;
    }

    // 构造验签字符串
    const body = data?.body || JSON.stringify(data?.resource || {});
    const signContent = `${timestamp}\n${nonce}\n${body}\n`;

    try {
      // 微信支付 v3 使用平台证书验签
      // TODO: 接入 SDK 后，通过 serial number 自动获取对应的平台证书
      // 当前使用 WECHAT_PUBLIC_KEY 环境变量（如有配置）
      const publicKey = this.configService.get<string>('WECHAT_PUBLIC_KEY', '');
      if (!publicKey) {
        this.logger.error(
          '[Wechat] WECHAT_PUBLIC_KEY 未配置，拒绝所有支付回调。请配置微信支付平台证书公钥或设置 PAYMENT_DEV_MODE=true 进行联调。',
        );
        return false;
      }

      const publicKeyPem = this.formatPublicKey(publicKey);

      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signContent, 'utf8');
      const isValid = verifier.verify(
        publicKeyPem,
        Buffer.from(signature, 'base64'),
      );

      if (!isValid) {
        this.logger.warn(
          `[Wechat] 验签失败 serial=${serial} signature=${signature.substring(0, 20)}...`,
        );
      }

      return isValid;
    } catch (err) {
      this.logger.error(
        `[Wechat] 验签异常: ${err?.message ?? err}`,
        err?.stack,
      );
      return false;
    }
  }

  /**
   * 格式化公钥为 PEM 格式
   */
  private formatPublicKey(key: string): string {
    const trimmed = key.trim();
    if (trimmed.startsWith('-----BEGIN')) {
      return trimmed;
    }
    const lines = trimmed.match(/.{1,64}/g) || [trimmed];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * 解析回调业务字段
   *
   * 微信支付 v3 异步回调(解密后)关键字段映射:
   *   transaction_id -> transaction_no(微信支付交易号)
   *   out_trade_no   -> order_id(业务订单号,约定为数字 id)
   *   amount.total   -> amount(实付金额,单位:分)
   *
   * @param data 微信支付 v3 回调解密后的业务数据
   * @throws 数据缺失时抛出异常
   */
  parseCallback(data: Record<string, any>): WechatCallbackResult {
    const transactionId = data?.transaction_id;
    const outTradeNo = data?.out_trade_no;
    const total = data?.amount?.total;

    if (!transactionId || !outTradeNo || total === undefined) {
      throw new Error(
        '微信支付回调数据缺失关键字段(transaction_id / out_trade_no / amount.total)',
      );
    }

    const orderId = Number(outTradeNo);
    if (Number.isNaN(orderId)) {
      throw new Error(`微信支付回调 out_trade_no 非数字: ${outTradeNo}`);
    }

    const amount = Number(total);
    if (Number.isNaN(amount)) {
      throw new Error(`微信支付回调 amount.total 非数字: ${total}`);
    }

    return {
      transaction_no: String(transactionId),
      order_id: orderId,
      // 微信支付金额单位为分,这里保留"分"语义,业务层使用时再 / 100 转元
      amount,
    };
  }
}

/**
 * 微信支付服务 Provider 常量
 */
export const WechatServiceProvider = {
  provide: WechatService,
  useClass: WechatService,
};
