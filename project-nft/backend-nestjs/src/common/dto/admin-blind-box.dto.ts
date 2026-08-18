// [公共-管理后台盲盒] - Body DTO
// 覆盖盲盒创建与更新入参
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * 创建盲盒
 * - 传入 collectibleId 时关联已有藏品
 * - 未传入 collectibleId 时需同时提供 name / categoryId / image 新建藏品
 */
export class CreateBlindBoxDto {
  @ApiPropertyOptional({ description: '关联已有藏品ID（与新建字段二选一）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  collectibleId?: number;

  @ApiPropertyOptional({ description: '藏品名称（新建藏品时必填）', example: '新春盲盒' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '分类ID（新建藏品时必填）', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: '主图URL（新建藏品时必填）', example: 'https://cdn.example.com/box.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ description: '副标题' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: '价格', example: 9.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '发行份数', example: 3000 })
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

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '状态：1=上架 0=下架', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;
}

/** 编辑盲盒（更新底层藏品商品属性，仅更新提供的字段） */
export class UpdateBlindBoxDto {
  @ApiPropertyOptional({ description: '藏品名称' })
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

  @ApiPropertyOptional({ description: '渐变色' })
  @IsOptional()
  @IsString()
  gradient?: string;

  @ApiPropertyOptional({ description: '图标' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ description: '价格', example: 9.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: '发行份数', example: 3000 })
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

  @ApiPropertyOptional({ description: '是否推荐', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  featured?: number;

  @ApiPropertyOptional({ description: '市场标签' })
  @IsOptional()
  @IsString()
  marketTag?: string;
}
