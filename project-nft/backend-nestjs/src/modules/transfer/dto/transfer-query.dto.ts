// [转赠模块] - 5 GET /transfers - 转赠记录查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class TransferQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '方向：sent=我发出的 / received=我收到的，默认全部',
    enum: ['sent', 'received'],
    example: 'sent',
  })
  @IsOptional()
  @IsIn(['sent', 'received'])
  direction?: 'sent' | 'received';

  @ApiPropertyOptional({
    description: '转赠状态：1=待确认 2=已接受 3=已拒绝 4=已取消，默认全部',
    enum: [1, 2, 3, 4],
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4])
  @IsOptional()
  status?: number;
}
