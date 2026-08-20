// [管理后台-权限管理模块] - AdminPermissionService
// 实现管理员、角色、权限、操作日志、登录日志的业务逻辑。
//
// 关键设计：
//  - 管理员密码使用 bcrypt 哈希（12 轮）
//  - 角色权限为「全量替换」语义：先删除角色现有权限关联，再批量插入新关联
//  - 权限树按 parent_id 递归构建
//  - 登录日志来源于 nft_audit_logs（action='login'）
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { NftAdminUser } from '../../../database/entities/nft-admin-user.entity';
import { NftAdminRole } from '../../../database/entities/nft-admin-role.entity';
import { NftAdminPermission } from '../../../database/entities/nft-admin-permission.entity';
import { NftAdminRolePermission } from '../../../database/entities/nft-admin-role-permission.entity';
import { NftAuditLog } from '../../../database/entities/nft-audit-log.entity';
import { NftOperationLog } from '../../../database/entities/nft-operation-log.entity';

/** bcrypt 加密轮数（12 轮，与 admin-auth.service 保持一致） */
const BCRYPT_ROUNDS = 12;

/** 分页结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AdminPermissionService {
  constructor(
    @InjectRepository(NftAdminUser)
    private readonly adminUserRepo: Repository<NftAdminUser>,
    @InjectRepository(NftAdminRole)
    private readonly roleRepo: Repository<NftAdminRole>,
    @InjectRepository(NftAdminPermission)
    private readonly permissionRepo: Repository<NftAdminPermission>,
    @InjectRepository(NftAdminRolePermission)
    private readonly rolePermissionRepo: Repository<NftAdminRolePermission>,
    @InjectRepository(NftAuditLog)
    private readonly auditLogRepo: Repository<NftAuditLog>,
    @InjectRepository(NftOperationLog)
    private readonly operationLogRepo: Repository<NftOperationLog>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // 管理员管理（6）
  // ============================================================

  /** 管理员分页列表 */
  async getAdminList(query: Record<string, any>): Promise<PaginatedResult<any>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.adminUserRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0');

    if (query.username) {
      qb.andWhere('a.username LIKE :u', { u: `%${query.username}%` });
    }
    if (query.realName) {
      qb.andWhere('a.real_name LIKE :r', { r: `%${query.realName}%` });
    }
    if (query.role !== undefined && query.role !== '') {
      qb.andWhere('a.role = :role', { role: Number(query.role) });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('a.status = :status', { status: Number(query.status) });
    }

    qb.orderBy('a.id', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 创建管理员 */
  async createAdmin(body: Record<string, any>): Promise<any> {
    if (!body.username || !body.password || !body.realName) {
      throw new BadRequestException('用户名、密码、真实姓名不能为空');
    }

    const exist = await this.adminUserRepo.findOne({
      where: { username: body.username },
      select: ['id'],
    });
    if (exist) {
      throw new ConflictException('用户名已存在');
    }

    const hashed = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    const admin = this.adminUserRepo.create({
      username: body.username,
      password: hashed,
      realName: body.realName,
      role: body.role !== undefined ? Number(body.role) : 2,
      status: body.status !== undefined ? Number(body.status) : 1,
    });
    const saved = await this.adminUserRepo.save(admin);
    const { password: _pwd, ...rest } = saved as any;
    return rest;
  }

  /** 管理员详情 */
  async getAdminDetail(id: number): Promise<any> {
    const admin = await this.adminUserRepo.findOne({
      where: { id, isDelete: 0 },
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }
    const { password: _pwd, ...rest } = admin as any;
    return rest;
  }

  /** 编辑管理员 */
  async updateAdmin(id: number, body: Record<string, any>): Promise<any> {
    const admin = await this.adminUserRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'username', 'realName', 'role', 'status'],
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }

    if (body.username && body.username !== admin.username) {
      const exist = await this.adminUserRepo.findOne({
        where: { username: body.username },
        select: ['id'],
      });
      if (exist && exist.id !== id) {
        throw new ConflictException('用户名已存在');
      }
    }

    await this.adminUserRepo.update(id, {
      username: body.username ?? admin.username,
      realName: body.realName ?? admin.realName,
      role: body.role !== undefined ? Number(body.role) : admin.role,
      status: body.status !== undefined ? Number(body.status) : admin.status,
    });
    return this.getAdminDetail(id);
  }

  /** 删除管理员（软删除） */
  async deleteAdmin(id: number): Promise<void> {
    const admin = await this.adminUserRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }
    await this.adminUserRepo.update(id, { isDelete: 1 });
  }

  /** 重置管理员密码 */
  async resetPassword(id: number, body: Record<string, any>): Promise<void> {
    if (!body.password) {
      throw new BadRequestException('密码不能为空');
    }
    const admin = await this.adminUserRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!admin) {
      throw new NotFoundException('管理员不存在');
    }
    const hashed = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    await this.adminUserRepo.update(id, { password: hashed });
  }

  // ============================================================
  // 角色管理（5）
  // ============================================================

  /** 角色列表 */
  async getRoleList(query: Record<string, any>): Promise<any> {
    const qb = this.roleRepo.createQueryBuilder('r').where('r.is_delete = 0');
    if (query.name) {
      qb.andWhere('r.name LIKE :n', { n: `%${query.name}%` });
    }
    if (query.status !== undefined && query.status !== '') {
      qb.andWhere('r.status = :status', { status: Number(query.status) });
    }
    qb.orderBy('r.sort', 'ASC').addOrderBy('r.id', 'ASC');
    const list = await qb.getMany();

    // 统计每个角色的管理员数量与权限数量
    const roleIds = list.map((r) => r.id);
    let adminCounts: Record<string, number> = {};
    let permCounts: Record<string, number> = {};
    if (roleIds.length) {
      const adminRows = await this.adminUserRepo
        .createQueryBuilder('a')
        .select('a.role', 'role')
        .addSelect('COUNT(a.id)', 'cnt')
        .where('a.is_delete = 0')
        .andWhere('a.role IN (:...ids)', { ids: roleIds })
        .groupBy('a.role')
        .getRawMany();
      adminCounts = adminRows.reduce(
        (m, r) => ({ ...m, [r.role]: Number(r.cnt) }),
        {},
      );

      const permRows = await this.rolePermissionRepo
        .createQueryBuilder('rp')
        .select('rp.role_id', 'roleId')
        .addSelect('COUNT(rp.id)', 'cnt')
        .where('rp.role_id IN (:...ids)', { ids: roleIds })
        .groupBy('rp.role_id')
        .getRawMany();
      permCounts = permRows.reduce(
        (m, r) => ({ ...m, [r.roleId]: Number(r.cnt) }),
        {},
      );
    }

    return list.map((r) => ({
      ...r,
      adminCount: adminCounts[r.id] || 0,
      permissionCount: permCounts[r.id] || 0,
    }));
  }

  /** 创建角色 */
  async createRole(body: Record<string, any>): Promise<NftAdminRole> {
    if (!body.code || !body.name) {
      throw new BadRequestException('角色编码与名称不能为空');
    }
    const exist = await this.roleRepo.findOne({
      where: { code: body.code },
      select: ['id'],
    });
    if (exist) {
      throw new ConflictException('角色编码已存在');
    }
    const role = this.roleRepo.create({
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      status: body.status !== undefined ? Number(body.status) : 1,
      sort: body.sort !== undefined ? Number(body.sort) : 0,
    });
    return this.roleRepo.save(role);
  }

  /** 编辑角色 */
  async updateRole(id: number, body: Record<string, any>): Promise<NftAdminRole> {
    const role = await this.roleRepo.findOne({ where: { id, isDelete: 0 } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    if (body.code && body.code !== role.code) {
      const exist = await this.roleRepo.findOne({
        where: { code: body.code },
        select: ['id'],
      });
      if (exist && exist.id !== id) {
        throw new ConflictException('角色编码已存在');
      }
    }
    await this.roleRepo.update(id, {
      code: body.code ?? role.code,
      name: body.name ?? role.name,
      description: body.description ?? role.description,
      status: body.status !== undefined ? Number(body.status) : role.status,
      sort: body.sort !== undefined ? Number(body.sort) : role.sort,
    });
    return this.roleRepo.findOne({ where: { id } }) as Promise<NftAdminRole>;
  }

  /** 删除角色 */
  async deleteRole(id: number): Promise<void> {
    const role = await this.roleRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id'],
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    await this.dataSource.transaction(async (mgr) => {
      await mgr.update(NftAdminRole, id, { isDelete: 1 });
      await mgr.delete(NftAdminRolePermission, { roleId: id });
    });
  }

  /** 设置角色权限（全量替换） */
  async setRolePermissions(
    id: number,
    body: Record<string, any>,
  ): Promise<any> {
    const role = await this.roleRepo.findOne({
      where: { id, isDelete: 0 },
      select: ['id', 'name'],
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }
    const permissionIds: number[] = Array.isArray(body.permissionIds)
      ? body.permissionIds.map((p: any) => Number(p))
      : [];

    await this.dataSource.transaction(async (mgr) => {
      await mgr.delete(NftAdminRolePermission, { roleId: id });
      if (permissionIds.length) {
        const rows = permissionIds.map((pid) =>
          this.rolePermissionRepo.create({ roleId: id, permissionId: pid }),
        );
        await mgr.save(rows);
      }
    });

    return { roleId: id, permissionIds };
  }

  // ============================================================
  // 权限与日志（5）
  // ============================================================

  /** 权限树（层级结构） */
  async getPermissionTree(): Promise<any> {
    const all = await this.permissionRepo.find({
      where: { isDelete: 0 },
      order: { sort: 'ASC', id: 'ASC' },
    });

    const build = (parentId: number): any[] =>
      all
        .filter((p) => p.parentId === parentId)
        .map((p) => ({ ...p, children: build(p.id) }));

    return build(0);
  }

  /** 操作日志分页列表 */
  async getOperationLogList(
    query: Record<string, any>,
  ): Promise<PaginatedResult<NftOperationLog>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.operationLogRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0');

    if (query.adminId) {
      qb.andWhere('o.admin_id = :adminId', { adminId: Number(query.adminId) });
    }
    if (query.targetTable) {
      qb.andWhere('o.target_table = :t', { t: query.targetTable });
    }
    if (query.action) {
      qb.andWhere('o.action = :a', { a: query.action });
    }
    if (query.startDate) {
      qb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('o.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 操作日志详情 */
  async getOperationLogDetail(id: number): Promise<NftOperationLog> {
    const log = await this.operationLogRepo.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException('操作日志不存在');
    }
    return log;
  }

  /** 登录日志（来自 audit_logs where action='login'） */
  async getLoginLogList(query: Record<string, any>): Promise<PaginatedResult<NftAuditLog>> {
    const page = Number(query.page) || 1;
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

    const qb = this.auditLogRepo
      .createQueryBuilder('a')
      .where('a.is_delete = 0')
      .andWhere('a.action = :action', { action: 'login' });

    if (query.userId) {
      qb.andWhere('a.user_id = :userId', { userId: Number(query.userId) });
    }
    if (query.operatorId) {
      qb.andWhere('a.operator_id = :operatorId', {
        operatorId: Number(query.operatorId),
      });
    }
    if (query.startDate) {
      qb.andWhere('a.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('a.created_at <= :end', { end: query.endDate });
    }

    qb.orderBy('a.created_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [list, total] = await qb.getManyAndCount();
    return { list, total, page, pageSize };
  }

  /** 导出操作日志为 CSV */
  async exportOperationLogs(query: Record<string, any>): Promise<string> {
    const qb = this.operationLogRepo
      .createQueryBuilder('o')
      .where('o.is_delete = 0')
      .orderBy('o.created_at', 'DESC');

    if (query.adminId) {
      qb.andWhere('o.admin_id = :adminId', { adminId: Number(query.adminId) });
    }
    if (query.targetTable) {
      qb.andWhere('o.target_table = :t', { t: query.targetTable });
    }
    if (query.startDate) {
      qb.andWhere('o.created_at >= :start', { start: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('o.created_at <= :end', { end: query.endDate });
    }
    qb.limit(10000);

    const logs = await qb.getMany();

    const header = [
      'ID',
      '管理员ID',
      '目标表',
      '目标ID',
      '操作',
      'IP',
      '操作时间',
    ];
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = logs.map((l) =>
      [
        l.id,
        l.adminId,
        l.targetTable,
        l.targetId,
        l.action,
        l.ip,
        l.createdAt ? new Date(l.createdAt).toISOString() : '',
      ]
        .map(escape)
        .join(','),
    );

    return [header.join(','), ...rows].join('\n');
  }
}
