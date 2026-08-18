// [用户模块] - 用户控制器
// 13 个端点，严格按 API 文档定义路径/方法/鉴权方式。
// 公开接口使用 @Public() 跳过全局 JWT 守卫；其余接口由全局 JwtAuthGuard 保护。
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ConcurrencyLimit } from '../../common/decorators/concurrency-limit.decorator';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { setAuthCookies, clearAuthCookies, extractToken } from '../../shared/cookie-auth.util';
import { UserService } from './user.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RealnameDto } from './dto/realname.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetTransactionPasswordDto } from './dto/set-transaction-password.dto';

@ApiTags('用户模块')
@ApiBearerAuth()
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

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
    return extractToken(req, false) || '';
  }

  // 4.1 发送短信验证码
  // INT-005 修复：IP 级别限流（60秒内同一 IP 仅允许 1 次请求）
  // 服务层另有手机号级冷却(60s) + IP/手机号日限流(20/5次)
  @Public()
  @Throttle({ default: { limit: 100000, ttl: 60000 } })
  @Post('sms/send')
  @ApiOperation({ summary: '发送短信验证码', description: '无需认证（scene=4 时若携带 JWT 则从登录态获取真实手机号）' })
  async sendSms(
    @Body() dto: SendSmsDto,
    @Req() req: Request,
  ): Promise<BaseResponseVo<{ expire_in: number; code?: string }>> {
    // scene=4（设置交易密码）为已登录场景，前端拿到的手机号是脱敏的
    // 若请求中携带有效 JWT，则从 token 中提取用户真实手机号
    if (dto.scene === 4 && (!dto.phone || dto.phone.includes('*'))) {
      const token = this.getBearerToken(req);
      if (token) {
        const realPhone = await this.userService.getPhoneFromToken(token);
        if (realPhone) {
          dto.phone = realPhone;
        }
      }
    }
    const data = await this.userService.sendSms(dto, this.getClientIp(req));
    return BaseResponseVo.success(data, '验证码已发送');
  }

  // 4.2 用户注册
  @Public()
  @Throttle({ default: { limit: parseInt(process.env.AUTH_THROTTLE_LIMIT || '20', 10), ttl: 60000 } })
  @ConcurrencyLimit(100, '注册人数过多，请稍后重试')
  @Post('user/register')
  @ApiOperation({ summary: '用户注册', description: '无需认证' })
  async register(
    @Body() dto: RegisterDto,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.register(dto);
    return BaseResponseVo.success(data, '注册成功');
  }

  // 4.3 用户登录
  @Public()
  @Throttle({ default: { limit: parseInt(process.env.AUTH_THROTTLE_LIMIT || '20', 10), ttl: 60000 } })
  @ConcurrencyLimit(200, '登录人数过多，请稍后重试')
  @Post('user/login')
  @ApiOperation({ summary: '用户登录', description: '无需认证' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.login(dto);
    // 设置 httpOnly Cookie（XSS 防护）
    setAuthCookies(res, data.token, data.refresh_token, data.expires_in);
    return BaseResponseVo.success(data, '登录成功');
  }

  // 4.4 刷新 Token
  // @Public() — 允许在 access token 过期时调用，userId 从 Redis 中存储的 refresh_token payload 中提取
  // INT-008 修复：刷新时将旧 access token 加入黑名单，防止旧 token 被盗用
  @Post('user/refresh-token')
  @Public()
  @ApiOperation({ summary: '刷新 Token（续期）', description: '公开接口，通过 refresh_token 刷新，旧 access token 自动失效' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.refreshToken(
      dto,
      this.getBearerToken(req),
    );
    // 刷新 httpOnly Cookie
    setAuthCookies(res, data.token, data.refresh_token, data.expires_in);
    return BaseResponseVo.success(data, '刷新成功');
  }

  // 4.5 登出
  @Post('user/logout')
  @ApiOperation({ summary: '退出登录', description: 'JWT 认证' })
  async logout(
    @CurrentUser('id') userId: number,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BaseResponseVo<null>> {
    await this.userService.logout(userId, this.getBearerToken(req));
    // 清除 httpOnly Cookie
    clearAuthCookies(res);
    return BaseResponseVo.success(null, '已退出登录');
  }

  // 4.6 找回密码
  @Public()
  @Post('user/reset-password')
  @ApiOperation({ summary: '找回密码（未登录态）', description: '无需认证' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<BaseResponseVo<null>> {
    await this.userService.resetPassword(dto);
    return BaseResponseVo.success(null, '密码已重置，请重新登录');
  }

  // 4.7 修改密码
  @Put('user/password')
  @ApiOperation({ summary: '修改登录密码（已登录态）', description: 'JWT 认证' })
  async updatePassword(
    @Body() dto: UpdatePasswordDto,
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.updatePassword(dto, userId);
    return BaseResponseVo.success(data, '密码修改成功');
  }

  // 4.8 实名认证
  @Post('user/realname')
  @ApiOperation({ summary: '实名认证', description: 'JWT 认证' })
  async realname(
    @Body() dto: RealnameDto,
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<{ is_realname: boolean }>> {
    const data = await this.userService.realname(dto, userId);
    return BaseResponseVo.success(data, '实名认证成功');
  }

  // 4.9 修改用户资料（PATCH 增量更新）
  @Patch('user/profile')
  @ApiOperation({
    summary: '修改资料（头像/昵称，部分更新）',
    description: 'JWT 认证',
  })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.updateProfile(dto, userId);
    return BaseResponseVo.success(data, '修改成功');
  }

  // 4.10 设置/修改交易密码
  @Post('user/transaction-password')
  @ApiOperation({ summary: '设置/修改交易密码', description: 'JWT 认证' })
  async setTransactionPassword(
    @Body() dto: SetTransactionPasswordDto,
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<null>> {
    await this.userService.setTransactionPassword(dto, userId);
    return BaseResponseVo.success(null, '交易密码设置成功');
  }

  // 4.11 获取用户信息
  @Get('user/info')
  @ApiOperation({ summary: '获取当前用户信息', description: 'JWT 认证' })
  async getUserInfo(
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.getUserInfo(userId);
    return BaseResponseVo.success(data, 'success');
  }

  // 4.12 我的藏品列表
  @Get('user/collectibles')
  @ApiOperation({ summary: '我的藏品列表', description: 'JWT 认证' })
  async getMyCollectibles(
    @CurrentUser('id') userId: number,
    @Query('page', new ParseIntWithDefaultPipe(1)) page: number,
    @Query('page_size', new ParseIntWithDefaultPipe(20)) page_size: number,
    @Query('holding_status', new ParseIntWithDefaultPipe(1))
    holding_status: number,
    @Query('source') source: string,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.getMyCollectibles(
      userId,
      page,
      page_size,
      holding_status,
      source,
    );
    return BaseResponseVo.success(data, 'success');
  }

  // 4.13 藏品流转历史
  @Get('user/collectibles/:id/history')
  @ApiOperation({ summary: '藏品流转历史', description: 'JWT 认证' })
  async getCollectibleHistory(
    @CurrentUser('id') userId: number,
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.getCollectibleHistory(userId, id);
    return BaseResponseVo.success(data, 'success');
  }

  // 4.14 邀请记录列表
  @Get('user/invites')
  @ApiOperation({ summary: '邀请记录列表', description: 'JWT 认证' })
  async getInviteRecords(
    @CurrentUser('id') userId: number,
    @Query('page', new ParseIntWithDefaultPipe(1)) page: number,
    @Query('page_size', new ParseIntWithDefaultPipe(20)) page_size: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.userService.getInviteRecords(
      userId,
      page,
      page_size,
    );
    return BaseResponseVo.success(data, 'success');
  }
}
