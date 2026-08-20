// [支付模块] - 端点 4 POST /payments/callback - 支付回调 DTO
// 第三方支付异步回调统一（归一化）格式，由网关 / 适配层转换为该结构后回调本服务
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class PaymentCallbackDto {
  @ApiProperty({ description: '业务订单号', example: 'ORD20260806143052001' })
  @IsString()
  order_no: string;

  @ApiProperty({
    description: '第三方交易号（作为幂等键，已处理直接返回 SUCCESS）',
    example: '2026080622001400001',
  })
  @IsString()
  transaction_no: string;

  @ApiProperty({
    description: '支付状态：success=成功 failed=失败',
    example: 'success',
  })
  @IsString()
  status: string;

  @ApiProperty({ description: '实付金额（元）', example: 99.0 })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: '支付方式：alipay=支付宝 wechat=微信（用于验签路由）',
    example: 'alipay',
  })
  @IsString()
  @IsIn(['alipay', 'wechat'])
  payment_method: string;

  @ApiProperty({ description: '签名（用于验签）', example: 'a1b2c3d4e5f6...' })
  @IsString()
  signature: string;
}
