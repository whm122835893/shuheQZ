<template>
  <div class="checkin-page">
    <div class="page-header">
      <span class="page-title">签到活动</span>
    </div>

    <!-- 签到配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>签到配置 - 阶梯奖励配置</span>
          <div>
            <el-select v-model="crowdType" placeholder="人群选择" style="width:200px;margin-right:8px">
              <el-option label="全部用户" value="all" />
              <el-option label="已实名用户" value="verified" />
              <el-option label="持有藏品用户" value="holder" />
              <el-option label="VIP用户" value="vip" />
            </el-select>
            <el-button type="primary" @click="saveConfig">保存配置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rewardConfig" border>
        <el-table-column label="签到天数" width="160" align="center">
          <template #default="{ row }">
            <span class="day-text">第</span>
            <el-input-number v-model="row.day" :min="1" :max="365" :controls="false" size="small" style="width:64px;margin:0 4px" />
            <span class="day-text">天</span>
          </template>
        </el-table-column>
        <el-table-column label="奖励类型" width="180">
          <template #default="{ row }">
            <el-select v-model="row.rewardType" placeholder="请选择奖励类型" style="width:100%">
              <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="奖励内容" min-width="200">
          <template #default="{ row }">
            <el-select
              v-if="row.rewardType === 'collectible' || row.rewardType === 'blindbox'"
              v-model="row.rewardContent"
              placeholder="请选择"
              filterable
              style="width:100%"
            >
              <el-option v-for="c in getRewardContentOptions(row.rewardType)" :key="c.id" :label="c.name" :value="c.name" />
            </el-select>
            <el-input v-else v-model="row.rewardContent" placeholder="请输入奖励内容" />
          </template>
        </el-table-column>
        <el-table-column label="数量" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.quantity" :min="1" :max="99" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="预览" min-width="160">
          <template #default="{ row }">
            <el-tag :type="rewardTagType(row.rewardType)" effect="light">
              {{ rewardTypeLabel(row.rewardType) }} × {{ row.quantity }}
            </el-tag>
            <span style="margin-left:6px;font-size:12px;color:var(--text-secondary)">{{ row.rewardContent || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ $index }">
            <el-button type="danger" link :disabled="rewardConfig.length <= 1" @click="removeDay($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:12px">
        <el-button type="primary" plain @click="addDay">
          <el-icon><Plus /></el-icon>
          添加一天
        </el-button>
      </div>

      <!-- 空投模式配置 -->
      <div class="airdrop-mode-wrap">
        <span class="airdrop-mode-label">空投模式：</span>
        <el-radio-group v-model="airdropMode">
          <el-radio value="auto">自动空投（签到后自动发放到仓库）</el-radio>
          <el-radio value="manual">手动空投（等待管理员统一空投）</el-radio>
        </el-radio-group>
      </div>

      <div style="margin-top:16px">
        <el-button type="warning" @click="handleAirdrop">
          <el-icon><Promotion /></el-icon>
          一键空投今日签到奖励
        </el-button>
      </div>
    </el-card>

    <!-- 签到记录 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>签到记录</span>
          <div>
            <el-input v-model="searchForm.username" placeholder="用户名" clearable style="width:160px;margin-right:8px" />
            <el-date-picker
              v-model="searchForm.date"
              type="date"
              placeholder="签到日期"
              value-format="YYYY-MM-DD"
              style="width:160px;margin-right:8px"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column prop="username" label="用户" width="150" />
        <el-table-column prop="checkinDate" label="签到日期" width="130" />
        <el-table-column prop="continuousDays" label="连续签到天数" width="130" align="center" />
        <el-table-column label="今日奖励" min-width="180">
          <template #default="{ row }">
            <el-tag :type="rewardTagType(row.rewardType)" effect="light" size="small">
              {{ rewardTypeLabel(row.rewardType) }} × {{ row.quantity }}
            </el-tag>
            <span style="margin-left:6px">{{ row.rewardContent }}</span>
          </template>
        </el-table-column>
        <el-table-column label="发放状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="dark">
              {{ row.status === 'success' ? '已发放' : '发放失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="checkinTime" label="签到时间" width="170" />
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
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="confirmPwd" />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Promotion } from '@element-plus/icons-vue'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import { put, post } from '../../api/request'

// 统一奖励类型
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
  const map: Record<string, string> = {
    collectible: 'success',
    priority: 'warning',
    qualification: 'danger',
    luckydraw: '',
    blindbox: 'info'
  }
  return map[val] || 'info'
}
function getRewardContentOptions(_type: string) {
  return []
}

// 阶梯奖励配置（动态天数）
interface RewardRow {
  day: number
  rewardType: string
  rewardContent: string
  quantity: number
}
const rewardConfig = ref<RewardRow[]>(
  Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    rewardType: i === 6 ? 'blindbox' : i % 2 === 0 ? 'collectible' : 'luckydraw',
    rewardContent: i === 6 ? '新春系列 第1期' : i % 2 === 0 ? ['敦煌飞天 第1期', '清明上河图 第2期', '千里江山图 第3期'][i % 3] : '抽奖次数',
    quantity: i === 6 ? 1 : (i + 1)
  }))
)

