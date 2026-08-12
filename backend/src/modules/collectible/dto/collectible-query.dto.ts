// [藏品模块] - 藏品列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CollectibleQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '分类ID筛选', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  category_id?: number;

  @ApiPropertyOptional({ description: '名称关键词搜索', example: '千里江山' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({
    description: '发售状态：1=即将发售 2=发售中 3=已售罄',
    enum: [1, 2, 3],
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({
    description: '排序：price_asc=价格升序 price_desc=价格降序 newest=最新',
    enum: ['price_asc', 'price_desc', 'newest'],
    example: 'newest',
  })
  @IsString()
  @IsIn(['price_asc', 'price_desc', 'newest'])
  @IsOptional()
  sort?: string;
}
