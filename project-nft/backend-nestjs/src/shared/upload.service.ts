// [公共] - 文件上传服务
//
// 职责:
//  1) 基于 Multer 处理文件上传(NestJS Express 平台默认集成 Multer)
//  2) 校验文件类型(jpg/png/jpeg)与大小(≤2MB)
//  3) 生成唯一文件名,避免覆盖
//  4) 生成可访问的 CDN URL
//
// TODO:
//  - 内容安全扫描(图片鉴黄/涉政/涉暴)
//  - 接入实际对象存储(阿里云 OSS / AWS S3 / 腾讯云 COS)
//    当前实现:仅生成文件名与本地 URL,未真正持久化到对象存储
import { BadRequestException, Injectable, Logger, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';
import * as crypto from 'crypto';

/**
 * Multer 文件接口(Multer 的 memoryStorage / diskStorage 均产出此结构)
 */
export interface IMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
  stream?: NodeJS.ReadableStream;
}

/**
 * 允许的图片 MIME 类型
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/gif',
  'image/webp',
];

/**
 * 允许的图片扩展名
 */
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 各图片类型对应的 magic bytes（文件头特征字节）
 * 用于校验文件实际内容，防止伪造 Content-Type 或扩展名
 */
const MAGIC_BYTES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8],
  'image/jpg': [0xff, 0xd8],
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

/**
 * 最大文件大小(2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 校验文件类型与大小
   *
   * @param file Multer 文件对象
   * @throws UnsupportedMediaTypeException 类型不允许或大小超限
   */
  validateFile(file: IMulterFile): void {
    if (!file) {
      throw new UnsupportedMediaTypeException('文件不能为空');
    }

    // 大小校验(≤2MB)
    if (file.size > MAX_FILE_SIZE) {
      throw new UnsupportedMediaTypeException(
        `文件大小超过 2MB 限制(当前 ${this.formatSize(file.size)})`,
      );
    }

    // MIME 类型校验
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(
        `不支持的文件类型 ${file.mimetype},仅允许 jpg/jpeg/png/gif/webp`,
      );
    }

    // 扩展名校验(防止伪造 mimetype)
    const ext = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new UnsupportedMediaTypeException(
        `不支持的文件扩展名 ${ext},仅允许 jpg/jpeg/png/gif/webp`,
      );
    }

    // Magic bytes 校验（防止伪造 Content-Type / 扩展名）
    this.validateMagicBytes(file);

    // TODO: 内容安全扫描(图片鉴黄/涉政/涉暴)
    // 建议接入阿里云内容安全 / 腾讯云天御 / 自建 NSFW 模型
    // this.logger.log(`[TODO] 对文件 ${file.originalname} 进行内容安全扫描`);
  }

  /**
   * 校验文件 magic bytes 是否与声称的 MIME 类型匹配
   * 通过读取文件头部字节，防止伪造 Content-Type 或扩展名的恶意文件上传
   *
   * @param file Multer 文件对象
   * @throws BadRequestException magic bytes 不匹配或文件内容过短
   */
  private validateMagicBytes(file: IMulterFile): void {
    const expected = MAGIC_BYTES[file.mimetype];
    if (!expected) {
      // 不在 magic bytes 映射中的类型（理论上已被 MIME 校验拦截）
      return;
    }

    const buf = file.buffer;
    if (!buf || buf.length < expected.length) {
      throw new BadRequestException(
        '文件内容过短或为空，无法验证文件类型',
      );
    }

    for (let i = 0; i < expected.length; i++) {
      if (buf[i] !== expected[i]) {
        throw new BadRequestException(
          `文件内容与声称的类型 ${file.mimetype} 不匹配（magic bytes 校验失败）`,
        );
      }
    }
  }

  /**
   * 生成唯一文件名
   *
   * 命名规则:yyyyMMddHHmmss_<16位随机hex>.<原扩展名>
   * 例如:20260807120030_a1b2c3d4e5f6a7b8.jpg
   *
   * 保证:
   *  - 时间戳保证同一秒内的可读性
   *  - 16 位随机 hex 保证唯一性,避免覆盖与可枚举攻击
   *  - 保留原文件扩展名,便于 CDN/MIME 推断
   */
  generateFilename(file: IMulterFile): string {
    const ext = extname(file.originalname).toLowerCase();
    const now = new Date();

    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate(),
    )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

    const random = crypto.randomBytes(8).toString('hex');

    return `${ts}_${random}${ext}`;
  }

  /**
   * 生成可访问的 CDN URL
   *
   * TODO: 接入实际对象存储(OSS/S3/COS)后,应返回真实 CDN 域名拼装的 URL
   * 当前实现:使用 UPLOAD_CDN_BASE 环境变量(默认 /uploads)拼装
   *
   * @param filename 文件名(由 generateFilename 生成)
   * @returns 完整 CDN URL
   */
  getUploadUrl(filename: string): string {
    const cdnBase = this.configService.get<string>(
      'UPLOAD_CDN_BASE',
      '/uploads',
    );
    // 拼装时去掉尾部斜杠,避免双斜杠
    const base = cdnBase.replace(/\/+$/, '');
    return `${base}/${filename}`;
  }

  /**
   * 格式化文件大小(用于错误提示)
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes}B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)}KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  }
}

/**
 * Upload 服务 Provider 常量
 */
export const UploadServiceProvider = {
  provide: UploadService,
  useClass: UploadService,
};
