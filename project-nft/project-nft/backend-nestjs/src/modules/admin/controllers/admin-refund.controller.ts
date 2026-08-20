// [管理后台-退款管理模块] - AdminRefundController
// 4 个端点：退款列表、详情、审批通过、审批拒绝
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
import { AdminRefundService } from '../services/admin-refund.service';

@ApiTags('管理后台-退款管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/refunds')
@UseGuards(AdminJwtGuard)
export class AdminRefundController {
  constructor(private readonly adminRefundService: AdminRefundService) {}

  // 1. 退款列表
  @Public()
  @Get()
  @ApiOperation({ summary: '退款列表', description: '分页查询退款记录，支持按状态/日期范围过滤' })
  async list(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminRefundService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 退款详情
  @Public()
  @Get(':id')
  @ApiOperation({ summary: '退款详情', description: '获取退款详情，含订单信息和支付信息' })
  async detail(@Param('id') id: number): Promise<BaseResponseVo<any>> {
    const data = await this.adminRefundService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 3. 审批通过
  @Public()
  @Put(':id/approve')
  @ApiOperation({ summary: '审批通过退款', description: '通过退款申请，退款金额退入用户钱包，状态变更为已退款(3)' })
  async approve(
    @Param('id') id: number,
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminRefundService.approve(Number(id), adminId);
    return BaseResponseVo.success(data, '退款已通过并处理');
  }

  // 4. 审批拒绝
  @Public()
  @Put(':id/reject')
  @ApiOperation({ summary: '拒绝退款', description: '拒绝退款申请，状态变更为已拒绝(2)' })
  async reject(
    @Param('id') id: number,
    @Body() body: { comment?: string },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminRefundService.reject(Number(id), adminId, body.comment);
    return BaseResponseVo.success(data, '退款已拒绝');
  }
}
