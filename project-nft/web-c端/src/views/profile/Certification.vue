<template>
  <div class="cert-page">
    <NavBar title="我的认证" />

    <!-- 未认证：表单 -->
    <div v-if="!isRealname" class="cert-form">
      <div class="cert-form__icon">
        <van-icon name="certificate" size="56" color="#3B82F6" />
      </div>
      <p class="cert-form__desc">请完成实名认证，以保障您的账号安全与交易权益</p>

      <div class="cert-form__area">
        <div class="form-item">
          <label class="form-item__label">姓名</label>
          <input
            v-model="name"
            class="form-item__input"
            type="text"
            placeholder="请输入真实姓名"
          />
        </div>

        <div class="form-item">
          <label class="form-item__label">身份证号</label>
          <input
            v-model="idNumber"
            class="form-item__input"
            type="text"
            maxlength="18"
            placeholder="请输入18位身份证号码"
          />
        </div>
      </div>

      <div class="cert-form__tips">
        <p>温馨提示：</p>
        <ul>
          <li>请确保输入的姓名与身份证号码一致</li>
          <li>实名认证一经提交不可修改</li>
          <li>您的信息将严格保密，仅用于身份验证</li>
        </ul>
      </div>

      <button class="cert-btn" :disabled="loading" @click="onSubmit">{{ loading ? '认证中...' : '立即认证' }}</button>
    </div>

    <!-- 已认证：展示信息 -->
    <div v-else class="cert-success">
      <div class="cert-success__icon">
        <svg viewBox="0 0 64 64" width="72" height="72">
          <circle cx="32" cy="32" r="30" fill="#52C41A" />
          <path d="M20 33 L28 41 L44 25" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <p class="cert-success__text">已实名认证</p>

      <div class="cert-success__card">
        <div class="info-row">
          <span class="info-row__label">姓名</span>
          <span class="info-row__value">{{ maskedName }}</span>
        </div>
        <div class="info-row info-row--last">
          <span class="info-row__label">身份证号码</span>
          <span class="info-row__value">{{ maskedIdCard }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const { isRealname, realName, idCard, setRealname } = useUser()

const name = ref('')
const idNumber = ref('')
const loading = ref(false)

const maskedName = computed(() => {
  if (!realName.value) return ''
  const n = realName.value
  // 后端 GET /user/info 返回的 real_name 已脱敏，直接展示
  if (n.includes('*')) return n
  if (n.length <= 1) return n
  if (n.length === 2) return n[0] + '*'
  return n[0] + '*'.repeat(n.length - 2) + n[n.length - 1]
})

const maskedIdCard = computed(() => {
  if (!idCard.value) return ''
  const id = idCard.value
  // 后端 GET /user/info 返回的 id_card_masked 已脱敏，直接展示
  if (id.includes('*')) return id
  if (id.length <= 6) return id
  return id.substring(0, 3) + '*'.repeat(id.length - 6) + id.substring(id.length - 3)
})

// 进入页面时拉取用户信息，判断是否已实名认证
onMounted(async () => {
  try {
    const res = await request.get('/user/info')
    const data = res.data
    if (data && data.is_realname) {
      // 后端返回的 real_name 与 id_card_masked 已脱敏，存入本地用于展示
      setRealname(data.real_name || '', data.id_card_masked || '')
    }
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  }
})

async function onSubmit() {
  const realNameVal = name.value.trim()
  if (!realNameVal) {
    showToast('请输入真实姓名')
    return
  }
  const idVal = idNumber.value.trim().toUpperCase()
  if (!idVal) {
    showToast('请输入身份证号码')
    return
  }
  // 与后端保持一致的身份证号校验
  const idCardRegex = /^[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/
  if (!idCardRegex.test(idVal)) {
    showToast('请输入正确的18位身份证号码')
    return
  }
  if (loading.value) return
  loading.value = true
  try {
    await request.post('/user/realname', {
      real_name: realNameVal,
      id_card: idVal
    })
    // 提交成功后用原始数据更新本地状态（maskedName / maskedIdCard 会负责脱敏展示）
    setRealname(realNameVal, idVal)
    showToast('认证成功')
  } catch (e) {
    // 错误提示由请求拦截器统一处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.cert-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* 未认证表单 */
.cert-form {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cert-form__icon {
  margin-top: 48px;
}
.cert-form__desc {
  margin-top: 16px;
  font-size: 14px;
  color: var(--ht-text-secondary);
  text-align: center;
  padding: 0 32px;
  line-height: 1.6;
}
.cert-form__area {
  width: 100%;
  padding: 32px 24px 0;
}
.form-item {
  display: flex;
  align-items: center;
  height: 56px;
  background: #fff;
  border: 1px solid var(--ht-border);
  border-radius: 15px;
  padding: 0 16px;
  margin-bottom: 16px;
}
.form-item__label {
  width: 90px;
  flex-shrink: 0;
  font-size: 16px;
  color: var(--ht-text-primary);
  text-align: left;
}
.form-item__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 16px;
  color: var(--ht-text-primary);
  background: transparent;
}
.form-item__input::placeholder {
  color: var(--ht-text-tertiary);
}

.cert-form__tips {
  width: 100%;
  margin-top: 8px;
  padding: 0 24px;
}
.cert-form__tips p {
  font-size: 13px;
  color: var(--ht-text-secondary);
  font-weight: 600;
  margin-bottom: 6px;
}
.cert-form__tips ul {
  padding-left: 16px;
}
.cert-form__tips li {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  line-height: 1.8;
}

.cert-btn {
  width: calc(100% - 48px);
  height: 50px;
  border-radius: 25px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  border: none;
  margin-top: 40px;
}

/* 已认证展示 */
.cert-success {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cert-success__icon {
  margin-top: 80px;
}
.cert-success__text {
  margin-top: 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.cert-success__card {
  width: calc(100% - 48px);
  margin-top: 40px;
  background: #fff;
  border-radius: 12px;
  padding: 0 20px;
  box-shadow: var(--ht-shadow-card);
}
.info-row {
  display: flex;
  align-items: center;
  height: 56px;
  border-bottom: 1px solid var(--ht-border-light);
}
.info-row--last {
  border-bottom: none;
}
.info-row__label {
  width: 100px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--ht-text-secondary);
}
.info-row__value {
  flex: 1;
  font-size: 16px;
  color: var(--ht-text-primary);
  font-weight: 500;
  text-align: right;
}
</style>
