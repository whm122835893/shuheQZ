// [优先购模块] - 端点1 GET /priority-sales 优先购活动列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class PrioritySaleQueryDto {
  @ApiPropertyOptional({ description: '按藏品ID筛选', example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  collectible_id?: number;

  @ApiPropertyOptional({
    description: '活动状态：1=待开始 2=进行中 3=已结束，默认 2=进行中',
    enum: [1, 2, 3],
    default: 2,
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  status?: number;
}
