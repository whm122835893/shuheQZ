<template>
  <div class="luckydraw-page">
    <div class="page-header">
      <span class="page-title">抽奖活动</span>
    </div>

    <!-- 活动列表 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" class="create-btn" :icon="Plus" @click="openActivityDialog">新建活动</el-button>
    </div>
    <el-card class="search-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>活动列表</span>
        </div>
      </template>
      <el-table :data="activities" border size="small">
        <el-table-column prop="name" label="活动名称" min-width="150" />
        <el-table-column prop="prizeCount" label="奖项数" width="90" align="center" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="dark">
              {{ row.status === 'active' ? '进行中' : '未开始' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="170" />
        <el-table-column prop="endTime" label="结束时间" width="170" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="selectActivity(row)">管理奖项池</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 奖项池管理 + 资格配置 -->
    <template v-if="currentActivity">
      <div class="create-btn-bar">
        <el-dropdown @command="handleAddPrizeCommand" trigger="click">
          <el-button type="primary" size="large" class="create-btn">
            添加奖项<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="custom">自定义奖项</el-dropdown-item>
              <el-dropdown-item command="collectible">选择已有藏品</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-card shadow="never" style="margin-bottom:16px">
        <template #header>
          <div class="card-header">
            <span>奖项池管理 - {{ currentActivity.name }}</span>
          </div>
        </template>

        <!-- 概率校验提示 -->
        <el-alert
          :type="probValid ? 'success' : 'error'"
          :closable="false"
          show-icon
          style="margin-bottom:12px"
        >
          <template #title>
            <span>非空奖项概率总和：</span>
            <span :class="probValid ? 'prob-ok' : 'prob-err'" style="font-weight:700;font-size:16px">
              {{ probSum.toFixed(4) }}%
            </span>
            <span style="margin-left:12px">{{ probValid ? '概率合法（≤100%），可保存' : '概率总和超过100%，无法保存！' }}</span>
          </template>
        </el-alert>

        <el-table :data="prizePool" border>
          <el-table-column label="奖项名称" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="如：一等奖" />
            </template>
          </el-table-column>
          <el-table-column label="奖品图片" width="100" align="center">
            <template #default="{ row }">
              <el-upload
                class="prize-uploader"
                :show-file-list="false"
                accept="image/*"
                :before-upload="(file: File) => handlePrizeImageBeforeUpload(file)"
                :http-request="(opts: any) => handlePrizeImageUpload(opts, row)"
              >
                <img v-if="row.image" :src="row.image" class="prize-thumb" />
                <div v-else class="prize-thumb-placeholder">
                  <el-icon><Plus /></el-icon>
                </div>
              </el-upload>
            </template>
          </el-table-column>
          <el-table-column label="奖品类型" width="180">
            <template #default="{ row }">
              <el-select v-model="row.prizeType" placeholder="请选择" style="width:100%">
                <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="奖品内容" min-width="180">
            <template #default="{ row }">
              <el-select
                v-if="row.prizeType === 'collectible' || row.prizeType === 'blindbox'"
                v-model="row.prizeContent"
                placeholder="请选择"
                filterable
                style="width:100%"
              >
                <el-option v-for="c in getRewardContentOptions(row.prizeType)" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>
              <el-input v-else v-model="row.prizeContent" placeholder="请输入奖品内容" />
            </template>
          </el-table-column>
          <el-table-column label="中奖概率(%)" width="160">
            <template #default="{ row }">
              <el-input-number
                v-model="row.probability"
                :min="0.0001"
                :max="100"
                :precision="4"
                :step="0.1"
                :controls="false"
                style="width:130px"
              />
            </template>
          </el-table-column>
          <el-table-column label="奖项数量" width="120">
            <template #default="{ row }">
              <el-input-number v-model="row.quantity" :min="1" :max="9999" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="启用" width="80" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ $index }">
              <el-button link type="danger" size="small" @click="removePrize($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top:16px">
          <el-button type="primary" :disabled="!probValid" @click="savePrizePool">保存奖项池</el-button>
        </div>
      </el-card>

      <!-- 抽奖资格配置 -->
      <el-card shadow="never" style="margin-bottom:16px">
        <template #header><span>抽奖资格配置</span></template>
        <el-form :model="qualConfig" label-width="160px" style="max-width:600px">
          <el-form-item label="每日免费抽奖次数" required>
            <el-input-number v-model="qualConfig.freeTimes" :min="0" :max="10" />
            <span class="sub-text" style="margin-left:8px">次/天（0表示无免费次数）</span>
          </el-form-item>
          <el-form-item label="消耗藏品兑换">
            <el-switch v-model="qualConfig.exchangeEnabled" />
          </el-form-item>
          <template v-if="qualConfig.exchangeEnabled">
            <el-form-item label="兑换藏品" required>
              <el-select v-model="qualConfig.exchangeCollectible" placeholder="请选择藏品" filterable style="width:100%">
                <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>
            </el-form-item>
            <el-form-item label="兑换比例" required>
              <span>1 次抽奖 = </span>
              <el-input-number v-model="qualConfig.exchangeCount" :min="1" :max="99" style="margin:0 8px" />
              <span>个藏品</span>
            </el-form-item>
          </template>
          <el-form-item>
            <el-button type="primary" @click="saveQualConfig">保存资格配置</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 持有藏品获取抽奖次数 -->
      <el-card shadow="never" style="margin-bottom:16px">
        <template #header>
          <div class="card-header">
            <span>持有藏品获取抽奖次数</span>
            <el-switch v-model="holdConfig.enabled" active-text="启用" inactive-text="关闭" />
          </div>
        </template>
        <el-alert type="info" :closable="false" show-icon style="margin-bottom:16px">
          <template #title>
            配置持有指定藏品可获得额外抽奖次数。可选择「不销毁」（仅校验持有）或「销毁」（消耗藏品兑换次数）。
          </template>
        </el-alert>
        <template v-if="holdConfig.enabled">
          <el-table :data="holdConfig.rules" border size="small" style="margin-bottom:12px">
            <el-table-column label="持有藏品" min-width="180">
              <template #default="{ row }">
                <el-select v-model="row.collectibleName" placeholder="选择藏品" filterable style="width:100%">
                  <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.name" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="所需数量" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.requiredCount" :min="1" :max="99" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="获得次数" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.grantTimes" :min="1" :max="99" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="销毁模式" width="140" align="center">
              <template #default="{ row }">
                <el-radio-group v-model="row.burnMode" size="small">
                  <el-radio-button value="hold">仅持有</el-radio-button>
                  <el-radio-button value="burn">销毁</el-radio-button>
                </el-radio-group>
              </template>
            </el-table-column>
            <el-table-column label="每人限领" width="120" align="center">
              <template #default="{ row }">
                <el-input-number v-model="row.maxClaim" :min="1" :max="999" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeHoldRule($index)" :disabled="holdConfig.rules.length <= 1">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="display:flex;gap:8px">
            <el-button type="primary" size="small" @click="addHoldRule">
              <el-icon><Plus /></el-icon>添加规则
            </el-button>
            <el-button type="success" size="small" @click="saveHoldConfig">保存配置</el-button>
          </div>
        </template>
      </el-card>

      <!-- 手动增加抽奖次数 -->
      <el-card shadow="never" style="margin-bottom:16px">
        <template #header>
          <div class="card-header">
            <span>手动增加抽奖次数</span>
            <el-tag type="warning" size="small">仅可为进行中的活动增加</el-tag>
          </div>
        </template>
        <el-alert type="warning" :closable="false" show-icon style="margin-bottom:16px">
          <template #title>
            手动为指定用户增加抽奖次数，需选择已开启（进行中）的抽奖活动。此操作需要密码确认。
          </template>
        </el-alert>
        <el-form :model="grantForm" label-width="120px" style="max-width:700px">
          <el-form-item label="选择活动" required>
            <el-select v-model="grantForm.activityId" placeholder="请选择活动" style="width:100%" @change="onGrantActivityChange">
              <el-option
                v-for="a in activeActivities"
                :key="a.id"
                :label="`${a.name}（${a.startTime} ~ ${a.endTime}）`"
                :value="a.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="手机号" required>
            <el-input
              v-model="grantForm.phones"
              type="textarea"
              :rows="3"
              placeholder="输入手机号，多个手机号用逗号或换行分隔&#10;示例：&#10;13800138000,13900139000&#10;13700137000"
            />
            <span class="sub-text">支持单个或多个手机号，用逗号或换行分隔</span>
          </el-form-item>
          <el-form-item label="增加次数" required>
            <el-input-number v-model="grantForm.times" :min="1" :max="999" />
            <span class="sub-text" style="margin-left:8px">次/人</span>
          </el-form-item>
          <el-form-item label="备注说明">
            <el-input v-model="grantForm.remark" type="textarea" :rows="2" placeholder="可选，记录增加原因" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleGrantTimes">确认增加</el-button>
          </el-form-item>
        </el-form>

        <!-- 增加记录 -->
        <div style="margin-top:20px">
          <div style="font-weight:600;margin-bottom:8px">增加记录</div>
          <el-table :data="grantRecords" border size="small">
            <el-table-column prop="activityName" label="活动" min-width="130" />
            <el-table-column prop="operator" label="操作人" width="100" />
            <el-table-column label="手机号" min-width="160">
              <template #default="{ row }">
                <span>{{ row.phones.join('、') }}</span>
              </template>
            </el-table-column>
            <el-table-column label="增加次数" width="90" align="center">
              <template #default="{ row }">+{{ row.times }}/人</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" />
            <el-table-column prop="createdAt" label="操作时间" width="170" />
          </el-table>
        </div>
      </el-card>

      <!-- 抽奖记录 -->
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>抽奖记录</span>
            <div>
              <el-input v-model="searchForm.username" placeholder="用户名" clearable style="width:140px;margin-right:8px" />
              <el-select v-model="searchForm.prizeLevel" placeholder="奖项等级" clearable style="width:140px;margin-right:8px">
                <el-option v-for="item in rewardTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="handleReset">重置</el-button>
            </div>
          </div>
        </template>

        <el-table :data="pageData.list" v-loading="loading" border stripe>
          <el-table-column prop="username" label="用户" width="140" />
          <el-table-column prop="activityName" label="活动" min-width="140" />
          <el-table-column label="中奖奖项" min-width="130">
            <template #default="{ row }">
              <el-tag :type="row.isWin ? 'success' : 'info'" effect="dark">
                {{ row.prizeName }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="奖品类型" width="140">
            <template #default="{ row }">
              <el-tag :type="rewardTagType(row.prizeType)" effect="light" size="small">
                {{ rewardTypeLabel(row.prizeType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="prizeContent" label="奖品内容" min-width="130" />
          <el-table-column label="来源" width="100">
            <template #default="{ row }">
              {{ row.source === 'free' ? '免费' : '兑换' }}
            </template>
          </el-table-column>
          <el-table-column prop="drawTime" label="抽奖时间" width="170" />
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
    </template>

    <!-- 新建活动弹窗 -->
    <el-dialog v-model="activityDialog.visible" title="新建抽奖活动" width="500px">
      <el-form :model="activityDialog.form" label-width="100px">
        <el-form-item label="活动名称" required>
          <el-input v-model="activityDialog.form.name" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="活动时间" required>
          <el-date-picker
            v-model="activityDialog.form.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activityDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveActivity">创建</el-button>
      </template>
    </el-dialog>

    <!-- 选择已有藏品弹窗 -->
    <el-dialog v-model="collectibleDialog.visible" title="选择已有藏品作为奖项" width="700px" :close-on-click-modal="false">
      <div style="margin-bottom:12px">
        <el-input v-model="collectibleDialog.search" placeholder="搜索藏品名称" clearable style="width:300px" />
        <span style="margin-left:12px;color:var(--text-secondary);font-size:13px">
          已选择 {{ collectibleDialog.selected.length }} 个藏品
        </span>
      </div>
      <div class="collectible-pick-grid">
        <div
          v-for="c in filteredCollectiblesForPrize"
          :key="c.id"
          class="collectible-pick-item"
          :class="{ selected: collectibleDialog.selected.includes(c.id) }"
          @click="toggleSelectCollectible(c.id)"
        >
          <el-image :src="c.image" fit="cover" class="pick-image" />
          <div class="pick-name">{{ c.name }}</div>
          <div class="pick-info">发行量 {{ c.edition }}</div>
          <el-icon v-if="collectibleDialog.selected.includes(c.id)" class="pick-check"><CircleCheckFilled /></el-icon>
        </div>
      </div>
      <template #footer>
        <el-button @click="collectibleDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddCollectiblesAsPrizes">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹窗 -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="400px" :close-on-click-modal="false">
      <el-alert title="正在进行高危操作：手动增加用户抽奖次数" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-form label-width="80px">
        <el-form-item label="操作密码" required>
          <el-input v-model="pwdDialog.password" type="password" show-password placeholder="请输入操作密码" @keyup.enter="pwdDialog.visible = false; pwdDialog.resolve?.(true)" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialog.visible = false; pwdDialog.resolve?.(false)">取消</el-button>
        <el-button type="primary" @click="pwdDialog.visible = false; pwdDialog.resolve?.(true)">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { Plus, ArrowDown, CircleCheckFilled } from '@element-plus/icons-vue'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import type { LuckyDrawActivity } from '../../api'
import { post, put } from '../../api/request'

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

// 活动列表
interface Activity { id: number; name: string; prizeCount: number; status: string; startTime: string; endTime: string }
const activities = ref<Activity[]>([
  { id: 1, name: '夏日抽奖盛典', prizeCount: 5, status: 'active', startTime: '2026-08-10 10:00:00', endTime: '2026-08-20 22:00:00' },
  { id: 2, name: '中秋回馈抽奖', prizeCount: 4, status: 'pending', startTime: '2026-09-10 10:00:00', endTime: '2026-09-15 22:00:00' }
])
const currentActivity = ref<Activity | null>(activities.value[0])

const activityDialog = reactive({ visible: false, form: { name: '', timeRange: [] as string[] } })
function openActivityDialog() {
  activityDialog.form.name = ''
  activityDialog.form.timeRange = []
  activityDialog.visible = true
}
async function saveActivity() {
  if (!activityDialog.form.name || activityDialog.form.timeRange.length !== 2) {
    ElMessage.warning('请填写完整活动信息')
    return
  }
  try {
    const res: any = await post('/marketing/lucky-draw/activities', {
      name: activityDialog.form.name,
      startTime: activityDialog.form.timeRange[0],
      endTime: activityDialog.form.timeRange[1]
    })
    const newAct: Activity = {
      id: res?.id ?? Date.now(),
      name: activityDialog.form.name,
      prizeCount: 0,
      status: 'pending',
      startTime: activityDialog.form.timeRange[0],
      endTime: activityDialog.form.timeRange[1]
    }
    activities.value.push(newAct)
    activityDialog.visible = false
    ElMessage.success('活动已创建')
  } catch (e: any) {
    ElMessage.error(e.message || '创建活动失败')
  }
}
function selectActivity(row: Activity) {
  currentActivity.value = row
  page.value = 1
  fetchData()
}

// 奖项池
interface Prize {
  id: number
  name: string
  image: string
  prizeType: string
  prizeContent: string
  probability: number
  quantity: number
  enabled: boolean
}
let prizeIdSeq = 100
const prizePool = ref<Prize[]>([])

const probSum = computed(() => {
  return prizePool.value
    .filter(p => p.enabled && p.name && p.probability > 0)
    .reduce((sum, p) => sum + p.probability, 0)
})
const probValid = computed(() => probSum.value <= 100)

function addPrize() {
  prizePool.value.push({
    id: prizeIdSeq++,
    name: '',
    image: '',
    prizeType: 'luckydraw',
    prizeContent: '',
    probability: 0,
    quantity: 1,
    enabled: true
  })
}
function removePrize(index: number) {
  prizePool.value.splice(index, 1)
}

// 添加奖项：自定义 / 选择已有藏品
function handleAddPrizeCommand(command: string) {
  if (command === 'custom') {
    addPrize()
  } else if (command === 'collectible') {
    collectibleDialog.visible = true
    collectibleDialog.search = ''
    collectibleDialog.selected = []
  }
}

// 选择藏品弹窗
const collectibleDialog = reactive({
  visible: false,
  search: '',
  selected: [] as number[]
})

const filteredCollectiblesForPrize = computed(() => {
  return []
})

function toggleSelectCollectible(id: number) {
  const idx = collectibleDialog.selected.indexOf(id)
  if (idx > -1) {
    collectibleDialog.selected.splice(idx, 1)
  } else {
    collectibleDialog.selected.push(id)
  }
}

function confirmAddCollectiblesAsPrizes() {
  if (collectibleDialog.selected.length === 0) {
    ElMessage.warning('请至少选择一个藏品')
    return
  }
  let count = 0
  collectibleDialog.selected.forEach(id => {
    const c: any = undefined
    if (c) {
      prizePool.value.push({
        id: prizeIdSeq++,
        name: c.name,
        image: c.image,
        prizeType: 'collectible',
        prizeContent: c.name,
        probability: 0,
        quantity: 1,
        enabled: true
      })
      count++
    }
  })
  collectibleDialog.visible = false
  collectibleDialog.selected = []
  ElMessage.success(`已添加 ${count} 个藏品作为奖项，请设置概率和数量`)
}
async function savePrizePool() {
  if (!probValid.value) {
    ElMessage.error('概率总和超过100%，无法保存')
    return
  }
  const invalid = prizePool.value.filter(p => p.enabled && (!p.name || !p.prizeContent))
  if (invalid.length > 0) {
    ElMessage.warning('存在启用的奖项未填写名称或内容')
    return
  }
  if (!currentActivity.value) return
  try {
    await put(`/marketing/lucky-draw/activities/${currentActivity.value.id}/prizes`, { prizes: prizePool.value })
    currentActivity.value.prizeCount = prizePool.value.filter(p => p.enabled).length
    ElMessage.success(`奖项池已保存，概率总和 ${probSum.value.toFixed(4)}%`)
  } catch (e: any) {
    ElMessage.error(e.message || '保存奖项池失败')
  }
}

// 奖品图片上传
function handlePrizeImageBeforeUpload(file: File) {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}
function handlePrizeImageUpload(options: UploadRequestOptions, row: Prize) {
  const file = options.file as File
  const reader = new FileReader()
  reader.onload = (e) => {
    row.image = e.target?.result as string
    ElMessage.success('奖品图片上传成功')
  }
  reader.onerror = () => {
    ElMessage.error('图片读取失败')
  }
  reader.readAsDataURL(file)
}

// 资格配置
const qualConfig = reactive({
  freeTimes: 1,
  exchangeEnabled: true,
  exchangeCollectible: '清明上河图 第2期',
  exchangeCount: 1
})
async function saveQualConfig() {
  if (qualConfig.exchangeEnabled && !qualConfig.exchangeCollectible) {
    ElMessage.warning('请选择兑换藏品')
    return
  }
  if (!currentActivity.value) return
  try {
    await put(`/marketing/lucky-draw/activities/${currentActivity.value.id}/qualification`, { ...qualConfig })
    ElMessage.success('抽奖资格配置已保存')
  } catch (e: any) {
    ElMessage.error(e.message || '保存资格配置失败')
  }
}

// ===================== 持有藏品获取抽奖次数 =====================
interface HoldRule {
  collectibleName: string
  requiredCount: number
  grantTimes: number
  burnMode: 'hold' | 'burn'
  maxClaim: number
}
const holdConfig = reactive({
  enabled: false,
  rules: ref<HoldRule[]>([
    { collectibleName: '', requiredCount: 1, grantTimes: 1, burnMode: 'hold', maxClaim: 1 }
  ]).value
})
function addHoldRule() {
  holdConfig.rules.push({ collectibleName: '', requiredCount: 1, grantTimes: 1, burnMode: 'hold', maxClaim: 1 })
}
function removeHoldRule(index: number) {
  holdConfig.rules.splice(index, 1)
}
async function saveHoldConfig() {
  for (const rule of holdConfig.rules) {
    if (!rule.collectibleName) {
      ElMessage.warning('存在未选择藏品的规则')
      return
    }
  }
  if (!currentActivity.value) return
  try {
    await put(`/marketing/lucky-draw/activities/${currentActivity.value.id}/hold-config`, { ...holdConfig })
    ElMessage.success(`持有藏品配置已保存（${holdConfig.rules.length} 条规则）`)
  } catch (e: any) {
    ElMessage.error(e.message || '保存持有配置失败')
  }
}

// ===================== 手动增加抽奖次数 =====================
const activeActivities = computed(() => activities.value.filter(a => a.status === 'active'))

const grantForm = reactive({
  activityId: null as number | null,
  phones: '',
  times: 1,
  remark: ''
})

interface GrantRecord {
  id: number
  activityName: string
  operator: string
  phones: string[]
  times: number
  remark: string
  createdAt: string
}
const grantRecords = ref<GrantRecord[]>([
  {
    id: 1,
    activityName: '夏日抽奖盛典',
    operator: 'admin',
    phones: ['13800138000', '13900139000'],
    times: 3,
    remark: '活动补偿',
    createdAt: '2026-08-12 14:30:00'
  }
])

function onGrantActivityChange() {
  // 可在此处加载活动信息
}

// 密码验证弹窗
const pwdDialog = reactive({
  visible: false,
  password: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.password = ''
    pwdDialog.visible = true
    pwdDialog.resolve = resolve
  })
}

async function handleGrantTimes() {
  if (!grantForm.activityId) {
    ElMessage.warning('请选择抽奖活动')
    return
  }
  if (!grantForm.phones.trim()) {
    ElMessage.warning('请输入手机号')
    return
  }
  const activity = activities.value.find(a => a.id === grantForm.activityId)
  if (!activity || activity.status !== 'active') {
    ElMessage.error('只能为进行中的活动增加抽奖次数')
    return
  }

  // 解析手机号：支持逗号、换行、空格分隔
  const phones = grantForm.phones
    .split(/[,，\n\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // 校验手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/
  const invalid = phones.filter(p => !phoneRegex.test(p))
  if (invalid.length > 0) {
    ElMessage.warning(`存在格式不正确的手机号：${invalid.join('、')}`)
    return
  }

  // 去重
  const uniquePhones = [...new Set(phones)]

  const ok = await requirePassword()
  if (!ok) return

  try {
    await post('/marketing/lucky-draw/grant-chances', { phones: uniquePhones, times: grantForm.times })
    grantRecords.value.unshift({
      id: Date.now(),
      activityName: activity.name,
      operator: 'admin',
      phones: uniquePhones,
      times: grantForm.times,
      remark: grantForm.remark || '-',
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    })

    ElMessage.success(`已为 ${uniquePhones.length} 个手机号各增加 ${grantForm.times} 次抽奖次数`)
    grantForm.phones = ''
    grantForm.times = 1
    grantForm.remark = ''
  } catch (e: any) {
    ElMessage.error(e.message || '发放抽奖次数失败')
  }
}

// 抽奖记录
interface DrawRecord {
  id: number
  username: string
  activityName: string
  prizeName: string
  prizeType: string
  prizeContent: string
  source: string
  isWin: boolean
  drawTime: string
}
const records = ref<DrawRecord[]>([])

const searchForm = reactive({ username: '', prizeLevel: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: DrawRecord[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): DrawRecord[] {
  let list = [...records.value]
  if (searchForm.username) list = list.filter(r => r.username.includes(searchForm.username.trim()))
  if (searchForm.prizeLevel) list = list.filter(r => r.prizeType === searchForm.prizeLevel)
  return list
}
async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as DrawRecord[], total: res.total }
  loading.value = false
}
function handleSearch() { page.value = 1; fetchData() }
function handleReset() { searchForm.username = ''; searchForm.prizeLevel = ''; page.value = 1; fetchData() }

// 加载真实 API 数据
async function loadData() {
  try {
    const res = await marketingApi.luckyDraw({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as LuckyDrawActivity[]
    records.value = list.map((item: any) => ({
      id: item.id,
      username: item.username || '',
      activityName: item.activityName || item.activity_name || '',
      prizeName: item.prizeName || item.prize_name || '未中奖',
      prizeType: item.prizeType || item.prize_type || '',
      prizeContent: item.prizeContent || item.prize_content || '-',
      source: item.source || 'free',
      isWin: item.isWin ?? item.is_win ?? false,
      drawTime: item.drawTime || item.draw_time || ''
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
.create-btn-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.create-btn {
  width: 260px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}
.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}
.prob-ok {
  color: var(--color-success);
}
.prob-err {
  color: var(--color-danger);
}
.prize-uploader :deep(.el-upload) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.prize-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
  cursor: pointer;
  border: 1px solid var(--el-border-color);
}
.prize-thumb-placeholder {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
  font-size: 20px;
  cursor: pointer;
}
.prize-thumb-placeholder:hover {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}
.collectible-pick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}
.collectible-pick-item {
  position: relative;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.collectible-pick-item:hover {
  border-color: var(--color-primary);
}
.collectible-pick-item.selected {
  border-color: var(--color-success);
  background: #f0f9eb;
}
.pick-image {
  width: 100%;
  height: 80px;
  border-radius: 4px;
}
.pick-name {
  font-size: 13px;
  font-weight: 600;
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pick-info {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.pick-check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 20px;
  color: var(--color-success);
}
</style>
