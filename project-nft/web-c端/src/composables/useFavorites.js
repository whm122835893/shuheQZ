import { ref } from 'vue'
import { showToast } from 'vant'
import request from '@/api/request'

const FAVORITES_KEY = 'ht_favorites'
const USER_KEY = 'ht_user'

// Load favorited collectible IDs from localStorage
function loadFavorites() {
  try {
    const data = localStorage.getItem(FAVORITES_KEY)
    if (data) return new Set(JSON.parse(data))
  } catch (e) {}
  return new Set()
}

// 判断用户是否已登录（localStorage 中存在 ht_user）
function isLoggedIn() {
  try {
    return !!localStorage.getItem(USER_KEY)
  } catch (e) {
    return false
  }
}

// Shared reactive favorites state across the app（本地缓存）
const favoriteIds = ref(loadFavorites())

function persistFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteIds.value]))
}

export function useFavorites() {
  function isFavorited(id) {
    return favoriteIds.value.has(Number(id))
  }

  // 乐观更新本地 Set，同步返回最新状态；同时异步同步到后端，失败则回滚
  function toggleFavorite(id) {
    const numId = Number(id)
    const wasFavorited = favoriteIds.value.has(numId)

    // 1. 乐观更新本地状态
    if (wasFavorited) {
      favoriteIds.value.delete(numId)
    } else {
      favoriteIds.value.add(numId)
    }
    persistFavorites()

    const nowFavorited = !wasFavorited

    // 2. 未登录：仅使用 localStorage（降级处理）
    if (!isLoggedIn()) {
      return nowFavorited
    }

    // 3. 已登录：异步同步到后端，失败则回滚本地状态
    const requestMethod = wasFavorited ? 'delete' : 'post'
    request[requestMethod](`/collectibles/${numId}/favorite`)
      .then(() => {
        // 同步成功，本地状态已正确
      })
      .catch(() => {
        if (wasFavorited) {
          favoriteIds.value.add(numId)
        } else {
          favoriteIds.value.delete(numId)
        }
        persistFavorites()
        showToast('操作失败，请重试')
      })

    return nowFavorited
  }

  // 从后端同步收藏状态（登录后调用，实际状态以后端为准）
  // 由于后端没有专门的“我的收藏列表”接口，这里通过 GET /collectibles 返回的
  // is_favored 字段进行同步：仅同步本次返回的藏品，未返回的保留本地缓存状态。
  async function syncFavorites() {
    if (!isLoggedIn()) {
      // 未登录：从本地缓存恢复
      favoriteIds.value = new Set(loadFavorites())
      return
    }
    try {
      const res = await request.get('/collectibles', {
        params: { page: 1, page_size: 100 },
      })
      const list = res.data?.list || []
      list.forEach((item) => {
        const id = Number(item.id)
        if (item.is_favored) {
          favoriteIds.value.add(id)
        } else {
          favoriteIds.value.delete(id)
        }
      })
      persistFavorites()
    } catch (e) {
      // 同步失败，保留本地缓存
    }
  }

  function getFavoriteIds() {
    return [...favoriteIds.value]
  }

  function clearFavorites() {
    favoriteIds.value.clear()
    localStorage.removeItem(FAVORITES_KEY)
  }

  return {
    favoriteIds,
    isFavorited,
    toggleFavorite,
    syncFavorites,
    getFavoriteIds,
    clearFavorites
  }
}
