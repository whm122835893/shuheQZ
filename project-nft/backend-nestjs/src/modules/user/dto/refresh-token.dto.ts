// [用户模块] - 刷新 Token DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: '登录/注册时下发的 refresh_token',
    example: 'rft_8f2c1a9e5b7d4e6f0a1b2c3d4e5f6a7b',
  })
  @IsString()
  refresh_token: string;
}
