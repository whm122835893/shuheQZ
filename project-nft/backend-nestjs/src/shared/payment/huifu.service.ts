// [支付] - 汇付天下支付服务(预留)
//
// 当前状态:coming_soon(即将上线,尚未接入)
// 本文件定义抽象类与方法签名,作为后续接入的契约占位,
// 待汇付 SDK 接入完成后,创建具体实现类并替换 provider。
//
// 配置来源:config/payment.config.ts 中的 HuifuConfig
//   环境变量:HUIFU_ID / HUIFU_PRODUCT_ID / HUIFU_GATEWAY /
//            HUIFU_NOTIFY_URL / HUIFU_PRIVATE_KEY / HUIFU_PUBLIC_KEY
import { Injectable, Logger } from '@nestjs/common';

/**
 * 汇付支付通道状态
 */
export const HUIFU_STATUS = 'coming_soon' as const;

/**
 * 汇付支付订单创建结果
 */
export interface HuifuOrderResult {
  /** 支付页面 URL */
  pay_url: string;
}

/**
 * 汇付支付异步回调解析结果
 */
export interface HuifuCallbackResult {
  /** 汇付交易号 */
  transaction_no: string;
  /** 业务订单 id */
  order_id: number;
  /** 实付金额(元) */
  amount: number;
}

/**
 * 汇付天下支付服务抽象基类
 *
 * 定义后续接入汇付 SDK 时需要实现的方法契约。
 * 当前提供占位实现:所有方法抛出"暂未接入"异常,
 * 防止业务层误调用未就绪通道。
 */
@Injectable()
export abstract class HuifuService {
  protected readonly logger = new Logger(HuifuService.name);

  /**
   * 通道状态(coming_soon)
   */
  abstract readonly status: typeof HUIFU_STATUS;

  /**
   * 创建支付订单
   *
   * TODO: 待接入汇付天下 SDK
   *
   * @param orderNo 业务订单号
   * @param amount  金额(元)
   * @param subject 订单标题
   */
  abstract createOrder(
    orderNo: string,
    amount: number,
    subject: string,
  ): Promise<HuifuOrderResult>;

  /**
   * 验签
   *
   * TODO: 待接入汇付 SDK 验签
   */
  abstract verifyCallback(data: Record<string, any>): boolean;

  /**
   * 解析回调业务字段
   *
   * TODO: 待接入汇付 SDK 回调解析
   */
  abstract parseCallback(data: Record<string, any>): HuifuCallbackResult;
}

/**
 * 汇付天下支付服务占位实现(coming_soon)
 *
 * 所有方法抛出"暂未接入"异常,确保未接入前不会被误用。
 * 待真实 SDK 接入后,创建 HuifuServiceImpl 继承本类并实现各方法。
 */
@Injectable()
export class HuifuServicePlaceholder extends HuifuService {
  readonly status = HUIFU_STATUS;

  async createOrder(
    orderNo: string,
    amount: number,
    subject: string,
  ): Promise<HuifuOrderResult> {
    // TODO: 待接入
    this.logger.warn(
      `[Huifu coming_soon] createOrder 被调用 orderNo=${orderNo} amount=${amount} subject=${subject}`,
    );
    throw new Error('汇付天下支付通道暂未接入(coming_soon)');
  }

  verifyCallback(_data: Record<string, any>): boolean {
    // TODO: 待接入
    this.logger.warn('[Huifu coming_soon] verifyCallback 被调用,暂未接入');
    throw new Error('汇付天下支付通道暂未接入(coming_soon)');
  }

  parseCallback(_data: Record<string, any>): HuifuCallbackResult {
    // TODO: 待接入
    this.logger.warn('[Huifu coming_soon] parseCallback 被调用,暂未接入');
    throw new Error('汇付天下支付通道暂未接入(coming_soon)');
  }
}

/**
 * 汇付支付服务 Provider 常量
 *
 * 当前绑定到占位实现,真实 SDK 接入后替换 useClass 即可。
 */
export const HuifuServiceProvider = {
  provide: HuifuService,
  useClass: HuifuServicePlaceholder,
};
