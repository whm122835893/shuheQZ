// [公告新闻模块] - 公告新闻控制器
// 3 个端点（全部公开，无 JWT）：
//   1. GET /announcements        公告/新闻列表
//   2. GET /announcements/:id    公告/新闻详情
//   3. GET /banners              首页轮播图
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { AnnouncementService } from './announcement.service';
import { AnnouncementQueryDto } from './dto/announcement-query.dto';

@ApiTags('公告新闻模块')
@Controller()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Public()
  @Get('announcements')
  @ApiOperation({ summary: '公告/新闻列表' })
  getListings(@Query() query: AnnouncementQueryDto) {
    return this.announcementService.getListings(query);
  }

  @Public()
  @Get('announcements/:id')
  @ApiOperation({ summary: '公告/新闻详情' })
  getDetail(@Param('id', new ParseIntWithDefaultPipe(0)) id: number) {
    return this.announcementService.getDetail(id);
  }

  @Public()
  @Get('banners')
  @ApiOperation({ summary: '首页轮播图' })
  getBanners() {
    return this.announcementService.getBanners();
  }
}
