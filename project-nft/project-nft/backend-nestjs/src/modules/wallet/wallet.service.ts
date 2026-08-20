// [钱包模块] - 钱包业务服务
// 端点：
//   1. GET  /wallet                   钱包信息
//   2. GET  /wallet/channels          当前启用支付通道列表
//   3. GET  /wallet/transactions      钱包流水列表
//   4. POST /wallet/recharge          钱包充值
//   5. POST /wallet/recharge/callback 充值回调（第三方异步通知）
//
// 负责：钱包信息查询 / 支付通道列表 / 流水查询 / 充值下单 / 充值回调（验签+幂等+乐观锁）
// 充值回调使用 DataSource.transaction() 保证钱包更新与流水写入的原子性，
// 乐观锁(version 字段)防并发，影响行数为 0 时抛出 ConflictException(code 409)。
// 第三方支付服务(AlipayService / WechatService)由全局 SharedModule 提供。
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { NftUserWallet } from '../../database/entities/nft-user-wallet.entity';
import { NftWalletTransaction } from '../../database/entities/nft-wallet-transaction.entity';
import { AlipayService } from '../../shared/payment/alipay.service';
import { WechatService } from '../../shared/payment/wechat.service';
import { RedisService } from '../../shared/redis.service';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { WalletTransactionsQueryDto } from './dto/wallet-transactions-query.dto';
import { RechargeDto } from './dto/recharge.dto';
import { RechargeCallbackDto } from './dto/recharge-callback.dto';

