// [公共] - 统一响应 VO
import { ApiProperty } from '@nestjs/swagger';

/**
 * 统一响应结构
 * @example
 * { "code": 200, "data": { ... }, "message": "success" }
 */
export class BaseResponseVo<T = any> {
  @ApiProperty({
    description: '业务码，与 HTTP 状态码保持一致',
    example: 200,
    type: Number,
  })
  code: number;

  @ApiProperty({
    description: '业务数据，可能是对象、数组或 null',
    example: null,
  })
  data: T | null;

  @ApiProperty({
    description: '提示信息',
    example: 'success',
  })
  message: string;

  constructor(code: number, data: T | null = null, message = 'success') {
    this.code = code;
    this.data = data;
    this.message = message;
  }

  /**
   * 快速构建成功响应
   */
  static success<T>(data: T, message = 'success'): BaseResponseVo<T> {
    return new BaseResponseVo<T>(200, data, message);
  }

  /**
   * 快速构建失败响应
   */
  static fail(
    code: number,
    message: string,
    data: null = null,
  ): BaseResponseVo<null> {
    return new BaseResponseVo<null>(code, data, message);
  }
}

/**
 * 分页数据 VO
 */
export class PaginatedDataVo<T = any> {
  @ApiProperty({ description: '记录数组', type: Array, example: [] })
  list: T[];

  @ApiProperty({ description: '总条数', example: 100 })
  total: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  page: number;

  @ApiProperty({ description: '每页条数', example: 20 })
  page_size: number;

  constructor(list: T[], total: number, page: number, page_size: number) {
    this.list = list;
    this.total = total;
    this.page = page;
    this.page_size = page_size;
  }
}
