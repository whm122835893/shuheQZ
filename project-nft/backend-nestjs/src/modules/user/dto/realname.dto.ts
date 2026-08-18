// [用户模块] - 实名认证 DTO
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RealnameDto {
  @ApiProperty({ description: '真实姓名', example: '张三' })
  @IsString()
  @MinLength(2, { message: '真实姓名至少2个字符' })
  @MaxLength(50, { message: '真实姓名不能超过50个字符' })
  real_name: string;

  @ApiProperty({
    description: '身份证号（18位，后端加密存储）',
    example: '110101199001011234',
  })
  @IsString()
  @Matches(
    /^[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/,
    { message: '身份证号格式不正确' },
  )
  id_card: string;
}
