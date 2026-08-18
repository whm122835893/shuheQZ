// [管理后台-奖励管理模块] - AdminRewardController
// 4 个端点：奖励列表、创建奖励、奖励详情、更新奖励
//
// 守卫协作：
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有端点
//  - 每个端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
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
import { AdminRewardService } from '../services/admin-reward.service';

@ApiTags('管理后台-奖励管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/rewards')
@UseGuards(AdminJwtGuard)
export class AdminRewardController {
  constructor(private readonly adminRewardService: AdminRewardService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: '奖励配置列表',
    description: '分页查询，支持按 activityType / rewardType / status 筛选',
  })
  async getRewardList(@Query() query: Record<string, any>) {
    const data = await this.adminRewardService.getRewardList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post()
  @ApiOperation({ summary: '创建奖励配置', description: '记录 adminId 为创建者' })
  async createReward(@Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminRewardService.createReward(body, req.user);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '奖励详情' })
  async getRewardDetail(@Param('id') id: string) {
    const data = await this.adminRewardService.getRewardDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put(':id')
  @ApiOperation({ summary: '更新奖励配置' })
  async updateReward(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    const data = await this.adminRewardService.updateReward(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }
}
