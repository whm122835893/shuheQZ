// [管理后台-营销活动模块] - AdminMarketingController
// 35 个端点，分为 7 大模块：优先购(10)、签到(3)、邀请(3)、抽奖(9)、合成(5)、空投(3)、注册奖励(2)
import {
  Body,
  Controller,
  Delete,
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
import { PaginationQueryDto } from '../../../common/dto/query.dto';
import { PaginatedResponse } from '../../../common/dto/response.interface';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  CreateAirdropDto,
  CreateInviteActivityDto,
  CreateLuckyDrawDto,
  CreatePrioritySaleDto,
  CreateSynthesisDto,
  AddLuckyDrawPrizeDto,
  UpdateLuckyDrawDto,
  UpdateLuckyDrawPrizeDto,
  UpdatePrioritySaleDto,
  UpdateSynthesisDto,
} from '../../../common/dto/admin-marketing.dto';
import {
  NftAirdropActivity,
  NftCheckInRecord,
  NftInviteActivity,
  NftInviteRecord,
  NftLuckyDrawActivity,
  NftLuckyDrawPrize,
  NftLuckyDrawRecord,
  NftLuckyDrawUserChance,
  NftPrioritySale,
  NftPrioritySaleWhitelist,
  NftSynthesisActivity,
  NftSynthesisMaterial,
  NftSynthesisRecord,
  NftSystemConfig,
} from '../../../database/entities';

import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminMarketingService } from '../services/admin-marketing.service';

@ApiTags('管理后台-营销活动模块')
@ApiBearerAuth()
@Controller('admin/api/v1/marketing')
@UseGuards(AdminJwtGuard)
export class AdminMarketingController {
  constructor(private readonly adminMarketingService: AdminMarketingService) {}

  // ============================================================
  // 优先购模块 (10 endpoints)
  // ============================================================

