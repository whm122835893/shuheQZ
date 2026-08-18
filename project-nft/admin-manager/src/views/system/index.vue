<template>
  <div class="system-page">
    <el-tabs v-model="activeTab" type="border-card">
      <!-- 支付配置 -->
      <el-tab-pane label="支付配置" name="payment">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Wallet /></el-icon> 支付配置</span>
              <el-tag type="warning" size="small">{{ payForm.env === 'sandbox' ? '当前：沙箱环境' : '当前：生产环境' }}</el-tag>
            </div>
          </template>
          <el-form ref="payFormRef" :model="payForm" :rules="payRules" label-width="140px" style="max-width: 720px">
            <el-form-item label="运行环境" prop="env">
              <el-radio-group v-model="payForm.env">
                <el-radio value="sandbox">沙箱环境</el-radio>
                <el-radio value="production">生产环境</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="支付宝商户号" prop="alipayMerchantId">
              <el-input v-model="payForm.alipayMerchantId" placeholder="请输入支付宝商户号" />
            </el-form-item>
            <el-form-item label="微信商户号" prop="wechatMerchantId">
              <el-input v-model="payForm.wechatMerchantId" placeholder="请输入微信商户号" />
            </el-form-item>
            <el-form-item label="支付回调地址" prop="callbackUrl">
              <el-input v-model="payForm.callbackUrl" placeholder="https://api.example.com/pay/callback" />
            </el-form-item>
            <el-form-item label="验签密钥" prop="signKey">
              <el-input v-model="payForm.signKey" type="password" show-password placeholder="请输入验签密钥" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.payment" :icon="Check" @click="handleSave('payment')">保存支付配置</el-button>
              <el-button @click="handleResetForm('payment')">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 安全策略 -->
      <el-tab-pane label="安全策略" name="security">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Lock /></el-icon> 安全策略配置</span>
            </div>
          </template>
          <el-form ref="secFormRef" :model="secForm" :rules="secRules" label-width="180px" style="max-width: 720px">
            <el-divider content-position="left">交易密码策略</el-divider>
            <el-form-item label="密码错误次数阈值" prop="pwdErrorLimit">
              <el-input-number v-model="secForm.pwdErrorLimit" :min="3" :max="10" />
              <span class="form-tip">连续错误达阈值后锁定账户</span>
            </el-form-item>
            <el-form-item label="锁定时长（分钟）" prop="lockMinutes">
              <el-input-number v-model="secForm.lockMinutes" :min="5" :max="1440" :step="5" />
              <span class="form-tip">达到锁定条件后的冻结时长</span>
            </el-form-item>
            <el-divider content-position="left">限流策略</el-divider>
            <el-form-item label="单IP限流QPS" prop="ipQps">
              <el-input-number v-model="secForm.ipQps" :min="10" :max="1000" :step="10" />
              <span class="form-tip">单个IP每秒最大请求数</span>
            </el-form-item>
            <el-form-item label="单用户限流QPS" prop="userQps">
              <el-input-number v-model="secForm.userQps" :min="5" :max="500" :step="5" />
              <span class="form-tip">单个用户每秒最大请求数</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.security" :icon="Check" @click="handleSave('security')">保存安全策略</el-button>
              <el-button @click="handleResetForm('security')">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- CORS 域名 -->
      <el-tab-pane label="CORS域名" name="cors">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Link /></el-icon> CORS 域名配置</span>
            </div>
          </template>
          <el-form ref="corsFormRef" :model="corsForm" :rules="corsRules" label-width="160px" style="max-width: 720px">
            <el-form-item label="允许的前端域名" prop="allowedDomains">
              <el-input
                v-model="corsForm.allowedDomains"
                type="textarea"
                :rows="6"
                placeholder="每行一个域名，例如：&#10;https://www.example.com&#10;https://admin.example.com&#10;https://h5.example.com"
              />
              <div class="sub-text" style="margin-top:4px">已配置 {{ corsDomainCount }} 个域名</div>
            </el-form-item>
            <el-form-item label="API 白名单" prop="apiWhitelist">
              <el-input
                v-model="corsForm.apiWhitelist"
                type="textarea"
                :rows="6"
                placeholder="每行一个接口路径，例如：&#10;/api/public/*&#10;/api/health&#10;/api/version"
              />
              <div class="sub-text" style="margin-top:4px">已配置 {{ apiWhitelistCount }} 个接口</div>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.cors" :icon="Check" @click="handleSave('cors')">保存 CORS 配置</el-button>
              <el-button @click="handleResetForm('cors')">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 短信 OSS -->
      <el-tab-pane label="短信OSS" name="sms">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Message /></el-icon> 短信 / OSS 配置</span>
            </div>
          </template>
          <el-form ref="smsFormRef" :model="smsForm" :rules="smsRules" label-width="160px" style="max-width: 720px">
            <el-divider content-position="left">短信配置</el-divider>
            <el-form-item label="短信模板ID" prop="smsTemplateId">
              <el-input v-model="smsForm.smsTemplateId" placeholder="请输入短信模板ID" />
            </el-form-item>
            <el-form-item label="短信签名" prop="smsSignName">
              <el-input v-model="smsForm.smsSignName" placeholder="请输入短信签名" />
            </el-form-item>
            <el-divider content-position="left">OSS 配置</el-divider>
            <el-form-item label="OSS 存储桶" prop="ossBucket">
              <el-input v-model="smsForm.ossBucket" placeholder="请输入 OSS 存储桶名称" />
            </el-form-item>
            <el-form-item label="文件大小限制（MB）" prop="fileSizeLimit">
              <el-input-number v-model="smsForm.fileSizeLimit" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="格式白名单" prop="formatWhitelist">
              <el-input
                v-model="smsForm.formatWhitelist"
                placeholder="逗号分隔，例如：jpg,png,gif,webp,mp4"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.sms" :icon="Check" @click="handleSave('sms')">保存短信/OSS配置</el-button>
              <el-button @click="handleResetForm('sms')">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 全局参数 -->
      <el-tab-pane label="全局参数" name="global">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span><el-icon><Tools /></el-icon> 全局参数配置</span>
            </div>
          </template>
          <el-form ref="globalFormRef" :model="globalForm" :rules="globalRules" label-width="160px" style="max-width: 720px">
            <el-form-item label="平台名称" prop="platformName">
              <el-input v-model="globalForm.platformName" placeholder="请输入平台名称" maxlength="30" show-word-limit />
            </el-form-item>
            <el-form-item label="客服联系方式" prop="customerService">
              <el-input v-model="globalForm.customerService" placeholder="电话/微信/邮箱" />
            </el-form-item>
            <el-form-item label="最低充值金额（元）" prop="minRecharge">
              <el-input-number v-model="globalForm.minRecharge" :min="1" :max="10000" :precision="2" :step="10" />
            </el-form-item>
            <el-form-item label="订单超时时间（分钟）" prop="orderTimeout">
              <el-input-number v-model="globalForm.orderTimeout" :min="1" :max="120" :step="5" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving.global" :icon="Check" @click="handleSave('global')">保存全局参数</el-button>
              <el-button @click="handleResetForm('global')">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Wallet, Lock, Link, Message, Tools, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { systemApi } from '../../api'
