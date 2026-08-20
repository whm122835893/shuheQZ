// [合成模块] - 合成控制器
// 4 个端点（仅 JWT 认证，不涉及交易密码）：
//   1. GET  /synthesis/activities            JWT  合成活动列表(分页)
//   2. GET  /synthesis/activities/:id        JWT  合成详情(含材料公式 + my_holding + is_sufficient + can_synthesize)
//   3. POST /synthesis/activities/:id/synthesize  JWT  提交合成(弹窗友好文案)
//   4. GET  /synthesis/records               JWT  合成记录(分页)
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { ConcurrencyLimit } from '../../common/decorators/concurrency-limit.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SynthesisService } from './synthesis.service';
import { withOptimisticRetry } from '../../common/utils/optimistic-retry.util';
import { SynthesizeDto } from './dto/synthesize.dto';
import { SynthesisRecordsQueryDto } from './dto/synthesis-records-query.dto';

@ApiTags('合成模块')
@Controller()
export class SynthesisController {
  constructor(private readonly synthesisService: SynthesisService) {}

  @ApiBearerAuth()
  @Get('synthesis/activities')
  @ApiOperation({ summary: '合成活动列表（分页）' })
  getActivities(@Query() query: PaginationDto) {
    return this.synthesisService.getActivities(query);
  }

  @ApiBearerAuth()
  @Get('synthesis/activities/:id')
  @ApiOperation({ summary: '合成公式详情（含我的持有情况）' })
  getActivityDetail(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.synthesisService.getActivityDetail(userId, id);
  }

  @ApiBearerAuth()
  @TxPassword()
  @ConcurrencyLimit(200, '合成排队中，请稍后重试')
  @Post('synthesis/activities/:id/synthesize')
  @ApiOperation({ summary: '提交合成（需交易密码）' })
  async synthesize(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: SynthesizeDto,
  ) {
    const result = await withOptimisticRetry(
      () => this.synthesisService.synthesize(userId, id, dto),
    );
    // 响应 message 使用弹窗友好文案
    return BaseResponseVo.success(
      result,
      `合成成功！获得了${result.result_collectible.name}`,
    );
  }

  @ApiBearerAuth()
  @Get('synthesis/records')
  @ApiOperation({ summary: '我的合成记录（分页）' })
  getRecords(
    @CurrentUser('id') userId: number,
    @Query() query: SynthesisRecordsQueryDto,
  ) {
    return this.synthesisService.getRecords(userId, query);
  }
}
