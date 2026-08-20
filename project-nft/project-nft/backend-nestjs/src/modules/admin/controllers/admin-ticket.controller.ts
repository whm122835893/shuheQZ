// [管理后台-工单管理模块] - AdminTicketController
// 8 个端点：工单列表、详情(含回复)、分派、回复、关闭、反馈列表、反馈详情、补偿
//
// 路由顺序注意：GET /feedbacks 与 GET /:id 同为单段路径，需先注册 /feedbacks
// 否则会被 /:id 以 id="feedbacks" 误匹配。
import {
  Body,
  Controller,
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
import { AdminTicketService } from '../services/admin-ticket.service';

@ApiTags('管理后台-工单管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/tickets')
@UseGuards(AdminJwtGuard)
export class AdminTicketController {
  constructor(private readonly adminTicketService: AdminTicketService) {}

  // ============================================================
  // 工单（注意：/feedbacks 路由需先于 /:id 注册）
  // ============================================================

  @Public()
  @Get()
  @ApiOperation({ summary: '工单分页列表', description: '按状态/优先级/类型/分派人筛选' })
  async getTicketList(@Query() query: Record<string, any>) {
    const data = await this.adminTicketService.getTicketList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('feedbacks')
  @ApiOperation({ summary: '用户反馈列表', description: '来源 nft_feedback' })
  async getFeedbackList(@Query() query: Record<string, any>) {
    const data = await this.adminTicketService.getFeedbackList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('feedbacks/:id')
  @ApiOperation({ summary: '反馈详情' })
  async getFeedbackDetail(@Param('id') id: string) {
    const data = await this.adminTicketService.getFeedbackDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '工单详情（含回复）' })
  async getTicketDetail(@Param('id') id: string) {
    const data = await this.adminTicketService.getTicketDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put(':id/assign')
  @ApiOperation({ summary: '分派工单给客服' })
  async assignTicket(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminTicketService.assignTicket(Number(id), body);
    return BaseResponseVo.success(data, '分派成功');
  }

  @Public()
  @Post(':id/reply')
  @ApiOperation({ summary: '回复工单', description: '创建回复并置为处理中' })
  async replyTicket(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminTicketService.replyTicket(
      Number(id),
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '回复成功');
  }

  @Public()
  @Put(':id/close')
  @ApiOperation({ summary: '关闭工单' })
  async closeTicket(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminTicketService.closeTicket(Number(id), body);
    return BaseResponseVo.success(data, '工单已关闭');
  }

  @Public()
  @Post(':id/compensate')
  @ApiOperation({ summary: '工单补偿', description: '创建审批 + 调整钱包余额 + 生成充值流水' })
  async compensate(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminTicketService.compensate(
      Number(id),
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '补偿已发放');
  }
}
