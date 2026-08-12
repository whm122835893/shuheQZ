// [钱包模块] - 端点 4 POST /wallet/recharge - 钱包充值 DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, Max, Min } from 'class-validator';

export class RechargeDto {
  @ApiProperty({ description: '充值金额（>0）', example: 100.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  amount: number;

  @ApiProperty({
    description:
      '支付方式：alipay=支付宝 wechat=微信 huifu=汇付 yeepay=易宝（不支持 balance 余额支付）',
    enum: ['alipay', 'wechat', 'huifu', 'yeepay'],
    example: 'alipay',
  })
  @IsString()
  @IsIn(['alipay', 'wechat', 'huifu', 'yeepay'])
  payment_method: string;
}
