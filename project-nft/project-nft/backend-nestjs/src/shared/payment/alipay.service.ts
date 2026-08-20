// [支付] - 支付宝支付服务
//
// 职责:
//  1) createOrder - 创建支付订单,返回支付页面 URL(电脑网站支付 alipay.trade.page.pay)
//  2) verifyCallback - 验签(支付宝异步回调签名校验,RSA2)
//  3) parseCallback - 解析回调业务字段(transaction_no / order_id / amount)
//
// 验签实现:
//  - 使用 Node.js crypto 模块进行 RSA-SHA256 签名校验
//  - 需要 ALIPAY_PUBLIC_KEY 环境变量配置支付宝公钥
//  - 若未配置公钥,拒绝所有回调(安全优先)
//  - 开发环境可设置 PAYMENT_DEV_MODE=true 跳过验签(仅限联调)
//
// 配置来源:config/payment.config.ts 中的 AlipayConfig
//   环境变量:ALIPAY_APP_ID / ALIPAY_PRIVATE_KEY / ALIPAY_PUBLIC_KEY /
//            ALIPAY_GATEWAY / ALIPAY_NOTIFY_URL / ALIPAY_RETURN_URL / ALIPAY_SANDBOX
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AlipayConfig } from '../../config/payment.config';

/**
 * 支付订单创建结果
 */
export interface AlipayOrderResult {
  /** 支付页面 URL(用于跳转或生成二维码) */
  pay_url: string;
}

/**
 * 支付宝异步回调解析结果
 */
