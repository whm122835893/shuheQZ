// [管理后台-平台运维模块] - AdminPlatformController
// 4 个端点：清理预览、清理执行、清理日志列表、触发备份
//
// 守卫协作：
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有端点
//  - 每个端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminPlatformService } from '../services/admin-platform.service';

@ApiTags('管理后台-平台运维模块')
@ApiBearerAuth()
@Controller('admin/api/v1/platform')
@UseGuards(AdminJwtGuard)
export class AdminPlatformController {
  constructor(private readonly adminPlatformService: AdminPlatformService) {}

  // ============================================================
  // 数据清理（3）
  // ============================================================

  @Public()
  @Post('cleanup-preview')
  @ApiOperation({
    summary: '清理预览',
    description: '统计符合条件的数据量（targetTable + beforeDate）',
  })
  async cleanupPreview(@Body() body: Record<string, any>) {
    const data = await this.adminPlatformService.cleanupPreview(body);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Post('cleanup-execute')
  @ApiOperation({
    summary: '清理执行',
    description: '创建审批记录后执行物理删除并写入清理日志',
  })
  async cleanupExecute(
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    const data = await this.adminPlatformService.cleanupExecute(
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '清理完成');
  }

  @Public()
  @Get('cleanup-logs')
  @ApiOperation({ summary: '清理日志列表', description: '分页查询清理日志' })
  async getCleanupLogs(@Query() query: Record<string, any>) {
    const data = await this.adminPlatformService.getCleanupLogs(query);
    return BaseResponseVo.success(data, 'success');
  }

  // ============================================================
  // 数据备份（1）
  // ============================================================

  @Public()
  @Post('backup')
  @ApiOperation({
    summary: '触发数据备份',
    description: '仅记录日志，实际备份由运维脚本执行',
  })
  async triggerBackup(
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    const data = await this.adminPlatformService.triggerBackup(
      body,
      req.user,
    );
    return BaseResponseVo.success(data, '备份已触发');
  }
}
