// [用户模块] - 用户业务服务
// 实现用户模块全部 13 个接口的业务逻辑：短信验证码、注册、登录、Token 刷新/登出、
// 找回/修改密码、实名认证、资料修改、交易密码、用户信息、我的藏品、藏品流转历史。
// 同时实现 IUserService 接口（findOneById），供 TxPasswordGuard 注入校验交易密码。
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { IUserService } from '../../common/guards/tx-password.guard';
import { RedisService } from '../../shared/redis.service';
import { encrypt as aesEncrypt, decrypt as aesDecrypt } from '../../shared/aes.util';
import { DEV_AES_KEYS } from '../../config/dev-defaults';
import { JwtPayload, TOKEN_VERSION_KEY } from './strategies/jwt.strategy';

import { NftUser } from '../../database/entities/nft-user.entity';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftSmsLog } from '../../database/entities/nft-sms-log.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftInviteRecord } from '../../database/entities/nft-invite-record.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { NftLuckyDrawActivity } from '../../database/entities/nft-lucky-draw-activity.entity';
import { NftLuckyDrawUserChance } from '../../database/entities/nft-lucky-draw-user-chance.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftTransfer } from '../../database/entities/nft-transfer.entity';

import { SendSmsDto } from './dto/send-sms.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RealnameDto } from './dto/realname.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SetTransactionPasswordDto } from './dto/set-transaction-password.dto';

/** 短信验证码有效期（秒） */
const SMS_CODE_TTL = 300;
/** 短信发送冷却时间（秒） */
const SMS_COOLDOWN = 60;
/** 同一 IP 每日发送上限 */
const IP_DAILY_LIMIT = 20;
/** 同一手机号每日发送上限 */
const PHONE_DAILY_LIMIT = 5;
/** 登录失败最大次数（超过后锁定账号） */
const LOGIN_MAX_FAILURES = 5;
/** 登录锁定时长（秒），30 分钟 */
const LOGIN_LOCK_DURATION = 1800;
/** 图形验证码 Redis key 前缀（由图形验证码模块写入） */
const CAPTCHA_PREFIX = 'captcha:';
/** bcrypt 加密轮数
 * 12 轮约 400ms/次，10 轮约 100ms/次
 * 高并发场景（10K+ 登录）使用 10 轮，仍满足 OWASP 安全推荐
 * 可通过环境变量 BCRYPT_ROUNDS 覆盖
 */
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

