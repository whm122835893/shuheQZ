// [市场模块] - 市场在售列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class MarketQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按藏品ID筛选', example: 5 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  collectible_id?: number;

  @ApiPropertyOptional({ description: '最低价格', example: 50.0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  min_price?: number;

  @ApiPropertyOptional({ description: '最高价格', example: 500.0 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  max_price?: number;

  @ApiPropertyOptional({
    description: '排序：price_asc=价格升序 price_desc=价格降序 newest=最新挂出',
    enum: ['price_asc', 'price_desc', 'newest'],
    example: 'newest',
  })
  @IsString()
  @IsIn(['price_asc', 'price_desc', 'newest'])
  @IsOptional()
  sort?: string;
}
