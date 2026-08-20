// [盲盒模块] - 盲盒业务服务
// 负责：盲盒列表 / 盲盒详情(含奖品池) / 开启盲盒
// 开启盲盒在事务内执行，并使用乐观锁(version 字段)防并发，
// 影响行数为 0 时抛出 ConflictException。
// 本模块仅 JWT 认证，不涉及交易密码。
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NftBlindBox } from '../../database/entities/nft-blind-box.entity';
import { NftBlindBoxItem } from '../../database/entities/nft-blind-box-item.entity';
import { NftBlindBoxOpenRecord } from '../../database/entities/nft-blind-box-open-record.entity';
import { NftCollectible } from '../../database/entities/nft-collectible.entity';
import { NftUserCollectible } from '../../database/entities/nft-user-collectible.entity';
import { NftOperationLog } from '../../database/entities/nft-operation-log.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OpenBlindBoxDto } from './dto/open-blind-box.dto';

@Injectable()
export class BlindBoxService {
  private readonly logger = new Logger(BlindBoxService.name);

  constructor(
    @InjectRepository(NftBlindBox)
    private readonly blindBoxRepo: Repository<NftBlindBox>,
    @InjectRepository(NftBlindBoxItem)
    private readonly blindBoxItemRepo: Repository<NftBlindBoxItem>,
    @InjectRepository(NftBlindBoxOpenRecord)
    private readonly openRecordRepo: Repository<NftBlindBoxOpenRecord>,
    @InjectRepository(NftCollectible)
    private readonly collectibleRepo: Repository<NftCollectible>,
    @InjectRepository(NftUserCollectible)
    private readonly userCollectibleRepo: Repository<NftUserCollectible>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 盲盒列表(分页)
   * 查询 nft_blind_boxes JOIN nft_collectibles(盲盒本身也是藏品)
   * WHERE c.is_release=1 AND c.is_delete=0 AND b.is_delete=0
   * 附带奖品池预览(不暴露概率)
   */
  async getList(query: PaginationDto) {
    const page = query.page ?? 1;
    const page_size = query.page_size ?? 20;

    const qb = this.blindBoxRepo
      .createQueryBuilder('b')
      .innerJoin(NftCollectible, 'c', 'c.id = b.collectible_id')
      .where('b.is_delete = 0')
      .andWhere('c.is_delete = 0')
      .andWhere('c.is_release = 1')
      .orderBy('b.id', 'DESC');

    const total = await qb.getCount();

    const rows = await qb
      .select([
        'b.id AS blind_box_id',
        'b.collectible_id AS collectible_id',
        'c.name AS name',
        'c.image AS image',
        'c.price AS price',
        'c.edition AS edition',
        'c.sold AS sold',
        'c.status AS status',
        'c.tag AS tag',
      ])
      .offset((page - 1) * page_size)
      .limit(page_size)
      .getRawMany();

    // 批量获取奖品池预览(不暴露概率)
    const blindBoxIds = rows.map((r: any) => Number(r.blind_box_id));
    const previewMap: Record<number, any[]> = {};
    if (blindBoxIds.length > 0) {
      const items = await this.blindBoxItemRepo
        .createQueryBuilder('i')
        .innerJoin(NftCollectible, 'c', 'c.id = i.collectible_id')
        .where('i.is_delete = 0')
        .andWhere('i.blind_box_id IN (:...ids)', { ids: blindBoxIds })
        .select([
          'i.blind_box_id AS blind_box_id',
          'c.name AS name',
          'c.image AS image',
          'c.tag AS rarity',
        ])
        .getRawMany();
      for (const it of items) {
        const key = Number(it.blind_box_id);
        if (!previewMap[key]) previewMap[key] = [];
        previewMap[key].push({
          name: it.name,
          image: it.image,
          rarity: it.rarity,
        });
      }
    }

    return {
      list: rows.map((r: any) => ({
        id: Number(r.blind_box_id),
        collectible_id: Number(r.collectible_id),
        name: r.name,
        image: r.image,
        price: r.price,
        edition: r.edition,
        sold: r.sold,
        status: r.status,
        prize_preview: previewMap[Number(r.blind_box_id)] ?? [],
      })),
      total,
      page,
      page_size,
    };
  }

  /**
   * 盲盒详情(含完整奖品池)
   * 查询盲盒信息 + nft_blind_box_items JOIN nft_collectibles → 返回奖品池含概率
   */
  async getDetail(id: number) {
    const blindBox = await this.blindBoxRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!blindBox) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '盲盒不存在',
      });
    }

    const collectible = await this.collectibleRepo.findOne({
      where: { id: blindBox.collectibleId, isDelete: 0 },
    });
    if (!collectible) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '盲盒藏品信息不存在',
      });
    }

    const items = await this.blindBoxItemRepo
      .createQueryBuilder('i')
      .innerJoin(NftCollectible, 'c', 'c.id = i.collectible_id')
      .where('i.blind_box_id = :blindBoxId', { blindBoxId: id })
      .andWhere('i.is_delete = 0')
      .orderBy('i.id', 'ASC')
      .select([
        'i.id AS item_id',
        'i.collectible_id AS collectible_id',
        'c.name AS name',
        'c.image AS image',
        'i.probability AS probability',
        'i.quantity_limit AS quantity_limit',
        'i.quantity_distributed AS quantity_distributed',
      ])
      .getRawMany();

    return {
      id: Number(blindBox.id),
      name: collectible.name,
      image: collectible.image,
      price: collectible.price,
      edition: collectible.edition,
      sold: collectible.sold,
      prizes: items.map((it: any) => ({
        id: Number(it.item_id),
        collectible_id: Number(it.collectible_id),
        name: it.name,
        image: it.image,
        probability: it.probability,
        quantity_limit: it.quantity_limit,
        quantity_distributed: it.quantity_distributed,
      })),
    };
  }

  /**
   * 开启盲盒
   * 事务内：
   *   1.  校验 user_collectible_id 归属当前用户
   *   2.  校验藏品是盲盒(status=1 持有) 且 collectibleId 匹配盲盒
   *   3.  加权随机选择奖品(nft_blind_box_items.probability)
   *   4.  概率兜底: 概率之和偏离 1 或库存不足时，按剩余可用奖品均分概率
   *   5.  消耗盲盒: user_collectible.status=5(已消耗) [乐观锁]
   *   6.  生成新藏品: 创建新的 nft_user_collectibles(source='blindbox')
   *   7.  生成 serial_no: collectible.serial_current += 1, CONCAT(serial_prefix, serial_current)
   *   8.  写入 nft_blind_box_open_records
   *   9.  // TODO: 触发异步 mint(上链藏品)
   *   10. 写入 nft_operation_logs 审计
   *   11. 返回中奖信息(prize_name, collectible_image, serial_no)
   */
  async open(
    userId: number,
    blindBoxId: number,
    dto: OpenBlindBoxDto,
  ): Promise<{ data: any; message: string }> {
    return this.dataSource.transaction(async (manager) => {
      // 1) 校验盲盒存在
      const blindBox = await manager.findOne(NftBlindBox, {
        where: { id: blindBoxId, isDelete: 0 },
      });
      if (!blindBox) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '盲盒不存在',
        });
      }

      // 2) 校验 user_collectible 归属当前用户 + 持有状态 + 确实是该盲盒
      const userCollectible = await manager.findOne(NftUserCollectible, {
        where: { id: dto.user_collectible_id, userId, isDelete: 0 },
      });
      if (!userCollectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '盲盒不存在或不属于您',
        });
      }
      // 校验持有状态(status=1)；source 不做强校验(购买/转赠/盲盒来源均可开启)
      if (userCollectible.status !== 1) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该盲盒当前状态不可开启',
        });
      }
      // 校验该用户藏品确实是这个盲盒(通过 collectibleId 匹配)
      if (userCollectible.collectibleId !== blindBox.collectibleId) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '该藏品不是此盲盒，无法开启',
        });
      }

      // 3) 查询奖品池配置
      const items = await manager.find(NftBlindBoxItem, {
        where: { blindBoxId, isDelete: 0 },
      });
      if (!items || items.length === 0) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: '盲盒奖品池未配置',
        });
      }

      // 3.5) 校验概率之和是否为 100%（允许 ±1% 浮点误差）
      const probSum = items.reduce(
        (sum, it) => sum + Number(it.probability),
        0,
      );
      if (probSum < 0.99 || probSum > 1.01) {
        throw new BadRequestException({
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: `盲盒奖品概率之和异常，应为 100%（当前 ${(probSum * 100).toFixed(2)}%）`,
        });
      }

      // 4) 过滤可用奖品(库存未耗尽)
      const available = items.filter((it) => {
        if (it.quantityLimit === null) return true; // 不限量
        return it.quantityLimit - it.quantityDistributed > 0;
      });
      if (available.length === 0) {
        // 奖品池全空 -> 422
        throw new HttpException(
          {
            code: ErrorCode.VALIDATION_FAILED,
            data: null,
            message: '奖品池已售罄，无法开启',
          },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // 直接使用配置的概率值进行加权随机，不做兜底归一化
      const weightedItems = available.map((it) => ({
        item: it,
        weight: Number(it.probability),
      }));

      // 加权随机选择奖品
      const picked = this.weightedPick(weightedItems);

      // 5) 增加奖品已发放数量(条件更新防超卖，NftBlindBoxItem 无 version 字段)
      const itemUpdated = await manager
        .createQueryBuilder()
        .update(NftBlindBoxItem)
        .set({ quantityDistributed: () => 'quantity_distributed + 1' })
        .where('id = :id', { id: picked.id })
        .andWhere(
          '(quantity_limit IS NULL OR quantity_distributed < quantity_limit)',
        )
        .execute();
      if (!itemUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '奖品库存已变更，请重试',
        });
      }

      // 6) 消耗盲盒: user_collectible.status=5(已消耗) [乐观锁]
      const ucUpdated = await manager
        .createQueryBuilder()
        .update(NftUserCollectible)
        .set({ status: 5, version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: userCollectible.id,
          version: userCollectible.version,
        })
        .execute();
      if (!ucUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '盲盒状态已变更，请刷新后重试',
        });
      }

      // 7) 生成奖品藏品 serial_no: collectible.serial_current += 1 [乐观锁]
      const prizeCollectible = await manager.findOne(NftCollectible, {
        where: { id: picked.collectibleId, isDelete: 0 },
      });
      if (!prizeCollectible) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '奖品藏品信息不存在',
        });
      }

      const newSerial = prizeCollectible.serialCurrent + 1;
      const cUpdated = await manager
        .createQueryBuilder()
        .update(NftCollectible)
        .set({
          serialCurrent: () => 'serial_current + 1',
          circulate: () => 'circulate + 1',
          version: () => 'version + 1',
        })
        .where('id = :id AND version = :version', {
          id: prizeCollectible.id,
          version: prizeCollectible.version,
        })
        .execute();
      if (!cUpdated.affected) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          data: null,
          message: '藏品库存已变更，请重试',
        });
      }

      const serialNo = this.buildSerialNo(
        prizeCollectible.serialPrefix,
        newSerial,
        prizeCollectible.edition,
      );

      // 8) 生成新藏品: nft_user_collectibles(source='blindbox')
      const now = new Date();
      const prizeUserCollectible = manager.create(NftUserCollectible, {
        userId,
        collectibleId: picked.collectibleId,
        orderId: null,
        blindBoxItemId: picked.id,
        airdropRecordId: null,
        serialNo,
        source: 'blindbox',
        acquiredPrice: 0,
        acquiredAt: now,
        isConsigned: 0,
        status: 1, // 持有
        txHash: null,
        blockNumber: null,
        tokenId: null,
        mintStatus: 0, // 待上链
        isDelete: 0,
      });
      const savedPrizeUc = await manager.save(
        NftUserCollectible,
        prizeUserCollectible,
      );

      // 9) 写入 nft_blind_box_open_records
      const openRecord = manager.create(NftBlindBoxOpenRecord, {
        userId,
        blindBoxId,
        consumedUserCollectibleId: userCollectible.id,
        blindBoxItemId: picked.id,
        prizeUserCollectibleId: savedPrizeUc.id,
        isDelete: 0,
      });
      await manager.save(NftBlindBoxOpenRecord, openRecord);

      // 10) // TODO: 触发异步 mint(上链藏品)
      //     await this.chainService.mint(savedPrizeUc.id);

      // 11) 写入 nft_operation_logs 审计
      await manager.save(NftOperationLog, {
        adminId: null,
        targetTable: 'nft_user_collectibles',
        targetId: Number(savedPrizeUc.id),
        action: 'open_blind_box',
        oldValue: {
          consumed_user_collectible_id: userCollectible.id,
          blind_box_id: blindBoxId,
        },
        newValue: {
          prize_user_collectible_id: Number(savedPrizeUc.id),
          blind_box_item_id: picked.id,
          collectible_id: picked.collectibleId,
          serial_no: serialNo,
        },
        ip: null,
        isDelete: 0,
      });

      // 12) 返回中奖信息
      const rarity = prizeCollectible.tag ?? null;
      const data = {
        prize: {
          collectible_id: Number(prizeCollectible.id),
          name: prizeCollectible.name,
          image: prizeCollectible.image,
          serial_no: serialNo,
          rarity,
        },
        new_user_collectible_id: Number(savedPrizeUc.id),
      };

      const message = this.buildOpenMessage(prizeCollectible.name, rarity);
      return { data, message };
    });
  }

  // ==================== 私有辅助方法 ====================

  /**
   * 加权随机选择奖品
   * 使用密码学安全随机数（crypto.randomBytes），直接使用传入的权重值
   * @param items 权重列表
   */
  private weightedPick(
    items: { item: NftBlindBoxItem; weight: number }[],
  ): NftBlindBoxItem {
    const total = items.reduce((sum, it) => sum + it.weight, 0);
    if (total <= 0) {
      // 权重全为 0 时随机选一个
      const randBuffer = crypto.randomBytes(4);
      const idx = randBuffer.readUInt32BE() % items.length;
      return items[idx].item;
    }
    // 密码学安全随机数 [0, total)
    const randBuffer = crypto.randomBytes(8);
    const rand = (Number(randBuffer.readBigUInt64BE()) / Number(2n ** 64n)) * total;
    let acc = 0;
    for (const { item, weight } of items) {
      acc += weight;
      if (rand < acc) {
        return item;
      }
    }
    // 浮点兜底：返回最后一个
    return items[items.length - 1].item;
  }

  /**
   * 生成编号：serial_prefix + 零填充 serial
   * 填充宽度按 edition 位数计算，最小 4 位
   * @example ('#', 61, 5000) -> '#0061'
   */
  private buildSerialNo(
    prefix: string,
    serial: number,
    edition: number,
  ): string {
    const width = Math.max(4, String(edition || 0).length);
    return `${prefix}${String(serial).padStart(width, '0')}`;
  }

  /**
   * 构建开盲盒弹窗友好文案
   */
  private buildOpenMessage(name: string, rarity: string | null): string {
    if (rarity && ['SSR', 'UR'].includes(rarity.toUpperCase())) {
      return `恭喜！开出了${rarity}·${name}！`;
    }
    return `恭喜！开出了「${name}」`;
  }
}
