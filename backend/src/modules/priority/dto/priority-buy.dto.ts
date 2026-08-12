// [优先购模块] - 端点3 POST /priority-sales/:id/buy 优先购下单 DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min } from 'class-validator';

/**
 * 优先购支付方式枚举
 * 与 nft_payments.payment_method 对应，扩展支持 huifu / yeepay
 */
export const PRIORITY_PAYMENT_METHODS = [
  'balance',
  'alipay',
  'wechat',
  'huifu',
  'yeepay',
] as const;
export type PriorityPaymentMethod = (typeof PRIORITY_PAYMENT_METHODS)[number];

export class PriorityBuyDto {
  @ApiProperty({ description: '购买数量（≥1）', example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;

  @ApiProperty({
    description:
      '支付方式：balance=余额 alipay=支付宝 wechat=微信 huifu=汇付 yeepay=易宝',
    enum: PRIORITY_PAYMENT_METHODS,
    example: 'balance',
  })
  @IsString()
  @IsIn(PRIORITY_PAYMENT_METHODS as unknown as string[])
  payment_method: PriorityPaymentMethod;

  @ApiProperty({ description: '交易密码（6位数字）', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
