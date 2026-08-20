// [公共-管理后台营销活动] - Body DTO
// 覆盖优先购 / 邀请 / 抽奖 / 合成 / 空投 模块的创建与更新入参
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

// ============================================================
// 优先购模块
// ============================================================

/** 创建优先购活动 */
export class CreatePrioritySaleDto {
  @ApiProperty({ description: '关联藏品ID', example: 1 })
  @Type(() => Number)
  @IsNumber()
  collectibleId: number;

  @ApiProperty({ description: '活动名称', example: '千里江山优先购' })
  @IsString()
  name: string;

  @ApiProperty({ description: '开始时间', example: '2025-01-01 10:00:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: '结束时间', example: '2025-01-02 10:00:00' })
  @IsString()
  endTime: string;
}

/** 编辑优先购活动 */
export class UpdatePrioritySaleDto {
  @ApiPropertyOptional({ description: '关联藏品ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  collectibleId?: number;

  @ApiPropertyOptional({ description: '活动名称', example: '千里江山优先购' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 10:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-01-02 10:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;
}

// ============================================================
// 邀请模块
// ============================================================

/** 创建邀请活动 */
export class CreateInviteActivityDto {
  @ApiProperty({ description: '活动名称', example: '新年邀请有礼' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '邀请人奖励藏品ID', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inviterCollectibleId?: number;

  @ApiPropertyOptional({ description: '被邀请人奖励藏品ID', example: 11 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inviteeCollectibleId?: number;

  @ApiPropertyOptional({ description: '空投模式', example: 'auto' })
  @IsOptional()
  @IsString()
  airdropMode?: string;
}

// ============================================================
// 抽奖模块
// ============================================================

/** 创建抽奖活动 */
export class CreateLuckyDrawDto {
  @ApiProperty({ description: '活动名称', example: '春节抽奖' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '每人抽奖次数限制', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  drawLimitPerUser?: number;

  @ApiPropertyOptional({ description: '注册赠送次数', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  registerGrant?: number;

  @ApiPropertyOptional({ description: '邀请赠送次数', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inviteGrant?: number;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;
}

/** 编辑抽奖活动 */
export class UpdateLuckyDrawDto {
  @ApiPropertyOptional({ description: '活动名称', example: '春节抽奖' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '每人抽奖次数限制', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  drawLimitPerUser?: number;

  @ApiPropertyOptional({ description: '注册赠送次数', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  registerGrant?: number;

  @ApiPropertyOptional({ description: '邀请赠送次数', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inviteGrant?: number;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;
}

/** 添加抽奖奖品 */
export class AddLuckyDrawPrizeDto {
  @ApiProperty({ description: '奖品藏品ID', example: 10 })
  @Type(() => Number)
  @IsNumber()
  collectibleId: number;

  @ApiProperty({ description: '奖品名称', example: '稀有藏品' })
  @IsString()
  name: string;

  @ApiProperty({ description: '中奖概率（0-100）', example: 5.5 })
  @Type(() => Number)
  @IsNumber()
  probability: number;

  @ApiPropertyOptional({ description: '数量限制', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantityLimit?: number;
}

/** 编辑抽奖奖品 */
export class UpdateLuckyDrawPrizeDto {
  @ApiPropertyOptional({ description: '奖品藏品ID', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  collectibleId?: number;

  @ApiPropertyOptional({ description: '奖品名称', example: '稀有藏品' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '中奖概率（0-100）', example: 5.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  probability?: number;

  @ApiPropertyOptional({ description: '数量限制', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantityLimit?: number;
}

// ============================================================
// 合成模块
// ============================================================

/** 创建合成活动 */
export class CreateSynthesisDto {
  @ApiProperty({ description: '活动名称', example: '三合一稀有合成' })
  @IsString()
  name: string;

  @ApiProperty({ description: '合成结果藏品ID', example: 20 })
  @Type(() => Number)
  @IsNumber()
  resultCollectibleId: number;

  @ApiProperty({ description: '合成类型', example: 'normal' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '总数量限制', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalLimit?: number;

  @ApiPropertyOptional({ description: '每人次数限制', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  perUserLimit?: number;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '描述', example: '收集三件合成稀有藏品' })
  @IsOptional()
  @IsString()
  description?: string;
}

/** 编辑合成活动 */
export class UpdateSynthesisDto {
  @ApiPropertyOptional({ description: '活动名称', example: '三合一稀有合成' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '合成结果藏品ID', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  resultCollectibleId?: number;

  @ApiPropertyOptional({ description: '合成类型', example: 'normal' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: '总数量限制', example: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalLimit?: number;

  @ApiPropertyOptional({ description: '每人次数限制', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  perUserLimit?: number;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '描述', example: '收集三件合成稀有藏品' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  status?: number;
}

// ============================================================
// 空投模块
// ============================================================

/** 创建空投活动 */
export class CreateAirdropDto {
  @ApiProperty({ description: '活动名称', example: '新年空投' })
  @IsString()
  name: string;

  @ApiProperty({ description: '空投类型', example: 'collectible' })
  @IsString()
  type: string;

  @ApiProperty({ description: '空投资产藏品ID', example: 30 })
  @Type(() => Number)
  @IsNumber()
  collectibleId: number;

  @ApiPropertyOptional({ description: '每人数量', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantityPerUser?: number;

  @ApiPropertyOptional({ description: '总数量限制', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalLimit?: number;

  @ApiPropertyOptional({ description: '开始时间', example: '2025-01-01 00:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-02-01 00:00:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: '空投模式', example: 'auto' })
  @IsOptional()
  @IsString()
  airdropMode?: string;

  @ApiPropertyOptional({ description: '条件配置（动态 JSON）', example: { minLevel: 3 } })
  @IsOptional()
  @IsObject()
  conditionConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '描述', example: '满足条件用户可领取' })
  @IsOptional()
  @IsString()
  description?: string;
}
