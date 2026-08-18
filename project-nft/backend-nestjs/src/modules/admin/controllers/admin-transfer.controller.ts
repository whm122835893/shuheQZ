// [管理后台-转赠管理模块] - AdminTransferController
// 6 个端点：转赠列表、详情、撤销、取消、统计、异常转赠
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminTransferService } from '../services/admin-transfer.service';

@ApiTags('管理后台-转赠管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/transfers')
@UseGuards(AdminJwtGuard)
export class AdminTransferController {
  constructor(private readonly adminTransferService: AdminTransferService) {}

  // 1. 转赠列表
  @Public()
  @Get()
  @ApiOperation({ summary: '转赠列表', description: '分页查询转赠记录，支持按状态/转出人/转入人/日期范围过滤' })
  async list(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 转赠详情
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '转赠详情', description: '获取转赠详情，含转出/转入用户信息、藏品信息' })
  async detail(@Param('id') id: number): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 3. 撤销转赠
  @Public()
  @Put(':id/revoke')
  @ApiOperation({ summary: '撤销转赠', description: '管理员撤销已完成的转赠，创建审批记录并将藏品所有权转回原用户' })
  async revoke(
    @Param('id') id: number,
    @Body() body: { reason?: string },
    @CurrentUser('id') adminId: number,
    @CurrentUser('username') adminName: string,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.revoke(Number(id), adminId, adminName || 'admin', body.reason || '管理员撤销');
    return BaseResponseVo.success(data, '转赠已撤销');
  }

  // 4. 取消转赠
  @Public()
  @Put(':id/cancel')
  @ApiOperation({ summary: '取消转赠', description: '取消待确认的转赠，恢复用户藏品状态' })
  async cancel(
    @Param('id') id: number,
    @Body() body: { reason?: string },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.cancel(Number(id), adminId, body.reason || '管理员取消');
    return BaseResponseVo.success(data, '转赠已取消');
  }

  // 5. 转赠统计
  @Public()
  @Get('stats/overview')
  @ApiOperation({ summary: '转赠统计', description: '转赠总数、按状态分组、按日期分组统计' })
  async stats(): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.getStats();
    return BaseResponseVo.success(data, 'success');
  }

  // 6. 异常转赠
  @Public()
  @Get('abnormal/list')
  @ApiOperation({ summary: '异常转赠', description: '查询同一用户对之间高频转赠记录' })
  async abnormal(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminTransferService.findAbnormal(query);
    return BaseResponseVo.success(data, 'success');
  }
}
