// [管理后台-认证模块] - 管理员认证控制器
// 7 个端点：登录、登出、刷新 Token、获取当前管理员信息、修改密码、2FA 设置、2FA 验证
//
// 守卫协作：
//  - 所有端点标记 @Public() 跳过全局 JwtAuthGuard（用户端认证）
//  - 控制器级 @UseGuards(AdminJwtGuard) 保护所有管理后台端点
//  - 登录/刷新 Token 标记 @AdminPublic() 跳过 AdminJwtGuard（无需认证即可访问）
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { setAdminAuthCookies, clearAdminAuthCookies, extractToken } from '../../../shared/cookie-auth.util';

import { AdminPublic } from '../decorators/admin-public.decorator';
import { AllowPending2fa } from '../decorators/allow-pending-2fa.decorator';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';
import { AdminAuthService } from '../services/admin-auth.service';

import {
  AdminLoginDto,
  AdminChangePasswordDto,
  AdminRefreshTokenDto,
  Admin2faSetupDto,
  Admin2faVerifyDto,
} from '../dto/admin-auth.dto';

@ApiTags('管理后台-认证模块')
@ApiBearerAuth()
@Controller('admin/api/v1/auth')
@UseGuards(AdminJwtGuard)
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  /** 从请求中提取客户端 IP */
  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      return String(xff).split(',')[0].trim();
    }
    return req.ip || '';
  }

  /** 从 Cookie 或 Authorization 头部提取 Bearer token */
  private getBearerToken(req: Request): string {
    return extractToken(req, true) || '';
  }

  // 1. 管理员登录（公开接口）
  @Public()
  @AdminPublic()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @ApiOperation({
    summary: '管理员登录',
    description: '公开接口，用户名 + 密码登录，返回 JWT Token 和 Refresh Token',
  })
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminAuthService.login(dto, this.getClientIp(req));
    // 设置 httpOnly Cookie（XSS 防护），仅在非 2FA 临时 token 时设置
    if (data.refreshToken) {
      setAdminAuthCookies(res, data.token, data.refreshToken);
    }
    return BaseResponseVo.success(data, '登录成功');
  }

  // 2. 管理员登出
  @Public()
  @Post('logout')
  @ApiOperation({
    summary: '管理员登出',
    description: '将当前 Token 加入黑名单，吊销 Refresh Token',
  })
  async logout(
    @CurrentUser('id') adminId: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<null>> {
    const token = this.getBearerToken(req);
    await this.adminAuthService.logout(adminId, token);
    // 清除 httpOnly Cookie
    clearAdminAuthCookies(res);
    return BaseResponseVo.success(null, '已退出登录');
  }

  // 3. 刷新 Token（公开接口，access token 可能已过期）
  @Public()
  @AdminPublic()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('refresh')
  @ApiOperation({
    summary: '刷新 Token',
    description: '公开接口，通过 refresh_token 刷新 access token，旧 token 自动失效',
  })
  async refreshToken(
    @Body() dto: AdminRefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminAuthService.refreshToken(dto);
    // 刷新 httpOnly Cookie
    setAdminAuthCookies(res, data.token, data.refreshToken);
    return BaseResponseVo.success(data, '刷新成功');
  }

  // 4. 获取当前管理员信息
  @Public()
  @Get('me')
  @ApiOperation({
    summary: '获取当前管理员信息',
    description: '返回当前登录管理员的详细信息（含 2FA 状态）',
  })
  async getMe(
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminAuthService.getAdminInfo(adminId);
    return BaseResponseVo.success(data, 'success');
  }

  // 5. 修改密码
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Put('password')
  @ApiOperation({
    summary: '修改管理员密码',
    description: '验证原密码后修改为新密码，修改后强制重新登录',
  })
  async changePassword(
    @Body() dto: AdminChangePasswordDto,
    @CurrentUser('id') adminId: number,
    @Req() req: Request,
  ): Promise<BaseResponseVo<null>> {
    const token = this.getBearerToken(req);
    await this.adminAuthService.changePassword(adminId, dto, token);
    return BaseResponseVo.success(null, '密码修改成功，请重新登录');
  }

  // 6. 设置 2FA（两步验证）
  @Public()
  @Post('2fa/setup')
  @ApiOperation({
    summary: '设置 2FA',
    description: '生成 TOTP 密钥和二维码，需验证当前密码。返回的 secret 需在 5 分钟内通过 2fa/verify 确认',
  })
  async setup2fa(
    @Body() dto: Admin2faSetupDto,
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.adminAuthService.setup2fa(adminId, dto.password);
    return BaseResponseVo.success(data, '2FA 密钥已生成，请使用验证器扫码并输入验证码确认');
  }

  // 7. 验证 2FA
  @Public()
  @AllowPending2fa()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('2fa/verify')
  @ApiOperation({
    summary: '验证 2FA',
    description: '验证 TOTP 验证码并启用 2FA。需提供 setup 阶段返回的 secret 和 6 位验证码',
  })
  async verify2fa(
    @Body() dto: Admin2faVerifyDto,
    @CurrentUser('id') adminId: number,
  ): Promise<BaseResponseVo<null>> {
    await this.adminAuthService.verify2fa(adminId, dto);
    return BaseResponseVo.success(null, '2FA 已启用');
  }
}
