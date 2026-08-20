// [管理后台-内容管理模块] - AdminCmsController
// 18 个端点：轮播图(5) + 公告(5) + 合规文档(2) + 文物(4) + 页面装饰(2)
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminCmsService } from '../services/admin-cms.service';

@ApiTags('管理后台-内容管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/cms')
@UseGuards(AdminJwtGuard)
export class AdminCmsController {
  constructor(private readonly adminCmsService: AdminCmsService) {}

  // ============================================================
  // 轮播图（5）
  // ============================================================

  @Public()
  @Get('banners')
  @ApiOperation({ summary: '轮播图列表' })
  async getBannerList(@Query() query: Record<string, any>) {
    const data = await this.adminCmsService.getBannerList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('banners')
  @ApiOperation({ summary: '创建轮播图' })
  async createBanner(@Body() body: Record<string, any>) {
    const data = await this.adminCmsService.createBanner(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Put('banners/:id')
  @ApiOperation({ summary: '编辑轮播图' })
  async updateBanner(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminCmsService.updateBanner(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Delete('banners/:id')
  @ApiOperation({ summary: '删除轮播图' })
  async deleteBanner(@Param('id') id: string) {
    await this.adminCmsService.deleteBanner(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  @Public()
  @Put('banners/sort')
  @ApiOperation({ summary: '批量排序轮播图', description: 'body.items = [{ id, sortOrder }]' })
  async batchSortBanners(@Body() body: Record<string, any>) {
    const data = await this.adminCmsService.batchSortBanners(body);
    return BaseResponseVo.success(data, '排序成功');
  }

  // ============================================================
  // 公告（5）
  // ============================================================

  @Public()
  @Get('announcements')
  @ApiOperation({ summary: '公告列表' })
  async getAnnouncementList(@Query() query: Record<string, any>) {
    const data = await this.adminCmsService.getAnnouncementList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('announcements')
  @ApiOperation({ summary: '创建公告' })
  async createAnnouncement(@Body() body: Record<string, any>) {
    const data = await this.adminCmsService.createAnnouncement(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Put('announcements/:id')
  @ApiOperation({ summary: '编辑公告' })
  async updateAnnouncement(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminCmsService.updateAnnouncement(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Put('announcements/:id/publish')
  @ApiOperation({ summary: '发布/取消公告', description: '切换 is_delete 状态' })
  async togglePublishAnnouncement(@Param('id') id: string) {
    const data = await this.adminCmsService.togglePublishAnnouncement(Number(id));
    return BaseResponseVo.success(data, data.published ? '已发布' : '已取消发布');
  }

  @Public()
  @Delete('announcements/:id')
  @ApiOperation({ summary: '删除公告' })
  async deleteAnnouncement(@Param('id') id: string) {
    await this.adminCmsService.deleteAnnouncement(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  // ============================================================
  // 合规文档（2）
  // ============================================================

  @Public()
  @Get('agreements')
  @ApiOperation({ summary: '合规文档列表' })
  async getAgreementList(@Query() query: Record<string, any>) {
    const data = await this.adminCmsService.getAgreementList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('agreements/:id')
  @ApiOperation({ summary: '编辑合规文档' })
  async updateAgreement(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminCmsService.updateAgreement(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // ============================================================
  // 文物（4）
  // ============================================================

  @Public()
  @Get('artifacts')
  @ApiOperation({ summary: '文物列表' })
  async getArtifactList(@Query() query: Record<string, any>) {
    const data = await this.adminCmsService.getArtifactList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('artifacts')
  @ApiOperation({ summary: '创建文物' })
  async createArtifact(@Body() body: Record<string, any>) {
    const data = await this.adminCmsService.createArtifact(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Put('artifacts/:id')
  @ApiOperation({ summary: '编辑文物' })
  async updateArtifact(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminCmsService.updateArtifact(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Delete('artifacts/:id')
  @ApiOperation({ summary: '删除文物' })
  async deleteArtifact(@Param('id') id: string) {
    await this.adminCmsService.deleteArtifact(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  // ============================================================
  // 页面装饰（2）
  // ============================================================

  @Public()
  @Get('decoration')
  @ApiOperation({ summary: '获取页面装饰配置', description: "system_configs key='page_decoration'" })
  async getDecoration() {
    const data = await this.adminCmsService.getDecoration();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('decoration')
  @ApiOperation({ summary: '更新页面装饰配置' })
  async updateDecoration(@Body() body: Record<string, any>) {
    const data = await this.adminCmsService.updateDecoration(body);
    return BaseResponseVo.success(data, '更新成功');
  }
}
