// [公共] - 整数解析管道,支持默认值
import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';

/**
 * 将字符串/数字参数解析为整数。
 * - 值为空（undefined / null / ''）时返回 defaultValue
 * - 无法解析为整数时抛出 400 参数错误
 */
@Injectable()
export class ParseIntWithDefaultPipe implements PipeTransform<string | number> {
  constructor(private readonly defaultValue: number) {}

  transform(
    value: string | number | undefined | null,
    metadata: ArgumentMetadata,
  ): number {
    // 空值返回默认值
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      return this.defaultValue;
    }

    const parsed = Number.parseInt(String(value), 10);

    if (Number.isNaN(parsed)) {
      throw new HttpException(
        {
          code: ErrorCode.BAD_REQUEST,
          data: null,
          message: `参数 ${metadata.data} 必须为整数`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return parsed;
  }
}
