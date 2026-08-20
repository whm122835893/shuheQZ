/**
 * NestJS 应用入口
 *
 * 启动职责：
 *  1. 使用 nest-winston 作为全局日志器
 *  2. 注册全局 ValidationPipe（whitelist / transform / forbidNonWhitelisted: false）
 *  3. 注册 Swagger 接口文档（路径 /api/docs）
 *  4. 启用 CORS（origin: true, credentials: true）
 *  5. 监听 3000 端口
 *
 * 说明：
 *  全局异常过滤器（HttpExceptionFilter）、全局响应拦截器（TransformInterceptor）
 *  与全局认证守卫（JwtAuthGuard）统一在 app.module.ts 中以 APP_FILTER /
 *  APP_INTERCEPTOR / APP_GUARD Provider 的方式注册（依赖注入方式）。
 *  其中 JwtAuthGuard 需注入 Reflector 与 Redis 黑名单服务，必须走 DI；
 *  TransformInterceptor 会将响应体包装为 BaseResponseVo，若在 main.ts 与
 *  app.module.ts 中同时注册会导致响应体被二次包装，故此处不再通过
 *  useGlobalFilters / useGlobalInterceptors 重复注册。
 */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { checkEnvOrThrow } from './config/env.validation';

async function bootstrap() {
  // 生产环境配置验证：检查 JWT/AES 密钥、支付安全、CORS 等关键配置
  checkEnvOrThrow();

  // 使用 nest-winston 作为应用日志器
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context }) =>
                `${timestamp} [${context ?? 'App'}] ${level}: ${message}`,
            ),
          ),
        }),
      ],
    }),
  });

  // 全局验证管道：白名单过滤、自动类型转换、拒绝额外字段
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Cookie 解析中间件（httpOnly Cookie 认证所需）
  app.use(cookieParser());

  // Swagger 接口文档
  const swaggerConfig = new DocumentBuilder()
    .setTitle('数和文创 API')
    .setDescription('数和文创数字藏品平台 RESTful API')
    .setVersion('v4.1')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 启用 CORS（白名单模式，生产环境需配置允许的域名）
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:4173']; // 开发环境默认
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // 启动监听
  await app.listen(3000);
}

bootstrap();
