// [市场模块] - 市场购买 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * 支付方式枚举（与 nft_payments.payment_method 一致）
 */
export const PAYMENT_METHODS = ['balance', 'alipay', 'wechat'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class BuyFromMarketDto {
  @ApiProperty({ description: '交易密码（6位数字）', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;

  @ApiPropertyOptional({
    description: '支付方式：balance=余额 alipay=支付宝 wechat=微信',
    enum: PAYMENT_METHODS,
    default: 'balance',
    example: 'balance',
  })
  @IsOptional()
  @IsIn(PAYMENT_METHODS as unknown as string[])
  payment_method?: PaymentMethod;

  // INT-009 修复：幂等键，防止前端重复提交导致重复下单
  @ApiPropertyOptional({
    description: '幂等键（UUID，防止重复下单，建议每次请求生成唯一值）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotency_key?: string;
}
