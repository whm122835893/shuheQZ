// [文物展馆模块] - 1 GET /artifacts 文物展品列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ArtifactQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '按朝代筛选', example: '唐代' })
  @IsString()
  @IsOptional()
  dynasty?: string;

  @ApiPropertyOptional({ description: '按分类筛选', example: '瓷器' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: '名称关键词（模糊搜索 name 字段）', example: '青花' })
  @IsString()
  @IsOptional()
  keyword?: string;
}
