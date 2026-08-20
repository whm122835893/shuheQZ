// [抽奖模块] - 参与抽奖 DTO
// JWT 认证 + 交易密码验证（抽奖消耗抽奖次数并可能获得藏品，属于资产变动操作）
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class DrawDto {
  @ApiProperty({
    description: '交易密码（6位数字）',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位数字' })
  transaction_password: string;
}
