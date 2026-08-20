// [签到模块] - 签到记录查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckInRecordsQueryDto {
  @ApiPropertyOptional({
    description: '月份，格式 YYYY-MM，默认当月',
    example: '2026-08',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month 格式必须为 YYYY-MM' })
  month?: string;

  @ApiPropertyOptional({ description: '页码', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: '每页条数', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page_size?: number;
}
