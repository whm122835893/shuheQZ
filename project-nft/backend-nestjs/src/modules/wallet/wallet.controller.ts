// [钱包模块] - 钱包控制器
// 5 个端点：
//   1. GET  /wallet                   JWT         钱包信息
//   2. GET  /wallet/channels          Public      当前启用支付通道列表
//   3. GET  /wallet/transactions      JWT         钱包流水列表
//   4. POST /wallet/recharge          JWT         钱包充值
//   5. POST /wallet/recharge/callback Public      充值回调（返回纯文本 SUCCESS）
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { WalletService } from './wallet.service';
import { WalletTransactionsQueryDto } from './dto/wallet-transactions-query.dto';
import { RechargeDto } from './dto/recharge.dto';
import { RechargeCallbackDto } from './dto/recharge-callback.dto';

@ApiTags('钱包模块')
@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // 端点 1：GET /wallet - 钱包信息
  @ApiBearerAuth()
  @Get('wallet')
  @ApiOperation({ summary: '钱包信息' })
  getWallet(@CurrentUser('id') userId: number) {
    return this.walletService.getWallet(userId);
  }

  // 端点 2：GET /wallet/channels - 当前启用支付通道列表
  @Public()
  @Get('wallet/channels')
  @ApiOperation({ summary: '当前启用支付通道列表' })
  getChannels() {
    return this.walletService.getChannels();
  }

  // 端点 3：GET /wallet/transactions - 钱包流水列表
  @ApiBearerAuth()
  @Get('wallet/transactions')
  @ApiOperation({ summary: '钱包流水列表' })
  getTransactions(
    @CurrentUser('id') userId: number,
    @Query() query: WalletTransactionsQueryDto,
  ) {
    return this.walletService.getTransactions(userId, query);
  }

  // 端点 4：POST /wallet/recharge - 钱包充值
  @ApiBearerAuth()
  @Post('wallet/recharge')
  @TxPassword()
  @ApiOperation({ summary: '钱包充值' })
  recharge(
    @CurrentUser('id') userId: number,
    @Body() dto: RechargeDto,
  ) {
    return this.walletService.recharge(userId, dto);
  }

  // 端点 5：POST /wallet/recharge/callback - 充值回调
  // 使用 @Res() 直接 res.send('SUCCESS')，绕过全局 TransformInterceptor
  // （路径含 "callback"，TransformInterceptor 亦会自动跳过包装）
  @Public()
  @Post('wallet/recharge/callback')
  @ApiOperation({ summary: '充值回调' })
  async handleRechargeCallback(
    @Body() dto: RechargeCallbackDto,
    @Res() res: Response,
  ) {
    await this.walletService.handleRechargeCallback(dto);
    res.send('SUCCESS');
  }
}
