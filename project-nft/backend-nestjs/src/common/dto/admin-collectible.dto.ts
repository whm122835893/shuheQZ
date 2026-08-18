// [公共-管理后台藏品] - Body DTO
// 覆盖藏品创建与更新入参（可附带库存配额）
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/** 创建藏品 */
export class CreateCollectibleDto {
  @ApiProperty({ description: '藏品名称', example: '千里江山图' })
  @IsString()
  name: string;

  @ApiProperty({ description: '分类ID', example: 1 })
  @Type(() => Number)
  @IsNumber()
  categoryId: number;

  @ApiProperty({ description: '主图URL', example: 'https://cdn.example.com/1.png' })
  @IsString()
  image: string;

  @ApiPropertyOptional({ description: '副标题', example: '故宫博物院联名' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: '价格', example: 19.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '二级市场版税费率(%)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  royaltyRate?: number;

  @ApiPropertyOptional({ description: '发行份数', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  edition?: number;

  @ApiPropertyOptional({ description: '发行方', example: '数和文创' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ description: '创作者', example: '数和文创' })
  @IsOptional()
  @IsString()
  creator?: string;

  @ApiPropertyOptional({ description: '品牌', example: '数和文创' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '标签', example: '限量' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '是否可流转：1=是 0=否', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  isTransferable?: number;

  @ApiPropertyOptional({ description: '状态：1=上架 0=下架', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;

  @ApiPropertyOptional({ description: '库存总配额', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalQuota?: number;

  @ApiPropertyOptional({ description: '每人限购', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPerUser?: number;
}

/** 编辑藏品（仅更新提供的字段） */
export class UpdateCollectibleDto {
  @ApiPropertyOptional({ description: '藏品名称', example: '千里江山图' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '副标题' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: '主图URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: '渐变色', example: 'linear-gradient(...)' })
  @IsOptional()
  @IsString()
  gradient?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '价格', example: 19.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '二级市场版税费率(%)', example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  royaltyRate?: number;

  @ApiPropertyOptional({ description: '发行份数', example: 5000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  edition?: number;

  @ApiPropertyOptional({ description: '发行方' })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional({ description: '创作者' })
  @IsOptional()
  @IsString()
  creator?: string;

  @ApiPropertyOptional({ description: '品牌' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: '专辑' })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '分类ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: '是否可流转', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  isTransferable?: number;

  @ApiPropertyOptional({ description: '是否推荐', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  featured?: number;

  @ApiPropertyOptional({ description: '市场标签' })
  @IsOptional()
  @IsString()
  marketTag?: string;

  @ApiPropertyOptional({ description: '序号前缀', example: '#' })
  @IsOptional()
  @IsString()
  serialPrefix?: string;
}
