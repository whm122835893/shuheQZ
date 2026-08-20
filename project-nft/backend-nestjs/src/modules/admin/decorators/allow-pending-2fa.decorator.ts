// [管理后台-认证模块] - 允许 2FA 待验证 Token 访问的端点装饰器
// 用于标记需要接受 pending2fa Token 的端点（如 2fa/verify）
import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_2FA_KEY = 'allow_pending_2fa';

/**
 * 标记此端点允许使用 pending2fa=true 的临时 Token 访问。
 * 仅用于 2FA 验证流程端点（如 /auth/2fa/verify）。
 * 其他所有端点会拒绝 pending2fa Token。
 */
export const AllowPending2fa = () => SetMetadata(ALLOW_PENDING_2FA_KEY, true);
