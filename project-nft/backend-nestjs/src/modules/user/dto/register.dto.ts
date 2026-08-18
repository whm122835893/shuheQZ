// [用户模块] - 用户注册 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: '手机号（11位，未注册）', example: '13800008888' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '短信验证码（scene=1）', example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: '验证码必须为6位数字' })
  code: string;

  @ApiPropertyOptional({ description: '图形验证码 key（生产环境必填）' })
  @IsOptional()
  @IsString()
  captcha_key?: string;

  @ApiPropertyOptional({ description: '图形验证码（生产环境必填）' })
  @IsOptional()
  @IsString()
  captcha_code?: string;

  @ApiProperty({
    description: '登录密码（8-20位，字母+数字）',
    example: 'abc12345',
  })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, {
    message: '密码必须为8-20位字母与数字组合',
  })
  login_password: string;

  @ApiProperty({ description: '用户名/昵称（≤50字）', example: '数藏玩家' })
  @IsString()
  @MaxLength(50, { message: '用户名不能超过50个字符' })
  username: string;

  @ApiPropertyOptional({
    description: '邀请人UID（5位数字）',
    example: '10000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: '邀请人UID格式不正确' })
  inviter_uid?: string;
}
