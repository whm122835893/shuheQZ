// [市场模块] - 发售购买 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { PAYMENT_METHODS, PaymentMethod } from './buy-from-market.dto';

export class BuyFromReleaseDto {
  @ApiProperty({ description: '购买数量（≥1）', default: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  quantity?: number = 1;

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

  @ApiPropertyOptional({ description: '优先购活动ID（优先购下单时传）', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  priority_sale_id?: number;

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
