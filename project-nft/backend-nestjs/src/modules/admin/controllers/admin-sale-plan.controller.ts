// [管理后台-发售计划控制器] - AdminSalePlanController
// 发售计划 CRUD、上架开售、下架、删除
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
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { AdminSalePlanService } from '../services/admin-sale-plan.service';

@ApiTags('管理后台-发售计划模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/sale-plans')
@UseGuards(AdminJwtGuard)
export class AdminSalePlanController {
  constructor(
    private readonly salePlanService: AdminSalePlanService,
  ) {}

  private getAdmin(req: Request): AuthenticatedAdmin {
    return req.user as AuthenticatedAdmin;
  }

  // 1. 发售计划列表
  @Get()
  @ApiOperation({ summary: '发售计划列表', description: '分页查询，支持搜索/状态/模式过滤' })
  async findList(
    @Query() query: PaginationQueryDto & { keyword?: string; status?: string; sale_mode?: string },
  ): Promise<BaseResponseVo<PaginatedResponse<any>>> {
    const data = await this.salePlanService.findList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword,
      status: query.status !== undefined ? Number(query.status) : undefined,
      saleMode: query.sale_mode !== undefined ? Number(query.sale_mode) : undefined,
    });
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 发售计划详情
  @Get(':id')
  @ApiOperation({ summary: '发售计划详情' })
  async findOne(@Param('id') id: string): Promise<BaseResponseVo<any>> {
    const data = await this.salePlanService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 3. 创建发售计划
  @Post()
  @ApiOperation({ summary: '创建发售计划', description: '选择藏品，设置发售时间、价格、限购等' })
  async create(
    @Body() dto: {
      collectibleId: number;
      collectibleType?: string;
      name: string;
      saleMode: number;
      price: number;
      perUserLimit?: number;
      stockAllocation?: number;
      startTime: string | Date;
      endTime: string | Date;
    },
    @Req() req: Request,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.salePlanService.create(
      {
        ...dto,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '创建成功');
  }

  // 4. 编辑发售计划
  @Put(':id')
  @ApiOperation({ summary: '编辑发售计划', description: '仅草稿状态可编辑' })
  async update(
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      saleMode?: number;
      price?: number;
      perUserLimit?: number;
      stockAllocation?: number;
      startTime?: string | Date;
      endTime?: string | Date;
    },
    @Req() req: Request,
  ): Promise<BaseResponseVo<any>> {
    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.saleMode !== undefined) updateData.saleMode = dto.saleMode;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.perUserLimit !== undefined) updateData.perUserLimit = dto.perUserLimit;
    if (dto.stockAllocation !== undefined) updateData.stockAllocation = dto.stockAllocation;
    if (dto.startTime !== undefined) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) updateData.endTime = new Date(dto.endTime);
    const data = await this.salePlanService.update(
      Number(id),
      updateData,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '更新成功');
  }

  // 5. 上架开售
  @Put(':id/publish')
  @ApiOperation({ summary: '上架开售', description: '发布到用户端，到开售时间自动可购买' })
  async publish(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number }>> {
    const data = await this.salePlanService.publish(Number(id), this.getAdmin(req));
    return BaseResponseVo.success(data, '已上架');
  }

  // 6. 下架
  @Put(':id/unpublish')
  @ApiOperation({ summary: '下架', description: '结束发售，藏品在用户端不可见' })
  async unpublish(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ id: number; status: number }>> {
    const data = await this.salePlanService.unpublish(Number(id), this.getAdmin(req));
    return BaseResponseVo.success(data, '已下架');
  }

  // 7. 删除发售计划
  @Delete(':id')
  @ApiOperation({ summary: '删除发售计划', description: '软删除，仅草稿/已结束状态可删' })
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ deleted: boolean }>> {
    const data = await this.salePlanService.delete(Number(id), this.getAdmin(req));
    return BaseResponseVo.success(data, '已删除');
  }
}
