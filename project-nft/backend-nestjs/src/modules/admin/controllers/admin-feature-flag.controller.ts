// [管理后台] - Feature Flag 管理控制器
//
// 提供 Feature Flag 的动态管理接口，无需重启即可修改开关状态。
//
// 接口：
//   GET    /admin/api/v1/feature-flags           — 查询所有开关
//   GET    /admin/api/v1/feature-flags/:name     — 查询单个开关
//   PUT    /admin/api/v1/feature-flags/:name     — 修改开关
//   DELETE /admin/api/v1/feature-flags/:name     — 删除开关（恢复默认开启）
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { FeatureFlagService, FeatureFlagConfig } from '../../../shared/feature-flag.service';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';

class UpdateFlagDto {
  @IsIn(['on', 'off', 'percentage', 'whitelist'])
  mode: 'on' | 'off' | 'percentage' | 'whitelist';

  @IsOptional()
  @IsNumber()
  percentage?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  whitelist?: number[];

  @IsOptional()
  @IsString()
  description?: string;
}

@Controller('admin/api/v1/feature-flags')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminFeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  /**
   * 查询所有 Feature Flag
   */
  @Get()
  async getAll(): Promise<BaseResponseVo<Record<string, FeatureFlagConfig>>> {
    const flags = await this.featureFlagService.getAllConfigs();
    return BaseResponseVo.success(flags);
  }

  /**
   * 查询单个 Feature Flag
   */
  @Get(':name')
  async getOne(
    @Param('name') name: string,
  ): Promise<BaseResponseVo<FeatureFlagConfig>> {
    const config = await this.featureFlagService.getConfig(name);
    return BaseResponseVo.success(config);
  }

  /**
   * 修改 Feature Flag
   *
   * @example
   * PUT /admin/api/v1/feature-flags/release_buy
   * { "mode": "off" }
   *
   * PUT /admin/api/v1/feature-flags/release_buy
   * { "mode": "percentage", "percentage": 20 }
   *
   * PUT /admin/api/v1/feature-flags/release_buy
   * { "mode": "whitelist", "whitelist": [1, 2, 3] }
   */
  @Put(':name')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('name') name: string,
    @Body() dto: UpdateFlagDto,
  ): Promise<BaseResponseVo<FeatureFlagConfig>> {
    const config: FeatureFlagConfig = {
      mode: dto.mode,
      percentage: dto.percentage,
      whitelist: dto.whitelist,
      description: dto.description,
    };
    await this.featureFlagService.setConfig(name, config);
    return BaseResponseVo.success(config, `开关 ${name} 已更新`);
  }

  /**
   * 删除 Feature Flag（恢复默认开启）
   */
  @Delete(':name')
  async delete(
    @Param('name') name: string,
  ): Promise<BaseResponseVo<null>> {
    await this.featureFlagService.deleteFlag(name);
    return BaseResponseVo.success(null, `开关 ${name} 已删除（恢复默认开启）`);
  }
}
