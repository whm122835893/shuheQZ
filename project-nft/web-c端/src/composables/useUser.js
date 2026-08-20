import { ref } from 'vue'

// Load from localStorage if available
function loadUserFromStorage() {
  try {
    const data = localStorage.getItem('ht_user')
    if (data) return JSON.parse(data)
  } catch (e) {}
  return null
}

const saved = loadUserFromStorage()

// Shared reactive user state across the app
const isLoggedIn = ref(saved?.isLoggedIn || false)
const token = ref(saved?.token || '')
const refreshToken = ref(saved?.refreshToken || '')
const username = ref(saved?.username || '')
const phone = ref(saved?.phone || '')
const avatar = ref(saved?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=huanting')
const uid = ref(saved?.uid || '')
const isRealname = ref(saved?.isRealname || false)
const realName = ref(saved?.realName || '')
const idCard = ref(saved?.idCard || '')
// 仅存储是否已设置交易密码的布尔标记，不存储密码本身（安全要求）
const hasTxPassword = ref(saved?.hasTxPassword || false)

function persistUser() {
  localStorage.setItem('ht_user', JSON.stringify({
    isLoggedIn: isLoggedIn.value,
    token: token.value,
    refreshToken: refreshToken.value,
    username: username.value,
    phone: phone.value,
    avatar: avatar.value,
    uid: uid.value,
    isRealname: isRealname.value,
    realName: realName.value,
    idCard: idCard.value,
    hasTxPassword: hasTxPassword.value
  }))
}

// Generate an 8-character nickname with uppercase letters and digits
function generateNickname() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate a 5-digit UID
function generateUid() {
  return String(Math.floor(10000 + Math.random() * 90000))
}

// Mask phone number: 138****8888
function maskPhone(phoneNum) {
  if (!phoneNum || phoneNum.length < 7) return phoneNum
  return phoneNum.substring(0, 3) + '****' + phoneNum.substring(phoneNum.length - 4)
}

export function useUser() {
  // 接收后端登录/注册返回的 data 对象: { token, refresh_token, expires_in, user: {...} }
  function login(apiData) {
    isLoggedIn.value = true
    token.value = apiData?.token || ''
    refreshToken.value = apiData?.refresh_token || ''
    phone.value = apiData?.user?.phone || ''
    username.value = apiData?.user?.username || generateNickname()
    uid.value = apiData?.user?.uid || generateUid()
    avatar.value = apiData?.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=huanting'
    isRealname.value = !!apiData?.user?.is_realname
    hasTxPassword.value = !!apiData?.user?.has_transaction_password
    persistUser()
  }

  // 注册成功后同样调用 login 存储登录态
  function register(apiData) {
    login(apiData)
  }

  function logout() {
    isLoggedIn.value = false
    token.value = ''
    refreshToken.value = ''
    username.value = ''
    phone.value = ''
    uid.value = ''
    isRealname.value = false
    realName.value = ''
    idCard.value = ''
    hasTxPassword.value = false
    persistUser()
  }

  function updateProfile(newName, newAvatar) {
    if (newName) username.value = newName
    if (newAvatar) avatar.value = newAvatar
    persistUser()
  }

  function setRealname(name, id) {
    isRealname.value = true
    realName.value = name
    idCard.value = id
    persistUser()
  }

  // 标记用户已设置交易密码（不存储密码值）
  function setTransactionPassword() {
    hasTxPassword.value = true
    persistUser()
  }

  function hasTransactionPassword() {
    return hasTxPassword.value
  }

  const maskedPhone = () => maskPhone(phone.value)

  return {
    isLoggedIn,
    token,
    refreshToken,
    username,
    phone,
    maskedPhone,
    avatar,
    uid,
    isRealname,
    realName,
    idCard,
    hasTxPassword,
    login,
    register,
    logout,
    updateProfile,
    setRealname,
    setTransactionPassword,
    hasTransactionPassword,
  }
}
