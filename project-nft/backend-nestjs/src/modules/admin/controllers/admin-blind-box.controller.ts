// [管理后台-盲盒管理模块] - AdminBlindBoxController
// 17 个端点：列表/创建/详情/编辑/盲盒项CRUD/发行/重新上架/强制售罄/销毁/
//           软删除/空投/恢复/开盒记录/销毁记录
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
  CreateBlindBoxDto,
  UpdateBlindBoxDto,
} from '../../../common/dto/admin-blind-box.dto';
import {
  NftAirdropRecord,
  NftApproval,
  NftBlindBox,
  NftBlindBoxItem,
  NftBlindBoxOpenRecord,
  NftCollectible,
  NftDestroyRecord,
} from '../../../database/entities';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { AdminBlindBoxService } from '../services/admin-blind-box.service';

@ApiTags('管理后台-盲盒管理模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/blindboxes')
@UseGuards(AdminJwtGuard)
export class AdminBlindBoxController {
  constructor(
    private readonly blindBoxService: AdminBlindBoxService,
  ) {}

  /** 从请求中获取当前管理员 */
  private getAdmin(req: Request): AuthenticatedAdmin {
    return req.user as AuthenticatedAdmin;
  }

  // 1. 盲盒列表（分页 + 搜索 + 过滤）
  @Get()
  @ApiOperation({
    summary: '盲盒列表',
    description: '分页查询，支持按名称搜索及状态/发行状态过滤',
  })
  async findList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftBlindBox>>> {
    const data = await this.blindBoxService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 创建盲盒
  @Post()
  @ApiOperation({
    summary: '创建盲盒',
    description: '可关联已有藏品或同时新建藏品',
  })
  async create(
    @Body() dto: CreateBlindBoxDto,
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftBlindBox>> {
    const data = await this.blindBoxService.create(dto, this.getAdmin(req));
    return BaseResponseVo.success(data, '创建成功');
  }

  // 3. 盲盒详情（含藏品与盲盒项）
  @Get(':id')
  @ApiOperation({
    summary: '盲盒详情',
    description: '含关联藏品信息及盲盒项列表',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftBlindBox & { items: NftBlindBoxItem[] }>> {
    const data = await this.blindBoxService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 4. 编辑盲盒（更新底层藏品商品属性）
  @Put(':id')
  @ApiOperation({
    summary: '编辑盲盒',
    description: '更新盲盒底层藏品的商品属性字段',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBlindBoxDto,
    @Req() req: Request,
  ): Promise<BaseResponseVo<Partial<NftCollectible> & { id: number; collectibleId: number }>> {
    const data = await this.blindBoxService.update(
      Number(id),
      dto,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '更新成功');
  }

  // 5. 盲盒项列表
  @Get(':id/items')
  @ApiOperation({
    summary: '盲盒项列表',
    description: '查询盲盒下所有奖品项',
  })
  async getItems(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftBlindBoxItem[]>> {
    const data = await this.blindBoxService.getItems(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 6. 新增盲盒项
  @Post(':id/items')
  @ApiOperation({
    summary: '新增盲盒项',
    description: '为盲盒添加奖品藏品，设置概率与数量限制',
  })
  async addItem(
    @Param('id') id: string,
    @Body()
    body: { collectibleId: number; probability: number; quantityLimit?: number },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftBlindBoxItem>> {
    const data = await this.blindBoxService.addItem(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '盲盒项已添加');
  }

  // 7. 编辑盲盒项
  @Put(':id/items/:itemId')
  @ApiOperation({
    summary: '编辑盲盒项',
    description: '更新盲盒项的概率与数量限制',
  })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: { probability?: number; quantityLimit?: number },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; probability?: number; quantityLimit?: number }>> {
    const data = await this.blindBoxService.updateItem(
      Number(id),
      Number(itemId),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '盲盒项已更新');
  }

  // 8. 删除盲盒项
  @Delete(':id/items/:itemId')
  @ApiOperation({
    summary: '删除盲盒项',
    description: '软删除盲盒项',
  })
  async deleteItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isDelete: number }>> {
    const data = await this.blindBoxService.deleteItem(
      Number(id),
      Number(itemId),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '盲盒项已删除');
  }

  // 9. 发行盲盒
  @Put(':id/release')
  @ApiOperation({
    summary: '发行盲盒',
    description: '设置底层藏品 is_release=1, status=1',
  })
  async release(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isRelease: number; status: number; releaseDate: Date }>> {
    const data = await this.blindBoxService.release(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已发行');
  }

  // 10. 重新上架
  @Put(':id/relist')
  @ApiOperation({
    summary: '重新上架',
    description: '将盲盒重新上架销售',
  })
  async relist(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number; onsaleAt: Date }>> {
    const data = await this.blindBoxService.relist(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已重新上架');
  }

  // 11. 强制售罄
  @Put(':id/force-soldout')
  @ApiOperation({
    summary: '强制售罄',
    description: '将盲盒状态置为售罄',
  })
  async forceSoldout(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number; offSaleAt: Date }>> {
    const data = await this.blindBoxService.forceSoldout(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已强制售罄');
  }

  // 12. 销毁盲盒库存
  @Post(':id/destroy')
  @ApiOperation({
    summary: '销毁盲盒库存',
    description: '销毁指定用户的盲盒底层藏品并记录',
  })
  async destroy(
    @Param('id') id: string,
    @Body() body: { userCollectibleId: number; userId: number; reason: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftDestroyRecord>> {
    const data = await this.blindBoxService.destroy(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已销毁');
  }

  // 13. 软删除盲盒
  @Delete(':id')
  @ApiOperation({
    summary: '删除盲盒',
    description: '软删除盲盒记录',
  })
  async softDelete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; isDelete: number }>> {
    const data = await this.blindBoxService.softDelete(
      Number(id),
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已删除');
  }

  // 14. 空投盲盒
  @Post(':id/airdrop')
  @ApiOperation({
    summary: '空投盲盒',
    description: '向指定用户空投盲盒底层藏品',
  })
  async airdrop(
    @Param('id') id: string,
    @Body() body: { activityId: number; userIds: number[]; quantity?: number },
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ count: number; records: NftAirdropRecord[] }>> {
    const data = await this.blindBoxService.airdrop(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '空投成功');
  }

  // 15. 恢复盲盒（创建审批记录）
  @Post(':id/recover')
  @ApiOperation({
    summary: '恢复盲盒',
    description: '为用户发起盲盒恢复审批，审批通过后执行',
  })
  async recover(
    @Param('id') id: string,
    @Body() body: { openRecordId: number; userId?: number; reason?: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftApproval>> {
    const data = await this.blindBoxService.recover(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已创建恢复盲盒审批');
  }

  // 16. 开盒记录
  @Get(':id/open-records')
  @ApiOperation({
    summary: '开盒记录',
    description: '分页查询盲盒开盒记录',
  })
  async getOpenRecords(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftBlindBoxOpenRecord>>> {
    const data = await this.blindBoxService.getOpenRecords(
      Number(id),
      query,
    );
    return BaseResponseVo.success(data, 'success');
  }

  // 17. 销毁记录
  @Get(':id/destroy-records')
  @ApiOperation({
    summary: '销毁记录',
    description: '分页查询盲盒库存销毁记录',
  })
  async getDestroyRecords(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftDestroyRecord>>> {
    const data = await this.blindBoxService.getDestroyRecords(
      Number(id),
      query,
    );
    return BaseResponseVo.success(data, 'success');
  }
}
