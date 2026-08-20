// [系统模块] - 4 POST /feedback 意见反馈 DTO
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class FeedbackDto {
  @ApiProperty({
    description: '反馈类型',
    enum: ['bug', 'suggestion', 'complaint', 'other'],
    example: 'bug',
  })
  @IsString()
  @IsIn(['bug', 'suggestion', 'complaint', 'other'])
  type: string;

  @ApiProperty({
    description: '反馈内容（≤1000字符，不能为空）',
    example: '购买藏品时页面加载缓慢',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty({ message: '反馈内容不能为空' })
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({
    description: '图片URL列表（可选）',
    example: ['https://cdn.example.com/uploads/feedback_1.jpg'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @ApiPropertyOptional({
    description: '联系方式（可选）',
    example: 'user@example.com',
  })
  @IsString()
  @IsOptional()
  contact?: string;
}
