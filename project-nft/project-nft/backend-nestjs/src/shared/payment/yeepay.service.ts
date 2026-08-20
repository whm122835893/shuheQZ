// [支付] - 易宝支付服务(预留)
//
// 当前状态:coming_soon(即将上线,尚未接入)
// 本文件定义抽象类与方法签名,作为后续接入的契约占位,
// 待易宝 SDK 接入完成后,创建具体实现类并替换 provider。
//
// 配置来源:config/payment.config.ts 中的 YeepayConfig
//   环境变量:YEEPAY_MERCHANT_ID / YEEPAY_PRIVATE_KEY / YEEPAY_PUBLIC_KEY /
//            YEEPAY_GATEWAY / YEEPAY_NOTIFY_URL / YEEPAY_PRODUCT_CODE
import { Injectable, Logger } from '@nestjs/common';

/**
 * 易宝支付通道状态
 */
export const YEEPAY_STATUS = 'coming_soon' as const;

/**
 * 易宝支付订单创建结果
 */
export interface YeepayOrderResult {
  /** 支付页面 URL */
  pay_url: string;
}

/**
 * 易宝支付异步回调解析结果
 */
export interface YeepayCallbackResult {
  /** 易宝交易号 */
  transaction_no: string;
  /** 业务订单 id */
  order_id: number;
  /** 实付金额(元) */
  amount: number;
}

/**
 * 易宝支付服务抽象基类
 *
 * 定义后续接入易宝 SDK 时需要实现的方法契约。
 * 当前提供占位实现:所有方法抛出"暂未接入"异常,
 * 防止业务层误调用未就绪通道。
 */
@Injectable()
export abstract class YeepayService {
  protected readonly logger = new Logger(YeepayService.name);

  /**
   * 通道状态(coming_soon)
   */
  abstract readonly status: typeof YEEPAY_STATUS;

  /**
   * 创建支付订单
   *
   * TODO: 待接入易宝支付 SDK
   *
   * @param orderNo     业务订单号
   * @param amount      金额(元)
   * @param description 订单描述
   */
  abstract createOrder(
    orderNo: string,
    amount: number,
    description: string,
  ): Promise<YeepayOrderResult>;

  /**
   * 验签
   *
   * TODO: 待接入易宝 SDK 验签
   */
  abstract verifyCallback(data: Record<string, any>): boolean;

  /**
   * 解析回调业务字段
   *
   * TODO: 待接入易宝 SDK 回调解析
   */
  abstract parseCallback(data: Record<string, any>): YeepayCallbackResult;
}

/**
 * 易宝支付服务占位实现(coming_soon)
 *
 * 所有方法抛出"暂未接入"异常,确保未接入前不会被误用。
 * 待真实 SDK 接入后,创建 YeepayServiceImpl 继承本类并实现各方法。
 */
@Injectable()
export class YeepayServicePlaceholder extends YeepayService {
  readonly status = YEEPAY_STATUS;

  async createOrder(
    orderNo: string,
    amount: number,
    description: string,
  ): Promise<YeepayOrderResult> {
    // TODO: 待接入
    this.logger.warn(
      `[Yeepay coming_soon] createOrder 被调用 orderNo=${orderNo} amount=${amount} description=${description}`,
    );
    throw new Error('易宝支付通道暂未接入(coming_soon)');
  }

  verifyCallback(_data: Record<string, any>): boolean {
    // TODO: 待接入
    this.logger.warn('[Yeepay coming_soon] verifyCallback 被调用,暂未接入');
    throw new Error('易宝支付通道暂未接入(coming_soon)');
  }

  parseCallback(_data: Record<string, any>): YeepayCallbackResult {
    // TODO: 待接入
    this.logger.warn('[Yeepay coming_soon] parseCallback 被调用,暂未接入');
    throw new Error('易宝支付通道暂未接入(coming_soon)');
  }
}

/**
 * 易宝支付服务 Provider 常量
 *
 * 当前绑定到占位实现,真实 SDK 接入后替换 useClass 即可。
 */
export const YeepayServiceProvider = {
  provide: YeepayService,
  useClass: YeepayServicePlaceholder,
};
