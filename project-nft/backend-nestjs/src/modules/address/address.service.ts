// [收货地址模块] - 收货地址业务服务
// 实现收货地址的 CRUD 及设置默认地址功能。
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NftUserAddress } from '../../database/entities/nft-user-address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/create-address.dto';
import { ErrorCode } from '../../common/enums/error-code.enum';

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(NftUserAddress)
    private readonly addressRepo: Repository<NftUserAddress>,
    private readonly dataSource: DataSource,
  ) {}

  /** 获取用户收货地址列表 */
  async list(userId: number): Promise<{ list: any[]; total: number }> {
    const rows = await this.addressRepo
      .createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere('a.is_delete = 0')
      .orderBy('a.is_default', 'DESC')
      .addOrderBy('a.updated_at', 'DESC')
      .getMany();

    const list = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      phone: r.phone,
      province: r.province,
      city: r.city,
      district: r.district,
      detail: r.detail,
      full_address: `${r.province}${r.city}${r.district}${r.detail}`,
      is_default: Number(r.isDefault) === 1,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));

    return { list, total: list.length };
  }

  /** 创建收货地址 */
  async create(userId: number, dto: CreateAddressDto): Promise<Record<string, any>> {
    return this.dataSource.transaction(async (manager) => {
      // 如果设为默认，先取消其他默认地址
      if (dto.is_default === 1) {
        await manager
          .createQueryBuilder()
          .update(NftUserAddress)
          .set({ isDefault: 0 })
          .where('user_id = :userId', { userId })
          .andWhere('is_default = 1')
          .andWhere('is_delete = 0')
          .execute();
      }

      // 如果是第一个地址，自动设为默认
      const count = await manager.count(NftUserAddress, {
        where: { userId, isDelete: 0 },
      });
      const isDefault = dto.is_default === 1 || count === 0 ? 1 : 0;

      const address = manager.create(NftUserAddress, {
        userId,
        name: dto.name,
        phone: dto.phone,
        province: dto.province,
        city: dto.city,
        district: dto.district,
        detail: dto.detail,
        isDefault,
        isDelete: 0,
      });
      const saved = await manager.save(NftUserAddress, address);

      return {
        id: Number(saved.id),
        name: saved.name,
        phone: saved.phone,
        province: saved.province,
        city: saved.city,
        district: saved.district,
        detail: saved.detail,
        full_address: `${saved.province}${saved.city}${saved.district}${saved.detail}`,
        is_default: Number(saved.isDefault) === 1,
      };
    });
  }

  /** 更新收货地址 */
  async update(
    userId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<Record<string, any>> {
    return this.dataSource.transaction(async (manager) => {
      const addr = await manager.findOne(NftUserAddress, {
        where: { id: addressId, userId, isDelete: 0 },
      });
      if (!addr) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '收货地址不存在',
        });
      }

      // 如果设为默认，先取消其他默认地址
      if (dto.is_default === 1) {
        await manager
          .createQueryBuilder()
          .update(NftUserAddress)
          .set({ isDefault: 0 })
          .where('user_id = :userId', { userId })
          .andWhere('is_default = 1')
          .andWhere('id != :addressId', { addressId })
          .andWhere('is_delete = 0')
          .execute();
      }

      // 更新字段
      if (dto.name !== undefined) addr.name = dto.name;
      if (dto.phone !== undefined) addr.phone = dto.phone;
      if (dto.province !== undefined) addr.province = dto.province;
      if (dto.city !== undefined) addr.city = dto.city;
      if (dto.district !== undefined) addr.district = dto.district;
      if (dto.detail !== undefined) addr.detail = dto.detail;
      if (dto.is_default !== undefined) addr.isDefault = dto.is_default;

      const saved = await manager.save(NftUserAddress, addr);

      return {
        id: Number(saved.id),
        name: saved.name,
        phone: saved.phone,
        province: saved.province,
        city: saved.city,
        district: saved.district,
        detail: saved.detail,
        full_address: `${saved.province}${saved.city}${saved.district}${saved.detail}`,
        is_default: Number(saved.isDefault) === 1,
      };
    });
  }

  /** 删除收货地址（软删除） */
  async delete(userId: number, addressId: number): Promise<Record<string, any>> {
    return this.dataSource.transaction(async (manager) => {
      const addr = await manager.findOne(NftUserAddress, {
        where: { id: addressId, userId, isDelete: 0 },
      });
      if (!addr) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '收货地址不存在',
        });
      }

      const wasDefault = Number(addr.isDefault) === 1;

      // 软删除
      addr.isDelete = 1;
      await manager.save(NftUserAddress, addr);

      // 如果删除的是默认地址，自动将第一条设为默认
      if (wasDefault) {
        const next = await manager.findOne(NftUserAddress, {
          where: { userId, isDelete: 0 },
          order: { updatedAt: 'DESC' },
        });
        if (next) {
          next.isDefault = 1;
          await manager.save(NftUserAddress, next);
        }
      }

      return { id: addressId };
    });
  }

  /** 设置默认地址 */
  async setDefault(
    userId: number,
    addressId: number,
  ): Promise<Record<string, any>> {
    return this.dataSource.transaction(async (manager) => {
      const addr = await manager.findOne(NftUserAddress, {
        where: { id: addressId, userId, isDelete: 0 },
      });
      if (!addr) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          data: null,
          message: '收货地址不存在',
        });
      }

      // 取消其他默认
      await manager
        .createQueryBuilder()
        .update(NftUserAddress)
        .set({ isDefault: 0 })
        .where('user_id = :userId', { userId })
        .andWhere('is_default = 1')
        .andWhere('id != :addressId', { addressId })
        .andWhere('is_delete = 0')
        .execute();

      // 设置当前为默认
      addr.isDefault = 1;
      await manager.save(NftUserAddress, addr);

      return { id: addressId, is_default: true };
    });
  }
}
