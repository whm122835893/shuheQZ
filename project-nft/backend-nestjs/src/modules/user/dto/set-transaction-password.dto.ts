// [用户模块] - 设置/修改交易密码 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class SetTransactionPasswordDto {
  @ApiProperty({ description: '短信验证码（scene=4）', example: '123456' })
  @IsString()
  code: string;

  @ApiProperty({ description: '交易密码（6位纯数字）', example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '交易密码必须为6位纯数字' })
  transaction_password: string;
}
