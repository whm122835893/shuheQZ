// [管理后台-报表统计模块] - AdminReportController
// 6 个端点：销售报表、用户报表、藏品报表、盲盒报表、财务报表、自定义导出
//
// 守卫协作：
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有端点
//  - 每个端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminReportService } from '../services/admin-report.service';

@ApiTags('管理后台-报表统计模块')
@ApiBearerAuth()
@Controller('admin/api/v1/reports')
@UseGuards(AdminJwtGuard)
export class AdminReportController {
  constructor(private readonly adminReportService: AdminReportService) {}

  // ============================================================
  // 报表查询（5）
  // ============================================================

  @Public()
  @Get('sales')
  @ApiOperation({ summary: '销售报表', description: 'daily/weekly/monthly 订单聚合' })
  async getSalesReport(@Query() query: Record<string, any>) {
    const data = await this.adminReportService.getSalesReport(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('users')
  @ApiOperation({ summary: '用户报表', description: '注册趋势 + 活跃用户 + 总用户数' })
  async getUserReport(@Query() query: Record<string, any>) {
    const data = await this.adminReportService.getUserReport(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('collectibles')
  @ApiOperation({ summary: '藏品报表', description: '按藏品聚合销量，返回畅销榜' })
  async getCollectibleReport(@Query() query: Record<string, any>) {
    const data = await this.adminReportService.getCollectibleReport(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('blindboxes')
  @ApiOperation({ summary: '盲盒报表', description: '开盒记录 + 奖品分布' })
  async getBlindboxReport(@Query() query: Record<string, any>) {
    const data = await this.adminReportService.getBlindboxReport(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('finance')
  @ApiOperation({ summary: '财务报表', description: '营收 + 退款 + 手续费 + 净收入' })
  async getFinanceReport(@Query() query: Record<string, any>) {
    const data = await this.adminReportService.getFinanceReport(query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 自定义导出（1）
  // ============================================================

  @Public()
  @Post('custom-export')
  @ApiOperation({ summary: '自定义导出', description: '接受 config JSON，返回 CSV' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async customExport(@Body() body: Record<string, any>): Promise<string> {
    return this.adminReportService.customExport(body);
  }
}