import { put } from '../../api/request'
import { useAppStore } from '../../store/app'

const appStore = useAppStore()
const activeTab = ref('payment')

const saving = reactive({
  payment: false,
  security: false,
  cors: false,
  sms: false,
  global: false
})

// ========== 支付配置 ==========
const payFormRef = ref<FormInstance>()
const defaultPayForm = () => ({
  env: 'sandbox',
  alipayMerchantId: '2088000000000000',
  wechatMerchantId: '1600000000',
  callbackUrl: 'https://api.example.com/pay/callback',
  signKey: 'sk_test_1234567890abcdef'
})
const payForm = reactive(defaultPayForm())
const payRules: FormRules = {
  env: [{ required: true, message: '请选择运行环境', trigger: 'change' }],
  alipayMerchantId: [{ required: true, message: '请输入支付宝商户号', trigger: 'blur' }],
  wechatMerchantId: [{ required: true, message: '请输入微信商户号', trigger: 'blur' }],
  callbackUrl: [{ required: true, message: '请输入支付回调地址', trigger: 'blur' }],
  signKey: [{ required: true, message: '请输入验签密钥', trigger: 'blur' }]
}

// ========== 安全策略 ==========
const secFormRef = ref<FormInstance>()
const defaultSecForm = () => ({
  pwdErrorLimit: 5,
  lockMinutes: 30,
  ipQps: 100,
  userQps: 50
})
const secForm = reactive(defaultSecForm())
const secRules: FormRules = {
  pwdErrorLimit: [{ required: true, message: '请输入密码错误次数阈值', trigger: 'blur' }],
  lockMinutes: [{ required: true, message: '请输入锁定时长', trigger: 'blur' }],
  ipQps: [{ required: true, message: '请输入单IP限流QPS', trigger: 'blur' }],
  userQps: [{ required: true, message: '请输入单用户限流QPS', trigger: 'blur' }]
}

