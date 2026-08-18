// [钱包模块] - 端点 5 POST /wallet/recharge/callback - 充值回调 DTO
// 第三方支付异步回调统一（归一化）格式，由网关 / 适配层转换为该结构后回调本服务
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';

export class RechargeCallbackDto {
  @ApiProperty({
    description: '第三方交易号（作为幂等键，已处理直接返回 SUCCESS）',
    example: 'RCH20260806143052001',
  })
  @IsString()
  @IsNotEmpty({ message: '交易号不能为空' })
  @MaxLength(64)
  transaction_no: string;

  @ApiProperty({ description: '充值金额（元）', example: 100.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  amount: number;

  @ApiProperty({
    description: '支付状态：success=成功 failed=失败',
    example: 'success',
  })
  @IsString()
  @IsIn(['success', 'failed'])
  status: string;

  @ApiProperty({
    description: '支付方式：alipay=支付宝 wechat=微信（用于验签路由）',
    example: 'alipay',
  })
  @IsString()
  @IsIn(['alipay', 'wechat'])
  payment_method: string;

  @ApiProperty({ description: '签名（用于验签）', example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty({ message: '签名不能为空' })
  signature: string;
}
