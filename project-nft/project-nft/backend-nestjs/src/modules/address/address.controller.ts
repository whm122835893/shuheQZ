// [收货地址模块] - 收货地址控制器
// 5 个端点（均需 JWT）：
//   1. GET    /user/addresses          JWT   收货地址列表
//   2. POST   /user/addresses          JWT   新增收货地址
//   3. PUT    /user/addresses/:id      JWT   更新收货地址
//   4. DELETE /user/addresses/:id      JWT   删除收货地址
//   5. PUT    /user/addresses/:id/default  JWT   设置默认地址
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BaseResponseVo } from '../../common/dto/base-response.vo';
import { ParseIntWithDefaultPipe } from '../../common/pipes/parse-int-with-default.pipe';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/create-address.dto';

@ApiTags('收货地址模块')
@ApiBearerAuth()
@Controller()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('user/addresses')
  @ApiOperation({ summary: '收货地址列表', description: 'JWT 认证' })
  async list(
    @CurrentUser('id') userId: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.addressService.list(userId);
    return BaseResponseVo.success(data, 'success');
  }

  @Post('user/addresses')
  @ApiOperation({ summary: '新增收货地址', description: 'JWT 认证' })
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateAddressDto,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.addressService.create(userId, dto);
    return BaseResponseVo.success(data, '添加成功');
  }

  @Put('user/addresses/:id')
  @ApiOperation({ summary: '更新收货地址', description: 'JWT 认证' })
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
    @Body() dto: UpdateAddressDto,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.addressService.update(userId, id, dto);
    return BaseResponseVo.success(data, '修改成功');
  }

  @Delete('user/addresses/:id')
  @ApiOperation({ summary: '删除收货地址', description: 'JWT 认证' })
  async delete(
    @CurrentUser('id') userId: number,
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.addressService.delete(userId, id);
    return BaseResponseVo.success(data, '删除成功');
  }

  @Put('user/addresses/:id/default')
  @ApiOperation({ summary: '设置默认地址', description: 'JWT 认证' })
  async setDefault(
    @CurrentUser('id') userId: number,
    @Param('id', new ParseIntWithDefaultPipe(0)) id: number,
  ): Promise<BaseResponseVo<any>> {
    const data = await this.addressService.setDefault(userId, id);
    return BaseResponseVo.success(data, '已设为默认地址');
  }
}