// ========== CORS ==========
const corsFormRef = ref<FormInstance>()
const defaultCorsForm = () => ({
  allowedDomains: 'https://www.example.com\nhttps://admin.example.com\nhttps://h5.example.com',
  apiWhitelist: '/api/public/*\n/api/health\n/api/version'
})
const corsForm = reactive(defaultCorsForm())
const corsRules: FormRules = {
  allowedDomains: [{ required: true, message: '请输入允许的前端域名', trigger: 'blur' }],
  apiWhitelist: [{ required: true, message: '请输入 API 白名单', trigger: 'blur' }]
}
const corsDomainCount = computed(() => corsForm.allowedDomains.split('\n').map(s => s.trim()).filter(Boolean).length)
const apiWhitelistCount = computed(() => corsForm.apiWhitelist.split('\n').map(s => s.trim()).filter(Boolean).length)

// ========== 短信 OSS ==========
const smsFormRef = ref<FormInstance>()
const defaultSmsForm = () => ({
  smsTemplateId: 'SMS_123456789',
  smsSignName: '数字藏品',
  ossBucket: 'collectible-prod',
  fileSizeLimit: 5,
  formatWhitelist: 'jpg,png,gif,webp,mp4'
})
const smsForm = reactive(defaultSmsForm())
const smsRules: FormRules = {
  smsTemplateId: [{ required: true, message: '请输入短信模板ID', trigger: 'blur' }],
  smsSignName: [{ required: true, message: '请输入短信签名', trigger: 'blur' }],
  ossBucket: [{ required: true, message: '请输入 OSS 存储桶', trigger: 'blur' }],
  fileSizeLimit: [{ required: true, message: '请输入文件大小限制', trigger: 'blur' }],
  formatWhitelist: [{ required: true, message: '请输入格式白名单', trigger: 'blur' }]
}

// ========== 全局参数 ==========
const globalFormRef = ref<FormInstance>()
const defaultGlobalForm = () => ({
  platformName: appStore.platformName,
  customerService: '400-888-8888 / 微信客服',
  minRecharge: 10,
  orderTimeout: 15
})
const globalForm = reactive(defaultGlobalForm())
const globalRules: FormRules = {
  platformName: [{ required: true, message: '请输入平台名称', trigger: 'blur' }],
  customerService: [{ required: true, message: '请输入客服联系方式', trigger: 'blur' }],
  minRecharge: [{ required: true, message: '请输入最低充值金额', trigger: 'blur' }],
  orderTimeout: [{ required: true, message: '请输入订单超时时间', trigger: 'blur' }]
}

// ========== 保存逻辑 ==========
const tabNameMap: Record<string, string> = {
  payment: '支付配置',
  security: '安全策略',
  cors: 'CORS 域名配置',
  sms: '短信/OSS 配置',
  global: '全局参数'
}

const formRefMap: Record<string, any> = {
  payment: payFormRef,
  security: secFormRef,
  cors: corsFormRef,
  sms: smsFormRef,
  global: globalFormRef
}

