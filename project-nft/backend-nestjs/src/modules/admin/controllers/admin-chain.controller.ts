// [管理后台-链上管理模块] - AdminChainController
// 12 个端点：渠道 CRUD + 启停(6) + 藏品上链状态(1) + 批量铸造(2) +
//            离线标识生成(1) + 任务列表/详情/重试(3)
//
// 路由顺序注意：
//  - /collectibles、/mint、/mint/retroactive、/offchain/random、/tasks 均为固定路径
//    需先于 /:id 注册，否则会被 /:id 以 id="collectibles" 等误匹配。
//
// 守卫协作：
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有端点
//  - 每个端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminChainService } from '../services/admin-chain.service';

@ApiTags('管理后台-链上管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/chain')
@UseGuards(AdminJwtGuard)
export class AdminChainController {
  constructor(private readonly adminChainService: AdminChainService) {}

  // ============================================================
  // 渠道管理（6）
  // ============================================================

  @Public()
  @Get('channels')
  @ApiOperation({ summary: '渠道列表', description: '分页查询，支持按链类型/状态/关键词筛选' })
  async getChannelList(@Query() query: Record<string, any>) {
    const data = await this.adminChainService.getChannelList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('channels')
  @ApiOperation({ summary: '创建渠道' })
  async createChannel(@Body() body: Record<string, any>) {
    const data = await this.adminChainService.createChannel(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Put('channels/:id')
  @ApiOperation({ summary: '编辑渠道' })
  async updateChannel(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminChainService.updateChannel(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Delete('channels/:id')
  @ApiOperation({ summary: '删除渠道', description: '软删除' })
  async deleteChannel(@Param('id') id: string) {
    await this.adminChainService.deleteChannel(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  @Public()
  @Patch('channels/:id/toggle')
  @ApiOperation({ summary: '启用/停用渠道' })
  async toggleChannel(@Param('id') id: string) {
    const data = await this.adminChainService.toggleChannel(Number(id));
    return BaseResponseVo.success(data, '切换成功');
  }

  // ============================================================
  // 藏品上链状态（1）
  // ============================================================

  @Public()
  @Get('collectibles')
  @ApiOperation({ summary: '藏品上链状态列表', description: '分页 + 按上链状态筛选' })
  async getCollectibleOnchainList(@Query() query: Record<string, any>) {
    const data = await this.adminChainService.getCollectibleOnchainList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 批量铸造（2）
  // ============================================================

  @Public()
  @Post('mint')
  @ApiOperation({ summary: '批量铸造', description: '为用户藏品创建上链任务' })
  async batchMint(@Body() body: Record<string, any>) {
    const data = await this.adminChainService.batchMint(body);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('mint/retroactive')
  @ApiOperation({ summary: '追溯铸造', description: '为历史未上链藏品批量创建任务' })
  async retroactiveMint(@Body() body: Record<string, any>) {
    const data = await this.adminChainService.retroactiveMint(body);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 离线标识生成（1）
  // ============================================================

  @Public()
  @Post('offchain/random')
  @ApiOperation({ summary: '离线标识生成', description: '为 tokenId 为空的用户藏品生成随机标识' })
  async generateOffchainIdentifiers(@Body() body: Record<string, any>) {
    const data = await this.adminChainService.generateOffchainIdentifiers(body);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 上链任务管理（3）
  // ============================================================

  @Public()
  @Get('tasks')
  @ApiOperation({ summary: '上链任务列表', description: '分页 + 按渠道/类型/状态/目标筛选' })
  async getTaskList(@Query() query: Record<string, any>) {
    const data = await this.adminChainService.getTaskList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('tasks/:id')
  @ApiOperation({ summary: '任务详情' })
  async getTaskDetail(@Param('id') id: string) {
    const data = await this.adminChainService.getTaskDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('tasks/:id/retry')
  @ApiOperation({ summary: '重试失败任务', description: '仅失败任务可重试，且不超过 maxRetry' })
  async retryTask(@Param('id') id: string) {
    const data = await this.adminChainService.retryTask(Number(id));
    return BaseResponseVo.success(data, '重试已触发');
  }
}
