// [支付模块] - 端点 1 GET /orders - 我的订单列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class OrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '订单状态：1=待支付 2=已完成 3=已取消，默认全部',
    enum: [1, 2, 3],
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  status?: number;

  @ApiPropertyOptional({
    description: '订单来源：release=发售购买 market=市场购买，默认全部',
    enum: ['release', 'market'],
    example: 'release',
  })
  @IsString()
  @IsIn(['release', 'market'])
  @IsOptional()
  source?: string;
}
