<template>
  <div class="airdrop-page">
    <div class="page-header">
      <span class="page-title">活动空投</span>
    </div>

    <!-- 空投配置 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>空投配置</span></template>
      <el-form :model="airdropForm" label-width="120px" style="max-width:700px">
        <el-form-item label="奖励类型" required>
          <el-select v-model="airdropForm.rewardType" placeholder="请选择奖励类型" style="width:220px">
            <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="奖励内容" required>
          <el-select
            v-if="airdropForm.rewardType === 'collectible' || airdropForm.rewardType === 'blindbox'"
            v-model="airdropForm.rewardContent"
            placeholder="请选择"
            filterable
            style="width:300px"
          >
            <el-option v-for="c in getRewardContentOptions(airdropForm.rewardType)" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
          <el-input v-else v-model="airdropForm.rewardContent" placeholder="请输入奖励内容" style="width:300px" />
        </el-form-item>
        <el-form-item label="每用户数量" required>
          <el-input-number v-model="airdropForm.quantity" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="手机号导入" required>
          <el-input
            v-model="airdropForm.phones"
            type="textarea"
            :rows="8"
            placeholder="每行一个手机号，换行分隔，例如：&#10;13800000001&#10;13800000002&#10;13800000003"
          />
          <div class="sub-text" style="margin-top:4px">
            已输入 {{ phoneCount }} 个手机号
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="warning" :loading="submitting" @click="handleAirdrop">
            <el-icon><Promotion /></el-icon>
            执行空投
          </el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 发放日志 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>发放日志</span>
          <div>
            <el-input v-model="searchForm.phone" placeholder="手机号" clearable style="width:160px;margin-right:8px" />
            <el-select v-model="searchForm.status" placeholder="状态" clearable style="width:120px;margin-right:8px">
              <el-option label="成功" value="success" />
              <el-option label="失败" value="failed" />
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
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failReason" label="失败原因" min-width="140">
          <template #default="{ row }">{{ row.failReason || '-' }}</template>
        </el-table-column>
        <el-table-column prop="airdropTime" label="发放时间" width="170" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import type { AirdropActivity } from '../../api'
import { post } from '../../api/request'

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
function getRewardContentOptions(_type: string) {
  return []
}

const airdropForm = reactive({
  rewardType: 'collectible',
  rewardContent: '',
  quantity: 1,
  phones: ''
})

const phoneCount = computed(() => {
  return airdropForm.phones.split('\n').map(p => p.trim()).filter(Boolean).length
})

const submitting = ref(false)

function resetForm() {
  airdropForm.rewardType = 'collectible'
  airdropForm.rewardContent = ''
  airdropForm.quantity = 1
  airdropForm.phones = ''
}

// 发放日志
interface AirdropLog {
  id: number
  phone: string
  rewardType: string
  rewardContent: string
  quantity: number
  status: string
  failReason: string
  airdropTime: string
}
let logIdSeq = 100
const logs = ref<AirdropLog[]>(
  Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    phone: `138${String(10000000 + i * 137).slice(0, 8)}`,
    rewardType: ['collectible', 'priority', 'luckydraw', 'blindbox'][i % 4],
    rewardContent: ['敦煌飞天 第1期', '优先购资格', '抽奖次数', '新春系列 第1期'][i % 4],
    quantity: 1,
    status: i % 6 === 0 ? 'failed' : 'success',
    failReason: i % 6 === 0 ? '用户不存在' : '',
    airdropTime: `2026-08-${String((i % 13) + 1).padStart(2, '0')} ${String(10 + (i % 10)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`
  }))
)

const searchForm = reactive({ phone: '', status: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: AirdropLog[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): AirdropLog[] {
  let list = [...logs.value]
  if (searchForm.phone) list = list.filter(l => l.phone.includes(searchForm.phone.trim()))
  if (searchForm.status) list = list.filter(l => l.status === searchForm.status)
  return list
}
async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as AirdropLog[], total: res.total }
  loading.value = false
}
function handleSearch() { page.value = 1; fetchData() }
function handleReset() { searchForm.phone = ''; searchForm.status = ''; page.value = 1; fetchData() }

// 执行空投
async function handleAirdrop() {
  const phones = airdropForm.phones.split('\n').map(p => p.trim()).filter(Boolean)
  if (phones.length === 0) {
    ElMessage.warning('请输入手机号')
    return
  }
  if (!airdropForm.rewardContent) {
    ElMessage.warning('请填写奖励内容')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认向 ${phones.length} 个用户空投【${rewardTypeLabel(airdropForm.rewardType)} × ${airdropForm.quantity}】吗？`,
      '执行空投',
      { type: 'warning' }
    )
  } catch {
    return
  }
  const ok = await requirePassword('批量空投奖励')
  if (!ok) return
  submitting.value = true
  try {
    await post('/marketing/airdrop', {
      phones,
      rewardType: airdropForm.rewardType,
      rewardContent: airdropForm.rewardContent,
      quantity: airdropForm.quantity
    })
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    phones.forEach(phone => {
      logs.value.unshift({
        id: logIdSeq++,
        phone,
        rewardType: airdropForm.rewardType,
        rewardContent: airdropForm.rewardContent,
        quantity: airdropForm.quantity,
        status: 'success',
        failReason: '',
        airdropTime: now
      })
    })
    ElMessage.success(`已向 ${phones.length} 个用户空投奖励`)
    fetchData()
  } catch (e: any) {
    ElMessage.error(e.message || '空投失败')
  } finally {
    submitting.value = false
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

// 导出空投记录
function handleExport() {
  const list = getFilteredList()
  if (list.length === 0) {
    ElMessage.warning('没有可导出的记录')
    return
  }
  const header = ['手机号', '奖励类型', '奖励内容', '数量', '状态', '失败原因', '发放时间']
  const rows = list.map(l => [
    l.phone, rewardTypeLabel(l.rewardType), l.rewardContent, l.quantity,
    l.status === 'success' ? '成功' : '失败', l.failReason || '-', l.airdropTime
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `空投记录_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条空投记录`)
}

// 加载真实 API 数据
async function loadData() {
  try {
    const res = await marketingApi.airdrop({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as AirdropActivity[]
    logs.value = list.map((item: any) => ({
      id: item.id,
      phone: item.phone || '',
      rewardType: item.rewardType || item.reward_type || '',
      rewardContent: item.rewardContent || item.reward_content || '',
      quantity: item.quantity ?? 1,
      status: item.status || 'success',
      failReason: item.failReason || item.fail_reason || '',
      airdropTime: item.airdropTime || item.airdrop_time || ''
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
