// [管理后台-安全管理模块] - AdminSecurityController
// 15 个端点：黑名单(3) + 风险预警(3) + 安全事件(3) + 交易锁(2) + 审批(4)
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminSecurityService } from '../services/admin-security.service';

@ApiTags('管理后台-安全管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/security')
@UseGuards(AdminJwtGuard)
export class AdminSecurityController {
  constructor(private readonly adminSecurityService: AdminSecurityService) {}

  // ============================================================
  // 黑名单（3）
  // ============================================================

  @Public()
  @Get('blacklist')
  @ApiOperation({ summary: '黑名单分页列表' })
  async getBlacklist(@Query() query: Record<string, any>) {
    const data = await this.adminSecurityService.getBlacklist(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('blacklist')
  @ApiOperation({ summary: '加入黑名单' })
  async createBlacklist(@Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminSecurityService.createBlacklist(body, req.user);
    return BaseResponseVo.success(data, '加入黑名单成功');
  }

  @Public()
  @Delete('blacklist/:id')
  @ApiOperation({ summary: '移出黑名单' })
  async removeBlacklist(@Param('id') id: string) {
    await this.adminSecurityService.removeBlacklist(Number(id));
    return BaseResponseVo.success(null, '已移出黑名单');
  }

  // ============================================================
  // 风险预警（3）
  // ============================================================

  @Public()
  @Get('risk-alerts')
  @ApiOperation({ summary: '风险预警分页列表' })
  async getRiskAlertList(@Query() query: Record<string, any>) {
    const data = await this.adminSecurityService.getRiskAlertList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('risk-alerts/:id')
  @ApiOperation({ summary: '风险预警详情' })
  async getRiskAlertDetail(@Param('id') id: string) {
    const data = await this.adminSecurityService.getRiskAlertDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('risk-alerts/:id/handle')
  @ApiOperation({ summary: '处理风险预警', description: 'action: confirm / ignore / process' })
  async handleRiskAlert(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminSecurityService.handleRiskAlert(
      Number(id),
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '处理成功');
  }

  // ============================================================
  // 安全事件（3）
  // ============================================================

  @Public()
  @Get('events')
  @ApiOperation({ summary: '安全事件分页列表' })
  async getEventList(@Query() query: Record<string, any>) {
    const data = await this.adminSecurityService.getEventList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('events/:id')
  @ApiOperation({ summary: '安全事件详情' })
  async getEventDetail(@Param('id') id: string) {
    const data = await this.adminSecurityService.getEventDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('events/:id/handle')
  @ApiOperation({ summary: '处理安全事件' })
  async handleEvent(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminSecurityService.handleEvent(
      Number(id),
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '处理成功');
  }

  // ============================================================
  // 交易锁（2）—— 内存维护
  // ============================================================

  @Public()
  @Get('tx-locks')
  @ApiOperation({ summary: '交易锁列表', description: '进程内存维护，重启即清空' })
  async getTxLocks() {
    const data = await this.adminSecurityService.getTxLocks();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('tx-locks/:id/unlock')
  @ApiOperation({ summary: '解锁交易' })
  async unlockTx(@Param('id') id: string) {
    const data = await this.adminSecurityService.unlockTx(id);
    return BaseResponseVo.success(data, '已解锁');
  }

  // ============================================================
  // 审批工作流（4）
  // ============================================================

  @Public()
  @Get('approvals')
  @ApiOperation({ summary: '审批分页列表' })
  async getApprovalList(@Query() query: Record<string, any>) {
    const data = await this.adminSecurityService.getApprovalList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('approvals/:id')
  @ApiOperation({ summary: '审批详情' })
  async getApprovalDetail(@Param('id') id: string) {
    const data = await this.adminSecurityService.getApprovalDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('approvals/:id/approve')
  @ApiOperation({ summary: '审批通过' })
  async approve(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminSecurityService.approve(Number(id), body, req.user);
    return BaseResponseVo.success(data, '审批通过');
  }

  @Public()
  @Put('approvals/:id/reject')
  @ApiOperation({ summary: '审批拒绝' })
  async reject(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminSecurityService.reject(Number(id), body, req.user);
    return BaseResponseVo.success(data, '审批拒绝');
  }
}
