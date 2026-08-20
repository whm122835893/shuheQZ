// [管理后台-藏品管理模块] - AdminCollectibleController
// 19 个端点：列表/创建/详情/编辑/发行/配额/重新上架/强制售罄/切换状态/销毁/软删除/
//           空投/寄售开关/价格管控/资格配置/资格白名单/优先购配置/优先购白名单/审计日志
//
// 守卫协作：
//  - 类级 @Public() 跳过全局 JwtAuthGuard（用户端认证）
//  - 类级 @UseGuards(AdminJwtGuard) 保护所有管理后台端点
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
import { Request } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { PaginationQueryDto } from '../../../common/dto/query.dto';
import { PaginatedResponse } from '../../../common/dto/response.interface';
import {
  CreateCollectibleDto,
  UpdateCollectibleDto,
} from '../../../common/dto/admin-collectible.dto';
import {
  NftAirdropRecord,
  NftCategory,
  NftCollectible,
  NftDestroyRecord,
  NftInventoryQuota,
  NftOperationLog,
  NftPrioritySale,
  NftPrioritySaleWhitelist,
  NftQualificationConfig,
  NftQualificationWhitelist,
} from '../../../database/entities';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { AdminCollectibleService } from '../services/admin-collectible.service';

@ApiTags('管理后台-藏品管理模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/collectibles')
@UseGuards(AdminJwtGuard)
export class AdminCollectibleController {
  constructor(
    private readonly collectibleService: AdminCollectibleService,
  ) {}

  /** 从请求中获取当前管理员 */
  private getAdmin(req: Request): AuthenticatedAdmin {
    return req.user as AuthenticatedAdmin;
  }

