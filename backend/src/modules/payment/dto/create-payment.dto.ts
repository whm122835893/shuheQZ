// [支付模块] - 端点 3 POST /payments - 创建支付 DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Min } from 'class-validator';

/**
 * 支持的支付方式枚举（与 nft_payments.payment_method 对齐并扩展第三方通道）
 * - balance: 余额支付（钱包扣款，同步完成）
 * - alipay:  支付宝
 * - wechat:  微信支付
 * - huifu:   汇付（TODO coming_soon）
 * - yeepay:  易宝（TODO coming_soon）
 */
export const PAYMENT_METHODS = [
  'balance',
  'alipay',
  'wechat',
  'huifu',
  'yeepay',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CreatePaymentDto {
  @ApiProperty({ description: '订单ID', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order_id: number;

  @ApiProperty({
    description:
      '支付方式：balance=余额 alipay=支付宝 wechat=微信 huifu=汇付 yeepay=易宝',
    enum: PAYMENT_METHODS,
    example: 'balance',
  })
  @IsString()
  @IsIn(PAYMENT_METHODS as unknown as string[])
  payment_method: PaymentMethod;
}
