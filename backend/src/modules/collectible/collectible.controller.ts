// [藏品模块] - 藏品控制器
// 5 个端点：
//   1. GET    /categories               公开  藏品分类列表
//   2. GET    /collectibles             公开  藏品列表
//   3. GET    /collectibles/:id         公开  藏品详情(含 is_favored，若已登录)
//   4. POST   /collectibles/:id/favorite JWT  关注藏品
//   5. DELETE /collectibles/:id/favorite JWT  取消关注
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { CollectibleService } from './collectible.service';
import { CollectibleQueryDto } from './dto/collectible-query.dto';

@ApiTags('藏品模块')
@Controller()
export class CollectibleController {
  constructor(private readonly collectibleService: CollectibleService) {}

  @Public()
  @Get('categories')
  @ApiOperation({ summary: '藏品分类列表' })
  getCategories() {
    return this.collectibleService.getCategories();
  }

  @Public()
  @Get('collectibles')
  @ApiOperation({ summary: '藏品列表' })
  getCollectibles(@Query() query: CollectibleQueryDto) {
    return this.collectibleService.getCollectibles(query);
  }

  @Public()
  @Get('collectibles/:id')
  @ApiOperation({ summary: '藏品详情' })
  getCollectibleDetail(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    // 公开接口，已登录时返回 is_favored；未登录时 user 为 null
    return this.collectibleService.getCollectibleDetail(id, user?.id ?? null);
  }

  @ApiBearerAuth()
  @Post('collectibles/:id/favorite')
  @ApiOperation({ summary: '关注藏品' })
  favorite(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.collectibleService.favorite(userId, id);
  }

  @ApiBearerAuth()
  @Delete('collectibles/:id/favorite')
  @ApiOperation({ summary: '取消关注' })
  unfavorite(
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.collectibleService.unfavorite(userId, id);
  }
}
