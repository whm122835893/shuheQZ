// [管理后台-权限管理模块] - AdminPermissionController
// 16 个端点：管理员 CRUD、角色 CRUD、角色权限设置、权限树、操作日志、登录日志、日志导出
//
// 守卫协作：
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有端点
//  - 每个端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { AdminPermissionService } from '../services/admin-permission.service';

@ApiTags('管理后台-权限管理模块')
@ApiBearerAuth()
@Controller('admin/api/v1/permission')
@UseGuards(AdminJwtGuard)
export class AdminPermissionController {
  constructor(private readonly adminPermissionService: AdminPermissionService) {}

  // ============================================================
  // 管理员管理（6）
  // ============================================================

  @Public()
  @Get('admins')
  @ApiOperation({ summary: '管理员分页列表', description: '支持按用户名、真实姓名、角色、状态筛选' })
  async getAdminList(@Query() query: Record<string, any>, @Req() req: any) {
    const data = await this.adminPermissionService.getAdminList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('admins')
  @ApiOperation({ summary: '创建管理员', description: 'bcrypt 加密密码并分配角色' })
  async createAdmin(@Body() body: Record<string, any>, @Req() req: any) {
    const data = await this.adminPermissionService.createAdmin(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Get('admins/:id')
  @ApiOperation({ summary: '管理员详情' })
  async getAdminDetail(@Param('id') id: string) {
    const data = await this.adminPermissionService.getAdminDetail(Number(id));
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('admins/:id')
  @ApiOperation({ summary: '编辑管理员' })
  async updateAdmin(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminPermissionService.updateAdmin(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Delete('admins/:id')
  @ApiOperation({ summary: '删除管理员（软删除）' })
  async deleteAdmin(@Param('id') id: string) {
    await this.adminPermissionService.deleteAdmin(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  @Public()
  @Put('admins/:id/reset-password')
  @ApiOperation({ summary: '重置管理员密码' })
  async resetPassword(@Param('id') id: string, @Body() body: Record<string, any>) {
    await this.adminPermissionService.resetPassword(Number(id), body);
    return BaseResponseVo.success(null, '密码重置成功');
  }

  // ============================================================
  // 角色管理（5）
  // ============================================================

  @Public()
  @Get('roles')
  @ApiOperation({ summary: '角色列表', description: '返回角色列表（含管理员数量、权限数量）' })
  async getRoleList(@Query() query: Record<string, any>) {
    const data = await this.adminPermissionService.getRoleList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('roles')
  @ApiOperation({ summary: '创建角色' })
  async createRole(@Body() body: Record<string, any>) {
    const data = await this.adminPermissionService.createRole(body);
    return BaseResponseVo.success(data, '创建成功');
  }

  @Public()
  @Put('roles/:id')
  @ApiOperation({ summary: '编辑角色' })
  async updateRole(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminPermissionService.updateRole(Number(id), body);
    return BaseResponseVo.success(data, '更新成功');
  }

  @Public()
  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色' })
  async deleteRole(@Param('id') id: string) {
    await this.adminPermissionService.deleteRole(Number(id));
    return BaseResponseVo.success(null, '删除成功');
  }

  @Public()
  @Put('roles/:id/permissions')
  @ApiOperation({ summary: '设置角色权限', description: '全量替换角色权限关联' })
  async setRolePermissions(@Param('id') id: string, @Body() body: Record<string, any>) {
    const data = await this.adminPermissionService.setRolePermissions(
      Number(id),
      body,
    );
    return BaseResponseVo.success(data, '权限设置成功');
  }

  // ============================================================
  // 权限与日志（5）
  // ============================================================

  @Public()
  @Get('permissions/tree')
  @ApiOperation({ summary: '权限树', description: '按 parent_id 递归构建层级结构' })
  async getPermissionTree() {
    const data = await this.adminPermissionService.getPermissionTree();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('operation-logs')
  @ApiOperation({ summary: '操作日志分页列表' })
  async getOperationLogList(@Query() query: Record<string, any>) {
    const data = await this.adminPermissionService.getOperationLogList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('operation-logs/export')
  @ApiOperation({ summary: '导出操作日志', description: '返回 CSV 格式字符串' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportOperationLogs(@Query() query: Record<string, any>): Promise<string> {
    return this.adminPermissionService.exportOperationLogs(query);
  }

  @Public()
  @Get('operation-logs/:id')
  @ApiOperation({ summary: '操作日志详情' })
  async getOperationLogDetail(@Param('id') id: string) {
    const data = await this.adminPermissionService.getOperationLogDetail(
      Number(id),
    );
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('login-logs')
  @ApiOperation({ summary: '登录日志', description: '来源 audit_logs where action=login' })
  async getLoginLogList(@Query() query: Record<string, any>) {
    const data = await this.adminPermissionService.getLoginLogList(query);
    return BaseResponseVo.success(data, 'success');
  }
}
