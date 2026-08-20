// [管理后台-认证模块] - 认证相关 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, Matches, IsNotEmpty } from 'class-validator';

/**
 * 管理员登录 DTO
 */
export class AdminLoginDto {
  @ApiProperty({ description: '管理员用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 50, { message: '用户名长度为 3-50 个字符' })
  username: string;

  @ApiProperty({ description: '登录密码（8-20位，字母+数字）', example: 'admin12345' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}|[\]\\:";'<>?,./]{8,20}$/, {
    message: '密码必须为 8-20 位字母与数字组合',
  })
  password: string;
}

/**
 * 修改管理员密码 DTO
 */
export class AdminChangePasswordDto {
  @ApiProperty({ description: '原登录密码', example: 'old12345' })
  @IsString()
  @IsNotEmpty({ message: '原密码不能为空' })
  old_password: string;

  @ApiProperty({
    description: '新登录密码（8-20位，字母+数字，不可与原密码相同）',
    example: 'new12345',
  })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-={}|[\]\\:";'<>?,./]{8,20}$/, {
    message: '新密码必须为 8-20 位字母与数字组合',
  })
  new_password: string;
}

/**
 * 刷新 Token DTO
 */
export class AdminRefreshTokenDto {
  @ApiProperty({
    description: '登录时下发的 refresh_token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'refresh_token 不能为空' })
  refresh_token: string;
}

/**
 * 2FA 设置 DTO（需要验证当前密码以确认身份）
 */
export class Admin2faSetupDto {
  @ApiProperty({ description: '当前登录密码（验证身份）', example: 'admin12345' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}

/**
 * 2FA 验证 DTO
 */
export class Admin2faVerifyDto {
  @ApiProperty({ description: '2FA 密钥（setup 阶段返回的 secret）', example: 'JBSWY3DPEHPK3PXP' })
  @IsString()
  @IsNotEmpty({ message: '密钥不能为空' })
  secret: string;

  @ApiProperty({ description: '6 位动态验证码', example: '123456' })
  @IsString()
  @Length(6, 6, { message: '验证码必须为 6 位' })
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string;
}

/**
 * 2FA 登录验证 DTO（开启 2FA 后登录需要额外验证）
 */
export class Admin2faLoginVerifyDto {
  @ApiProperty({ description: '管理员用户名', example: 'admin' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @ApiProperty({ description: '6 位动态验证码', example: '123456' })
  @IsString()
  @Length(6, 6, { message: '验证码必须为 6 位' })
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  code: string;
}
