// [市场模块] - 我的挂单查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class MyListingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '挂单状态：1=寄售中 2=已售出 3=已取消，默认全部',
    enum: [1, 2, 3],
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  status?: number;
}
