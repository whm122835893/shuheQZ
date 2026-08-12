// [配置] - TypeORM 数据库配置
// 从 .env 读取，使用 ConfigService，entities 自动加载，synchronize/logging 受环境变量控制
// 生产环境使用 migration 管理表结构，开发环境可使用 synchronize 快速迭代
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * TypeORM 配置工厂
 *
 * 通过 ConfigModule.forFeature / ConfigService 注入环境变量：
 *   DB_TYPE            数据库类型，默认 mysql
 *   DB_HOST            主机，默认 127.0.0.1
 *   DB_PORT            端口，默认 3306
 *   DB_USERNAME        用户名
 *   DB_PASSWORD        密码
 *   DB_DATABASE        数据库名
 *   DB_SYNC            是否自动同步表结构（生产环境强制 false）
 *   DB_LOGGING         是否开启 SQL 日志，默认 true
 *   DB_POOL_SIZE       连接池大小，默认 10
 *   DB_CHARSET         字符集，默认 utf8mb4
 *   DB_MIGRATIONS_RUN  是否启动时自动执行迁移（生产环境默认 true）
 */
export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    type: (configService.get<string>('DB_TYPE') ||
      'mysql') as 'mysql' | 'mariadb',
    host: configService.get<string>('DB_HOST', '127.0.0.1'),
    port: configService.get<number>('DB_PORT', 3306),
    username: configService.get<string>('DB_USERNAME', 'root'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_DATABASE', 'shuhe_wenchuang'),
    charset: configService.get<string>('DB_CHARSET', 'utf8mb4'),
    timezone: '+08:00',

    // 自动加载 src/database/entities/*.entity.ts
    entities: [
      join(__dirname, '..', 'database', 'entities', '*.entity{.ts,.js}'),
    ],

    // 迁移文件目录
    migrations: [
      join(__dirname, '..', 'database', 'migrations', '*{.ts,.js}'),
    ],

    // 迁移表名（记录已执行的迁移）
    migrationsTableName: 'typeorm_migrations',

    // 生产环境启动时自动执行迁移；开发环境由 DB_MIGRATIONS_RUN 控制
    migrationsRun:
      isProduction ||
      configService.get<string>('DB_MIGRATIONS_RUN') === 'true',

    // synchronize: 生产环境强制 false，开发环境由 DB_SYNC 控制
    // 注意：生产环境必须依赖 migration，不能使用 synchronize
    synchronize:
      !isProduction && configService.get<string>('DB_SYNC') === 'true',

    // logging: 默认开启
    logging: configService.get<string>('DB_LOGGING', 'true') === 'true',

    // 连接池配置
    extra: {
      connectionLimit: configService.get<number>('DB_POOL_SIZE', 10),
      waitForConnections: true,
      queueLimit: 0,
    },
  };
};

/**
 * 数据库配置模块导出
 *
 * 在 app.module.ts 中使用方式：
 *   TypeOrmModule.forRootAsync({
 *     imports: [ConfigModule],
 *     inject: [ConfigService],
 *     useFactory: getTypeOrmConfig,
 *   })
 */
export default getTypeOrmConfig;

export const databaseConfigModule = ConfigModule;
