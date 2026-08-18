// [优先购模块] - 优先购控制器
// 3 个端点（均需 JWT）：
//   1. GET  /priority-sales                    JWT   优先购活动列表
//   2. GET  /priority-sales/:id/eligibility    JWT   查询我的优先购资格
//   3. POST /priority-sales/:id/buy            JWT + @TxPassword  优先购下单
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
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { PriorityService } from './priority.service';
import { PrioritySaleQueryDto } from './dto/priority-sale-query.dto';
import { PriorityBuyDto } from './dto/priority-buy.dto';

@ApiTags('优先购模块')
@Controller()
export class PriorityController {
  constructor(private readonly priorityService: PriorityService) {}

  @ApiBearerAuth()
  @Get('priority-sales')
  @ApiOperation({ summary: '优先购活动列表' })
  getPrioritySales(
    @CurrentUser('id') userId: number,
    @Query() query: PrioritySaleQueryDto,
  ) {
    return this.priorityService.getPrioritySales(userId, query);
  }

  @ApiBearerAuth()
  @Get('priority-sales/:id/eligibility')
  @ApiOperation({ summary: '查询我的优先购资格' })
  getEligibility(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.priorityService.getEligibility(userId, id);
  }

  @ApiBearerAuth()
  @TxPassword()
  @Post('priority-sales/:id/buy')
  @ApiOperation({ summary: '优先购下单', description: 'JWT 认证 + 交易密码' })
  buy(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: PriorityBuyDto,
  ) {
    return this.priorityService.buy(userId, id, dto);
  }
}
