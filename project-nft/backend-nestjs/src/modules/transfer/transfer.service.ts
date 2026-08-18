// [转赠模块] - 转赠业务服务
// 5 个端点：
//   1. POST /transfers             JWT + @TxPassword  发起转赠
//   2. PUT  /transfers/:id/confirm JWT                确认接收转赠
//   3. PUT  /transfers/:id/reject  JWT                拒绝转赠
//   4. PUT  /transfers/:id/cancel  JWT                取消转赠（发起方）
//   5. GET  /transfers             JWT                转赠记录
// 所有资产变动操作均在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException。
// 确认接收后通过 forwardRef 注入 LuckyDrawService 异步检测 hold_collectible 抽奖规则。
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { NftTransfer } from '../../database/entities/nft-transfer.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUser } from '../../database/entities/nft-user.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { LuckyDrawService } from '../luckydraw/luckydraw.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(
    @InjectRepository(NftTransfer)
    private readonly transferRepo: Repository<NftTransfer>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUser)
    private readonly userRepo: Repository<NftUser>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    @Inject(forwardRef(() => LuckyDrawService))
    private readonly luckyDrawService: LuckyDrawService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 端点 1：发起转赠
  // ============================================================

  /**
   * 发起转赠
   *
   * 事务内执行：
   * 1. 校验藏品归属且 status=1(持有)
   * 2. 校验藏品 is_transferable=1
   * 3. 校验接收方用户存在（按 to_phone 查询）
   * 4. 乐观锁冻结藏品(status=3 冻结，基于 user_collectibles.version)
   * 5. 写入 nft_transfers(status=1 待确认)
   * 6. 写入 operation_logs
   *
   * 交易密码校验由 TxPasswordGuard 在进入控制器前完成(bcrypt)。
   *
   * @returns { data: { transfer_id, to_nickname, status, created_at }, message }
   */
  async createTransfer(
    userId: number,
    dto: CreateTransferDto,
  ): Promise<{ data: any; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      // 1) 校验藏品归属
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: dto.user_collectible_id, userId, isDelete: 0 },
      });
      if (!uc) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品不存在或不属于您',
        });
      }
      if (uc.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该藏品当前状态不可转赠',
        });
      }

      // 2) 校验藏品可转赠
      const collectible = await manager.findOne(NftCollectible, {
        where: { id: uc.collectibleId, isDelete: 0 },
      });
      if (!collectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品信息不存在',
        });
      }
      if (!collectible.isTransferable) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该藏品不可转赠',
        });
      }

      // 3) 查询接收方用户是否存在
      const toUser = await manager.findOne(NftUser, {
        where: { phone: dto.to_phone, isDelete: 0 },
      });
      if (!toUser) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '接收方用户不存在',
        });
      }
      if (Number(toUser.id) === Number(userId)) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '不能转赠给自己',
        });
      }

      // INT-012 修复：转赠需双方实名认证
      // 发起方实名校验
      const sender = await manager.findOne(NftUser, {
        where: { id: userId, isDelete: 0 },
        select: ['id', 'isRealname'],
      });
      if (!sender || sender.isRealname !== 1) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          data: null,
          message: '请先完成实名认证后再转赠藏品',
        });
      }
      // 接收方实名校验
      if (toUser.isRealname !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '接收方尚未完成实名认证，无法接收转赠',
        });
      }

      // 4) 乐观锁冻结藏品(status=3 冻结)，基于 version
      const ucUpdated = await manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({ status: 3, version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: uc.id,
          version: uc.version,
        })
        .execute();
      if (!ucUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '藏品状态已变更，请刷新后重试',
        });
      }

      // 5) 写入 nft_transfers(status=1 待确认)
      const transfer = manager.create(NftTransfer, {
        fromUserId: userId,
        toUserId: toUser.id,
        toPhone: dto.to_phone,
        toNickname: toUser.username,
        collectibleId: uc.collectibleId,
        userCollectibleId: uc.id,
        status: 1,
        confirmedAt: null,
        isDelete: 0,
      });
      const savedTransfer = await manager.save(NftTransfer, transfer);

      // 6) 写入 operation_logs
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_transfers',
        targetId: Number(savedTransfer.id),
        action: 'create_transfer',
        oldValue: null,
        newValue: {
          transfer_id: Number(savedTransfer.id),
          user_collectible_id: uc.id,
          from_user_id: userId,
          to_user_id: toUser.id,
          to_phone: dto.to_phone,
        },
        ip: null,
        isDelete: 0,
      });

      return {
        data: {
          transfer_id: Number(savedTransfer.id),
          to_nickname: toUser.username,
          status: savedTransfer.status,
          created_at: savedTransfer.createdAt,
        },
        message: '转赠请求已发送，等待对方确认',
      };
    });
  }

  // ============================================================
  // 端点 2：确认接收转赠
  // ============================================================

  /**
   * 确认接收转赠
   *
   * 事务内执行：
   * 1. 校验 to_user_id=当前用户 且 status=1(待确认)
   * 2. 乐观锁更新藏品 user_id=接收方, source='transfer', status=1（基于 version）
   * 3. 更新 transfer.status=2(已接受)
   * 4. 若上链触发 transferFrom（TODO）
   * 5. 写入 operation_logs
   *
   * 事务提交后异步检测 hold_collectible 抽奖规则，命中则发放次数（TODO）。
   *
   * @returns { data: null, message: '已确认接收' }
   */
  async confirmTransfer(
    userId: number,
    transferId: number,
  ): Promise<{ data: null; message: string }> {
    // 1) 校验 transfer 存在且 to_user_id=当前用户 且 status=1(待确认)
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId, isDelete: 0 },
    });
    if (!transfer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '转赠记录不存在',
      });
    }
    if (Number(transfer.toUserId) !== Number(userId)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '无权操作此转赠',
      });
    }
    if (transfer.status !== 1) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '转赠当前状态不可确认',
      });
    }

    // 缓存事务外需要使用的字段
    const toUserId = Number(transfer.toUserId);
    const collectibleId = transfer.collectibleId;
    const userCollectibleId = transfer.userCollectibleId;

    // 2) 事务内执行
    await this.dataSource.transaction(async (manager) => {
      // a) 查询藏品记录
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: userCollectibleId, isDelete: 0 },
      });
      if (!uc) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '藏品记录不存在',
        });
      }

      // b) 乐观锁更新藏品：user_id=接收方, source='transfer', status=1（基于 version）
      const ucUpdated = await manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({
          userId: toUserId,
          source: 'transfer',
          status: 1,
          version: () => 'version + 1',
        })
        .where('id = :id AND version = :version', {
          id: uc.id,
          version: uc.version,
        })
        .execute();
      if (!ucUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '藏品状态已变更，请刷新后重试',
        });
      }

      // c) 更新 transfer.status=2(已接受)
      //    NftTransfer 无 version 字段，使用 WHERE status=1 防并发
      const now = new Date();
      const transferUpdated = await manager
        .createQueryBuilder()
        .update(NftTransfer)
        .set({ status: 2, confirmedAt: now })
        .where('id = :id AND status = 1', { id: transferId })
        .execute();
      if (!transferUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '转赠状态已变更，请刷新后重试',
        });
      }

      // d) 若上链触发 transferFrom
      // TODO: 若藏品已上链(is_on_chain=1)，调用链上 transferFrom(from地址, to地址, token_id)

      // e) 写入 operation_logs
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_transfers',
        targetId: transferId,
        action: 'confirm_transfer',
        oldValue: { status: 1, user_id: transfer.fromUserId },
        newValue: { status: 2, user_id: toUserId, source: 'transfer' },
        ip: null,
        isDelete: 0,
      });
    });

    // 3) 获得新藏品后异步检测 hold_collectible 类型抽奖规则，命中则发放次数
    // TODO: 检测当前进行中的 hold_collectible 类型抽奖活动，
    //       若接收方持有的藏品(collectibleId)满足活动规则，
    //       调用 luckyDrawService.grantChances 发放抽奖次数
    //       e.g. await this.luckyDrawService.grantChances(toUserId, activityId, 'hold_collectible', count)
    this.logger.debug(
      `转赠确认完成，待检测 hold_collectible 抽奖规则: userId=${toUserId}, collectibleId=${collectibleId}`,
    );

    return {
      data: null,
      message: '已确认接收',
    };
  }

  // ============================================================
  // 端点 3：拒绝转赠
  // ============================================================

  /**
   * 拒绝转赠
   *
   * 事务内执行：
   * 1. 校验 to_user_id=当前用户 且 status=1(待确认)
   * 2. 乐观锁恢复藏品 status=1(持有，基于 version)
   * 3. 更新 transfer.status=3(已拒绝)
   * 4. 写入 operation_logs
   *
   * @returns { data: null, message: '已拒绝转赠' }
   */
  async rejectTransfer(
    userId: number,
    transferId: number,
  ): Promise<{ data: null; message: string }> {
    // 1) 校验 to_user_id=当前用户 且 status=1
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId, isDelete: 0 },
    });
    if (!transfer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '转赠记录不存在',
      });
    }
    if (Number(transfer.toUserId) !== Number(userId)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '无权操作此转赠',
      });
    }
    if (transfer.status !== 1) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '转赠当前状态不可拒绝',
      });
    }

    // 2) 事务内执行
    await this.dataSource.transaction(async (manager) => {
      // a) 乐观锁恢复藏品 status=1(持有)，基于 version
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: transfer.userCollectibleId, isDelete: 0 },
      });
      if (uc) {
        const ucUpdated = await manager
          .createQueryBuilder()
          .update(NftUserCollectible)
          .set({ status: 1, version: () => 'version + 1' })
          .where('id = :id AND version = :version', {
            id: uc.id,
            version: uc.version,
          })
          .execute();
        if (!ucUpdated.affected) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '藏品状态已变更，请刷新后重试',
          });
        }
      }

      // b) 更新 transfer.status=3(已拒绝)
      const transferUpdated = await manager
        .createQueryBuilder()
        .update(NftTransfer)
        .set({ status: 3 })
        .where('id = :id AND status = 1', { id: transferId })
        .execute();
      if (!transferUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '转赠状态已变更，请刷新后重试',
        });
      }

      // c) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_transfers',
        targetId: transferId,
        action: 'reject_transfer',
        oldValue: { status: 1 },
        newValue: { status: 3 },
        ip: null,
        isDelete: 0,
      });
    });

    return {
      data: null,
      message: '已拒绝转赠',
    };
  }

  // ============================================================
  // 端点 4：取消转赠（发起方）
  // ============================================================

  /**
   * 取消转赠（发起方）
   *
   * 事务内执行：
   * 1. 校验 from_user_id=当前用户 且 status=1(待确认)
   * 2. 乐观锁恢复藏品 status=1(持有，基于 version)
   * 3. 更新 transfer.status=4(已取消)
   * 4. 写入 operation_logs
   *
   * @returns { data: null, message: '已取消转赠' }
   */
  async cancelTransfer(
    userId: number,
    transferId: number,
  ): Promise<{ data: null; message: string }> {
    // 1) 校验 from_user_id=当前用户 且 status=1
    const transfer = await this.transferRepo.findOne({
      where: { id: transferId, isDelete: 0 },
    });
    if (!transfer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '转赠记录不存在',
      });
    }
    if (Number(transfer.fromUserId) !== Number(userId)) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        data: null,
        message: '无权操作此转赠',
      });
    }
    if (transfer.status !== 1) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '转赠当前状态不可取消',
      });
    }

    // 2) 事务内执行
    await this.dataSource.transaction(async (manager) => {
      // a) 乐观锁恢复藏品 status=1(持有)，基于 version
      const uc = await manager.findOne(NftUserCollectible, {
        where: { id: transfer.userCollectibleId, isDelete: 0 },
      });
      if (uc) {
        const ucUpdated = await manager
          .createQueryBuilder()
          .update(NftUserCollectible)
          .set({ status: 1, version: () => 'version + 1' })
          .where('id = :id AND version = :version', {
            id: uc.id,
            version: uc.version,
          })
          .execute();
        if (!ucUpdated.affected) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            data: null,
            message: '藏品状态已变更，请刷新后重试',
          });
        }
      }

      // b) 更新 transfer.status=4(已取消)
      const transferUpdated = await manager
        .createQueryBuilder()
        .update(NftTransfer)
        .set({ status: 4 })
        .where('id = :id AND status = 1', { id: transferId })
        .execute();
      if (!transferUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '转赠状态已变更，请刷新后重试',
        });
      }

      // c) 写入审计日志
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_transfers',
        targetId: transferId,
        action: 'cancel_transfer',
        oldValue: { status: 1 },
        newValue: { status: 4 },
        ip: null,
        isDelete: 0,
      });
    });

    return {
      data: null,
      message: '已取消转赠',
    };
  }

  // ============================================================
  // 端点 5：转赠记录（分页）
  // ============================================================

  /**
   * 转赠记录（分页）
   * 查询 nft_transfers WHERE from_user_id 或 to_user_id = 当前用户
   * JOIN nft_collectibles（藏品名称/图片）+ nft_user_collectibles（序列号）
   * to_phone 脱敏处理（中间4位替换为 ****）
   */
  async getTransfers(userId: number, query: TransferQueryDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.transferRepo
      .createQueryBuilder('t')
      .innerJoin(NftCollectible, 'c', 'c.id = t.collectible_id')
      .innerJoin(
        NftUserCollectible,
        'uc',
        'uc.id = t.user_collectible_id',
      )
      .where('t.is_delete = 0')
      .andWhere('(t.from_user_id = :userId OR t.to_user_id = :userId)', {
        userId,
      });

    if (query.direction === 'sent') {
      qb.andWhere('t.from_user_id = :userId', { userId });
    } else if (query.direction === 'received') {
      qb.andWhere('t.to_user_id = :userId', { userId });
    }

    if (query.status) {
      qb.andWhere('t.status = :status', { status: query.status });
    }

    qb.orderBy('t.created_at', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        't.id AS id',
        't.from_user_id AS from_user_id',
        't.to_user_id AS to_user_id',
        't.to_phone AS to_phone',
        't.to_nickname AS to_nickname',
        'c.name AS collectible_name',
        'c.image AS collectible_image',
        'uc.serial_no AS serial_no',
        't.status AS status',
        't.created_at AS created_at',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    return {
      list: rows.map((r: any) => ({
        id: Number(r.id),
        direction: Number(r.from_user_id) === userId ? 'sent' : 'received',
        to_phone: this.maskPhone(r.to_phone),
        to_nickname: r.to_nickname,
        collectible_name: r.collectible_name,
        collectible_image: r.collectible_image,
        serial_no: r.serial_no,
        status: r.status,
        created_at: r.created_at,
      })),
      total,
      page,
      page_size,
    };
  }

  // ============================================================
  // 私有辅助方法
  // ============================================================

  /**
   * 手机号脱敏：中间4位替换为 ****
   * @example 13900006666 -> 139****6666
   */
  private maskPhone(phone: string): string {
    if (!phone || phone.length < 7) {
      return phone;
    }
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
  }
}
