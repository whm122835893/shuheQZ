// [系统模块] - 系统控制器
// 4 个端点：
//   1. GET  /agreements/:code  公开            获取合规文档
//   2. POST /upload            JWT             文件上传（头像/反馈图片等）
//   3. GET  /settings          公开            网站全局配置
//   4. POST /feedback          JWT             意见反馈
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IMulterFile } from '../../shared/upload.service';
import { SystemService } from './system.service';
import { FeedbackDto } from './dto/feedback.dto';

@ApiTags('系统模块')
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  // 1. GET /agreements/:code (Public) - 获取合规文档
  @Public()
  @Get('agreements/:code')
  @ApiOperation({ summary: '获取合规文档' })
  getAgreement(@Param('code') code: string) {
    return this.systemService.getAgreement(code);
  }

  // 2. POST /upload (JWT) - 文件上传（头像/反馈图片等）
  @ApiBearerAuth()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '上传文件（jpg/png，≤2MB）',
        },
        type: {
          type: 'string',
          enum: ['avatar', 'feedback'],
          default: 'avatar',
          description: '上传类型（可选，默认 avatar）',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: '文件上传（头像/反馈图片等）' })
  uploadFile(
    @UploadedFile() file: IMulterFile,
    @Body('type') type?: string,
  ) {
    return this.systemService.uploadFile(file, type || 'avatar');
  }

  // 3. GET /settings (Public) - 网站全局配置
  @Public()
  @Get('settings')
  @ApiOperation({ summary: '网站全局配置' })
  getSettings() {
    return this.systemService.getSettings();
  }

  // 4. POST /feedback (JWT) - 意见反馈
  @ApiBearerAuth()
  @Post('feedback')
  @ApiOperation({ summary: '意见反馈' })
  createFeedback(
    @CurrentUser('id') userId: number,
    @Body() dto: FeedbackDto,
  ) {
    return this.systemService.createFeedback(userId, dto);
  }
}
