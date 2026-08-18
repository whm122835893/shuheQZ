// [用户模块] - 找回密码 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: '手机号（已注册）', example: '13800008888' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码（scene=5）', example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: '验证码必须为6位数字' })
  code: string;

  @ApiProperty({
    description: '新登录密码（8-20位，字母+数字）',
    example: 'new12345',
  })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, {
    message: '密码必须为8-20位字母与数字组合',
  })
  new_password: string;
}
