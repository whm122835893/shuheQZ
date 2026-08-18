import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type LoginResult } from '../api'
import { getToken, setToken, clearToken } from '../api/request'

export const useAdminStore = defineStore('admin', () => {
  const token = ref<string>(getToken() || '')
  const userInfo = ref({
    id: 0,
    username: '',
    realName: '',
    role: 0,
    roleName: '',
    avatar: '',
    phone: ''
  })
  const isLoggedIn = ref(!!getToken())

  async function login(username: string, password: string) {
    const result: LoginResult = await authApi.login(username, password)
    token.value = result.token
    setToken(result.token)
    isLoggedIn.value = true
    userInfo.value = {
      id: Number(result.admin.id),
      username: result.admin.username,
      realName: result.admin.realName,
      role: result.admin.role,
      roleName: result.admin.role === 1 ? '超级管理员' : '管理员',
      avatar: '',
      phone: ''
    }
    // 存储 refreshToken 以备后续使用
    if (result.refreshToken) {
      localStorage.setItem('admin_refresh_token', result.refreshToken)
    }
  }

  function logout() {
    token.value = ''
    isLoggedIn.value = false
    clearToken()
    localStorage.removeItem('admin_refresh_token')
  }

  return { token, userInfo, isLoggedIn, login, logout }
})
