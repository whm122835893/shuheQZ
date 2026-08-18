// [用户模块] - 用户登录 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: '手机号', example: '13800008888' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiPropertyOptional({
    description: '短信验证码（scene=2），与登录密码二选一',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: '验证码必须为6位数字' })
  code?: string;

  @ApiPropertyOptional({
    description: '登录密码，与验证码二选一',
    example: 'abc12345',
  })
  @IsOptional()
  @IsString()
  login_password?: string;
}
