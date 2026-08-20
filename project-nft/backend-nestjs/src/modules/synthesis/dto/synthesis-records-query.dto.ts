// [合成模块] - 合成记录查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SynthesisRecordsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按活动ID筛选', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  activity_id?: number;
}