// 新增一天
function addDay() {
  const nextDay = rewardConfig.value.length > 0
    ? Math.max(...rewardConfig.value.map(r => r.day)) + 1
    : 1
  rewardConfig.value.push({
    day: nextDay,
    rewardType: 'luckydraw',
    rewardContent: '',
    quantity: 1
  })
}

// 删除某一天（至少保留1天）
function removeDay(index: number) {
  if (rewardConfig.value.length <= 1) {
    ElMessage.warning('至少保留1天配置')
    return
  }
  rewardConfig.value.splice(index, 1)
}

// 空投模式
const airdropMode = ref<'auto' | 'manual'>('manual')

const crowdType = ref('all')

async function saveConfig() {
  const emptyDays = rewardConfig.value.filter(r => !r.rewardType)
  if (emptyDays.length > 0) {
    ElMessage.warning(`第 ${emptyDays.map(d => d.day).join(', ')} 天未配置奖励类型`)
    return
  }
  try {
    await put('/marketing/check-in/config', {
      rewardConfig: rewardConfig.value,
      airdropMode: airdropMode.value,
      crowdType: crowdType.value
    })
    const modeText = airdropMode.value === 'auto' ? '自动空投' : '手动空投'
    ElMessage.success(`签到配置已保存（空投模式：${modeText}）`)
  } catch (e: any) {
    ElMessage.error(e.message || '保存签到配置失败')
  }
}

// 签到记录数据
interface CheckinRecord {
  id: number
  username: string
  checkinDate: string
  continuousDays: number
  rewardType: string
  rewardContent: string
  quantity: number
  status: string
  checkinTime: string
}

const records = ref<CheckinRecord[]>([])

const searchForm = reactive({ username: '', date: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: CheckinRecord[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): CheckinRecord[] {
  let list = [...records.value]
  if (searchForm.username) {
    list = list.filter(r => r.username.includes(searchForm.username.trim()))
  }
  if (searchForm.date) {
    list = list.filter(r => r.checkinDate === searchForm.date)
  }
  return list
}

async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as CheckinRecord[], total: res.total }
  loading.value = false
}

function handleSearch() {
  page.value = 1
  fetchData()
}
function handleReset() {
  searchForm.username = ''
  searchForm.date = ''
  page.value = 1
  fetchData()
}

// 一键空投
async function handleAirdrop() {
  try {
    await ElMessageBox.confirm(
      '确认向今日所有已签到用户一键空投签到奖励吗？此操作将批量发放奖励，请谨慎操作。',
      '一键空投',
      { type: 'warning' }
    )
  } catch {
    return
  }
  const ok = await requirePassword('一键空投签到奖励')
  if (!ok) return
  try {
    await post('/marketing/check-in/airdrop', {
      rewardConfig: rewardConfig.value,
      airdropMode: airdropMode.value,
      crowdType: crowdType.value
    })
    ElMessage.success('空投任务已提交，预计 5 分钟内完成发放')
  } catch (e: any) {
    ElMessage.error(e.message || '空投失败')
  }
}

// 密码验证
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(action: string): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.resolve = resolve
    pwdDialog.visible = true
  })
}
function confirmPwd() {
  if (!pwdDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  pwdDialog.visible = false
  pwdDialog.resolve?.(true)
}
function cancelPwd() {
  pwdDialog.visible = false
  pwdDialog.resolve?.(false)
}

// 加载真实 API 数据
async function loadData() {
  try {
    const res: any = await marketingApi.checkinConfig()
    if (Array.isArray(res?.rewardConfig)) {
      rewardConfig.value = res.rewardConfig.map((item: any) => ({
        day: item.day ?? 1,
        rewardType: item.rewardType || item.reward_type || 'luckydraw',
        rewardContent: item.rewardContent || item.reward_content || '',
        quantity: item.quantity ?? 1
      }))
    }
    if (Array.isArray(res?.records)) {
      records.value = res.records.map((item: any) => ({
        id: item.id,
        username: item.username || '',
        checkinDate: item.checkinDate || item.checkin_date || '',
        continuousDays: item.continuousDays ?? item.continuous_days ?? 1,
        rewardType: item.rewardType || item.reward_type || '',
        rewardContent: item.rewardContent || item.reward_content || '',
        quantity: item.quantity ?? 1,
        status: item.status || 'success',
        checkinTime: item.checkinTime || item.checkin_time || ''
      }))
    }
    if (res?.airdropMode) {
      airdropMode.value = res.airdropMode
    }
    if (res?.crowdType) {
      crowdType.value = res.crowdType
    }
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
.day-text {
  font-weight: 600;
  color: var(--color-primary);
}
.airdrop-mode-wrap {
  display: flex;
  align-items: center;
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.airdrop-mode-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-right: 8px;
  white-space: nowrap;
}
</style>
