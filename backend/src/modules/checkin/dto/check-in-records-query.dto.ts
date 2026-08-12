// [签到模块] - 签到记录查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class CheckInRecordsQueryDto {
  @ApiPropertyOptional({
    description: '月份，格式 YYYY-MM，默认当月',
    example: '2026-08',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month 格式必须为 YYYY-MM' })
  month?: string;
}
