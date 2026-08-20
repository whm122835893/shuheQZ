// [系统模块] - 系统业务服务
// 负责：合规文档获取 / 文件上传 / 网站全局配置 / 意见反馈
// 4 个端点：
//   1. GET  /agreements/:code  公开   获取合规文档
//   2. POST /upload            JWT    文件上传
//   3. GET  /settings          公开   网站全局配置
//   4. POST /feedback          JWT    意见反馈
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { NftAgreement } from '../../database/entities/nft-agreement.entity';
import { NftSiteSetting } from '../../database/entities/nft-site-setting.entity';
import { NftFeedback } from '../../database/entities/nft-feedback.entity';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { UploadService, IMulterFile } from '../../shared/upload.service';
import { FeedbackDto } from './dto/feedback.dto';

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    @InjectRepository(NftAgreement)
    private readonly agreementRepo: Repository<NftAgreement>,
    @InjectRepository(NftSiteSetting)
    private readonly settingRepo: Repository<NftSiteSetting>,
    @InjectRepository(NftFeedback)
    private readonly feedbackRepo: Repository<NftFeedback>,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 1. GET /agreements/:code - 获取合规文档
   * 查询 nft_agreements WHERE code=? AND status=1(生效中) AND is_delete=0
   *
   * @param code 文档编码：user_agreement / privacy_policy / disclaimer
   * @returns { title, content, version, effective_at }
   */
  async getAgreement(code: string) {
    const agreement = await this.agreementRepo.findOne({
      where: { code, status: 1, isDelete: 0 },
    });

    if (!agreement) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        data: null,
        message: '合规文档不存在或已失效',
      });
    }

    return {
      title: agreement.title,
      content: agreement.content,
      version: agreement.version,
      effective_at: agreement.effectiveAt,
    };
  }

  /**
   * 2. POST /upload - 文件上传（头像/反馈图片等）
   * 校验文件类型+大小 → 上传至 OSS/MinIO → 上传后触发内容安全扫描
   * → 异常文件隔离并返回 400 → 正常文件返回 CDN 访问 URL
   *
   * @param file Multer 文件对象
   * @param type 上传类型：avatar / feedback（默认 avatar）
   * @returns { url }
   */
  async uploadFile(file: IMulterFile, type: string) {
    // 1) 校验文件不能为空
    if (!file) {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '文件不能为空',
      });
    }

    // 2) 校验文件类型与大小（UploadService 内部处理 jpg/png ≤2MB）
    this.uploadService.validateFile(file);

    // 3) 生成唯一文件名
    const filename = this.uploadService.generateFilename(file);

    // TODO: 上传至 OSS/MinIO 对象存储
    // 当前由 UploadService 生成文件名与 URL，未真正持久化到对象存储
    // await this.uploadService.uploadToOss(filename, file.buffer);

    // 4) 生成 CDN 访问 URL
    const url = this.uploadService.getUploadUrl(filename);

    // TODO: 内容安全扫描（图片鉴黄/涉政/涉暴）
    // 上传后触发内容安全扫描，异常文件隔离并返回 400
    // const scanResult = await this.contentSecurityScan(url);
    // if (!scanResult.passed) {
    //   await this.quarantineFile(filename);
    //   throw new BadRequestException({
    //     code: ErrorCode.BAD_REQUEST,
    //     data: null,
    //     message: '文件内容违规，已隔离',
    //   });
    // }

    this.logger.log(`文件上传成功: ${filename}, type=${type}, url=${url}`);

    return { url };
  }

  /**
   * 3. GET /settings - 网站全局配置
   * 查询 nft_site_settings WHERE is_delete=0 → 按 setting_group 分组返回
   *
   * @returns 按 setting_group 分组的配置对象
   *   { basic: { site_name, site_logo, contact_email },
   *     theme: { primary_color },
   *     button: { buy_text } }
   */
  async getSettings() {
    const settings = await this.settingRepo.find({
      where: { isDelete: 0 },
    });

    // 按 setting_group 分组，每组内以 setting_key: setting_value 组成对象
    const grouped: Record<string, Record<string, string>> = {};
    for (const setting of settings) {
      const group = setting.settingGroup;
      if (!grouped[group]) {
        grouped[group] = {};
      }
      grouped[group][setting.settingKey] = setting.settingValue;
    }

    return grouped;
  }

  /**
   * 4. POST /feedback - 意见反馈
   * 校验 content 非空 → 写入 nft_feedback（user_id, type, content, images(JSON),
   * contact, status=1待处理）→ 返回工单号 ticket_id
   *
   * @param userId 当前登录用户ID
   * @param dto 反馈数据
   * @returns BaseResponseVo<{ ticket_id, status }> 附带自定义提示消息
   */
  async createFeedback(userId: number, dto: FeedbackDto) {
    // 1) 校验 content 非空（DTO 已校验，此处二次确认）
    if (!dto.content || dto.content.trim() === '') {
      throw new BadRequestException({
        code: ErrorCode.BAD_REQUEST,
        data: null,
        message: '反馈内容不能为空',
      });
    }

    // 2) 生成工单号：FB + yyyyMMddHHmmss + 5位随机数
    const ticketId = this.generateTicketId();

    // 3) 写入 nft_feedback（status=1 待处理）
    const feedback = this.feedbackRepo.create({
      userId,
      type: dto.type,
      content: dto.content,
      images: dto.images ?? null,
      contact: dto.contact ?? null,
      ticketId,
      status: 1,
      isDelete: 0,
    });
    await this.feedbackRepo.save(feedback);

    this.logger.log(`用户 ${userId} 提交反馈，工单号: ${ticketId}`);

    // 返回工单号与状态，附带自定义提示消息
    // TransformInterceptor 会透传 BaseResponseVo，不再二次包装
    return BaseResponseVo.success(
      { ticket_id: ticketId, status: 1 },
      '反馈已提交，我们会尽快处理',
    );
  }

  /**
   * 生成工单号：FB + yyyyMMddHHmmss + 5位随机数
   * @example FB2026080714305201234
   */
  private generateTicketId(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp =
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = pad(crypto.randomInt(100000), 5);
    return `FB${stamp}${rand}`;
  }
}
