// [抽奖模块] - 抽奖控制器
// 5 个端点（全部 JWT 认证，不涉及交易密码）：
//   1. GET  /lucky-draw/activities          JWT  抽奖活动列表
//   2. GET  /lucky-draw/activities/:id      JWT  抽奖规则（含奖品池 + draw_chances 来源明细 + my_remaining_draws 总和）
//   3. GET  /lucky-draw/activities/:id/chances JWT  次数明细（独立端点）
//   4. POST /lucky-draw/activities/:id/draw JWT  参与抽奖（弹窗友好文案）
//   5. GET  /lucky-draw/records             JWT  中奖记录（分页）
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { LuckyDrawService } from './luckydraw.service';
import { LuckyDrawRecordsQueryDto } from './dto/lucky-draw-records-query.dto';
import { DrawDto } from './dto/draw.dto';

@ApiTags('抽奖模块')
@Controller()
export class LuckyDrawController {
  constructor(private readonly luckyDrawService: LuckyDrawService) {}

  // 1. 抽奖活动列表
  @ApiBearerAuth()
  @Get('lucky-draw/activities')
  @ApiOperation({ summary: '抽奖活动列表' })
  getActivities(@Query() query: PaginationDto) {
    return this.luckyDrawService.getActivities(query);
  }

  // 2. 抽奖规则与奖品池
  @ApiBearerAuth()
  @Get('lucky-draw/activities/:id')
  @ApiOperation({ summary: '抽奖规则与奖品池' })
  getActivityDetail(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.luckyDrawService.getActivityDetail(id, userId);
  }

  // 3. 抽奖次数明细（独立端点）
  @ApiBearerAuth()
  @Get('lucky-draw/activities/:id/chances')
  @ApiOperation({ summary: '我的抽奖次数来源明细' })
  getChances(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.luckyDrawService.getChances(id, userId);
  }

  // 4. 参与抽奖
  // JWT 认证 + 交易密码验证（抽奖消耗抽奖次数并可能获得藏品）
  // 响应 message 使用弹窗友好文案：中奖 "恭喜中奖！获得了xxx" / 未中奖 "很遗憾，未中奖"
  @ApiBearerAuth()
  @TxPassword()
  @Post('lucky-draw/activities/:id/draw')
  @ApiOperation({ summary: '参与抽奖（需交易密码）' })
  async draw(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() _dto: DrawDto,
  ) {
    const { data, message } = await this.luckyDrawService.draw(userId, id);
    // 返回 BaseResponseVo 以使用自定义 message（TransformInterceptor 会透传，不再二次包装）
    return BaseResponseVo.success(data, message);
  }

  // 5. 中奖记录（分页）
  @ApiBearerAuth()
  @Get('lucky-draw/records')
  @ApiOperation({ summary: '我的抽奖记录' })
  getRecords(
    @CurrentUser('id') userId: number,
    @Query() query: LuckyDrawRecordsQueryDto,
  ) {
    return this.luckyDrawService.getRecords(userId, query);
  }
}
