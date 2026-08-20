// [转赠模块] - 转赠控制器
// 5 个端点：
//   1. POST /transfers             JWT + @TxPassword  发起转赠
//   2. PUT  /transfers/:id/confirm JWT                确认接收转赠
//   3. PUT  /transfers/:id/reject  JWT                拒绝转赠
//   4. PUT  /transfers/:id/cancel  JWT                取消转赠（发起方）
//   5. GET  /transfers             JWT                转赠记录
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';

@ApiTags('转赠模块')
@Controller()
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  // 1. 发起转赠
  @ApiBearerAuth()
  @Post('transfers')
  @TxPassword()
  @ApiOperation({ summary: '发起转赠' })
  async createTransfer(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateTransferDto,
  ) {
    const { data, message } = await this.transferService.createTransfer(
      userId,
      dto,
    );
    return BaseResponseVo.success(data, message);
  }

  // 2. 确认接收转赠
  @ApiBearerAuth()
  @Put('transfers/:id/confirm')
  @ApiOperation({ summary: '确认接收转赠' })
  async confirmTransfer(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const { data, message } = await this.transferService.confirmTransfer(
      userId,
      id,
    );
    return BaseResponseVo.success(data, message);
  }

  // 3. 拒绝转赠
  @ApiBearerAuth()
  @Put('transfers/:id/reject')
  @ApiOperation({ summary: '拒绝转赠' })
  async rejectTransfer(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const { data, message } = await this.transferService.rejectTransfer(
      userId,
      id,
    );
    return BaseResponseVo.success(data, message);
  }

  // 4. 取消转赠（发起方）
  @ApiBearerAuth()
  @Put('transfers/:id/cancel')
  @ApiOperation({ summary: '取消转赠（发起方）' })
  async cancelTransfer(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    const { data, message } = await this.transferService.cancelTransfer(
      userId,
      id,
    );
    return BaseResponseVo.success(data, message);
  }

  // 5. 转赠记录
  @ApiBearerAuth()
  @Get('transfers')
  @ApiOperation({ summary: '转赠记录' })
  getTransfers(
    @CurrentUser('id') userId: number,
    @Query() query: TransferQueryDto,
  ) {
    return this.transferService.getTransfers(userId, query);
  }
}
