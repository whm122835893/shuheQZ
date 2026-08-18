// [收货地址模块] - 创建/更新收货地址 DTO
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ description: '收货人姓名', example: '张三' })
  @IsString()
  @IsNotEmpty({ message: '收货人姓名不能为空' })
  @MaxLength(50, { message: '收货人姓名不能超过50个字符' })
  name: string;

  @ApiProperty({ description: '手机号', example: '13888888888' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '省份', example: '北京市' })
  @IsString()
  @IsNotEmpty({ message: '省份不能为空' })
  province: string;

  @ApiProperty({ description: '城市', example: '北京市' })
  @IsString()
  @IsNotEmpty({ message: '城市不能为空' })
  city: string;

  @ApiProperty({ description: '区/县', example: '朝阳区' })
  @IsString()
  @IsNotEmpty({ message: '区/县不能为空' })
  district: string;

  @ApiProperty({ description: '详细地址', example: '建国路88号SOHO现代城A座1201室' })
  @IsString()
  @IsNotEmpty({ message: '详细地址不能为空' })
  @MaxLength(255, { message: '详细地址不能超过255个字符' })
  detail: string;

  @ApiProperty({ description: '是否设为默认地址', example: false, required: false })
  @IsOptional()
  @IsIn([0, 1])
  is_default?: number;
}

export class UpdateAddressDto {
  @ApiProperty({ description: '收货人姓名', example: '张三', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({ description: '手机号', example: '13888888888', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone?: string;

  @ApiProperty({ description: '省份', required: false })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({ description: '城市', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: '区/县', required: false })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: '详细地址', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  detail?: string;

  @ApiProperty({ description: '是否设为默认地址', required: false })
  @IsOptional()
  @IsIn([0, 1])
  is_default?: number;
}
