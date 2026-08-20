// [公共] - @TxPassword() 装饰器,标记需要交易密码验证
import { SetMetadata } from '@nestjs/common';

export const TX_PASSWORD_KEY = 'txPassword';
export const TxPassword = () => SetMetadata(TX_PASSWORD_KEY, true);
