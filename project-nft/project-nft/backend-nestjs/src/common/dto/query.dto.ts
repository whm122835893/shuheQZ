// [公共] - 通用分页查询 DTO
// 管理后台控制器统一的查询参数基类，使用 camelCase 命名（page/pageSize）
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** 通用分页查询参数 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: '页码，从 1 开始', default: 1, minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20, minimum: 1, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '关键词搜索', example: '千里江山' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '状态筛选', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: '开始日期（YYYY-MM-DD）', example: '2025-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期（YYYY-MM-DD）', example: '2025-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
