<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-header">
        <img :src="logoSrc" alt="logo" class="login-logo" />
        <h1>{{ platformName }} · 运营管理后台</h1>
        <p>数字藏品管理平台</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="handleLogin">
          登 录
        </el-button>
      </el-form>
      <div class="login-tip">
        <p>默认账号：admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAdminStore } from '../../store/admin'
import { useAppStore } from '../../store/app'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const adminStore = useAdminStore()
const appStore = useAppStore()
const platformName = computed(() => appStore.platformName)
const logoSrc = computed(() => appStore.logoSrc)
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: 'admin123'
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await adminStore.login(form.username, form.password)
        ElMessage.success('登录成功')
        router.push('/dashboard')
      } catch (err: any) {
        ElMessage.error(err.message || '登录失败，请检查用户名和密码')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-box {
  width: 400px;
  max-width: 90vw;
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
}
.login-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  margin-bottom: 16px;
}
.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.login-header p {
  font-size: 14px;
  color: var(--text-secondary);
}
.login-tip {
  margin-top: 20px;
  text-align: center;
}
.login-tip p {
  font-size: 12px;
  color: var(--text-placeholder);
  line-height: 1.8;
}
</style>
