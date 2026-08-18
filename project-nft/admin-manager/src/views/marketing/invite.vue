<template>
  <div class="invite-page">
    <div class="page-header">
      <span class="page-title">邀请活动</span>
    </div>

    <!-- 注册奖励配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>注册奖励配置</span></template>
      <el-form :model="registerReward" label-width="120px" inline>
        <el-form-item label="奖励类型" required>
          <el-select v-model="registerReward.rewardType" placeholder="请选择" style="width:180px">
            <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="奖励内容" required>
          <el-select
            v-if="registerReward.rewardType === 'collectible' || registerReward.rewardType === 'blindbox'"
            v-model="registerReward.rewardContent"
            placeholder="请选择"
            filterable
            style="width:200px"
          >
            <el-option v-for="c in getRewardContentOptions(registerReward.rewardType)" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
          <el-input v-else v-model="registerReward.rewardContent" placeholder="请输入奖励内容" style="width:200px" />
        </el-form-item>
        <el-form-item label="数量" required>
          <el-input-number v-model="registerReward.quantity" :min="1" :max="99" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 邀请人奖励配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>邀请人奖励配置 - 阶梯奖励</span></template>
      <el-table :data="ladderRewards" border>
        <el-table-column label="邀请人数门槛" width="180" align="center">
          <template #default="{ row }">
            <el-input-number v-model="row.threshold" :min="1" :max="9999" :controls="false" size="small" style="width:96px" />
            <span class="ladder-text"> 人</span>
          </template>
        </el-table-column>
        <el-table-column label="奖励类型" width="200">
          <template #default="{ row }">
            <el-select v-model="row.rewardType" placeholder="请选择" style="width:100%">
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
          </template>
        </el-table-column>
        <el-table-column label="已完成人数" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="success" effect="plain">{{ row.completedCount }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button type="warning" size="small" plain @click="handleLadderAirdrop(row)">
              <el-icon><Promotion /></el-icon>
              一键空投
            </el-button>
            <el-button type="danger" link :disabled="ladderRewards.length <= 1" @click="removeLadder($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top:12px">
        <el-button type="primary" plain @click="addLadder">
          <el-icon><Plus /></el-icon>
          添加阶梯
        </el-button>
      </div>

      <!-- 空投模式配置 -->
      <div class="airdrop-mode-wrap">
        <span class="airdrop-mode-label">空投模式：</span>
        <el-radio-group v-model="airdropMode">
          <el-radio value="auto">自动空投（人数达标后自动发放到仓库）</el-radio>
          <el-radio value="manual">统一空投（等待管理员手动统一空投）</el-radio>
        </el-radio-group>
      </div>

      <div style="margin-top:16px">
        <el-button type="primary" @click="saveAllConfig">保存全部配置</el-button>
      </div>
    </el-card>

    <!-- 邀请记录 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>邀请记录</span>
          <div>
            <el-input v-model="searchForm.inviter" placeholder="邀请人" clearable style="width:140px;margin-right:8px" />
            <el-input v-model="searchForm.invitee" placeholder="被邀请人" clearable style="width:140px;margin-right:8px" />
            <el-select v-model="searchForm.status" placeholder="状态" clearable style="width:120px;margin-right:8px">
              <el-option label="有效" value="valid" />
              <el-option label="无效" value="invalid" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
            <el-button type="success" @click="handleExport">
              <el-icon><Download /></el-icon>
              导出记录
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column prop="inviter" label="邀请人" width="140" />
        <el-table-column prop="invitee" label="被邀请人" width="140" />
        <el-table-column label="邀请状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'valid' ? 'success' : 'info'" effect="dark">
              {{ row.status === 'valid' ? '有效' : '无效' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="已达阶梯" width="120" align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="plain">{{ row.ladder }} 人</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="奖励发放" min-width="180">
          <template #default="{ row }">
            <el-tag :type="rewardTagType(row.rewardType)" effect="light" size="small">
              {{ rewardTypeLabel(row.rewardType) }} × {{ row.quantity }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" width="170" />
        <el-table-column prop="rewardTime" label="奖励发放时间" width="170" />
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
import { Plus, Promotion, Download } from '@element-plus/icons-vue'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import type { InviteActivity } from '../../api'
import { put, post, get } from '../../api/request'
import { availableCollectibles, availableBlindboxes, getAvailableCollectibles, getAvailableBlindboxes } from '../../api/salePlan'

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
function getRewardContentOptions(type: string): { id: number; name: string }[] {
  if (type === 'collectible') return availableCollectibles.value
  if (type === 'blindbox') return availableBlindboxes.value
  return []
}

// 注册奖励
const registerReward = reactive({
  rewardType: 'luckydraw',
  rewardContent: '注册抽奖次数',
  quantity: 1
})

// 阶梯奖励（可动态增减）
interface LadderReward {
  threshold: number
  rewardType: string
  rewardContent: string
  quantity: number
  completedCount: number
}
const ladderRewards = ref<LadderReward[]>([])

// 添加阶梯（不限数量）
function addLadder() {
  const nextThreshold = ladderRewards.value.length > 0
    ? Math.max(...ladderRewards.value.map(l => l.threshold)) + 3
    : 1
  ladderRewards.value.push({
    threshold: nextThreshold,
    rewardType: 'luckydraw',
    rewardContent: '',
    quantity: 1,
    completedCount: 0
  })
}

// 删除阶梯（至少保留1个）
function removeLadder(index: number) {
  if (ladderRewards.value.length <= 1) {
    ElMessage.warning('至少保留1个阶梯配置')
    return
  }
  ladderRewards.value.splice(index, 1)
}

// 空投模式
const airdropMode = ref<'auto' | 'manual'>('manual')

async function saveAllConfig() {
  const emptyLadder = ladderRewards.value.filter(l => !l.rewardType || !l.rewardContent)
  if (!registerReward.rewardType || !registerReward.rewardContent) {
    ElMessage.warning('请完善注册奖励配置')
    return
  }
  if (emptyLadder.length > 0) {
    ElMessage.warning('请完善所有阶梯奖励配置')
    return
  }
  try {
    await put('/marketing/invite/config', {
      registerReward,
      ladderRewards: ladderRewards.value,
      airdropMode: airdropMode.value
    })
    const modeText = airdropMode.value === 'auto' ? '自动空投' : '统一空投'
    ElMessage.success(`邀请活动配置已保存（空投模式：${modeText}）`)
  } catch (e: any) {
    ElMessage.error(e.message || '保存配置失败')
  }
}

// 单个阶梯一键空投
async function handleLadderAirdrop(row: LadderReward) {
  if (!row.rewardType || !row.rewardContent) {
    ElMessage.warning('请先完善该阶梯的奖励配置')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认对【邀请 ${row.threshold} 人】阶梯的 ${row.completedCount} 名达标用户一键空投【${rewardTypeLabel(row.rewardType)} × ${row.quantity}】吗？`,
      '阶梯一键空投',
      { type: 'warning' }
    )
  } catch {
    return
  }
  const ok = await requirePassword(`阶梯空投（${row.threshold}人）`)
  if (!ok) return
  try {
    await post('/marketing/invite/airdrop', {
      threshold: row.threshold,
      rewardType: row.rewardType,
      rewardContent: row.rewardContent,
      quantity: row.quantity
    })
    ElMessage.success(`空投任务已提交，预计 5 分钟内完成 ${row.completedCount} 名用户奖励发放`)
  } catch (e: any) {
    ElMessage.error(e.message || '空投失败')
  }
}

// 邀请记录
interface InviteRecord {
  id: number
  inviter: string
  invitee: string
  status: string
  ladder: number
  rewardType: string
  quantity: number
  registerTime: string
  rewardTime: string
}
const records = ref<InviteRecord[]>([])

const searchForm = reactive({ inviter: '', invitee: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: InviteRecord[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): InviteRecord[] {
  let list = [...records.value]
  if (searchForm.inviter) list = list.filter(r => r.inviter.includes(searchForm.inviter.trim()))
  if (searchForm.invitee) list = list.filter(r => r.invitee.includes(searchForm.invitee.trim()))
  if (searchForm.status) list = list.filter(r => r.status === searchForm.status)
  return list
}
async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as InviteRecord[], total: res.total }
  loading.value = false
}
function handleSearch() { page.value = 1; fetchData() }
function handleReset() { searchForm.inviter = ''; searchForm.invitee = ''; searchForm.status = ''; page.value = 1; fetchData() }

// 导出邀请记录
function handleExport() {
  const list = getFilteredList()
  if (list.length === 0) {
    ElMessage.warning('没有可导出的记录')
    return
  }
  const header = ['邀请人', '被邀请人', '邀请状态', '已达阶梯', '奖励类型', '数量', '注册时间', '奖励发放时间']
  const rows = list.map(r => [
    r.inviter, r.invitee, r.status === 'valid' ? '有效' : '无效',
    r.ladder, rewardTypeLabel(r.rewardType), r.quantity, r.registerTime, r.rewardTime
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `邀请记录_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条邀请记录`)
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
  // 加载邀请活动（用于空投模式等配置）
  try {
    const actRes = await marketingApi.inviteActivities({ page: 1, pageSize: 9999 })
    const actList = (actRes?.list || []) as InviteActivity[]
    if (actList.length > 0) {
      const latest = actList[0]
      if (latest.airdropMode) {
        airdropMode.value = latest.airdropMode as 'auto' | 'manual'
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载邀请活动失败')
  }

  // 加载邀请配置（阶梯奖励、注册奖励、空投模式）
  try {
    const config: any = await get('/marketing/invite/config')
    if (config) {
      if (config.registerReward) {
        const r = config.registerReward
        if (r.rewardType) registerReward.rewardType = r.rewardType
        if (r.rewardContent) registerReward.rewardContent = r.rewardContent
        if (r.quantity !== undefined) registerReward.quantity = r.quantity
      }
      if (Array.isArray(config.ladderRewards) && config.ladderRewards.length > 0) {
        ladderRewards.value = config.ladderRewards.map((r: any) => ({
          threshold: r.threshold ?? 1,
          rewardType: r.rewardType || '',
          rewardContent: r.rewardContent || '',
          quantity: r.quantity ?? 1,
          completedCount: r.completedCount ?? 0
        }))
      }
      if (config.airdropMode) {
        airdropMode.value = config.airdropMode as 'auto' | 'manual'
      }
    }
  } catch (e: any) {
    // 配置可能尚未创建，静默忽略
  }

  // 加载邀请记录
  try {
    const res = await marketingApi.inviteRecords({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as any[]
    records.value = list.map((item: any) => ({
      id: item.id,
      inviter: item.inviter || item.inviter_name || '',
      invitee: item.invitee || item.invitee_name || '',
      status: item.status || 'valid',
      ladder: item.ladder ?? item.ladder_count ?? 0,
      rewardType: item.rewardType || item.reward_type || '',
      quantity: item.quantity ?? 1,
      registerTime: item.registerTime || item.register_time || '',
      rewardTime: item.rewardTime || item.reward_time || ''
    }))
  } catch (e: any) {
    ElMessage.error(e.message || '加载邀请记录失败')
  }
}

onMounted(async () => {
  await loadData()
  fetchData()
  getAvailableCollectibles()
  getAvailableBlindboxes()
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ladder-text {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 16px;
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
