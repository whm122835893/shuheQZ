// [转赠模块] - 1 POST /transfers - 发起转赠请求 DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Min } from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    description: '用户藏品ID（nft_user_collectibles.id）',
    example: 201,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_collectible_id: number;

  @ApiProperty({ description: '接收方手机号（11位）', example: '13900006666' })
  @IsString()
  @Matches(/^1\d{10}$/, { message: '手机号格式不正确' })
  to_phone: string;

  @ApiProperty({ description: '交易密码（6位数字）', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
