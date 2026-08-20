// [用户模块] - 修改用户资料 DTO（部分更新）
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '新昵称（≤50字）', example: '新昵称' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '用户名不能超过50个字符' })
  username?: string;

  @ApiPropertyOptional({
    description: '头像URL（先调用上传接口获取）',
    example: 'https://cdn.example.com/avatar.png',
  })
  @IsOptional()
  @IsUrl({}, { message: '头像地址格式不正确' })
  avatar?: string;
}
