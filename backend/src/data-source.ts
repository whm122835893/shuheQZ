/**
 * TypeORM 独立 DataSource（用于 CLI 迁移命令）
 *
 * 使用方式（在 package.json scripts 中已配置）：
 *   npm run migration:generate -- src/database/migrations/MigrationName
 *   npm run migration:create -- src/database/migrations/MigrationName
 *   npm run migration:run
 *   npm run migration:revert
 *
 * 此文件不参与 NestJS 运行时，仅用于 typeorm CLI。
 * 运行时迁移配置在 database.config.ts 中通过 TypeOrmModule.forRootAsync 注入。
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: (process.env.DB_TYPE || 'mysql') as 'mysql' | 'mariadb',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'shuhe_wenchuang',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  timezone: '+08:00',

  entities: [join(__dirname, 'database', 'entities', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'database', 'migrations', '*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',

  // CLI 模式下不自动同步，不自动运行迁移
  synchronize: false,
  migrationsRun: false,
});
