import axios from 'axios'
import { showToast } from 'vant'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// 从 localStorage 读取 token（避免与 useUser 循环依赖）
function getToken() {
  try {
    const raw = localStorage.getItem('ht_user')
    if (raw) {
      const data = JSON.parse(raw)
      return data.token || ''
    }
  } catch (e) {}
  return ''
}

// 从 localStorage 读取 refresh_token
function getRefreshToken() {
  try {
    const raw = localStorage.getItem('ht_user')
    if (raw) {
      const data = JSON.parse(raw)
      return data.refreshToken || ''
    }
  } catch (e) {}
  return ''
}

// 更新 localStorage 中的 token 和 refresh_token
function updateTokens(newToken, newRefreshToken) {
  try {
    const raw = localStorage.getItem('ht_user')
    if (raw) {
      const data = JSON.parse(raw)
      data.token = newToken
      if (newRefreshToken) data.refreshToken = newRefreshToken
      localStorage.setItem('ht_user', JSON.stringify(data))
    }
  } catch (e) {}
}

// 清除本地用户数据并跳转登录页
function clearUserAndRedirect() {
  localStorage.removeItem('ht_user')
  showToast('登录已过期，请重新登录')
  if (!window.location.pathname.includes('/auth/login')) {
    setTimeout(() => {
      window.location.href = '/auth/login'
    }, 1500)
  }
}

// ---- Token 刷新队列（防止并发刷新） ----
let isRefreshing = false
let refreshSubscribers = []

function onTokenRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback)
}

// 请求拦截器：自动带 Bearer Token
request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截器：统一处理响应和错误
request.interceptors.response.use(
  (response) => {
    // 后端统一返回 { code, data, message }
    const res = response.data
    return res
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response) {
      const { status, data } = error.response
      const message = data?.message || '请求失败'

      // 401: 尝试刷新 token，刷新失败则跳转登录
      if (status === 401) {
        // 避免对 refresh-token 端点本身和登录页请求做重试
        if (originalRequest.url?.includes('/user/refresh-token')) {
          clearUserAndRedirect()
          return Promise.reject(error)
        }

        // 避免重复重试（已标记过 _retry）
        if (originalRequest._retry) {
          clearUserAndRedirect()
          return Promise.reject(error)
        }

        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          clearUserAndRedirect()
          return Promise.reject(error)
        }

        // 如果已经在刷新中，将请求排队等待
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            addRefreshSubscriber((newToken) => {
              if (!newToken) {
                reject(error)
                return
              }
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(axios(originalRequest))
            })
          })
        }

        // 开始刷新
        originalRequest._retry = true
        isRefreshing = true

        try {
          const refreshRes = await axios.post('/api/user/refresh-token', {
            refresh_token: refreshToken,
          })
          const resData = refreshRes.data
          if (resData?.code === 200 && resData?.data?.token) {
            const newToken = resData.data.token
            const newRft = resData.data.refresh_token
            updateTokens(newToken, newRft)

            // 通知排队中的请求使用新 token
            onTokenRefreshed(newToken)

            // 重试原始请求
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return axios(originalRequest)
          } else {
            onTokenRefreshed(null)
            clearUserAndRedirect()
            return Promise.reject(error)
          }
        } catch (refreshErr) {
          onTokenRefreshed(null)
          clearUserAndRedirect()
          return Promise.reject(refreshErr)
        } finally {
          isRefreshing = false
        }
      } else {
        showToast(message)
      }
    } else if (error.request) {
      showToast('网络异常，请检查网络连接')
    } else {
      showToast(error.message || '未知错误')
    }
    return Promise.reject(error)
  },
)

export default request
