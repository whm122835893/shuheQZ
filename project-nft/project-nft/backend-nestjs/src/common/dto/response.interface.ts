// [公共] - 通用响应接口
// 使用 camelCase 命名（pageSize），与后台服务返回的分页结构保持一致

/** 通用分页响应 */
export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
