// [用户模块] - 发送短信验证码 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SendSmsDto {
  @ApiPropertyOptional({
    description: '手机号（11位）。scene=4 时可不传，后端从 JWT 获取当前用户手机号',
    example: '13800008888',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: '场景：1=注册 2=登录 3=修改密码 4=设置交易密码 5=找回密码',
    example: 1,
    minimum: 1,
    maximum: 5,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  scene: number;

  @ApiPropertyOptional({
    description: '图形验证码 key（scene=1,2,5 时必填）',
  })
  @IsOptional()
  @IsString()
  captcha_key?: string;

  @ApiPropertyOptional({
    description: '图形验证码（scene=1,2,5 时必填）',
  })
  @IsOptional()
  @IsString()
  captcha_code?: string;
}
