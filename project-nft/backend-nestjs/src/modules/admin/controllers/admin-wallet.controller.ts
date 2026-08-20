// [管理后台-钱包管理模块] - AdminWalletController
// 9 个端点：平台余额概览、冻结统计、充值记录、充值审核、流水查询、
//          手续费统计、资金守恒、异常交易、手动调账
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
import { AdminWalletService } from '../services/admin-wallet.service';

@ApiTags('管理后台-钱包管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/wallet')
@UseGuards(AdminJwtGuard)
export class AdminWalletController {
  constructor(private readonly adminWalletService: AdminWalletService) {}

  @Public()
  @Get('balance')
  @ApiOperation({ summary: '平台余额概览', description: '聚合所有用户钱包的余额/冻结/累计充值/累计消费' })
  async getBalanceOverview() {
    const data = await this.adminWalletService.getBalanceOverview();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('frozen')
  @ApiOperation({ summary: '冻结余额统计' })
  async getFrozenStats() {
    const data = await this.adminWalletService.getFrozenStats();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('recharges')
  @ApiOperation({ summary: '充值记录', description: "wallet_transactions where type='recharge'" })
  async getRechargeList(@Query() query: Record<string, any>) {
    const data = await this.adminWalletService.getRechargeList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('recharge/:id/audit')
  @ApiOperation({ summary: '充值审核', description: 'approve 通过 / reject 驳回冲正' })
  async auditRecharge(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    const data = await this.adminWalletService.auditRecharge(
      Number(id),
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '审核完成');
  }

  @Public()
  @Get('transactions')
  @ApiOperation({ summary: '钱包流水列表', description: '分页 + 多条件筛选' })
  async getTransactionList(@Query() query: Record<string, any>) {
    const data = await this.adminWalletService.getTransactionList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('fee-stats')
  @ApiOperation({ summary: '手续费统计', description: '订单成交额 + 市场交易额 + 估算手续费' })
  async getFeeStats(@Query() query: Record<string, any>) {
    const data = await this.adminWalletService.getFeeStats(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('conservation')
  @ApiOperation({ summary: '资金守恒校验', description: 'total_recharged - total_consumed - current_balance 应为 0' })
  async getConservation() {
    const data = await this.adminWalletService.getConservation();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('abnormal')
  @ApiOperation({ summary: '异常交易', description: '金额<=0 或 余额为负' })
  async getAbnormalList(@Query() query: Record<string, any>) {
    const data = await this.adminWalletService.getAbnormalList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('adjust')
  @ApiOperation({ summary: '手动调账', description: '创建审批记录并即时调整钱包余额' })
  async adjust(@Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminWalletService.adjust(body, req.user);
    return BaseResponseVo.success(data, '调账成功');
  }
}
