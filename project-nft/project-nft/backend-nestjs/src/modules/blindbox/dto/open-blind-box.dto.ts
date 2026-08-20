// [盲盒模块] - 开启盲盒 DTO
// JWT 认证 + 交易密码验证（开启盲盒消耗盲盒藏品，属于资产变动操作）
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, Matches, Min } from 'class-validator';

export class OpenBlindBoxDto {
  @ApiProperty({
    description: '用户持有的盲盒藏品ID（nft_user_collectibles.id）',
    example: 201,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_collectible_id: number;

  @ApiProperty({
    description: '交易密码（6位数字）',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
