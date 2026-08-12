// [公告新闻模块] - 端点 1 GET /announcements - 公告/新闻列表查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AnnouncementQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '类型筛选：notice=公告 news=新闻，不传则返回全部',
    enum: ['notice', 'news'],
    example: 'notice',
  })
  @IsString()
  @IsIn(['notice', 'news'])
  @IsOptional()
  type?: string;
}
