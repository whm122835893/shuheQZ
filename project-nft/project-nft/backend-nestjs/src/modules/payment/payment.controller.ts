// [支付模块] - 支付控制器
// 5 个端点：
//   1. GET  /orders             JWT         我的订单列表
//   2. GET  /orders/:id         JWT         订单详情
//   3. POST /payments           JWT         创建支付
//   4. POST /payments/callback  Public      支付回调（返回纯文本 SUCCESS）
//   5. PUT  /orders/:id/cancel  JWT         取消订单
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { PaymentService } from './payment.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentCallbackDto } from './dto/payment-callback.dto';

@ApiTags('支付模块')
@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // 端点 1：GET /orders - 我的订单列表
  @ApiBearerAuth()
  @Get('orders')
  @ApiOperation({ summary: '我的订单列表' })
  getOrders(
    @CurrentUser('id') userId: number,
    @Query() query: OrderQueryDto,
  ) {
    return this.paymentService.getOrders(userId, query);
  }

  // 端点 2：GET /orders/:id - 订单详情
  @ApiBearerAuth()
  @Get('orders/:id')
  @ApiOperation({ summary: '订单详情' })
  getOrderDetail(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.paymentService.getOrderDetail(userId, id);
  }

  // 端点 3：POST /payments - 创建支付
  @ApiBearerAuth()
  @Post('payments')
  @TxPassword()
  @ApiOperation({ summary: '创建支付' })
  createPayment(
    @CurrentUser('id') userId: number,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(userId, dto);
  }

  // 端点 4：POST /payments/callback - 支付回调
  // 使用 @Res() 直接 res.send('SUCCESS')，绕过全局 TransformInterceptor
  // （路径含 "callback"，TransformInterceptor 亦会自动跳过包装）
  @Public()
  @Post('payments/callback')
  @ApiOperation({ summary: '支付回调' })
  async handleCallback(
    @Body() dto: PaymentCallbackDto,
    @Res() res: Response,
  ) {
    await this.paymentService.handleCallback(dto);
    res.send('SUCCESS');
  }

  // 端点 5：PUT /orders/:id/cancel - 取消订单
  @ApiBearerAuth()
  @Put('orders/:id/cancel')
  @ApiOperation({ summary: '取消订单' })
  cancelOrder(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.paymentService.cancelOrder(userId, id);
  }
}
