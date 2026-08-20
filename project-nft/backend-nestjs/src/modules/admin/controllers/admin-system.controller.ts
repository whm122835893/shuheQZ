// [管理后台-系统配置模块] - AdminSystemController
// 10 个端点：支付、安全、短信、OSS、全局配置的读取与更新
import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminSystemService } from '../services/admin-system.service';

@ApiTags('管理后台-系统配置模块')
@ApiBearerAuth()
@Controller('admin/api/v1/system')
@UseGuards(AdminJwtGuard)
export class AdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  // 支付配置
  @Public()
  @Get('payment')
  @ApiOperation({ summary: '获取支付配置', description: "config_key 以 payment_ 开头" })
  async getPaymentConfig() {
    const data = await this.adminSystemService.getPaymentConfig();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('payment')
  @ApiOperation({ summary: '更新支付配置' })
  async updatePaymentConfig(@Body() body: Record<string, any>) {
    const data = await this.adminSystemService.updatePaymentConfig(body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // 安全配置
  @Public()
  @Get('security')
  @ApiOperation({ summary: '获取安全配置', description: "config_key 以 security_ 开头" })
  async getSecurityConfig() {
    const data = await this.adminSystemService.getSecurityConfig();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('security')
  @ApiOperation({ summary: '更新安全配置' })
  async updateSecurityConfig(@Body() body: Record<string, any>) {
    const data = await this.adminSystemService.updateSecurityConfig(body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // 短信 / OSS 配置
  @Public()
  @Get('sms')
  @ApiOperation({ summary: '获取短信/OSS配置', description: "config_key 以 sms_ 或 oss_ 开头" })
  async getSmsConfig() {
    const data = await this.adminSystemService.getSmsConfig();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('sms')
  @ApiOperation({ summary: '更新短信/OSS配置' })
  async updateSmsConfig(@Body() body: Record<string, any>) {
    const data = await this.adminSystemService.updateSmsConfig(body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // OSS 配置
  @Public()
  @Get('oss')
  @ApiOperation({ summary: '获取OSS配置', description: "config_key 以 oss_ 开头" })
  async getOssConfig() {
    const data = await this.adminSystemService.getOssConfig();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('oss')
  @ApiOperation({ summary: '更新OSS配置' })
  async updateOssConfig(@Body() body: Record<string, any>) {
    const data = await this.adminSystemService.updateOssConfig(body);
    return BaseResponseVo.success(data, '更新成功');
  }

  // 全局配置
  @Public()
  @Get('global')
  @ApiOperation({ summary: '获取全局配置', description: "config_key 以 global_ 开头" })
  async getGlobalConfig() {
    const data = await this.adminSystemService.getGlobalConfig();
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Put('global')
  @ApiOperation({ summary: '更新全局配置' })
  async updateGlobalConfig(@Body() body: Record<string, any>) {
    const data = await this.adminSystemService.updateGlobalConfig(body);
    return BaseResponseVo.success(data, '更新成功');
  }
}
