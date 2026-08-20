// [管理后台-订单管理模块] - AdminOrderController
// 8 个端点：列表、详情、取消、标记已付、发起退款、异常订单、修复异常、导出CSV
import {
  Body,
  Controller,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminOrderService } from '../services/admin-order.service';

@ApiTags('管理后台-订单管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/orders')
@UseGuards(AdminJwtGuard)
export class AdminOrderController {
  constructor(private readonly adminOrderService: AdminOrderService) {}

  // 1. 分页订单列表
  @Public()
  @Get()
  @ApiOperation({ summary: '订单列表', description: '分页查询订单，支持按订单号搜索、按状态/来源/用户/日期过滤' })
  async list(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 订单详情
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '订单详情', description: '获取订单详情，含支付信息、用户信息、藏品信息' })
  async detail(@Param('id') id: number): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 3. 取消订单
  @Public()
  @Put(':id/cancel')
  @ApiOperation({ summary: '取消订单', description: '管理员取消待支付订单' })
  async cancel(
    @Param('id') id: number,
    @Body() body: { reason?: string },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.cancelOrder(Number(id), adminId, body.reason);
    return BaseResponseVo.success(data, '订单已取消');
  }

  // 4. 标记已支付
  @Public()
  @Put(':id/mark-paid')
  @ApiOperation({ summary: '标记已支付', description: '手动标记订单为已支付，创建支付记录并更新订单状态' })
  async markPaid(
    @Param('id') id: number,
    @Body() body: { paymentMethod?: string; remark?: string },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.markPaid(Number(id), adminId, body);
    return BaseResponseVo.success(data, '已标记为已支付');
  }

  // 5. 发起退款
  @Public()
  @Post(':id/refund')
  @ApiOperation({ summary: '发起退款', description: '为订单创建退款记录，状态为待审核(0)' })
  async refund(
    @Param('id') id: number,
    @Body() body: { reason: string; amount?: number },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.initiateRefund(Number(id), adminId, body);
    return BaseResponseVo.success(data, '退款申请已创建');
  }

  // 6. 异常订单列表
  @Public()
  @Get('abnormal/list')
  @ApiOperation({ summary: '异常订单', description: '查询异常订单：已过期未取消、已支付未完成' })
  async abnormal(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.findAbnormal(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 7. 修复异常订单
  @Public()
  @Post(':id/repair')
  @ApiOperation({ summary: '修复异常订单', description: '修复异常订单状态：过期未取消则取消，已支付未完成则完成' })
  async repair(
    @Param('id') id: number,
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminOrderService.repairOrder(Number(id), adminId);
    return BaseResponseVo.success(data, '订单已修复');
  }

  // 8. 导出订单（CSV）
  @Public()
  @Get('export/data')
  @ApiOperation({ summary: '导出订单', description: '导出订单列表为CSV格式' })
  async export(@Query() query: any): Promise<BaseResponseVo<string>> {
    const csv = await this.adminOrderService.exportOrders(query);
    return BaseResponseVo.success(csv, 'success');
  }
}