export interface AlipayCallbackResult {
  /** 支付宝交易号 */
  transaction_no: string;
  /** 业务订单 id */
  order_id: number;
  /** 实付金额(元) */
  amount: number;
}

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);

  /**
   * 支付宝配置(从 getPaymentConfig 工厂读取)
   */
  private readonly config: AlipayConfig;

  /** 是否为开发模式（跳过验签，仅限联调） */
  private readonly devMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      status: 'active',
      enabled: true,
      displayName: '支付宝',
      appId: this.configService.get<string>('ALIPAY_APP_ID', ''),
      privateKey: this.configService.get<string>('ALIPAY_PRIVATE_KEY', ''),
      alipayPublicKey: this.configService.get<string>('ALIPAY_PUBLIC_KEY', ''),
      gateway: this.configService.get<string>(
        'ALIPAY_GATEWAY',
        'https://openapi.alipay.com/gateway.do',
      ),
      notifyUrl: this.configService.get<string>(
        'ALIPAY_NOTIFY_URL',
        '/payments/callback/alipay',
      ),
      returnUrl: this.configService.get<string>(
        'ALIPAY_RETURN_URL',
        '/payments/return/alipay',
      ),
      signType: 'RSA2',
      sandbox: this.configService.get<string>('ALIPAY_SANDBOX', 'false') === 'true',
    };
    this.devMode = this.configService.get<string>('PAYMENT_DEV_MODE', 'false') === 'true';
  }

  /**
   * 创建支付订单
   *
   * TODO: 接入支付宝 SDK(alipay-sdk)
   *   const sdk = new AlipaySdk({ appId, privateKey, alipayPublicKey, gateway });
   *   const result = await sdk.pageExec('alipay.trade.page.pay', {
   *     bizContent: { out_trade_no: orderNo, total_amount: amount, subject },
   *     notify_url, return_url,
   *   });
   *   return { pay_url: result };
   *
   * @param orderNo 业务订单号(对应 out_trade_no)
   * @param amount  金额(元)
   * @param subject 订单标题
   */
  async createOrder(
    orderNo: string,
    amount: number,
    subject: string,
  ): Promise<AlipayOrderResult> {
    this.logger.log(
      `[Alipay] 创建订单 orderNo=${orderNo} amount=${amount} subject=${subject}`,
    );

    // 占位:返回支付宝网关 + 假参数,实际应由 SDK 生成签名后的完整 URL
    // 接入真实 SDK 后替换此实现
    const payUrl = `${this.config.gateway}?app_id=${this.config.appId}&out_trade_no=${orderNo}&total_amount=${amount}&subject=${encodeURIComponent(
      subject,
    )}`;

    return { pay_url: payUrl };
  }

  /**
   * 验签 - 支付宝异步回调 RSA2 签名校验
   *
   * 验签流程:
   *  1. 提取 sign 和 sign_type 参数
   *  2. 将剩余参数按 key 字典序排序,拼接为 key=value&key=value
   *  3. 使用支付宝公钥进行 RSA-SHA256 验签
   *
   * 安全策略:
   *  - 若 ALIPAY_PUBLIC_KEY 未配置,拒绝所有回调(返回 false)
   *  - 若 PAYMENT_DEV_MODE=true,跳过验签(仅限开发联调)
   *  - 验签失败返回 false,由调用方决定是否记录日志
   *
   * @param data 支付宝异步回调的全部参数(key-value)
   * @returns 验签通过返回 true,否则 false
   */
  verifyCallback(data: Record<string, any>): boolean {
    // 开发模式跳过验签（仅限联调，生产环境必须关闭）
    if (this.devMode) {
      this.logger.warn(
        '[Alipay] PAYMENT_DEV_MODE=true，跳过验签（仅限开发联调，生产环境必须设置为 false）',
      );
      return true;
    }

    // 检查支付宝公钥是否配置
    if (!this.config.alipayPublicKey) {
      this.logger.error(
        '[Alipay] ALIPAY_PUBLIC_KEY 未配置，拒绝所有支付回调。请配置支付宝公钥或设置 PAYMENT_DEV_MODE=true 进行联调。',
      );
      return false;
    }

    // 提取签名
    const sign = data?.sign;
    if (!sign) {
      this.logger.warn('[Alipay] 回调数据缺少 sign 字段，验签失败');
      return false;
    }

    // 提取所有参与签名的参数（排除 sign 和 sign_type）
    const signParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'sign' || key === 'sign_type') continue;
      if (value === undefined || value === null || value === '') continue;
      signParams[key] = String(value);
    }

    // 按 key 字典序排序并拼接
    const sortedKeys = Object.keys(signParams).sort();
    const signContent = sortedKeys
      .map((key) => `${key}=${signParams[key]}`)
      .join('&');

    try {
      // 构建公钥（支付宝公钥可能是 PEM 格式或纯 base64）
      const publicKeyPem = this.formatPublicKey(this.config.alipayPublicKey);

      // RSA-SHA256 验签
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signContent, 'utf8');
      const isValid = verifier.verify(
        publicKeyPem,
        Buffer.from(sign, 'base64'),
      );

      if (!isValid) {
        this.logger.warn(
          `[Alipay] 验签失败 order_no=${data?.out_trade_no} sign=${sign.substring(0, 20)}...`,
        );
      }

      return isValid;
    } catch (err) {
      this.logger.error(
        `[Alipay] 验签异常: ${err?.message ?? err}`,
        err?.stack,
      );
      return false;
    }
  }

  /**
   * 格式化支付宝公钥为 PEM 格式
   * 支付宝公钥可能是纯 base64 字符串，需要包装为 PEM 格式
   */
  private formatPublicKey(key: string): string {
    const trimmed = key.trim();
    // 如果已经是 PEM 格式，直接返回
    if (trimmed.startsWith('-----BEGIN')) {
      return trimmed;
    }
    // 包装为 PEM 格式
    const lines = trimmed.match(/.{1,64}/g) || [trimmed];
    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * 解析回调业务字段
   *
   * 支付宝异步回调关键字段映射:
   *   trade_no      -> transaction_no(支付宝交易号)
   *   out_trade_no  -> order_id(业务订单号,约定为数字 id)
   *   total_amount  -> amount(实付金额)
   *   trade_status  -> TRADE_STATUS_TRADE_SUCCESS 表示支付成功
   *
   * @param data 支付宝异步回调的全部参数
   * @throws 数据缺失时抛出异常
   */
  parseCallback(data: Record<string, any>): AlipayCallbackResult {
    const tradeNo = data?.trade_no;
    const outTradeNo = data?.out_trade_no;
    const totalAmount = data?.total_amount;

    if (!tradeNo || !outTradeNo || totalAmount === undefined) {
      throw new Error(
        '支付宝回调数据缺失关键字段(trade_no / out_trade_no / total_amount)',
      );
    }

    const orderId = Number(outTradeNo);
    if (Number.isNaN(orderId)) {
      throw new Error(`支付宝回调 out_trade_no 非数字: ${outTradeNo}`);
    }

    const amount = Number(totalAmount);
    if (Number.isNaN(amount)) {
      throw new Error(`支付宝回调 total_amount 非数字: ${totalAmount}`);
    }

    return {
      transaction_no: String(tradeNo),
      order_id: orderId,
      amount,
    };
  }
}

/**
 * 支付宝服务 Provider 常量
 */
export const AlipayServiceProvider = {
  provide: AlipayService,
  useClass: AlipayService,
};
