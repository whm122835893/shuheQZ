// API 请求工具 - 基于 fetch 封装，自动注入 JWT Token
//
// 设计要点：
//  - 所有请求路径以 /admin/api/v1/ 开头，通过 Vite 代理转发到后端 NestJS
//  - 自动从 localStorage 读取 admin_token 并注入 Authorization 头
//  - 统一处理后端返回的 { code, data, message } 结构
//  - 401 时自动清除 token 并跳转登录页

const BASE_URL = '/admin/api/v1'
const TOKEN_KEY = 'admin_token'

/** 获取存储的 token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** 设置 token */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/** 清除 token */
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/** 后端统一响应结构 */
export interface ApiResponse<T = any> {
  code: number
  data: T
  message: string
}

/** 分页结果结构 */
export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/** 通用请求方法 */
async function request<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  options?: {
    body?: Record<string, any>
    query?: Record<string, any>
  },
  baseUrl: string = BASE_URL,
): Promise<T> {
  // 构建 URL（含 query 参数）
  let url = `${baseUrl}${path}`
  if (options?.query) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    }
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // 发起请求
  const response = await fetch(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  // 解析响应
  const result: ApiResponse<T> = await response.json()

  // 处理业务错误码
  if (result.code !== 200) {
    // 401 未授权 - 清除 token 并跳转登录
    if (result.code === 401 || response.status === 401) {
      clearToken()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    throw new Error(result.message || '请求失败')
  }

  return result.data
}

/** GET 请求 */
export function get<T = any>(path: string, query?: Record<string, any>): Promise<T> {
  return request<T>('GET', path, { query })
}

/**
 * 公开端点 GET 请求
 *
 * 与 get() 的区别：不拼接 /admin/api/v1 前缀，直接访问后端公开路由（如 /categories）。
 * 仍复用统一的响应解包（{ code, data, message }）与错误处理；公开端点无需登录态，
 * 即便携带 token 也无副作用。需在 vite.config.ts 中为对应路径配置代理。
 */
export function getPublic<T = any>(path: string, query?: Record<string, any>): Promise<T> {
  return request<T>('GET', path, { query }, '')
}

/** POST 请求 */
export function post<T = any>(path: string, body?: Record<string, any>): Promise<T> {
  return request<T>('POST', path, { body })
}

/** PUT 请求 */
export function put<T = any>(path: string, body?: Record<string, any>): Promise<T> {
  return request<T>('PUT', path, { body })
}

/** DELETE 请求 */
export function del<T = any>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

/** PATCH 请求 */
export function patch<T = any>(path: string, body?: Record<string, any>): Promise<T> {
  return request<T>('PATCH', path, { body })
}