  // 1. 藏品列表（分页 + 搜索 + 过滤）
  @Get()
  @ApiOperation({ summary: '藏品列表', description: '分页查询，支持按名称搜索及分类/状态/发行状态过滤' })
  async findList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftCollectible>>> {
    const data = await this.collectibleService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 创建藏品
  @Post()
  @ApiOperation({ summary: '创建藏品', description: '创建藏品记录，可附带库存配额' })
  async create(
    @Body() dto: CreateCollectibleDto,
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftCollectible>> {
    const data = await this.collectibleService.create(dto, this.getAdmin(req));
    return BaseResponseVo.success(data, '创建成功');
  }

  // 3. 藏品详情
  @Get(':id')
  @ApiOperation({ summary: '藏品详情', description: '含分类与库存配额信息' })
  async findOne(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftCollectible & { category: NftCategory | null; quota: NftInventoryQuota | null }>> {
    const data = await this.collectibleService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 4. 编辑藏品
  @Put(':id')
  @ApiOperation({ summary: '编辑藏品', description: '更新藏品可编辑字段' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCollectibleDto,
    @Req() req: Request,
  ): Promise<BaseResponseVo<Partial<NftCollectible> & { id: number }>> {
    const data = await this.collectibleService.update(
      Number(id),
      dto,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '更新成功');
  }

  // 5. 发行 / 发布藏品
  @Put(':id/release')
  @ApiOperation({ summary: '发行藏品', description: '设置 is_release=1, status=1' })
  async release(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isRelease: number; status: number; releaseDate: Date }>> {
    const data = await this.collectibleService.release(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已发行');
  }

  // 6. 库存配额列表
  @Get(':id/quotas')
  @ApiOperation({ summary: '库存配额', description: '查询该藏品的库存配额' })
  async getQuotas(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftInventoryQuota[]>> {
    const data = await this.collectibleService.getQuotas(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 7. 重新上架
  @Put(':id/relist')
  @ApiOperation({ summary: '重新上架', description: '重新上架藏品' })
  async relist(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number; onsaleAt: Date }>> {
    const data = await this.collectibleService.relist(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已重新上架');
  }

  // 8. 强制售罄
  @Put(':id/force-soldout')
  @ApiOperation({ summary: '强制售罄', description: '将藏品状态置为售罄' })
  async forceSoldout(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number; offSaleAt: Date }>> {
    const data = await this.collectibleService.forceSoldout(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已强制售罄');
  }

  // 8.5. 切换藏品上下架状态
  @Put(':id/toggle-status')
  @ApiOperation({ summary: '切换藏品状态', description: '在 status=1(上架) 和 status=0(下架) 之间切换' })
  async toggleStatus(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number }>> {
    const data = await this.collectibleService.toggleStatus(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '状态已切换');
  }

  // 9. 销毁库存
  @Post(':id/destroy')
  @ApiOperation({ summary: '销毁库存', description: '销毁指定用户藏品并记录' })
  async destroy(
    @Param('id') id: string,
    @Body() body: { userCollectibleId: number; userId: number; reason: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftDestroyRecord>> {
    const data = await this.collectibleService.destroy(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已销毁');
  }

  // 10. 软删除藏品
  @Delete(':id')
  @ApiOperation({ summary: '删除藏品', description: '软删除藏品' })
  async softDelete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isDelete: number }>> {
    const data = await this.collectibleService.softDelete(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已删除');
  }

  // 11. 空投藏品
  @Post(':id/airdrop')
  @ApiOperation({ summary: '空投藏品', description: '向指定用户空投藏品' })
  async airdrop(
    @Param('id') id: string,
    @Body() body: { activityId: number; userIds: number[]; quantity?: number },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ count: number; records: NftAirdropRecord[] }>> {
    const data = await this.collectibleService.airdrop(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '空投成功');
  }

  // 12. 寄售开关
  @Put(':id/resale-toggle')
  @ApiOperation({ summary: '寄售开关', description: '切换藏品可寄售/流转状态' })
  async resaleToggle(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isTransferable: number }>> {
    const data = await this.collectibleService.resaleToggle(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已切换寄售状态');
  }

  // 13. 价格管控
  @Put(':id/price-control')
  @ApiOperation({
    summary: '价格管控',
    description: '设置寄售价格上下限（记录到操作日志）',
  })
  async priceControl(
    @Param('id') id: string,
    @Body() body: { minResalePrice: number; maxResalePrice: number },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; minResalePrice: number; maxResalePrice: number }>> {
    const data = await this.collectibleService.priceControl(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '价格管控已设置');
  }

  // 14. 创建资格配置
  @Post(':id/qualification/config')
  @ApiOperation({ summary: '创建资格配置', description: '为藏品创建优先购/活动资格配置' })
  async createQualificationConfig(
    @Param('id') id: string,
    @Body() body: { name: string; activityType?: string; rules?: Record<string, unknown> },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftQualificationConfig>> {
    const data = await this.collectibleService.createQualificationConfig(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '资格配置已创建');
  }

  // 15. 导入资格白名单
  @Post(':id/qualification/whitelist')
  @ApiOperation({
    summary: '导入资格白名单',
    description: '批量导入资格白名单（JSON/CSV 解析后的 userIds）',
  })
  async importQualificationWhitelist(
    @Param('id') id: string,
    @Body() body: { configId: number; userIds: number[]; remark?: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ imported: number; skipped: number; records: NftQualificationWhitelist[] }>> {
    const data = await this.collectibleService.importQualificationWhitelist(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '资格白名单导入完成');
  }

  // 16. 创建优先购配置
  @Post(':id/priority-sale/config')
  @ApiOperation({ summary: '创建优先购配置', description: '为藏品创建优先购活动' })
  async createPrioritySaleConfig(
    @Param('id') id: string,
    @Body() body: { name: string; startTime: string; endTime: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftPrioritySale>> {
    const data = await this.collectibleService.createPrioritySaleConfig(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '优先购配置已创建');
  }

  // 17. 导入优先购白名单
  @Post(':id/priority-sale/whitelist')
  @ApiOperation({ summary: '导入优先购白名单', description: '批量导入优先购白名单' })
  async importPrioritySaleWhitelist(
    @Param('id') id: string,
    @Body()
    body: {
      prioritySaleId: number;
      entries: Array<{ userId: number; maxQuantity?: number }>;
    },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ imported: number; skipped: number; records: NftPrioritySaleWhitelist[] }>> {
    const data = await this.collectibleService.importPrioritySaleWhitelist(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '优先购白名单导入完成');
  }

  // 18. 操作审计日志
  @Get(':id/audit')
  @ApiOperation({ summary: '操作审计日志', description: '查询该藏品的操作日志' })
  async getAudit(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftOperationLog>>> {
    const data = await this.collectibleService.getAudit(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 19. 空投记录列表
  @Get(':id/airdrop-records')
  @ApiOperation({ summary: '空投记录', description: '分页查询该藏品的空投记录' })
  async getAirdropRecords(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftAirdropRecord>>> {
    const data = await this.collectibleService.getAirdropRecords(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 20. 销毁记录列表
  @Get(':id/destroy-records')
  @ApiOperation({ summary: '销毁记录', description: '分页查询该藏品的销毁记录' })
  async getDestroyRecords(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftDestroyRecord>>> {
    const data = await this.collectibleService.getDestroyRecords(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }
}
