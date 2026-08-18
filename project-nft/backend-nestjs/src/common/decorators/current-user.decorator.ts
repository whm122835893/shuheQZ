// [公共] - @CurrentUser() 参数装饰器,从 request.user 中提取当前登录用户信息
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前登录用户信息装饰器
 *
 * @example
 * getUser(@CurrentUser() user: AuthenticatedUser) { ... }
 * getUser(@CurrentUser('id') userId: number) { ... }
 */
export interface AuthenticatedUser {
  id: number;
  username?: string;
  phone?: string;
  [key: string]: any;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    // 未登录或不存在 user 时返回 null，由业务层自行判断
    if (!user) {
      return null;
    }

    // 传入字段名则返回对应字段，否则返回整个 user 对象
    return data ? user[data] : user;
  },
);