async function handleSave(type: keyof typeof saving) {
  const formRef = formRefMap[type]
  if (!formRef || !formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    try {
      await ElMessageBox.confirm(
        `确定要保存${tabNameMap[type]}吗？修改将立即生效，请确认配置无误。`,
        `保存${tabNameMap[type]}`,
        { type: 'warning', confirmButtonText: '确定保存', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
    saving[type] = true
    try {
      const configMap: Record<string, any> = {
        payment: payForm,
        security: secForm,
        cors: corsForm,
        sms: smsForm,
        global: globalForm
      }
      await put('/system/settings', { type, ...configMap[type] })
      // 全局参数保存时同步平台名称到全局 store
      if (type === 'global') {
        appStore.setPlatformName(globalForm.platformName)
      }
      ElMessage.success(`${tabNameMap[type]}已保存并生效`)
    } catch (e: any) {
      ElMessage.error(e.message || `${tabNameMap[type]}保存失败`)
    } finally {
      saving[type] = false
    }
  })
}

function handleResetForm(type: keyof typeof saving) {
  ElMessageBox.confirm('确定要重置当前配置为初始值吗？未保存的修改将丢失。', '重置确认', {
    type: 'warning',
    confirmButtonText: '确定重置',
    cancelButtonText: '取消'
  })
    .then(() => {
      switch (type) {
        case 'payment':
          Object.assign(payForm, defaultPayForm())
          break
        case 'security':
          Object.assign(secForm, defaultSecForm())
          break
        case 'cors':
          Object.assign(corsForm, defaultCorsForm())
          break
        case 'sms':
          Object.assign(smsForm, defaultSmsForm())
          break
        case 'global':
          Object.assign(globalForm, defaultGlobalForm())
          break
      }
      ElMessage.success('配置已重置')
    })
    .catch(() => {})
}

// 加载系统配置（全局参数 + 支付配置），失败时回退默认值
async function loadData() {
  try {
    const [globalRes, paymentRes]: any = await Promise.all([
      systemApi.global(),
      systemApi.payment()
    ])
    if (globalRes) {
      // 全局参数
      if (globalRes.platformName) globalForm.platformName = globalRes.platformName
      if (globalRes.customerService) globalForm.customerService = globalRes.customerService
      if (globalRes.minRecharge !== undefined) globalForm.minRecharge = Number(globalRes.minRecharge)
      if (globalRes.orderTimeout !== undefined) globalForm.orderTimeout = Number(globalRes.orderTimeout)
      // 安全策略
      if (globalRes.pwdErrorLimit !== undefined) secForm.pwdErrorLimit = Number(globalRes.pwdErrorLimit)
      if (globalRes.lockMinutes !== undefined) secForm.lockMinutes = Number(globalRes.lockMinutes)
      if (globalRes.ipQps !== undefined) secForm.ipQps = Number(globalRes.ipQps)
      if (globalRes.userQps !== undefined) secForm.userQps = Number(globalRes.userQps)
      // CORS
      if (globalRes.allowedDomains) corsForm.allowedDomains = globalRes.allowedDomains
      if (globalRes.apiWhitelist) corsForm.apiWhitelist = globalRes.apiWhitelist
      // 短信 / OSS
      if (globalRes.smsTemplateId) smsForm.smsTemplateId = globalRes.smsTemplateId
      if (globalRes.smsSignName) smsForm.smsSignName = globalRes.smsSignName
      if (globalRes.ossBucket) smsForm.ossBucket = globalRes.ossBucket
      if (globalRes.fileSizeLimit !== undefined) smsForm.fileSizeLimit = Number(globalRes.fileSizeLimit)
      if (globalRes.formatWhitelist) smsForm.formatWhitelist = globalRes.formatWhitelist
    }
    if (paymentRes) {
      if (paymentRes.env) payForm.env = paymentRes.env
      if (paymentRes.alipayMerchantId) payForm.alipayMerchantId = paymentRes.alipayMerchantId
      if (paymentRes.wechatMerchantId) payForm.wechatMerchantId = paymentRes.wechatMerchantId
      if (paymentRes.callbackUrl) payForm.callbackUrl = paymentRes.callbackUrl
      if (paymentRes.signKey) payForm.signKey = paymentRes.signKey
    }
  } catch (e) {
    // API 不可用时使用默认配置兜底
    console.warn('[system] API 加载失败，使用默认配置', e)
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.system-page :deep(.el-tabs__content) {
  padding: 0;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: var(--text-primary);
}
.card-header .el-icon {
  vertical-align: -2px;
  margin-right: 4px;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
