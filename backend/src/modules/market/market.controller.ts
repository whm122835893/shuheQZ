// [市场模块] - 市场控制器
// 6 个端点：
//   1. GET  /market/listings          公开            市场在售列表
//   2. POST /market/listings          JWT + @TxPassword  挂售藏品
//   3. PUT  /market/listings/:id/cancel JWT           取消寄售
//   4. POST /market/listings/:id/buy  JWT + @TxPassword  市场购买
//   5. POST /collectibles/:id/buy     JWT + @TxPassword  发售购买
//   6. GET  /market/my-listings       JWT            我的挂单
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
import { Public } from '../../common/decorators/public.decorator';
import { TxPassword } from '../../common/decorators/tx-password.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { MarketService } from './market.service';
import { MarketQueryDto } from './dto/market-query.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { BuyFromMarketDto } from './dto/buy-from-market.dto';
import { BuyFromReleaseDto } from './dto/buy-from-release.dto';
import { MyListingsQueryDto } from './dto/my-listings-query.dto';

@ApiTags('市场模块')
@Controller()
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Public()
  @Get('market/listings')
  @ApiOperation({ summary: '市场在售列表' })
  getListings(@Query() query: MarketQueryDto) {
    return this.marketService.getListings(query);
  }

  @ApiBearerAuth()
  @Post('market/listings')
  @TxPassword()
  @ApiOperation({ summary: '挂售藏品（寄售）' })
  createListing(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateListingDto,
  ) {
    return this.marketService.createListing(userId, dto);
  }

  @ApiBearerAuth()
  @Put('market/listings/:id/cancel')
  @ApiOperation({ summary: '取消寄售' })
  cancelListing(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.marketService.cancelListing(userId, id);
  }

  @ApiBearerAuth()
  @Post('market/listings/:id/buy')
  @TxPassword()
  @ApiOperation({ summary: '购买市场藏品（创建订单）' })
  buyFromMarket(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: BuyFromMarketDto,
  ) {
    return this.marketService.buyFromMarket(userId, id, dto);
  }

  @ApiBearerAuth()
  @Post('collectibles/:id/buy')
  @TxPassword()
  @ApiOperation({ summary: '发售购买（创建订单）' })
  buyFromRelease(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
    @Body() dto: BuyFromReleaseDto,
  ) {
    return this.marketService.buyFromRelease(userId, id, dto);
  }

  @ApiBearerAuth()
  @Get('market/my-listings')
  @ApiOperation({ summary: '我的寄售挂单列表' })
  getMyListings(
    @CurrentUser('id') userId: number,
    @Query() query: MyListingsQueryDto,
  ) {
    return this.marketService.getMyListings(userId, query);
  }
}