  // 1. 优先购列表
  @Public()
  @Get('priority')
  @ApiOperation({ summary: '优先购列表', description: '分页查询优先购活动列表' })
  async priorityList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftPrioritySale>>> {
    const data = await this.adminMarketingService.findPriorityList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 创建优先购
  @Public()
  @Post('priority')
  @ApiOperation({ summary: '创建优先购', description: '创建优先购活动' })
  async createPriority(
    @Body() body: CreatePrioritySaleDto,
  ): Promise<BaseResponseVo<NftPrioritySale>> {
    const data = await this.adminMarketingService.createPriority(body);
    return BaseResponseVo.success(data, '优先购活动已创建');
  }

  // 3. 编辑优先购
  @Public()
  @Put('priority/:id')
  @ApiOperation({ summary: '编辑优先购', description: '编辑优先购活动' })
  async updatePriority(
    @Param('id') id: number,
    @Body() body: UpdatePrioritySaleDto,
  ): Promise<BaseResponseVo<NftPrioritySale>> {
    const data = await this.adminMarketingService.updatePriority(Number(id), body);
    return BaseResponseVo.success(data, '优先购活动已更新');
  }

  // 4. 删除优先购
  @Public()
  @Delete('priority/:id')
  @ApiOperation({ summary: '删除优先购', description: '软删除优先购活动' })
  async deletePriority(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<{ deleted: boolean }>> {
    const data = await this.adminMarketingService.deletePriority(Number(id));
    return BaseResponseVo.success(data, '优先购活动已删除');
  }

  // 5. 优先购白名单列表
  @Public()
  @Get('priority/:id/whitelist')
  @ApiOperation({ summary: '优先购白名单', description: '分页查询优先购活动白名单' })
  async priorityWhitelist(
    @Param('id') id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftPrioritySaleWhitelist>>> {
    const data = await this.adminMarketingService.findPriorityWhitelist(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 6. 导入白名单
  @Public()
  @Post('priority/:id/whitelist/import')
  @ApiOperation({ summary: '导入白名单', description: '批量导入优先购白名单（JSON数组输入）' })
  async importPriorityWhitelist(
    @Param('id') id: number,
    @Body() body: { data: Array<{ userId: number; maxQuantity?: number }> },
  ): Promise<BaseResponseVo<{ imported: number }>> {
    const data = await this.adminMarketingService.importPriorityWhitelist(Number(id), body.data || []);
    return BaseResponseVo.success(data, '白名单导入完成');
  }

  // 7. 导出白名单
  @Public()
  @Get('priority/:id/whitelist/export')
  @ApiOperation({ summary: '导出白名单', description: '导出优先购白名单为CSV' })
  async exportPriorityWhitelist(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<string>> {
    const csv = await this.adminMarketingService.exportPriorityWhitelist(Number(id));
    return BaseResponseVo.success(csv, 'success');
  }

  // 8. 删除白名单条目
  @Public()
  @Delete('priority/:id/whitelist/:wid')
  @ApiOperation({ summary: '删除白名单条目', description: '删除指定白名单条目' })
  async deletePriorityWhitelistEntry(
    @Param('id') id: number,
    @Param('wid') wid: number,
  ): Promise<BaseResponseVo<{ deleted: boolean }>> {
    const data = await this.adminMarketingService.deletePriorityWhitelistEntry(Number(id), Number(wid));
    return BaseResponseVo.success(data, '白名单条目已删除');
  }

  // 9. 开始优先购
  @Public()
  @Put('priority/:id/start')
  @ApiOperation({ summary: '开始优先购', description: '启动优先购活动' })
  async startPriority(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<NftPrioritySale>> {
    const data = await this.adminMarketingService.startPriority(Number(id));
    return BaseResponseVo.success(data, '优先购活动已开始');
  }

  // 10. 结束优先购
  @Public()
  @Put('priority/:id/end')
  @ApiOperation({ summary: '结束优先购', description: '结束优先购活动' })
  async endPriority(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<NftPrioritySale>> {
    const data = await this.adminMarketingService.endPriority(Number(id));
    return BaseResponseVo.success(data, '优先购活动已结束');
  }

  // ============================================================
  // 签到模块 (3 endpoints)
  // ============================================================

  // 11. 获取签到配置
  @Public()
  @Get('checkin/config')
  @ApiOperation({ summary: '获取签到配置', description: '从系统配置中获取签到相关配置' })
  async getCheckinConfig(): Promise<BaseResponseVo<NftSystemConfig[]>> {
    const data = await this.adminMarketingService.getCheckinConfig();
    return BaseResponseVo.success(data, 'success');
  }

  // 12. 更新签到配置
  @Public()
  @Put('checkin/config')
  @ApiOperation({ summary: '更新签到配置', description: '更新签到相关系统配置' })
  async updateCheckinConfig(
    @Body() body: { items: Array<{ configKey: string; configValue: string; configDesc?: string }> },
  ): Promise<BaseResponseVo<NftSystemConfig[]>> {
    const data = await this.adminMarketingService.updateCheckinConfig(body.items || []);
    return BaseResponseVo.success(data, '签到配置已更新');
  }

  // 13. 签到记录列表
  @Public()
  @Get('checkin/records')
  @ApiOperation({ summary: '签到记录', description: '分页查询签到记录' })
  async checkinRecords(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftCheckInRecord>>> {
    const data = await this.adminMarketingService.findCheckinRecords(query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 邀请模块 (3 endpoints)
  // ============================================================

  // 14. 邀请活动列表
  @Public()
  @Get('invite/activities')
  @ApiOperation({ summary: '邀请活动列表', description: '分页查询邀请活动列表' })
  async inviteActivities(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftInviteActivity>>> {
    const data = await this.adminMarketingService.findInviteActivities(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 15. 创建邀请活动
  @Public()
  @Post('invite/activities')
  @ApiOperation({ summary: '创建邀请活动', description: '创建邀请活动' })
  async createInviteActivity(
    @Body() body: CreateInviteActivityDto,
  ): Promise<BaseResponseVo<NftInviteActivity>> {
    const data = await this.adminMarketingService.createInviteActivity(body);
    return BaseResponseVo.success(data, '邀请活动已创建');
  }

  // 16. 邀请记录列表
  @Public()
  @Get('invite/records')
  @ApiOperation({ summary: '邀请记录', description: '分页查询邀请记录' })
  async inviteRecords(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftInviteRecord>>> {
    const data = await this.adminMarketingService.findInviteRecords(query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 抽奖模块 (9 endpoints)
  // ============================================================

  // 17. 抽奖活动列表
  @Public()
  @Get('lucky-draw')
  @ApiOperation({ summary: '抽奖活动列表', description: '分页查询抽奖活动列表' })
  async luckyDrawList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftLuckyDrawActivity>>> {
    const data = await this.adminMarketingService.findLuckyDrawList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 18. 创建抽奖活动
  @Public()
  @Post('lucky-draw')
  @ApiOperation({ summary: '创建抽奖活动', description: '创建抽奖活动' })
  async createLuckyDraw(
    @Body() body: CreateLuckyDrawDto,
  ): Promise<BaseResponseVo<NftLuckyDrawActivity>> {
    const data = await this.adminMarketingService.createLuckyDraw(body);
    return BaseResponseVo.success(data, '抽奖活动已创建');
  }

  // 19. 编辑抽奖活动
  @Public()
  @Put('lucky-draw/:id')
  @ApiOperation({ summary: '编辑抽奖活动', description: '编辑抽奖活动' })
  async updateLuckyDraw(
    @Param('id') id: number,
    @Body() body: UpdateLuckyDrawDto,
  ): Promise<BaseResponseVo<NftLuckyDrawActivity>> {
    const data = await this.adminMarketingService.updateLuckyDraw(Number(id), body);
    return BaseResponseVo.success(data, '抽奖活动已更新');
  }

  // 20. 奖品列表
  @Public()
  @Get('lucky-draw/:id/prizes')
  @ApiOperation({ summary: '奖品列表', description: '查询抽奖活动的奖品列表' })
  async luckyDrawPrizes(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<NftLuckyDrawPrize[]>> {
    const data = await this.adminMarketingService.findLuckyDrawPrizes(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 21. 添加奖品
  @Public()
  @Post('lucky-draw/:id/prizes')
  @ApiOperation({ summary: '添加奖品', description: '为抽奖活动添加奖品' })
  async addLuckyDrawPrize(
    @Param('id') id: number,
    @Body() body: AddLuckyDrawPrizeDto,
  ): Promise<BaseResponseVo<NftLuckyDrawPrize>> {
    const data = await this.adminMarketingService.addLuckyDrawPrize(Number(id), body);
    return BaseResponseVo.success(data, '奖品已添加');
  }

  // 22. 编辑奖品
  @Public()
  @Put('lucky-draw/:id/prizes/:pid')
  @ApiOperation({ summary: '编辑奖品', description: '编辑抽奖活动奖品' })
  async updateLuckyDrawPrize(
    @Param('id') id: number,
    @Param('pid') pid: number,
    @Body() body: UpdateLuckyDrawPrizeDto,
  ): Promise<BaseResponseVo<NftLuckyDrawPrize>> {
    const data = await this.adminMarketingService.updateLuckyDrawPrize(Number(id), Number(pid), body);
    return BaseResponseVo.success(data, '奖品已更新');
  }

  // 23. 删除奖品
  @Public()
  @Delete('lucky-draw/:id/prizes/:pid')
  @ApiOperation({ summary: '删除奖品', description: '删除抽奖活动奖品' })
  async deleteLuckyDrawPrize(
    @Param('id') id: number,
    @Param('pid') pid: number,
  ): Promise<BaseResponseVo<{ deleted: boolean }>> {
    const data = await this.adminMarketingService.deleteLuckyDrawPrize(Number(id), Number(pid));
    return BaseResponseVo.success(data, '奖品已删除');
  }

  // 24. 抽奖记录列表
  @Public()
  @Get('lucky-draw/:id/records')
  @ApiOperation({ summary: '抽奖记录', description: '分页查询抽奖活动的抽奖记录' })
  async luckyDrawRecords(
    @Param('id') id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftLuckyDrawRecord>>> {
    const data = await this.adminMarketingService.findLuckyDrawRecords(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 25. 手动发放抽奖次数
  @Public()
  @Post('lucky-draw/:id/grant')
  @ApiOperation({ summary: '手动发放抽奖次数', description: '为指定用户手动发放抽奖次数' })
  async grantLuckyDrawChances(
    @Param('id') id: number,
    @Body() body: { userId: number; chances: number; source?: string },
  ): Promise<BaseResponseVo<NftLuckyDrawUserChance>> {
    const data = await this.adminMarketingService.grantLuckyDrawChances(Number(id), body);
    return BaseResponseVo.success(data, '抽奖次数已发放');
  }

  // ============================================================
  // 合成模块 (5 endpoints)
  // ============================================================

  // 26. 合成活动列表
  @Public()
  @Get('synthesis')
  @ApiOperation({ summary: '合成活动列表', description: '分页查询合成活动列表' })
  async synthesisList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftSynthesisActivity>>> {
    const data = await this.adminMarketingService.findSynthesisList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 27. 创建合成活动
  @Public()
  @Post('synthesis')
  @ApiOperation({ summary: '创建合成活动', description: '创建合成活动' })
  async createSynthesis(
    @Body() body: CreateSynthesisDto,
  ): Promise<BaseResponseVo<NftSynthesisActivity>> {
    const data = await this.adminMarketingService.createSynthesis(body);
    return BaseResponseVo.success(data, '合成活动已创建');
  }

  // 28. 编辑合成活动
  @Public()
  @Put('synthesis/:id')
  @ApiOperation({ summary: '编辑合成活动', description: '编辑合成活动' })
  async updateSynthesis(
    @Param('id') id: number,
    @Body() body: UpdateSynthesisDto,
  ): Promise<BaseResponseVo<NftSynthesisActivity>> {
    const data = await this.adminMarketingService.updateSynthesis(Number(id), body);
    return BaseResponseVo.success(data, '合成活动已更新');
  }

  // 29. 合成材料列表
  @Public()
  @Get('synthesis/:id/materials')
  @ApiOperation({ summary: '合成材料', description: '查询合成活动所需材料列表' })
  async synthesisMaterials(
    @Param('id') id: number,
  ): Promise<BaseResponseVo<NftSynthesisMaterial[]>> {
    const data = await this.adminMarketingService.findSynthesisMaterials(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 30. 合成记录列表
  @Public()
  @Get('synthesis/:id/records')
  @ApiOperation({ summary: '合成记录', description: '分页查询合成记录' })
  async synthesisRecords(
    @Param('id') id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftSynthesisRecord>>> {
    const data = await this.adminMarketingService.findSynthesisRecords(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 空投模块 (3 endpoints)
  // ============================================================

  // 31. 空投活动列表
  @Public()
  @Get('airdrop')
  @ApiOperation({ summary: '空投活动列表', description: '分页查询空投活动列表' })
  async airdropList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftAirdropActivity>>> {
    const data = await this.adminMarketingService.findAirdropList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 32. 创建空投活动
  @Public()
  @Post('airdrop')
  @ApiOperation({ summary: '创建空投活动', description: '创建空投活动' })
  async createAirdrop(
    @Body() body: CreateAirdropDto,
  ): Promise<BaseResponseVo<NftAirdropActivity>> {
    const data = await this.adminMarketingService.createAirdrop(body);
    return BaseResponseVo.success(data, '空投活动已创建');
  }

  // 33. 执行空投
  @Public()
  @Post('airdrop/:id/execute')
  @ApiOperation({ summary: '执行空投', description: '执行空投活动，向符合条件的用户发放藏品' })
  async executeAirdrop(
    @Param('id') id: number,
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<{ executed: number }>> {
    const data = await this.adminMarketingService.executeAirdrop(Number(id), adminId);
    return BaseResponseVo.success(data, '空投执行完成');
  }

  // ============================================================
  // 注册奖励模块 (2 endpoints)
  // ============================================================

  // 34. 获取注册奖励配置
  @Public()
  @Get('register/config')
  @ApiOperation({ summary: '获取注册奖励配置', description: '从系统配置中获取注册奖励相关配置' })
  async getRegisterConfig(): Promise<BaseResponseVo<NftSystemConfig[]>> {
    const data = await this.adminMarketingService.getRegisterConfig();
    return BaseResponseVo.success(data, 'success');
  }

  // 35. 更新注册奖励配置
  @Public()
  @Put('register/config')
  @ApiOperation({ summary: '更新注册奖励配置', description: '更新注册奖励相关系统配置' })
  async updateRegisterConfig(
    @Body() body: { items: Array<{ configKey: string; configValue: string; configDesc?: string }> },
  ): Promise<BaseResponseVo<NftSystemConfig[]>> {
    const data = await this.adminMarketingService.updateRegisterConfig(body.items || []);
    return BaseResponseVo.success(data, '注册奖励配置已更新');
  }
}