/** 支付通道定义（含预留通道） */
const PAYMENT_CHANNELS = [
  { code: 'balance', name: '余额支付', status: 'active' },
  { code: 'alipay', name: '支付宝', status: 'active' },
  { code: 'wechat', name: '微信支付', status: 'active' },
  { code: 'huifu', name: '汇付天下', status: 'coming_soon' },
  { code: 'yeepay', name: '易宝支付', status: 'coming_soon' },
] as const;

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(NftUserWallet)
    private readonly walletRepo: Repository<NftUserWallet>,
    @InjectRepository(NftWalletTransaction)
    private readonly walletTxnRepo: Repository<NftWalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly alipayService: AlipayService,
    private readonly wechatService: WechatService,
    @Inject('REDIS_SERVICE') private readonly redis: RedisService,
  ) {}

  // ============================================================
  // 端点 1：GET /wallet - 钱包信息
  // ============================================================
  /**
   * 钱包信息
   * 查询 nft_user_wallets WHERE user_id=当前用户
   * 钱包不存在时自动创建（兜底机制，正常应在注册时创建）
   */
  async getWallet(userId: number) {
    let wallet = await this.walletRepo.findOne({
      where: { userId, isDelete: 0 },
    });

    if (!wallet) {
      // 钱包不存在，自动创建（并发场景下唯一约束兜底）
      this.logger.warn(`用户钱包不存在(user_id=${userId})，自动创建`);
      try {
        wallet = this.walletRepo.create({ userId });
        wallet = await this.walletRepo.save(wallet);
      } catch (e: any) {
        // 并发创建冲突：另一个请求已创建，重新查询
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
          wallet = await this.walletRepo.findOne({
            where: { userId, isDelete: 0 },
          });
        } else {
          throw e;
        }
      }
      if (!wallet) {
        // 极端情况：创建失败且重新查询也失败
        return {
          balance: 0,
          frozen_balance: 0,
          total_recharged: 0,
          total_consumed: 0,
        };
      }
    }

    return {
      balance: Number(wallet.balance),
      frozen_balance: Number(wallet.frozenBalance),
      total_recharged: Number(wallet.totalRecharged),
      total_consumed: Number(wallet.totalConsumed),
    };
  }

  // ============================================================
  // 端点 2：GET /wallet/channels - 当前启用支付通道列表
  // ============================================================
  /**
   * 支付通道列表（含预留通道）
   * 返回所有通道及其状态：active / coming_soon
   */
  getChannels() {
    return {
      list: PAYMENT_CHANNELS.map((c) => ({
        code: c.code,
        name: c.name,
        status: c.status,
      })),
    };
  }

  // ============================================================
  // 端点 3：GET /wallet/transactions - 钱包流水列表
  // ============================================================
  /**
   * 钱包流水列表(分页)
   * 查询 nft_wallet_transactions WHERE user_id=当前用户
   * → 按 type 过滤 → 按 created_at DESC 分页
   */
  async getTransactions(userId: number, query: WalletTransactionsQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;
    const type = query.type ?? 'all';

    const qb = this.walletTxnRepo
      .createQueryBuilder('t')
      .where('t.user_id = :userId', { userId });

    if (type && type !== 'all') {
      qb.andWhere('t.type = :type', { type });
    }

    qb.orderBy('t.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        't.id AS id',
        't.type AS type',
        't.amount AS amount',
        't.balance_after AS balance_after',
        't.direction AS direction',
        't.related_order_no AS related_order_no',
        't.remark AS remark',
        't.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        type: r.type,
        amount: Number(r.amount),
        balance_after: Number(r.balance_after),
        direction: r.direction,
        related_order_no: r.related_order_no,
        remark: r.remark,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 端点 4：POST /wallet/recharge - 钱包充值
  // ============================================================
  /**
   * 钱包充值
   * 校验 payment_method 为已启用通道 → 创建充值订单(wallet_transaction pending)
   * → 调用第三方支付下单 → 返回支付链接
   *
   * huifu / yeepay：TODO coming_soon，直接返回错误
   */
  async recharge(userId: number, dto: RechargeDto) {
    // 1) 校验 payment_method 为已启用通道
    if (dto.payment_method === 'huifu' || dto.payment_method === 'yeepay') {
      // TODO: 接入汇付(huifu) / 易宝(yeepay) 支付通道
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '该支付方式暂未开通',
      });
    }

    // 2) 生成充值订单号（同时作为 related_order_no 与第三方 out_trade_no）
    const orderNo = this.generateRechargeNo();

    // 3) 调用第三方支付下单，获取支付链接
    let payUrl: string;
    let remark: string;
    if (dto.payment_method === 'alipay') {
      const result = await this.alipayService.createOrder(
        orderNo,
        dto.amount,
        '钱包充值',
      );
      payUrl = result.pay_url;
      remark = '支付宝充值';
    } else {
      // wechat
      const result = await this.wechatService.createOrder(
        orderNo,
        dto.amount,
        '钱包充值',
      );
      payUrl = result.pay_url;
      remark = '微信充值';
    }

    // 4) 创建充值流水记录(type=recharge, direction=in, balance_after=0 待回调更新)
    const transaction = this.walletTxnRepo.create({
      userId,
      type: 'recharge',
      amount: dto.amount,
      balanceAfter: 0,
      direction: 'in',
      relatedOrderNo: orderNo,
      remark,
    });
    const saved = await this.walletTxnRepo.save(transaction);

    // 5) 返回充值信息（含支付链接），自定义提示语
    return BaseResponseVo.success(
      {
        recharge_id: Number(saved.id),
        amount: dto.amount,
        pay_url: payUrl,
      },
      '请跳转支付完成充值',
    );
  }

  // ============================================================
  // 端点 5：POST /wallet/recharge/callback - 充值回调
  // ============================================================
  /**
   * 充值回调（第三方异步通知）
   * 流程：验签 → 幂等校验（transaction_no 为幂等键）→ 事务内乐观锁更新钱包
   *      → 更新流水 balance_after → 返回 void（由控制器统一 res.send('SUCCESS')）
   *
   * 注意：本方法内部捕获异常，保证始终返回 void，避免第三方重试风暴。
   * transaction_no 对应充值时生成的 related_order_no（第三方回传业务订单号）。
   */
  async handleRechargeCallback(dto: RechargeCallbackDto): Promise<void> {
    try {
      // 1) 验签
      if (!this.verifyCallbackSignature(dto)) {
        this.logger.warn(
          `[recharge callback] 验签失败 transaction_no=${dto.transaction_no}`,
        );
        return;
      }

      // 2) 仅处理支付成功通知
      if (dto.status !== 'success') {
        this.logger.log(
          `[recharge callback] 支付状态非 success(${dto.status})，忽略`,
        );
        return;
      }

      // 3) 金额校验
      const amount = Number(dto.amount);
      if (!(amount > 0)) {
        this.logger.warn(
          `[recharge callback] 金额非法 amount=${dto.amount}，忽略`,
        );
        return;
      }

      // 4) 查找待处理的充值流水（related_order_no = transaction_no）
      const pendingTx = await this.walletTxnRepo.findOne({
        where: {
          relatedOrderNo: dto.transaction_no,
          type: 'recharge',
          direction: 'in',
        },
      });

      if (!pendingTx) {
        this.logger.warn(
          `[recharge callback] 未找到对应的充值记录 transaction_no=${dto.transaction_no}`,
        );
        return;
      }

      // 5) 幂等校验：balance_after > 0 表示已处理
      if (Number(pendingTx.balanceAfter) > 0) {
        this.logger.log(
          `[recharge callback] 交易号 ${dto.transaction_no} 已处理，幂等返回`,
        );
        return;
      }

      // INT-011 修复：Redis 原子 SET NX EX 幂等锁，防止并发回调双重入账
      const idempotencyKey = `wallet:recharge:idempotency:${dto.transaction_no}`;
      const lockResult = await this.redis.setNxEx(idempotencyKey, Date.now().toString(), 3600);
      if (!lockResult) {
        this.logger.log(
          `[recharge callback] 交易号 ${dto.transaction_no} 正在处理中，跳过并发回调`,
        );
        return;
      }

      const userId = pendingTx.userId;

      // 6) 事务内：乐观锁更新钱包 + 更新流水 balance_after
      await this.dataSource.transaction(async (manager) => {
        // 查找钱包
        const wallet = await manager.findOne(NftUserWallet, {
          where: { userId, isDelete: 0 },
        });
        if (!wallet) {
          this.logger.warn(
            `[recharge callback] 钱包不存在 user_id=${userId}`,
          );
          return;
        }

        // 乐观锁更新：balance += amount, total_recharged += amount, version += 1
        // amount 已由 DTO @IsNumber 校验且上方二次 Number() 转换，插值安全
        const walletUpdated = await manager
          .createQueryBuilder()
          .update(NftUserWallet)
          .set({
            balance: () => `balance + ${amount}`,
            totalRecharged: () => `total_recharged + ${amount}`,
            version: () => 'version + 1',
          })
          .where('user_id = :userId AND version = :version', {
            userId,
            version: wallet.version,
          })
          .execute();

        if (!walletUpdated.affected) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '钱包余额更新冲突，请重试',
          });
        }

        // 更新流水 balance_after（从 0 标记为实际变动后余额）
        const balanceAfter = Number(wallet.balance) + amount;
        await manager.update(
          NftWalletTransaction,
          { id: pendingTx.id },
          { balanceAfter },
        );
      });

      this.logger.log(
        `[recharge callback] 充值成功 transaction_no=${dto.transaction_no} amount=${amount}`,
      );
    } catch (e: any) {
      // 回调处理异常：记录日志但不抛出，始终由控制器返回 SUCCESS，避免第三方重试风暴
      this.logger.error(
        `[recharge callback] 处理失败 transaction_no=${dto.transaction_no}: ${e?.message}`,
      );
    }
  }

  // ============================================================
  // 私有工具方法
  // ============================================================

  /**
   * 验签
   * 根据支付方式进行真实验签校验
   */
  private verifyCallbackSignature(dto: RechargeCallbackDto): boolean {
    if (dto.payment_method === 'alipay') {
      return this.alipayService.verifyCallback(dto);
    }
    if (dto.payment_method === 'wechat') {
      return this.wechatService.verifyCallback(dto);
    }
    this.logger.warn(
      `[recharge callback] 未知支付方式 payment_method=${dto.payment_method}，验签失败`,
    );
    return false;
  }

  /**
   * 生成充值订单号：RCH + yyyyMMddHHmmss + 3位随机数，共 20 位
   * @example RCH20260806143052001
   */
  private generateRechargeNo(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = pad(Math.floor(Math.random() * 1000), 3);
    return `RCH${stamp}${rand}`;
  }
}
