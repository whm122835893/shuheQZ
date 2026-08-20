<template>
  <div class="realname-page">
    <NavBar title="实名认证" />

    <div class="form-area">
      <div class="form-group">
        <div class="form-group__head">
          <van-icon name="manager-o" size="20" color="#9CA3AF" />
          <span class="form-group__label">姓名</span>
        </div>
        <input
          v-model="realName"
          class="border-input"
          type="text"
          placeholder="请输入真实姓名"
        />
      </div>

      <div class="form-group">
        <div class="form-group__head">
          <van-icon name="certificate" size="20" color="#9CA3AF" />
          <span class="form-group__label">身份证号码</span>
        </div>
        <input
          v-model="idCard"
          class="border-input"
          type="text"
          placeholder="请输入有效身份证号"
        />
      </div>

      <button class="btn-primary" :disabled="loading" @click="onAuth">立即认证</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import NavBar from '@/components/NavBar.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const { setRealname } = useUser()
const realName = ref('')
const idCard = ref('')
const loading = ref(false)

async function onAuth() {
  if (loading.value) return
  if (!realName.value || realName.value.trim().length < 2) {
    showToast('请输入真实姓名（至少2个字符）')
    return
  }
  // 身份证号格式：18位，符合后端正则
  if (!/^[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(idCard.value)) {
    showToast('身份证号格式不正确')
    return
  }
  loading.value = true
  try {
    const name = realName.value.trim()
    const card = idCard.value.toUpperCase()
    const res = await request.post('/user/realname', {
      real_name: name,
      id_card: card
    })
    // 更新本地用户状态
    setRealname(name, card)
    showToast(res.message || '实名认证成功')
    router.back()
  } catch (e) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.realname-page {
  min-height: 100vh;
  background: #fff;
}

.form-area {
  padding: 0 24px;
  margin-top: 32px;
}

.form-group {
  margin-bottom: 24px;
}
.form-group__head {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.form-group__label {
  margin-left: 8px;
  font-size: 16px;
  color: var(--ht-text-primary);
}

.border-input {
  width: 100%;
  height: 56px;
  font-size: 16px;
  color: var(--ht-text-primary);
  border: none;
  border-bottom: 1px solid var(--ht-border);
  background: transparent;
}
.border-input::placeholder {
  color: var(--ht-text-tertiary);
}

.btn-primary {
  width: 100%;
  height: 50px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  border: none;
  border-radius: 25px;
  margin-top: 60px;
}
</style>
