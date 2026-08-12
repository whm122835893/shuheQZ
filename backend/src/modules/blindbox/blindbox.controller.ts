// [盲盒模块] - 盲盒控制器
// 3 个端点：
//   1. GET  /blind-boxes          公开  盲盒列表(分页)
//   2. GET  /blind-boxes/:id      公开  盲盒详情(含奖品池)
//   3. POST /blind-boxes/:id/open JWT   开启盲盒(Body: user_collectible_id)
// 本模块仅 JWT 认证，不涉及交易密码。
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BlindBoxService } from './blindbox.service';
import { OpenBlindBoxDto } from './dto/open-blind-box.dto';

@ApiTags('盲盒模块')
@Controller()
export class BlindBoxController {
  constructor(private readonly blindBoxService: BlindBoxService) {}

  @Public()
  @Get('blind-boxes')
  @ApiOperation({ summary: '盲盒列表(分页)', description: '无需认证' })
  async getList(@Query() query: PaginationDto): Promise<BaseResponseVo<any>> {
    const data = await this.blindBoxService.getList(query);
    return BaseResponseVo.success(data, 'success');
  }

  @Public()
  @Get('blind-boxes/:id')
  @ApiOperation({ summary: '盲盒详情(含奖品池)', description: '无需认证' })
  async getDetail(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.blindBoxService.getDetail(id);
    return BaseResponseVo.success(data, 'success');
  }

  @ApiBearerAuth()
  @TxPassword()
  @Post('blind-boxes/:id/open')
  @ApiOperation({
    summary: '开启盲盒（需交易密码）',
    description: 'JWT 认证 + 交易密码验证',
  })
  async open(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: OpenBlindBoxDto,
  ): Promise<BaseResponseVo<any>> {
    const { data, message } = await this.blindBoxService.open(userId, id, dto);
    return BaseResponseVo.success(data, message);
  }
}
