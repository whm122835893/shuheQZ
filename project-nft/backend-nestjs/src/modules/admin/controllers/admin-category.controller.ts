// [管理后台-藏品分类管理模块] - AdminCategoryController
// 6 个端点：列表/创建/更新/软删除/切换启用状态/批量重排序
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { PaginationQueryDto } from '../../../common/dto/query.dto';
import { PaginatedResponse } from '../../../common/dto/response.interface';
import { NftCategory } from '../../../database/entities';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminCollectibleService } from '../services/admin-collectible.service';

@ApiTags('管理后台-藏品分类管理模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/categories')
@UseGuards(AdminJwtGuard)
export class AdminCategoryController {
  constructor(
    private readonly collectibleService: AdminCollectibleService,
  ) {}

  // 1. 分类列表（分页 + 搜索）
  @Get()
  @ApiOperation({
    summary: '分类列表',
    description: '分页查询分类，支持按名称搜索，默认返回全部（含禁用）以便切换启用/禁用',
  })
  async findList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftCategory>>> {
    const data = await this.collectibleService.findCategories(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 创建分类
  @Post()
  @ApiOperation({ summary: '创建分类', description: '创建藏品分类，code 自动生成' })
  async create(
    @Body() body: { name: string; sortOrder?: number },
  ): Promise<BaseResponseVo<NftCategory>> {
    const data = await this.collectibleService.createCategory(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  // 3. 批量重排序（静态路由，需在 :id 路由之前声明，避免 "reorder" 被 :id 捕获）
  @Put('reorder')
  @ApiOperation({ summary: '批量重排序', description: '批量更新分类排序' })
  async reorder(
    @Body() body: { items: Array<{ id: number; sortOrder: number }> },
  ): Promise<BaseResponseVo<{ updated: number }>> {
    const data = await this.collectibleService.reorderCategories(body.items);
    return BaseResponseVo.success(data, '重排序成功');
  }

  // 4. 更新分类
  @Put(':id')
  @ApiOperation({ summary: '更新分类', description: '更新分类可编辑字段' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; sortOrder?: number },
  ): Promise<BaseResponseVo<Partial<NftCategory> & { id: number }>> {
    const data = await this.collectibleService.updateCategory(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // 5. 软删除分类（设置 is_delete=1）
  @Delete(':id')
  @ApiOperation({
    summary: '删除分类',
    description: '软删除分类（设置 is_delete=1）',
  })
  async softDelete(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; isDelete: number }>> {
    const data = await this.collectibleService.deleteCategory(Number(id));
    return BaseResponseVo.success(data, '已删除');
  }

  // 6. 切换启用/禁用状态（切换 is_delete）
  @Put(':id/toggle')
  @ApiOperation({
    summary: '切换分类状态',
    description: '在启用(is_delete=0)与禁用(is_delete=1)之间切换',
  })
  async toggle(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; isDelete: number }>> {
    const data = await this.collectibleService.toggleCategory(Number(id));
    return BaseResponseVo.success(data, '状态已切换');
  }
}
