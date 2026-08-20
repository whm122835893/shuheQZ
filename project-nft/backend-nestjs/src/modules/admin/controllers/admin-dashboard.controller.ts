// [管理后台-仪表盘模块] - AdminDashboardController
// 6 个端点：核心指标、财务概览、告警概览、活动概览、趋势数据、优先购统计
//
// 守卫协作：
//  - 类级 @Public() 跳过全局 JwtAuthGuard（用户端认证）
//  - 类级 @UseGuards(AdminJwtGuard) 保护所有管理后台端点
import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('管理后台-仪表盘模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/dashboard')
@UseGuards(AdminJwtGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  // 1. 核心指标
  @Get('metrics')
  @ApiOperation({
    summary: '核心指标',
    description:
      '总用户数、总藏品数、总订单数、总 GMV、今日新增用户、今日订单、今日收入',
  })
  async getMetrics(): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getMetrics();
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 财务概览
  @Get('finance')
  @ApiOperation({
    summary: '财务概览',
    description: '总收入、总退款、平台余额（所有用户钱包余额合计）',
  })
  async getFinance(): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getFinance();
    return BaseResponseVo.success(data, 'success');
  }

  // 3. 告警概览
  @Get('alerts')
  @ApiOperation({
    summary: '告警概览',
    description: '待处理风险预警数、待审批数、待处理工单数',
  })
  async getAlerts(): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getAlerts();
    return BaseResponseVo.success(data, 'success');
  }

  // 4. 活动概览
  @Get('activities')
  @ApiOperation({
    summary: '活动概览',
    description: '进行中的抽奖、合成、空投、邀请活动数量',
  })
  async getActivities(): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getActivities();
    return BaseResponseVo.success(data, 'success');
  }

  // 5. 趋势数据
  @Get('trends')
  @ApiOperation({
    summary: '趋势数据',
    description: '最近 7/30 天每日新增用户与订单数',
  })
  @ApiQuery({
    name: 'days',
    description: '天数，可选 7 或 30，默认 7',
    required: false,
    type: Number,
  })
  async getTrends(
    @Query('days') days: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getTrends(Number(days) || 7);
    return BaseResponseVo.success(data, 'success');
  }

  // 6. 优先购统计
  @Get('priority-stats')
  @ApiOperation({
    summary: '优先购统计',
    description: '进行中的优先购活动数、白名单总数、转化率',
  })
  async getPriorityStats(): Promise<BaseResponseVo<any>> {
    const data = await this.dashboardService.getPriorityStats();
    return BaseResponseVo.success(data, 'success');
  }
}
