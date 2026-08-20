// [管理后台-用户管理模块] - AdminUserController
// 15 个端点：列表/详情/冻结/解冻/重置交易密码/强制下线/拉黑/钱包/藏品/
//           盲盒/优先购资格/邀请记录/恢复藏品/恢复盲盒/导出
//
// 守卫协作：
//  - 类级 @Public() 跳过全局 JwtAuthGuard（用户端认证）
//  - 类级 @UseGuards(AdminJwtGuard) 保护所有管理后台端点
import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { PaginationQueryDto } from '../../../common/dto/query.dto';
import { PaginatedResponse } from '../../../common/dto/response.interface';
import {
  NftApproval,
  NftBlacklist,
  NftBlindBoxOpenRecord,
  NftInviteRecord,
  NftPrioritySaleWhitelist,
  NftUser,
  NftUserCollectible,
  NftUserWallet,
} from '../../../database/entities';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AuthenticatedAdmin } from '../strategies/admin-jwt.strategy';
import { AdminUserService } from '../services/admin-user.service';

@ApiTags('管理后台-用户管理模块')
@ApiBearerAuth()
@Public()
@Controller('admin/api/v1/users')
@UseGuards(AdminJwtGuard)
export class AdminUserController {
  constructor(private readonly userService: AdminUserService) {}

  /** 从请求中获取当前管理员 */
  private getAdmin(req: Request): AuthenticatedAdmin {
    return req.user as AuthenticatedAdmin;
  }

  // 1. 用户列表（分页 + 搜索 + 过滤）
  @Get()
  @ApiOperation({
    summary: '用户列表',
    description: '分页查询，支持按手机号/用户名/UID 搜索及状态/黑名单/实名过滤',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'keyword', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiQuery({ name: 'isBlacklisted', required: false, type: String })
  @ApiQuery({ name: 'isRealname', required: false, type: Number })
  async findList(
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftUser>>> {
    const data = await this.userService.findList(query);
    return BaseResponseVo.success(data, 'success');
  }

  // 2. 导出用户列表（CSV）—— 必须在 /:id 之前注册
  @Get('export')
  @ApiOperation({
    summary: '导出用户列表',
    description: '按当前筛选条件导出 CSV 文件',
  })
  async export(
    @Query() query: PaginationQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.userService.exportUsersCsv(query);
    const filename = `users-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    // 加 BOM 头，保证 Excel 正确识别 UTF-8
    res.send('\ufeff' + csv);
  }

  // 3. 用户详情（含钱包信息）
  @Get(':id')
  @ApiOperation({ summary: '用户详情', description: '包含钱包与黑名单状态' })
  async findOne(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftUser & { wallet: NftUserWallet | null; isBlacklisted: boolean }>> {
    const data = await this.userService.findOne(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 4. 冻结用户
  @Put(':id/freeze')
  @ApiOperation({ summary: '冻结用户', description: '将用户 status 置为 0' })
  async freeze(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; status: number }>> {
    const data = await this.userService.freeze(Number(id));
    return BaseResponseVo.success(data, '已冻结');
  }

  // 5. 解冻用户
  @Put(':id/unfreeze')
  @ApiOperation({ summary: '解冻用户', description: '将用户 status 置为 1' })
  async unfreeze(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; status: number }>> {
    const data = await this.userService.unfreeze(Number(id));
    return BaseResponseVo.success(data, '已解冻');
  }

  // 6. 重置交易密码
  @Put(':id/reset-tx-password')
  @ApiOperation({
    summary: '重置交易密码',
    description: '管理员操作，清空交易密码，由用户重新设置',
  })
  async resetTxPassword(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; transactionPassword: null }>> {
    const data = await this.userService.resetTxPassword(Number(id));
    return BaseResponseVo.success(data, '交易密码已重置');
  }

  // 7. 强制下线
  @Put(':id/force-logout')
  @ApiOperation({
    summary: '强制下线',
    description: '记录操作日志，后续接入 token 版本号失效机制',
  })
  async forceLogout(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<{ id: number; forceLogout: boolean }>> {
    const data = await this.userService.forceLogout(Number(id));
    return BaseResponseVo.success(data, '已强制下线');
  }

  // 8. 加入黑名单
  @Put(':id/blacklist')
  @ApiOperation({
    summary: '加入黑名单',
    description: '写入 nft_blacklist（blacklist_type=1 用户）',
  })
  async blacklist(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftBlacklist>> {
    const data = await this.userService.blacklist(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已加入黑名单');
  }

  // 9. 用户钱包信息
  @Get(':id/wallet')
  @ApiOperation({ summary: '用户钱包', description: '查询用户钱包余额等信息' })
  async getWallet(
    @Param('id') id: string,
  ): Promise<BaseResponseVo<NftUserWallet>> {
    const data = await this.userService.getWallet(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  // 10. 用户藏品列表
  @Get(':id/collectibles')
  @ApiOperation({ summary: '用户藏品列表', description: '分页查询用户持有的藏品' })
  async getCollectibles(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftUserCollectible>>> {
    const data = await this.userService.getCollectibles(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 11. 用户盲盒（开盒记录）
  @Get(':id/blindboxes')
  @ApiOperation({
    summary: '用户盲盒',
    description: '分页查询用户盲盒开盒记录',
  })
  async getBlindBoxes(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftBlindBoxOpenRecord>>> {
    const data = await this.userService.getBlindBoxes(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 12. 用户优先购资格
  @Get(':id/priority-qualifications')
  @ApiOperation({
    summary: '优先购资格',
    description: '分页查询用户优先购白名单',
  })
  async getPriorityQualifications(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftPrioritySaleWhitelist>>> {
    const data = await this.userService.getPriorityQualifications(
      Number(id),
      query,
    );
    return BaseResponseVo.success(data, 'success');
  }

  // 13. 用户邀请记录
  @Get(':id/invites')
  @ApiOperation({
    summary: '邀请记录',
    description: '分页查询用户发出的邀请记录',
  })
  async getInvites(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<BaseResponseVo<PaginatedResponse<NftInviteRecord>>> {
    const data = await this.userService.getInvites(Number(id), query);
    return BaseResponseVo.success(data, 'success');
  }

  // 14. 恢复藏品（创建审批记录）
  @Post(':id/recover-collectible')
  @ApiOperation({
    summary: '恢复藏品',
    description: '为用户发起藏品恢复审批，审批通过后执行',
  })
  async recoverCollectible(
    @Param('id') id: string,
    @Body() body: { userCollectibleId: number; reason?: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftApproval>> {
    const data = await this.userService.recoverCollectible(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已创建恢复藏品审批');
  }

  // 15. 恢复盲盒（创建审批记录）
  @Post(':id/recover-blindbox')
  @ApiOperation({
    summary: '恢复盲盒',
    description: '为用户发起盲盒恢复审批，审批通过后执行',
  })
  async recoverBlindBox(
    @Param('id') id: string,
    @Body() body: { openRecordId: number; reason?: string },
    @Req() req: Request,
  ): Promise<BaseResponseVo<NftApproval>> {
    const data = await this.userService.recoverBlindBox(
      Number(id),
      body,
      this.getAdmin(req),
    );
    return BaseResponseVo.success(data, '已创建恢复盲盒审批');
  }
}
