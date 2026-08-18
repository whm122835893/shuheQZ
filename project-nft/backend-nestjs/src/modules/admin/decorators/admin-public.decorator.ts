// [管理后台-认证模块] - @AdminPublic() 装饰器
// 标记管理后台的公开接口（如登录），使 AdminJwtGuard 跳过认证。
// 与 @Public() 区别：@Public() 跳过全局 JwtAuthGuard（用户端认证），
// @AdminPublic() 跳过 AdminJwtGuard（管理员端认证）。
// 登录接口需要同时使用 @Public() + @AdminPublic() 才能同时跳过两个守卫。
import { SetMetadata } from '@nestjs/common';

export const ADMIN_PUBLIC_KEY = 'isAdminPublic';
export const AdminPublic = () => SetMetadata(ADMIN_PUBLIC_KEY, true);
