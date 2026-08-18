// [市场模块] - 挂售藏品(寄售) DTO
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class CreateListingDto {
  @ApiProperty({ description: '用户藏品ID（nft_user_collectibles.id）', example: 201 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_collectible_id: number;

  @ApiProperty({ description: '挂单价格（>0）', example: 150.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  price: number;

  @ApiProperty({ description: '交易密码（6位数字）', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
