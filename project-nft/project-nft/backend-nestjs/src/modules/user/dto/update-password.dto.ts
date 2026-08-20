// [用户模块] - 修改登录密码 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({ description: '原登录密码', example: 'old12345' })
  @IsString()
  old_password: string;

  @ApiProperty({
    description: '新登录密码（8-20位，字母+数字，不可与原密码相同）',
    example: 'new12345',
  })
  @IsString()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,20}$/, {
    message: '密码必须为8-20位字母与数字组合',
  })
  new_password: string;
}
