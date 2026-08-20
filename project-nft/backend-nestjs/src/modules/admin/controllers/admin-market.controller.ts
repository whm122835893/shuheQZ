// [管理后台-市场管理模块] - AdminMarketController
// 7 个端点：寄售列表、强制下架、交易记录、价格异常预警、费用配置(读/写)、藏品寄售列表
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
import { AdminMarketService } from '../services/admin-market.service';

@ApiTags('管理后台-市场管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/market')
@UseGuards(AdminJwtGuard)
export class AdminMarketController {
  constructor(private readonly adminMarketService: AdminMarketService) {}

  // 1. 寄售列表
  @Public()
  @Get('listings')
  @ApiOperation({ summary: '寄售列表', description: '分页查询寄售列表，支持按状态/藏品/价格范围过滤' })
  async listings(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.findListings(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 强制下架
  @Public()
  @Put('listings/:id/delist')
  @ApiOperation({ summary: '强制下架', description: '管理员强制下架寄售商品，恢复用户藏品状态' })
  async delist(
    @Param('id') id: number,
    @Body() body: { reason?: string },
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.delistListing(Number(id), adminId, body.reason || '管理员强制下架');
    return BaseResponseVo.success(data, '已强制下架');
  }

  // 3. 交易记录
  @Public()
  @Get('trades')
  @ApiOperation({ summary: '交易记录', description: '查询已完成的市场交易记录（source=market, status=3）' })
  async trades(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.findTrades(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 4. 价格异常预警
  @Public()
  @Get('price-alerts')
  @ApiOperation({ summary: '价格异常预警', description: '查询价格显著偏离平均价格的寄售记录' })
  async priceAlerts(@Query() query: any): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.findPriceAlerts(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 5. 获取手续费配置
  @Public()
  @Get('fee-config')
  @ApiOperation({ summary: '获取手续费配置', description: '获取市场相关手续费配置（config_key LIKE market_%）' })
  async getFeeConfig(): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.getFeeConfig();
    return BaseResponseVo.success(data, 'success');
  }

  // 6. 更新手续费配置
  @Public()
  @Put('fee-config')
  @ApiOperation({ summary: '更新手续费配置', description: '更新市场相关手续费配置' })
  async updateFeeConfig(
    @Body() body: { items: Array<{ configKey: string; configValue: string; configDesc?: string }> },
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.updateFeeConfig(body.items || []);
    return BaseResponseVo.success(data, '配置已更新');
  }

  // 7. 藏品寄售列表
  @Public()
  @Get('collectibles/:id/listings')
  @ApiOperation({ summary: '藏品寄售列表', description: '获取指定藏品的全部寄售列表' })
  async collectibleListings(@Param('id') id: number): Promise<BaseResponseVo<any>> {
    const data = await this.adminMarketService.findCollectibleListings(Number(id));
    return BaseResponseVo.success(data, 'success');
  }
}
