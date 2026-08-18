// [抽奖模块] - 中奖记录查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class LuckyDrawRecordsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按活动ID筛选', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  activity_id?: number;

  @ApiPropertyOptional({
    description: '是否中奖筛选：true=仅中奖 false=仅未中奖 不传=全部',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === 'true' || value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === 'false' || value === false || value === 0 || value === '0') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  @IsOptional()
  is_win?: boolean;
}
