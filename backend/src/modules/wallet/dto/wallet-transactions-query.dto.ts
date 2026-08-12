// [钱包模块] - 端点 3 GET /wallet/transactions - 钱包流水查询 DTO
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class WalletTransactionsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      '流水类型：all=全部(默认) recharge=充值 consume=消费 freeze=冻结 unfreeze=解冻',
    enum: ['all', 'recharge', 'consume', 'freeze', 'unfreeze'],
    default: 'all',
    example: 'recharge',
  })
  @IsString()
  @IsIn(['all', 'recharge', 'consume', 'freeze', 'unfreeze'])
  @IsOptional()
  type?: string = 'all';
}
