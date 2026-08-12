// [公共] - 错误码枚举
// 业务码（响应体 code）与 HTTP 状态码保持一致取值，便于网关与前端统一处理。
export enum ErrorCode {
  SUCCESS = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_FAILED = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_ERROR = 500,
}
