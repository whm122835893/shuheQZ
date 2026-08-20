// [合成模块] - 提交合成 DTO
// JWT 认证 + 交易密码验证（合成消耗材料藏品，属于资产变动操作）
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Matches } from 'class-validator';

export class SynthesizeDto {
  @ApiProperty({
    description: '消耗的用户藏品ID数组（需匹配材料配方数量）',
    type: [Number],
    example: [101, 102, 103],
  })
  @Type(() => Number)
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  material_user_collectible_ids: number[];

  @ApiProperty({
    description: '交易密码（6位数字）',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
