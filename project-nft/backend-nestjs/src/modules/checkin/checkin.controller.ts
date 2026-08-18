// [签到模块] - 签到控制器
// 2 个端点：
//   1. POST /check-in          JWT  每日签到
//   2. GET  /check-in/records  JWT  签到记录(参数: month, 格式 YYYY-MM)
// 本模块不涉及交易密码。
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { CheckInService } from './checkin.service';
import { CheckInRecordsQueryDto } from './dto/check-in-records-query.dto';

@ApiTags('签到模块')
@ApiBearerAuth()
@Controller()
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post('check-in')
  @ApiOperation({
    summary: '每日签到',
    description: 'JWT 认证，不需要交易密码',
  })
  async checkIn(
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<any>> {
    const { data, message } = await this.checkInService.checkIn(userId);
    return BaseResponseVo.success(data, message);
  }

  @Get('check-in/records')
  @ApiOperation({ summary: '签到记录查询', description: 'JWT 认证' })
  async getRecords(
    @CurrentUser('id') userId: number,
    @Query() query: CheckInRecordsQueryDto,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.checkInService.getRecords(userId, query);
    return BaseResponseVo.success(data, 'success');
  }
}
