/**
 * 分页工具函数
 *
 * 从原 api/mock.ts 中提取的通用分页辅助函数，
 * 不包含任何 Mock 数据，纯工具函数。
 */

/**
 * 通用分页函数
 *
 * @param list 原始数据列表
 * @param page 当前页码（从 1 开始）
 * @param pageSize 每页条数
 * @returns 分页结果对象
 */
export function paginate<T>(list: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    page_size: pageSize
  }
}

/**
 * 模拟网络延迟（仅在开发环境使用）
 */
export function delay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
