// [管理后台] - 库存预热控制器
//
// 提供手动触发 Redis 库存预热的接口，活动开始前将 DB 库存同步到 Redis。
// 支持按类型批量预热：发售(release)、抽奖(luckydraw)、合成(synthesis)
import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsArray, IsIn, IsNumber } from 'class-validator';
import { StockService } from '../../../shared/stock.service';
import { BaseResponseVo } from '../../../common/dto/base-response.vo';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';

class WarmUpDto {
  /** 预热类型：release | luckydraw | synthesis */
  @IsIn(['release', 'luckydraw', 'synthesis'])
  type: 'release' | 'luckydraw' | 'synthesis';
  /** 发售类型：藏品ID数组；抽奖/合成类型：活动ID数组 */
  @IsArray()
  @IsNumber({}, { each: true })
  ids: number[];
}

@Controller('admin/api/v1/stock')
@Public()
@UseGuards(AdminJwtGuard)
export class AdminStockController {
  constructor(private readonly stockService: StockService) {}

  /**
   * 手动触发库存预热
   *
   * @example
   * POST /admin/api/v1/stock/warmup
   * { "type": "release", "ids": [1, 2, 3] }
   * { "type": "luckydraw", "ids": [1] }
   * { "type": "synthesis", "ids": [1] }
   */
  @Post('warmup')
  @HttpCode(HttpStatus.OK)
  async warmUp(
    @Body() dto: WarmUpDto,
  ): Promise<BaseResponseVo<{ warmed: number; type: string }>> {
    let warmed = 0;

    switch (dto.type) {
      case 'release':
        warmed = await this.stockService.warmUpReleaseStock(dto.ids);
        break;
      case 'luckydraw':
        // 抽奖按活动ID预热，每个活动预热所有奖品
        for (const activityId of dto.ids) {
          warmed += await this.stockService.warmUpDrawStock(activityId);
        }
        break;
      case 'synthesis':
        for (const activityId of dto.ids) {
          const ok = await this.stockService.warmUpSynthesisStock(activityId);
          if (ok) warmed++;
        }
        break;
      default:
        return BaseResponseVo.fail(
          HttpStatus.BAD_REQUEST,
          `不支持的预热类型: ${dto.type}`,
        );
    }

    return BaseResponseVo.success({
      warmed,
      type: dto.type,
    }, `库存预热完成: ${warmed} 个`);
  }
}