/** 用户信息缓存 key 前缀（登录/注册时缓存用户基本信息，减少 DB 查询） */
const USER_CACHE_PREFIX = 'user:cache:';
/** 用户信息缓存 TTL（秒） */
const USER_CACHE_TTL = 300; // 5 分钟
/** 手机号注册状态缓存前缀 */
const PHONE_EXISTS_PREFIX = 'phone:exists:';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftSmsLog)
    private readonly smsLogRepo: Repository<NftSmsLog>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftInviteRecord)
    private readonly inviteRecordRepo: Repository<NftInviteRecord>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    @InjectRepository(NftLuckyDrawActivity)
    private readonly luckyDrawActivityRepo: Repository<NftLuckyDrawActivity>,
    @InjectRepository(NftLuckyDrawUserChance)
    private readonly luckyDrawUserChanceRepo: Repository<NftLuckyDrawUserChance>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
  ) {}

  /**
   * 从 JWT token 中解码出用户真实手机号
   * 用于已登录场景（如 scene=4 设置交易密码）下，前端仅有脱敏手机号的情况
   */
  async getPhoneFromToken(token: string): Promise<string | null> {
    try {
      const decoded = this.jwtService.decode(token) as
        | { id?: number; phone?: string; ver?: number }
        | null;
      if (!decoded || !decoded.id || !decoded.phone) return null;

      // 校验 token 版本号是否仍有效（防止已注销的 token 被利用）
      const currentVer = await this.getCurrentTokenVersion(decoded.id);
      if (decoded.ver !== currentVer) return null;

      // 再次确认 token 未被加入黑名单
      const isBlacklisted = await this.redis.get(`auth:blacklist:${token}`);
      if (isBlacklisted) return null;

      return decoded.phone;
    } catch {
      return null;
    }
  }

  // ============================================================
  // 4.1 发送短信验证码
  // ============================================================
  async sendSms(dto: SendSmsDto, ip: string): Promise<{ expire_in: number; code?: string }> {
    // 0) phone 必填校验（scene=4 时由控制器从 JWT 填充，其余场景前端必传）
    if (!dto.phone) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '请输入手机号',
      });
    }

    // 0.1) 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(dto.phone)) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '手机号格式不正确',
      });
    }

    // 1) scene=1,2,5 需校验图形验证码
    if ([1, 2, 5].includes(dto.scene)) {
      await this.verifyCaptcha(dto.captcha_key, dto.captcha_code);
    }

    // 2) 60 秒冷却
    const cooldownKey = `sms:cooldown:${dto.phone}:${dto.scene}`;
    if (await this.redis.exists(cooldownKey)) {
      throw new HttpException(
        {
          code: ErrorCode.TOO_MANY_REQUESTS,
          data: null,
          message: '验证码发送过于频繁，请60秒后重试',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3) IP / 手机号 日限流
    const today = this.getDateString();
    const endOfDayTtl = this.secondsUntilEndOfDay();

    const ipKey = `sms:ip_count:${ip}:${today}`;
    const ipCount = await this.redis.incr(ipKey);
    if (ipCount === 1) {
      await this.redis.expire(ipKey, endOfDayTtl);
    }
    if (ipCount > IP_DAILY_LIMIT) {
      throw new HttpException(
        {
          code: ErrorCode.TOO_MANY_REQUESTS,
          data: null,
          message: '当日发送次数已达上限',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const phoneKey = `sms:phone_count:${dto.phone}:${today}`;
    const phoneCount = await this.redis.incr(phoneKey);
    if (phoneCount === 1) {
      await this.redis.expire(phoneKey, endOfDayTtl);
    }
    if (phoneCount > PHONE_DAILY_LIMIT) {
      throw new HttpException(
        {
          code: ErrorCode.TOO_MANY_REQUESTS,
          data: null,
          message: '该手机号当日发送次数已达上限',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4) 生成 6 位验证码并写入 Redis
    const code = this.generateSmsCode();
    await this.redis.setex(`sms:code:${dto.phone}:${dto.scene}`, SMS_CODE_TTL, code);
    await this.redis.setex(cooldownKey, SMS_COOLDOWN, '1');

    // 5) 写入 nft_sms_logs
    const expiresAt = new Date(Date.now() + SMS_CODE_TTL * 1000);
    const smsLog = new NftSmsLog();
    smsLog.phone = dto.phone;
    smsLog.code = code;
    smsLog.scene = dto.scene;
    smsLog.status = 1;
    smsLog.ip = ip || null;
    smsLog.expiresAt = expiresAt;
    smsLog.sentAt = new Date();
    await this.smsLogRepo.save(smsLog);

    // 6) 调用短信服务商发送
    // TODO: 接入真实短信服务商（阿里云/腾讯云），失败时回写 smsLog.status 并抛出异常
    // await this.smsProvider.send(dto.phone, code);

    // 开发环境返回验证码方便联调
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    return {
      expire_in: SMS_CODE_TTL,
      ...(nodeEnv !== 'production' ? { code } : {}),
    };
  }

  // ============================================================
  // 4.2 用户注册
  // ============================================================
  async register(
    dto: RegisterDto,
  ): Promise<{
    token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, any>;
  }> {
    // 1) 图形验证码
    await this.verifyCaptcha(dto.captcha_key, dto.captcha_code);
    // 2) 短信验证码（scene=1）
    await this.verifySmsCode(dto.phone, 1, dto.code);
    // 3) 手机号唯一（高并发优化：先查 Redis 缓存，减少 DB 查询）
    const phoneExistsKey = `${PHONE_EXISTS_PREFIX}${dto.phone}`;
    const phoneExistsCached = await this.redis.get(phoneExistsKey);
    if (phoneExistsCached === '1') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        data: null,
        message: '该手机号已注册',
      });
    }
    const exists = await this.userRepo.findOne({
      where: { phone: dto.phone, isDelete: 0 },
    });
    if (exists) {
      // 缓存"手机号已注册"标记（60s TTL），减少并发注册时的 DB 查询
      await this.redis.set(phoneExistsKey, '1', 60);
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        data: null,
        message: '该手机号已注册',
      });
    }
    // 4) 邀请人校验
    let inviter: NftUser | null = null;
    if (dto.inviter_uid) {
      inviter = await this.userRepo.findOne({
        where: { uid: dto.inviter_uid, isDelete: 0 },
      });
      if (!inviter) {
        throw new UnprocessableEntityException({
          code: ErrorCode.VALIDATION_FAILED,
          data: null,
          message: '邀请人不存在',
        });
      }
    }
    // 5) 生成 5 位 UID + bcrypt 密码
    const uid = await this.generateUniqueUid();
    const hashedPassword = await bcrypt.hash(dto.login_password, BCRYPT_ROUNDS);
    // 6) 查询进行中的抽奖活动
    const activity = await this.findOngoingLuckyDrawActivity();

    // 7) 事务：创建用户 + 钱包 + 邀请记录 + 抽奖次数
    const savedUser = await this.userRepo.manager.transaction(async (em) => {
      const user = await em.save(NftUser, {
        phone: dto.phone,
        username: dto.username,
        avatar: '',
        uid,
        loginPassword: hashedPassword,
        isRealname: 0,
        inviterUid: inviter ? inviter.uid : null,
        status: 1,
        loginCount: 0,
      });

      await em.save(NftUserWallet, {
        userId: user.id,
      });

      if (inviter) {
        await em.save(NftInviteRecord, {
          inviterUserId: inviter.id,
          inviteeUserId: user.id,
          inviteePhone: dto.phone,
          status: 1,
          registeredAt: new Date(),
        });
      }

      // 注册赠送抽奖次数
      const registerGrant = this.getActivityGrant(activity, 'register');
      if (activity && registerGrant > 0) {
        await em.save(NftLuckyDrawUserChance, {
          activityId: activity.id,
          userId: user.id,
          source: 'register',
          chances: registerGrant,
          usedChances: 0,
        });
      }
      // 邀请人赠送抽奖次数
      const inviteGrant = this.getActivityGrant(activity, 'invite');
      if (inviter && activity && inviteGrant > 0) {
        await em.save(NftLuckyDrawUserChance, {
          activityId: activity.id,
          userId: inviter.id,
          source: 'invite_friend',
          chances: inviteGrant,
          usedChances: 0,
        });
      }

      return user;
    });

    // 8) 签发 Token
    const tokenPair = await this.signTokenPair(savedUser);
    return { ...tokenPair, user: this.buildLoginUserVo(savedUser) };
  }

  // ============================================================
  // 4.3 用户登录
  // ============================================================
  async login(
    dto: LoginDto,
  ): Promise<{
    token: string;
    refresh_token: string;
    expires_in: number;
    user: Record<string, any>;
  }> {
    if (!dto.code && !dto.login_password) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '请输入验证码或登录密码',
      });
    }

    // INT-006 修复：登录前检查账号是否被锁定
    const lockKey = `auth:login_lock:${dto.phone}`;
    const lockTtl = await this.redis.ttl(lockKey);
    if (lockTtl > 0) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: `账号已被临时锁定，请 ${Math.ceil(lockTtl / 60)} 分钟后再试`,
      });
    }

    // 高并发优化：先查 Redis 缓存的"手机号不存在"标记，避免 DB 查询
    const notFoundKey = `${PHONE_EXISTS_PREFIX}${dto.phone}`;
    const notFoundCached = await this.redis.get(notFoundKey);
    if (notFoundCached === '0') {
      // 缓存标记该手机号不存在，直接返回错误（60s TTL）
      await this.recordLoginFailure(dto.phone);
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '账号或密码错误',
      });
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.loginPassword')
      .addSelect('u.transactionPassword')
      .where('u.phone = :phone', { phone: dto.phone })
      .andWhere('u.is_delete = 0')
      .getOne();

    if (!user) {
      // 缓存"手机号不存在"标记（60s TTL），减少高并发登录时的 DB 查询压力
      await this.redis.set(notFoundKey, '0', 60);
      // 用户不存在也计入失败次数，防止枚举手机号
      await this.recordLoginFailure(dto.phone);
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '账号或密码错误',
      });
    }
    if (user.status !== 1) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '账号已被禁用',
      });
    }

    // 验证码或密码二选一
    if (dto.code) {
      await this.verifySmsCode(dto.phone, 2, dto.code);
    } else {
      const matched = await bcrypt.compare(
        dto.login_password as string,
        user.loginPassword,
      );
      if (!matched) {
        // INT-006 修复：密码错误时记录失败次数
        await this.recordLoginFailure(dto.phone);
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          data: null,
          message: '账号或密码错误',
        });
      }
    }

    // INT-006 修复：登录成功，清除失败计数
    await this.redis.del(`auth:login_fail:${dto.phone}`);

    // 更新登录信息
    await this.userRepo.update(user.id, {
      lastLoginAt: new Date(),
      loginCount: (user.loginCount || 0) + 1,
    });
    user.lastLoginAt = new Date();

    // INT-013 修复：单设备登录限制 - 递增 token 版本号使旧设备 token 即时失效
    await this.incrementTokenVersion(user.id);

    const tokenPair = await this.signTokenPair(user);
    return { ...tokenPair, user: this.buildLoginUserVo(user) };
  }

  // ============================================================
  // 4.4 刷新 Token
  // ============================================================
  async refreshToken(
    dto: RefreshTokenDto,
    oldAccessToken?: string,
  ): Promise<{ token: string; refresh_token: string; expires_in: number }> {
    const key = `auth:refresh:${dto.refresh_token}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: 'refresh_token 无效或已过期',
      });
    }

    let payload: { userId: number; ver: number; exp: number };
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: 'refresh_token 无效',
      });
    }

    const userId = payload.userId;

    const currentVer = await this.getCurrentTokenVersion(userId);
    if (payload.ver !== currentVer) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '登录状态已失效，请重新登录',
      });
    }

    // 旧 refresh_token 立即失效
    await this.redis.del(key);
    await this.redis.del(`auth:user_active_rft:${userId}`);

    // INT-008 修复：旧 access token 加入黑名单（剩余 TTL 内即时失效）
    if (oldAccessToken) {
      const ttl = this.getTokenRemainingTtl(oldAccessToken);
      if (ttl > 0) {
        await this.redis.setex(`auth:blacklist:${oldAccessToken}`, ttl, '1');
      }
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, isDelete: 0 },
    });
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '用户不存在',
      });
    }

    return this.signTokenPair(user);
  }

  // ============================================================
  // 4.5 登出
  // ============================================================
  async logout(userId: number, token: string): Promise<null> {
    // JWT 加入黑名单（剩余 TTL 内即时失效）
    const ttl = this.getTokenRemainingTtl(token);
    if (ttl > 0) {
      await this.redis.setex(`auth:blacklist:${token}`, ttl, '1');
    }
    // refresh_token 同步吊销
    await this.revokeUserActiveRefreshToken(userId);
    return null;
  }

  // ============================================================
  // 4.6 找回密码
  // ============================================================
  async resetPassword(dto: ResetPasswordDto): Promise<null> {
    await this.verifySmsCode(dto.phone, 5, dto.code);

    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, isDelete: 0 },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '该手机号未注册',
      });
    }

    const hashed = await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS);
    await this.userRepo.update(user.id, { loginPassword: hashed });

    // 使该用户所有 Token 即时失效
    await this.invalidateAllTokens(Number(user.id));

    // 审计日志
    this.writeOperationLog(
      'nft_users',
      Number(user.id),
      'reset_password',
      null,
      { login_password: '******' },
      null,
    ).catch(() => undefined);

    return null;
  }

  // ============================================================
  // 4.7 修改密码
  // ============================================================
  async updatePassword(
    dto: UpdatePasswordDto,
    userId: number,
  ): Promise<{ token: string; refresh_token: string; expires_in: number }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.loginPassword')
      .where('u.id = :id', { id: userId })
      .andWhere('u.is_delete = 0')
      .getOne();
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }

    const matched = await bcrypt.compare(dto.old_password, user.loginPassword);
    if (!matched) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        data: null,
        message: '原密码错误',
      });
    }
    if (dto.old_password === dto.new_password) {
      throw new UnprocessableEntityException({
        code: ErrorCode.VALIDATION_FAILED,
        data: null,
        message: '新密码不可与原密码相同',
      });
    }

    const hashed = await bcrypt.hash(dto.new_password, BCRYPT_ROUNDS);
    await this.userRepo.update(user.id, { loginPassword: hashed });

    // 使该用户所有旧 Token 失效（递增版本号）
    await this.incrementTokenVersion(userId);

    // 签发新 Token（携带新版本号）
    const refreshedUser = await this.userRepo.findOne({
      where: { id: userId, isDelete: 0 },
    });
    if (!refreshedUser) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }

    this.writeOperationLog(
      'nft_users',
      userId,
      'update_password',
      null,
      { login_password: '******' },
      null,
    ).catch(() => undefined);

    return this.signTokenPair(refreshedUser);
  }

  // ============================================================
  // 4.8 实名认证
  // ============================================================
  async realname(
    dto: RealnameDto,
    userId: number,
  ): Promise<{ is_realname: boolean }> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isDelete: 0 },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }
    if (user.isRealname === 1) {
      throw new UnprocessableEntityException({
        code: ErrorCode.VALIDATION_FAILED,
        data: null,
        message: '已实名认证，无需重复认证',
      });
    }

    // 调用第三方实名认证接口校验 real_name + id_card
    const verified = await this.callThirdPartyRealname(
      dto.real_name,
      dto.id_card,
    );
    if (!verified) {
      throw new UnprocessableEntityException({
        code: ErrorCode.VALIDATION_FAILED,
        data: null,
        message: '实名认证失败：身份证与姓名不一致',
      });
    }

    // AES-256-GCM 加密存储敏感数据（姓名 + 身份证号）
    // 使用 shared/aes.util.ts 统一加密工具，密钥由 DATA_AES_KEY 环境变量管理
    await this.userRepo.update(user.id, {
      realName: aesEncrypt(dto.real_name),
      idCard: aesEncrypt(dto.id_card),
      isRealname: 1,
    });

    // 清除用户信息缓存
    await this.redis.del(`${USER_CACHE_PREFIX}${userId}`);

    this.writeOperationLog(
      'nft_users',
      userId,
      'realname',
      { is_realname: 0 },
      { is_realname: 1, real_name: '******', id_card: '******' },
      null,
    ).catch(() => undefined);

    return { is_realname: true };
  }

  // ============================================================
  // 4.9 修改用户资料（PATCH 增量更新）
  // ============================================================
  async updateProfile(
    dto: UpdateProfileDto,
    userId: number,
  ): Promise<{ id: number; username: string; avatar: string }> {
    if (dto.username === undefined && dto.avatar === undefined) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '至少修改一个字段',
      });
    }

    const partial: Partial<NftUser> = {};
    if (dto.username !== undefined) {
      partial.username = dto.username;
    }
    if (dto.avatar !== undefined) {
      partial.avatar = dto.avatar;
    }
    await this.userRepo.update(userId, partial);

    // 高并发优化：清除用户信息缓存
    await this.redis.del(`${USER_CACHE_PREFIX}${userId}`);

    const user = await this.userRepo.findOne({
      where: { id: userId, isDelete: 0 },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }

    return {
      id: Number(user.id),
      username: user.username,
      avatar: user.avatar || '',
    };
  }

  // ============================================================
  // 4.10 设置/修改交易密码
  // ============================================================
  async setTransactionPassword(
    dto: SetTransactionPasswordDto,
    userId: number,
  ): Promise<null> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.transactionPassword')
      .where('u.id = :id', { id: userId })
      .andWhere('u.is_delete = 0')
      .getOne();
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }

    await this.verifySmsCode(user.phone, 4, dto.code);

    const hashed = await bcrypt.hash(dto.transaction_password, BCRYPT_ROUNDS);
    await this.userRepo.update(user.id, { transactionPassword: hashed });

    // 清除用户信息缓存（has_transaction_password 字段变更）
    await this.redis.del(`${USER_CACHE_PREFIX}${userId}`);

    // 交易密码变更后需重新登录：使所有 Token 失效
    await this.invalidateAllTokens(userId);

    this.writeOperationLog(
      'nft_users',
      userId,
      'set_transaction_password',
      null,
      { transaction_password: '******' },
      null,
    ).catch(() => undefined);

    return null;
  }

  // ============================================================
  // 4.11 获取用户信息
  // ============================================================
  async getUserInfo(userId: number): Promise<Record<string, any>> {
    // 高并发优化：先查 Redis 缓存，缓存未命中再查 DB
    const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // JSON 解析失败，忽略缓存继续查 DB
      }
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.transactionPassword')
      .where('u.id = :id', { id: userId })
      .andWhere('u.is_delete = 0')
      .getOne();
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '用户不存在',
      });
    }

    const wallet = await this.walletRepo.findOne({
      where: { userId, isDelete: 0 },
    });

    const result = {
      id: Number(user.id),
      uid: user.uid,
      phone: this.maskPhone(user.phone),
      username: user.username,
      avatar: user.avatar || '',
      is_realname: user.isRealname === 1,
      has_transaction_password: !!user.transactionPassword,
      inviter_uid: user.inviterUid || '',
      last_login_at: user.lastLoginAt,
      wallet: {
        balance: this.formatDecimal(wallet?.balance ?? 0),
        frozen_balance: this.formatDecimal(wallet?.frozenBalance ?? 0),
      },
    };

    // 缓存用户信息（5 分钟 TTL）
    await this.redis.set(cacheKey, JSON.stringify(result), USER_CACHE_TTL);
    return result;
  }

  // ============================================================
  // 4.12 我的藏品列表
  // ============================================================
  async getMyCollectibles(
    userId: number,
    page: number,
    pageSize: number,
    holdingStatus: number,
    source?: string,
  ): Promise<{ list: any[]; total: number; page: number; page_size: number }> {
    const qb = this.userCollectibleRepo
      .createQueryBuilder('uc')
      .leftJoin(NftCollectible, 'c', 'c.id = uc.collectibleId')
      .select([
        'uc.id AS id',
        'uc.collectibleId AS collectible_id',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'uc.serialNo AS serial_no',
        'uc.source AS source',
        'uc.acquiredPrice AS acquired_price',
        'uc.acquiredAt AS acquired_at',
        'uc.status AS status',
        'uc.mintStatus AS mint_status',
        'uc.txHash AS tx_hash',
      ])
      .where('uc.userId = :userId', { userId })
      .andWhere('uc.is_delete = 0')
      .andWhere('uc.status = :status', { status: holdingStatus });

    if (source) {
      qb.andWhere('uc.source = :source', { source });
    }

    qb.orderBy('uc.acquiredAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const rows = await qb.getRawMany();

    const countWhere: any = { userId, status: holdingStatus, isDelete: 0 };
    if (source) {
      countWhere.source = source;
    }
    const total = await this.userCollectibleRepo.count({
      where: countWhere,
    });

    const list = rows.map((r: any) => ({
      id: Number(r.id),
      collectible_id: Number(r.collectible_id),
      collectible_name: r.collectible_name,
      collectible_image: r.collectible_image,
      serial_no: r.serial_no,
      source: r.source,
      acquired_price: this.formatDecimal(r.acquired_price),
      acquired_at: r.acquired_at,
      status: Number(r.status),
      is_on_chain: Number(r.mint_status) === 3,
      mint_status:
        r.mint_status === null || r.mint_status === undefined
          ? null
          : Number(r.mint_status),
      tx_hash_masked: this.maskChainId(r.tx_hash),
    }));

    return { list, total, page, page_size: pageSize };
  }

  // ============================================================
  // 4.13 藏品流转历史
  // ============================================================
  async getCollectibleHistory(
    userId: number,
    id: number,
  ): Promise<Record<string, any>> {
    const uc = await this.userCollectibleRepo
      .createQueryBuilder('uc')
      .leftJoin(NftCollectible, 'c', 'c.id = uc.collectibleId')
      .select([
        'uc.id AS id',
        'uc.userId AS user_id',
        'uc.collectibleId AS collectible_id',
        'c.name AS collectible_name',
        'uc.serialNo AS serial_no',
        'uc.source AS source',
        'uc.acquiredPrice AS acquired_price',
        'uc.acquiredAt AS acquired_at',
      ])
      .where('uc.id = :id', { id })
      .andWhere('uc.is_delete = 0')
      .getRawOne();

    if (!uc) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '藏品不存在',
      });
    }
    if (Number(uc.user_id) !== userId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '无权查看该藏品',
      });
    }

    // 查询该藏品的转赠记录
    const transfers = await this.userCollectibleRepo
      .createQueryBuilder('uc')
      .leftJoin(
        NftTransfer,
        't',
        't.userCollectibleId = uc.id AND t.is_delete = 0',
      )
      .select([
        't.fromUserId AS t_from',
        't.toUserId AS t_to',
        't.confirmedAt AS t_at',
        't.createdAt AS t_created',
      ])
      .where('uc.id = :id', { id })
      .andWhere('t.id IS NOT NULL')
      .orderBy('t.confirmedAt', 'DESC')
      .getRawMany();

    // 收集涉及用户 uid
    const userIds = new Set<number>([userId]);
    transfers.forEach((t: any) => {
      if (t.t_from) userIds.add(Number(t.t_from));
      if (t.t_to) userIds.add(Number(t.t_to));
    });
    const users = await this.userRepo.find({
      where: { id: In([...userIds]), isDelete: 0 },
      select: ['id', 'uid'],
    });
    const uidMap = new Map<number, string>(
      users.map((u) => [Number(u.id), u.uid]),
    );

    // 来源 -> 事件元信息
    const sourceMeta: Record<string, { event: string; desc: string }> = {
      purchase: { event: 'purchase', desc: '发售购买' },
      blindbox: { event: 'blindbox', desc: '盲盒开出' },
      transfer: { event: 'transfer_in', desc: '转赠接收' },
      airdrop: { event: 'airdrop', desc: '空投获得' },
      synthesis: { event: 'synthesis', desc: '合成产出' },
      lucky_draw: { event: 'lucky_draw', desc: '抽奖中奖' },
    };
    const meta = sourceMeta[uc.source] || { event: uc.source, desc: uc.source };

    const timeline: any[] = [
      {
        event: meta.event,
        desc: meta.desc,
        price: this.formatDecimal(uc.acquired_price),
        from_uid: null,
        to_uid: uidMap.get(userId) || null,
        occurred_at: uc.acquired_at,
      },
    ];

    for (const t of transfers) {
      const isIn = Number(t.t_to) === userId;
      timeline.push({
        event: isIn ? 'transfer_in' : 'transfer_out',
        desc: isIn ? '转赠接收' : '转赠发出',
        price: null,
        from_uid: t.t_from ? uidMap.get(Number(t.t_from)) || null : null,
        to_uid: t.t_to ? uidMap.get(Number(t.t_to)) || null : null,
        occurred_at: t.t_at || t.t_created,
      });
    }

    timeline.sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    return {
      user_collectible_id: id,
      collectible_name: uc.collectible_name,
      serial_no: uc.serial_no,
      timeline,
    };
  }

  // ============================================================
  // 4.14 邀请记录列表
  // ============================================================
  async getInviteRecords(
    userId: number,
    page: number,
    pageSize: number,
  ): Promise<{ list: any[]; total: number; page: number; page_size: number }> {
    const qb = this.inviteRecordRepo
      .createQueryBuilder('ir')
      .leftJoin(NftUser, 'u', 'u.id = ir.inviteeUserId')
      .select([
        'ir.id AS id',
        'ir.inviteeUserId AS invitee_user_id',
        'ir.inviteePhone AS invitee_phone',
        'ir.status AS status',
        'ir.registeredAt AS registered_at',
        'ir.rewardedAt AS rewarded_at',
        'ir.createdAt AS created_at',
        'u.uid AS invitee_uid',
        'u.username AS invitee_name',
      ])
      .where('ir.inviterUserId = :userId', { userId })
      .andWhere('ir.is_delete = 0')
      .orderBy('ir.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const rows = await qb.getRawMany();
    const total = await this.inviteRecordRepo.count({
      where: { inviterUserId: userId, isDelete: 0 },
    });

    const list = rows.map((r: any) => ({
      id: Number(r.id),
      invitee_uid: r.invitee_uid || '',
      invitee_name: r.invitee_name || this.maskPhone(r.invitee_phone || ''),
      invitee_phone: this.maskPhone(r.invitee_phone || ''),
      status: Number(r.status),
      status_text:
        Number(r.status) === 2 ? '已注册' : Number(r.status) === 3 ? '已奖励' : '待注册',
      registered_at: r.registered_at,
      rewarded_at: r.rewarded_at,
      created_at: r.created_at,
    }));

    return { list, total, page, page_size: pageSize };
  }

  // ============================================================
  // IUserService 接口实现：供 TxPasswordGuard 注入校验交易密码
  // ============================================================
  async findOneById(
    userId: number,
  ): Promise<{ id: number; transaction_password: string | null } | null> {
    const row = await this.userRepo
      .createQueryBuilder('u')
      .select(['u.id AS id', 'u.transactionPassword AS transaction_password'])
      .where('u.id = :userId', { userId })
      .andWhere('u.is_delete = 0')
      .getRawOne();
    if (!row) {
      return null;
    }
    return {
      id: Number(row.id),
      transaction_password: row.transaction_password,
    };
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /** 手机号脱敏：138****8888 */
  private maskPhone(phone: string): string {
    if (!phone || phone.length !== 11) {
      return phone || '';
    }
    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }

  /** 链上标识脱敏：取前8后6，中间用 * */
  private maskChainId(id: string | null | undefined): string | null {
    if (!id) {
      return null;
    }
    if (id.length <= 14) {
      return `${id.slice(0, 4)}****${id.slice(-4)}`;
    }
    return `${id.slice(0, 8)}****${id.slice(-6)}`;
  }

  /** 生成 6 位随机短信验证码 */
  private generateSmsCode(): string {
    return String(crypto.randomInt(100000, 999999));
  }

  /** 生成 refresh_token（rft_ + 32位十六进制） */
  private generateRefreshToken(): string {
    return `rft_${crypto.randomBytes(16).toString('hex')}`;
  }

  /** 生成唯一 5 位 UID（10000-99999） */
  private async generateUniqueUid(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const uid = String(10000 + crypto.randomInt(90000));
      const exists = await this.userRepo.findOne({
        where: { uid, isDelete: 0 },
      });
      if (!exists) {
        return uid;
      }
    }
    throw new InternalServerErrorException({
      code: ErrorCode.INTERNAL_ERROR,
      data: null,
      message: 'UID 生成失败，请重试',
    });
  }

  /** 将 '7d' / '2h' / '30m' / '60s' / 数字 转换为秒 */
  private parseDurationToSeconds(input: string | number): number {
    if (typeof input === 'number') {
      return input;
    }
    const match = /^(\d+)([smhd])$/.exec(input);
    if (!match) {
      return parseInt(input, 10) || 0;
    }
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }

  /** 访问令牌有效期（秒） */
  private getAccessTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(
      this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    );
  }

  /** 刷新令牌有效期（秒） */
  private getRefreshTokenExpiresInSeconds(): number {
    return this.parseDurationToSeconds(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    );
  }

  /** decimal 字段格式化为两位小数字符串 */
  private formatDecimal(value: any): string {
    if (value === null || value === undefined) {
      return '0.00';
    }
    return Number(value).toFixed(2);
  }

  /** 当前北京时间日期串 YYYYMMDD */
  private getDateString(): string {
    const beijing = new Date(Date.now() + 8 * 3600 * 1000);
    return beijing.toISOString().slice(0, 10).replace(/-/g, '');
  }

  /** 距当日结束（北京时间）剩余秒数 */
  private secondsUntilEndOfDay(): number {
    const beijing = new Date(Date.now() + 8 * 3600 * 1000);
    const tomorrow = new Date(
      Date.UTC(
        beijing.getUTCFullYear(),
        beijing.getUTCMonth(),
        beijing.getUTCDate() + 1,
      ),
    );
    return Math.max(1, Math.floor((tomorrow.getTime() - beijing.getTime()) / 1000));
  }

  /**
   * AES-256-GCM 解密（用于读取加密的敏感数据）
   *
   * 兼容两种密文格式：
   *   - 新格式（AES-256-GCM via shared/aes.util.ts）：base64(iv + authTag + ciphertext)
   *   - 旧格式（AES-256-CBC via 原 aesEncrypt）：hex(iv):hex(ciphertext)
   *
   * @param ciphertext 加密的字符串
   * @returns 解密后的明文
   */
  private decryptSensitiveData(ciphertext: string): string {
    if (!ciphertext) return '';

    // 尝试新格式（AES-256-GCM base64）
    try {
      return aesDecrypt(ciphertext);
    } catch {
      // 可能是旧格式（AES-256-CBC hex:hex），尝试兼容解密
      try {
        const parts = ciphertext.split(':');
        if (parts.length === 2) {
          const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
          const rawKey = this.configService.get<string>('DATA_AES_KEY');
          const finalKey = (rawKey || DEV_AES_KEYS[0]).padEnd(32, '0').slice(0, 32);
          const key = Buffer.from(finalKey, 'utf8');
          const iv = Buffer.from(parts[0], 'hex');
          const encrypted = Buffer.from(parts[1], 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
          ]);
          return decrypted.toString('utf8');
        }
      } catch (e) {
        this.logger.error(`敏感数据解密失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return ciphertext; // 无法解密时返回原值（可能是未加密的旧数据）
  }

  /**
   * 第三方实名认证
   *
   * 预留接口：接入第三方 KYC 服务商时，替换此方法实现
   * 推荐服务商：阿里云身份证实名核验 / 腾讯云身份证核验 / 公安部实名认证
   *
   * 安全策略：
   *  - 开发环境(REALNAME_DEV_MODE=true)：跳过校验，返回 true
   *  - 生产环境：未配置 KYC 服务时拒绝认证(返回 false)，防止绕过实名
   */
  private async callThirdPartyRealname(
    realName: string,
    idCard: string,
  ): Promise<boolean> {
    const devMode = this.configService.get<string>('REALNAME_DEV_MODE', 'false') === 'true';

    if (devMode) {
      this.logger.warn(
        'REALNAME_DEV_MODE=true，跳过实名认证（仅限开发联调，生产环境必须设置为 false）',
      );
      return true;
    }

    // 第三方实名认证服务商接入（预留）
    // 示例（阿里云）：
    // const client = new Core({ accessKeyId, secretAccessKey, endpoint, apiVersion });
    // const result = await client.request('GetIdVerify', { Name: realName, IdCard: idCard });
    // return result.Data.VerifyResult === 'T';

    const kycProvider = this.configService.get<string>('KYC_PROVIDER', '');
    if (!kycProvider) {
      this.logger.error(
        'KYC_PROVIDER 未配置，实名认证不可用。请配置 KYC 服务商或设置 REALNAME_DEV_MODE=true 进行联调。',
      );
      return false;
    }

    // 预留：根据 KYC_PROVIDER 路由到不同的实名认证服务
    // case 'aliyun': return await this.verifyViaAliyun(realName, idCard);
    // case 'tencent': return await this.verifyViaTencent(realName, idCard);
    this.logger.error(`KYC_PROVIDER=${kycProvider} 尚未实现，实名认证失败`);
    return false;
  }

  /** 查询进行中的抽奖活动（status=2 进行中 且在时间范围内） */
  private async findOngoingLuckyDrawActivity(): Promise<NftLuckyDrawActivity | null> {
    const now = new Date();
    const activity = await this.luckyDrawActivityRepo.findOne({
      where: { status: 2, isDelete: 0 },
      order: { createdAt: 'DESC' },
    });
    if (!activity) {
      return null;
    }
    if (activity.startTime && activity.startTime > now) {
      return null;
    }
    if (activity.endTime && activity.endTime < now) {
      return null;
    }
    return activity;
  }

  /**
   * 读取抽奖活动赠送次数
   * register_grant / invite_grant 字段已在 NftLuckyDrawActivity 实体中声明，
   * 数据库迁移脚本 004_lucky_draw_grants.sql 已补充对应列。
   */
  private getActivityGrant(
    activity: NftLuckyDrawActivity | null,
    type: 'register' | 'invite',
  ): number {
    if (!activity) {
      return 0;
    }
    const grant =
      type === 'register' ? activity.registerGrant : activity.inviteGrant;
    return Number(grant) || 0;
  }

  /** 校验图形验证码（开发环境自动跳过） */
  private async verifyCaptcha(
    captchaKey?: string,
    captchaCode?: string,
  ): Promise<void> {
    // 非生产环境跳过图形验证码校验，方便前端联调
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv !== 'production') {
      return;
    }
    if (!captchaKey || !captchaCode) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '图形验证码不能为空',
      });
    }
    const stored = await this.redis.get(`${CAPTCHA_PREFIX}${captchaKey}`);
    if (
      !stored ||
      stored.toLowerCase() !== String(captchaCode).toLowerCase()
    ) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '图形验证码错误或已过期',
      });
    }
    // 一次性使用
    await this.redis.del(`${CAPTCHA_PREFIX}${captchaKey}`);
  }

  /** 校验短信验证码（校验成功后一次性消费） */
  private async verifySmsCode(
    phone: string,
    scene: number,
    code?: string,
  ): Promise<void> {
    if (!code) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '短信验证码不能为空',
      });
    }
    const stored = await this.redis.get(`sms:code:${phone}:${scene}`);
    if (!stored || stored !== code) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '短信验证码错误或已过期',
      });
    }
    await this.redis.del(`sms:code:${phone}:${scene}`);

    // 标记对应短信日志已使用
    this.smsLogRepo
      .update({ phone, scene, code, isDelete: 0 }, { usedAt: new Date() })
      .catch(() => undefined);
  }

  /** 获取当前 token 版本号 */
  private async getCurrentTokenVersion(userId: number): Promise<number> {
    const v = await this.redis.get(TOKEN_VERSION_KEY(userId));
    return v ? parseInt(v, 10) : 0;
  }

  /**
   * INT-006 修复：记录登录失败次数
   * 累计达到 LOGIN_MAX_FAILURES 次后锁定账号 LOGIN_LOCK_DURATION 秒
   */
  private async recordLoginFailure(phone: string): Promise<void> {
    const failKey = `auth:login_fail:${phone}`;
    const failCount = await this.redis.incr(failKey);
    if (failCount === 1) {
      // 首次失败设置 TTL（与锁定时长一致，超时自动清除计数）
      await this.redis.expire(failKey, LOGIN_LOCK_DURATION);
    }
    if (failCount >= LOGIN_MAX_FAILURES) {
      // 达到阈值，锁定账号
      await this.redis.setex(
        `auth:login_lock:${phone}`,
        LOGIN_LOCK_DURATION,
        '1',
      );
      // 清除失败计数（锁定期间不再累加）
      await this.redis.del(failKey);
    }
  }

  /** 递增 token 版本号（使该用户所有旧 JWT 失效），返回新版本号 */
  private async incrementTokenVersion(userId: number): Promise<number> {
    return this.redis.incr(TOKEN_VERSION_KEY(userId));
  }

  /** 使该用户所有 Token 即时失效（递增版本号 + 吊销当前 refresh_token） */
  private async invalidateAllTokens(userId: number): Promise<void> {
    await this.incrementTokenVersion(userId);
    await this.revokeUserActiveRefreshToken(userId);
  }

  /** 吊销用户当前活跃的 refresh_token */
  private async revokeUserActiveRefreshToken(userId: number): Promise<void> {
    const rft = await this.redis.get(`auth:user_active_rft:${userId}`);
    if (rft) {
      await this.redis.del(`auth:refresh:${rft}`);
      await this.redis.del(`auth:user_active_rft:${userId}`);
    }
  }

  /** 解析 JWT 剩余有效期（秒） */
  private getTokenRemainingTtl(token: string): number {
    try {
      const decoded = this.jwtService.decode(token) as
        | { exp?: number }
        | null;
      if (decoded && decoded.exp) {
        const remaining = decoded.exp - Math.floor(Date.now() / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      /* ignore */
    }
    return this.getAccessTokenExpiresInSeconds();
  }

  /** 签发 JWT + refresh_token 并存储 */
  private async signTokenPair(user: NftUser): Promise<{
    token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const ver = await this.getCurrentTokenVersion(Number(user.id));
    const payload: JwtPayload = {
      id: Number(user.id),
      username: user.username,
      phone: user.phone,
      ver,
    };
    const token = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();
    const refreshTtl = this.getRefreshTokenExpiresInSeconds();

    // 存储 refresh_token（含版本号，用于校验与批量失效）
    await this.redis.setex(
      `auth:refresh:${refreshToken}`,
      refreshTtl,
      JSON.stringify({
        userId: Number(user.id),
        ver,
        exp: Date.now() + refreshTtl * 1000,
      }),
    );
    // 记录用户当前活跃 refresh_token（供登出/批量失效吊销）
    await this.redis.setex(
      `auth:user_active_rft:${user.id}`,
      refreshTtl,
      refreshToken,
    );

    return {
      token,
      refresh_token: refreshToken,
      expires_in: this.getAccessTokenExpiresInSeconds(),
    };
  }

  /** 构造登录/注册返回的用户视图对象 */
  private buildLoginUserVo(user: NftUser): Record<string, any> {
    return {
      id: Number(user.id),
      uid: user.uid,
      phone: this.maskPhone(user.phone),
      username: user.username,
      avatar: user.avatar || '',
      is_realname: user.isRealname === 1,
      has_transaction_password: !!(user as any).transactionPassword,
    };
  }

  /** 写入操作审计日志（best-effort，失败不影响主流程） */
  private async writeOperationLog(
    targetTable: string,
    targetId: number,
    action: string,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
    ip: string | null,
  ): Promise<void> {
    const log = new NftOperationLog();
    log.adminId = null;
    log.targetTable = targetTable;
    log.targetId = targetId;
    log.action = action;
    log.oldValue = oldValue;
    log.newValue = newValue;
    log.ip = ip;
    await this.operationLogRepo.save(log);
  }
}
