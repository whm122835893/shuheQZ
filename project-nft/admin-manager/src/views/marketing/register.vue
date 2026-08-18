<template>
  <div class="register-page">
    <div class="page-header">
      <span class="page-title">注册福利</span>
    </div>

    <!-- 新用户奖励配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>新用户注册奖励配置</span></template>
      <el-form :model="rewardForm" label-width="140px" style="max-width:700px">
        <el-form-item label="活动状态">
          <el-switch v-model="rewardForm.enabled" active-text="已开启" inactive-text="已关闭" />
        </el-form-item>
        <el-form-item label="奖励类型" required>
          <el-select v-model="rewardForm.rewardType" placeholder="请选择奖励类型" style="width:240px" @change="handleTypeChange">
            <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <!-- 根据类型弹出对应配置面板 -->
        <!-- 藏品 -->
        <template v-if="rewardForm.rewardType === 'collectible'">
          <el-form-item label="奖励藏品" required>
            <el-select v-model="rewardForm.collectibleId" placeholder="请选择藏品" filterable style="width:300px" @change="onCollectibleChange">
              <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="发放数量" required>
            <el-input-number v-model="rewardForm.quantity" :min="1" :max="10" />
            <span class="sub-text" style="margin-left:8px">份/用户</span>
          </el-form-item>
        </template>

        <!-- 优先购白名单资格 -->
        <template v-else-if="rewardForm.rewardType === 'priority'">
          <el-form-item label="关联优先购活动" required>
            <el-select v-model="rewardForm.priorityActivity" placeholder="请选择活动" style="width:300px">
              <el-option label="敦煌飞天优先购" value="敦煌飞天优先购" />
              <el-option label="清明上河图优先购" value="清明上河图优先购" />
              <el-option label="千里江山图优先购" value="千里江山图优先购" />
            </el-select>
          </el-form-item>
          <el-form-item label="最大购买量" required>
            <el-input-number v-model="rewardForm.maxPurchase" :min="1" :max="10" />
            <span class="sub-text" style="margin-left:8px">份/用户</span>
          </el-form-item>
          <el-form-item label="资格有效期" required>
            <el-date-picker
              v-model="rewardForm.expireAt"
              type="datetime"
              placeholder="选择有效期"
              value-format="YYYY-MM-DD HH:mm:ss"
              format="YYYY-MM-DD HH:mm:ss"
              style="width:300px"
            />
          </el-form-item>
        </template>

        <!-- 资格购资格 -->
        <template v-else-if="rewardForm.rewardType === 'qualification'">
          <el-form-item label="资格购藏品" required>
            <el-select v-model="rewardForm.qualificationCollectible" placeholder="请选择藏品" filterable style="width:300px">
              <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.name" />
            </el-select>
          </el-form-item>
          <el-form-item label="资格数量" required>
            <el-input-number v-model="rewardForm.quantity" :min="1" :max="5" />
            <span class="sub-text" style="margin-left:8px">份/用户</span>
          </el-form-item>
        </template>

        <!-- 抽奖次数 -->
        <template v-else-if="rewardForm.rewardType === 'luckydraw'">
          <el-form-item label="关联抽奖活动" required>
            <el-select v-model="rewardForm.luckydrawActivity" placeholder="请选择抽奖活动" style="width:300px">
              <el-option label="夏日抽奖盛典" value="夏日抽奖盛典" />
              <el-option label="中秋回馈抽奖" value="中秋回馈抽奖" />
            </el-select>
          </el-form-item>
          <el-form-item label="赠送抽奖次数" required>
            <el-input-number v-model="rewardForm.quantity" :min="1" :max="20" />
            <span class="sub-text" style="margin-left:8px">次/用户</span>
          </el-form-item>
        </template>

        <!-- 盲盒 -->
        <template v-else-if="rewardForm.rewardType === 'blindbox'">
          <el-form-item label="奖励盲盒" required>
            <el-select v-model="rewardForm.blindboxId" placeholder="请选择盲盒" filterable style="width:300px" @change="onBlindboxChange">
              <el-option v-for="b in []" :key="b.id" :label="b.name" :value="b.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="发放数量" required>
            <el-input-number v-model="rewardForm.quantity" :min="1" :max="10" />
            <span class="sub-text" style="margin-left:8px">份/用户</span>
          </el-form-item>
        </template>

        <el-form-item label="奖励说明">
          <el-input v-model="rewardForm.description" type="textarea" :rows="3" placeholder="将展示给用户的奖励说明文案" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="空投模式">
          <el-radio-group v-model="rewardForm.airdropMode">
            <el-radio value="auto">自动空投（用户注册后自动发放奖励到仓库）</el-radio>
            <el-radio value="manual">手动空投（等待管理员统一空投）</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveConfig">保存配置</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 配置预览 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>当前配置预览</span></template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="活动状态">
          <el-tag :type="rewardForm.enabled ? 'success' : 'info'" effect="dark">
            {{ rewardForm.enabled ? '已开启' : '已关闭' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="奖励类型">
          <el-tag :type="rewardTagType(rewardForm.rewardType)" effect="light">
            {{ rewardTypeLabel(rewardForm.rewardType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="奖励内容">{{ rewardPreview }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ rewardForm.quantity }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 发放记录 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>注册奖励发放记录</span>
          <div>
            <el-input v-model="searchForm.username" placeholder="用户名" clearable style="width:140px;margin-right:8px" />
            <el-select v-model="searchForm.status" placeholder="状态" clearable style="width:120px;margin-right:8px">
              <el-option label="已发放" value="success" />
              <el-option label="发放失败" value="failed" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="warning" @click="handleAirdrop">一键空投</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column prop="username" label="用户" width="140" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column label="奖励类型" width="150">
          <template #default="{ row }">
            <el-tag :type="rewardTagType(row.rewardType)" effect="light" size="small">
              {{ rewardTypeLabel(row.rewardType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rewardContent" label="奖励内容" min-width="150" />
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="dark">
              {{ row.status === 'success' ? '已发放' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" width="170" />
        <el-table-column prop="grantTime" label="发放时间" width="170" />
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="pageData.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="管理员验证" width="420px" :close-on-click-modal="false">
      <el-form label-width="100px" @submit.prevent>
        <el-form-item label="管理员密码" required>
          <el-input
            v-model="pwdDialog.password"
            type="password"
            show-password
            placeholder="请输入管理员密码"
            @keyup.enter="confirmPwd"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelPwd">取消</el-button>
        <el-button type="primary" @click="confirmPwd">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import type { PrioritySale } from '../../api'
import { put, post } from '../../api/request'

const rewardTypeOptions = [
  { label: '藏品', value: 'collectible' },
  { label: '优先购白名单资格', value: 'priority' },
  { label: '资格购资格', value: 'qualification' },
  { label: '抽奖次数', value: 'luckydraw' },
  { label: '盲盒', value: 'blindbox' }
]
function rewardTypeLabel(val: string) {
  return rewardTypeOptions.find(o => o.value === val)?.label || '未配置'
}
function rewardTagType(val: string) {
  const map: Record<string, string> = { collectible: 'success', priority: 'warning', qualification: 'danger', luckydraw: '', blindbox: 'info' }
  return map[val] || 'info'
}

const rewardForm = reactive({
  enabled: true,
  rewardType: 'collectible',
  // collectible
  collectibleId: null as number | null,
  collectibleName: '',
  // priority
  priorityActivity: '',
  maxPurchase: 1,
  expireAt: '',
  // qualification
  qualificationCollectible: '',
  // luckydraw
  luckydrawActivity: '',
  // blindbox
  blindboxId: null as number | null,
  blindboxName: '',
  // common
  quantity: 1,
  description: '',
  // 空投模式
  airdropMode: 'manual' as 'auto' | 'manual'
})

function handleTypeChange() {
  // 切换类型时重置公共数量
  rewardForm.quantity = 1
}

function onCollectibleChange(_id: number) {
  rewardForm.collectibleName = ''
}
function onBlindboxChange(_id: number) {
  rewardForm.blindboxName = ''
}

const rewardPreview = computed(() => {
  switch (rewardForm.rewardType) {
    case 'collectible':
      return rewardForm.collectibleName || '未选择'
    case 'priority':
      return rewardForm.priorityActivity || '未选择'
    case 'qualification':
      return rewardForm.qualificationCollectible || '未选择'
    case 'luckydraw':
      return rewardForm.luckydrawActivity || '未选择'
    case 'blindbox':
      return rewardForm.blindboxName || '未选择'
    default:
      return '未配置'
  }
})

async function saveConfig() {
  if (!rewardForm.enabled) {
    try {
      await put('/marketing/register/config', { ...rewardForm })
      ElMessage.success('注册福利已关闭')
    } catch (e: any) {
      ElMessage.error(e.message || '保存配置失败')
    }
    return
  }
  // 校验对应类型必填项
  switch (rewardForm.rewardType) {
    case 'collectible':
      if (!rewardForm.collectibleId) { ElMessage.warning('请选择奖励藏品'); return }
      break
    case 'priority':
      if (!rewardForm.priorityActivity || !rewardForm.expireAt) { ElMessage.warning('请完善优先购配置'); return }
      break
    case 'qualification':
      if (!rewardForm.qualificationCollectible) { ElMessage.warning('请选择资格购藏品'); return }
      break
    case 'luckydraw':
      if (!rewardForm.luckydrawActivity) { ElMessage.warning('请选择抽奖活动'); return }
      break
    case 'blindbox':
      if (!rewardForm.blindboxId) { ElMessage.warning('请选择奖励盲盒'); return }
      break
  }
  try {
    await put('/marketing/register/config', { ...rewardForm })
    const modeText = rewardForm.airdropMode === 'auto' ? '自动空投' : '手动空投'
    ElMessage.success(`注册福利配置已保存，当前空投模式：${modeText}`)
  } catch (e: any) {
    ElMessage.error(e.message || '保存配置失败')
  }
}

function resetForm() {
  rewardForm.enabled = true
  rewardForm.rewardType = 'collectible'
  rewardForm.collectibleId = null
  rewardForm.collectibleName = ''
  rewardForm.priorityActivity = ''
  rewardForm.maxPurchase = 1
  rewardForm.expireAt = ''
  rewardForm.qualificationCollectible = ''
  rewardForm.luckydrawActivity = ''
  rewardForm.blindboxId = null
  rewardForm.blindboxName = ''
  rewardForm.quantity = 1
  rewardForm.description = ''
  rewardForm.airdropMode = 'manual'
  ElMessage.info('已重置')
}

// 密码验证弹窗（Promise 模式）
const pwdDialog = reactive({
  visible: false,
  password: '',
  resolve: null as ((value: boolean) => void) | null
})
function requirePassword(): Promise<boolean> {
  return new Promise((resolve) => {
    pwdDialog.password = ''
    pwdDialog.visible = true
    pwdDialog.resolve = resolve
  })
}
function confirmPwd() {
  if (!pwdDialog.password) {
    ElMessage.warning('请输入管理员密码')
    return
  }
  pwdDialog.visible = false
  pwdDialog.resolve?.(true)
  pwdDialog.resolve = null
}
function cancelPwd() {
  pwdDialog.visible = false
  pwdDialog.resolve?.(false)
  pwdDialog.resolve = null
}

// 一键空投
async function handleAirdrop() {
  const ok = await requirePassword()
  if (!ok) {
    ElMessage.info('已取消空投')
    return
  }
  if (rewardForm.airdropMode === 'auto') {
    ElMessage.success('当前为自动空投模式，无需手动空投')
    return
  }
  try {
    await post('/marketing/register/airdrop', { ...rewardForm })
    ElMessage.success('密码验证通过，一键空投已执行')
  } catch (e: any) {
    ElMessage.error(e.message || '空投失败')
  }
}

// 发放记录
interface RegisterReward {
  id: number
  username: string
  phone: string
  rewardType: string
  rewardContent: string
  quantity: number
  status: string
  registerTime: string
  grantTime: string
}
const records = ref<RegisterReward[]>([])

const searchForm = reactive({ username: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: RegisterReward[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): RegisterReward[] {
  let list = [...records.value]
  if (searchForm.username) list = list.filter(r => r.username.includes(searchForm.username.trim()))
  if (searchForm.status) list = list.filter(r => r.status === searchForm.status)
  return list
}
async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as RegisterReward[], total: res.total }
  loading.value = false
}
function handleSearch() { page.value = 1; fetchData() }
function handleReset() { searchForm.username = ''; searchForm.status = ''; page.value = 1; fetchData() }

// 加载真实 API 数据
// Note: 使用 marketingApi.priority.list() 作为注册奖励记录的最近匹配端点
async function loadData() {
  try {
    const res = await marketingApi.priority.list({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as PrioritySale[]
    records.value = list.map((item: any) => ({
      id: item.id,
      username: item.username || '',
      phone: item.phone || '',
      rewardType: item.rewardType || item.reward_type || '',
      rewardContent: item.rewardContent || item.reward_content || '',
      quantity: item.quantity ?? 1,
      status: item.status || 'success',
      registerTime: item.registerTime || item.register_time || '',
      grantTime: item.grantTime || item.grant_time || ''
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
  }
}

onMounted(async () => {
  await loadData()
  fetchData()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
