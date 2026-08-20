/**
 * 初始基线迁移
 *
 * 说明：
 *   此迁移作为 migration 机制的基线（baseline）。
 *
 *   - 已有数据库（通过 synchronize 创建了表）：
 *     执行 `npm run migration:run` 后，此迁移会被记录到 typeorm_migrations 表，
 *     表示"当前 schema 已经是此状态"，后续新增的迁移会在此基础上增量执行。
 *
 *   - 全新数据库：
 *     方案 A（推荐开发环境）：先设置 DB_SYNC=true 启动一次应用，TypeORM 会自动创建所有表，
 *         然后设置 DB_SYNC=false，执行 `npm run migration:run` 记录基线。
 *     方案 B（推荐生产环境）：使用 `npm run migration:generate` 生成包含全部表结构的完整迁移，
 *         替换此基线文件后执行 `npm run migration:run`。
 *
 *   后续 schema 变更流程：
 *     1. 修改 entity 文件（添加/删除字段、索引等）
 *     2. 执行 `npm run migration:generate -- src/database/migrations/YourMigrationName`
 *     3. 检查生成的迁移文件
 *     4. 执行 `npm run migration:run` 应用变更
 */
import { MigrationInterface } from 'typeorm';

export class InitBaseline1700000000000 implements MigrationInterface {
  name = 'InitBaseline1700000000000';

  public async up(): Promise<void> {
    // 基线迁移：不对已有表做任何操作
    // 已通过 synchronize 创建的表保持不变，仅记录此迁移为已执行
  }

  public async down(): Promise<void> {
    // 基线迁移：不删除任何表
    // 如需回退到空数据库，请手动 DROP DATABASE
  }
}
