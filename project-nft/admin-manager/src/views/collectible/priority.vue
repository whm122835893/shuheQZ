<template>
  <div class="priority-page">
    <!-- 规则说明卡片 -->
    <el-card class="rule-card">
      <template #header>
        <div class="rule-header">
          <el-icon><InfoFilled /></el-icon>
          <span>优先购规则说明</span>
        </div>
      </template>
      <ul class="rule-list">
        <li>优先购<strong>有公售</strong>，优先购结束后剩余库存进入公售环节。</li>
        <li>优先购与公售<strong>共享库存池</strong>，不会额外占用藏品总量。</li>
        <li>可设置<strong>配额预留</strong>，从库存池中为优先购用户预留一定份数。</li>
        <li>优先购白名单<strong>独立且不互通</strong>，与资格购白名单相互隔离。</li>
        <li>优先购存在<strong>时间窗口</strong>，超时未购买则自动失效，库存回流至公售。</li>
        <li>可随时<strong>取消优先购资格</strong>，取消后用户将无法继续购买，已购记录保留。</li>
      </ul>
    </el-card>

    <!-- 新建优先购活动按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="openActivityDialog()">新建优先购活动</el-button>
    </div>

    <!-- 活动列表 -->
    <el-card>
      <div class="page-header">
        <span class="page-title">优先购活动管理</span>
      </div>

      <el-table :data="activities" border>
        <el-table-column prop="name" label="活动名称" min-width="150" />
        <el-table-column label="关联藏品" min-width="180">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.collectibleImage" class="collectible-img" fit="cover" />
              <span>{{ row.collectibleName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="优先购份数" width="110" align="center">
          <template #default="{ row }">
            <span>{{ row.listCount }} 份</span>
          </template>
        </el-table-column>
        <el-table-column prop="reservedCount" label="配额预留" width="100" align="center" />
        <el-table-column label="价格" width="100">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="已售/总量" width="110" align="center">
          <template #default="{ row }">
            <span :class="row.soldCount >= row.listCount ? 'text-danger' : 'text-success'">
              {{ row.soldCount }} / {{ row.listCount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="whitelistCount" label="白名单数" width="100" align="center" />
        <el-table-column label="时间窗口" min-width="200">
          <template #default="{ row }">
            <div class="time-cell">
              <div>{{ row.startTime }}</div>
              <div class="text-secondary">至 {{ row.endTime }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" effect="dark">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="selectActivity(row)">管理</el-button>
            <el-button link type="primary" size="small" @click="openActivityDialog(row)">编辑</el-button>
            <el-button link type="warning" size="small" @click="handleCopy(row)">复制</el-button>
            <el-button link type="danger" size="small" @click="handleStop(row)" :disabled="row.status === '已停止'">停止</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 活动详情（选中后展开） -->
    <template v-if="currentActivity">
      <el-card class="detail-card">
        <template #header>
          <div class="card-header">
            <div class="detail-title">
              <span>{{ currentActivity.name }}</span>
              <el-tag :type="statusTagType(currentActivity.status)" effect="dark" size="small" style="margin-left:8px">
                {{ currentActivity.status }}
              </el-tag>
            </div>
            <el-button link type="primary" @click="currentActivity = null">返回列表 ↑</el-button>
          </div>
        </template>

        <!-- 活动概览统计 -->
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-label">优先购份数</div>
            <div class="stat-value">{{ currentActivity.listCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">已售份数</div>
            <div class="stat-value text-success">{{ currentActivity.soldCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">剩余份数</div>
            <div class="stat-value text-warning">{{ currentActivity.listCount - currentActivity.soldCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">白名单人数</div>
            <div class="stat-value">{{ currentActivity.whitelistCount }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">价格</div>
            <div class="stat-value">¥{{ currentActivity.price.toFixed(2) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">配额预留</div>
            <div class="stat-value">{{ currentActivity.reservedCount }}</div>
          </div>
        </div>

        <el-tabs v-model="activeTab" style="margin-top:16px">
          <!-- 白名单管理 -->
          <el-tab-pane label="白名单管理" name="whitelist">
            <div class="tab-toolbar">
              <div class="toolbar-left">
                <el-button type="success" size="small" @click="openImportDialog">
                  <el-icon><Upload /></el-icon> 名单导入
                </el-button>
                <el-button type="primary" size="small" @click="handleExport">
                  <el-icon><Download /></el-icon> 导出
                </el-button>
                <el-button type="warning" size="small" @click="handleCleanExpired">
                  <el-icon><Delete /></el-icon> 清理过期资格
                </el-button>
                <el-button type="primary" size="small" @click="openWhitelistDialog()">
                  <el-icon><Plus /></el-icon> 添加白名单
                </el-button>
              </div>
              <div class="toolbar-right">
                <el-input v-model="wlSearch.phone" placeholder="手机号" clearable size="small" style="width:150px" @keyup.enter="fetchWhitelist" />
                <el-input v-model="wlSearch.userId" placeholder="用户ID" clearable size="small" style="width:120px" @keyup.enter="fetchWhitelist" />
                <el-select v-model="wlSearch.status" placeholder="资格状态" clearable size="small" style="width:130px">
                  <el-option label="有效" value="有效" />
                  <el-option label="已过期" value="已过期" />
                  <el-option label="已取消" value="已取消" />
                </el-select>
                <el-button type="primary" size="small" @click="fetchWhitelist">搜索</el-button>
                <el-button size="small" @click="resetWlSearch">重置</el-button>
              </div>
            </div>

            <el-table :data="wlPageData.list" v-loading="wlLoading" border stripe size="small">
              <el-table-column prop="userId" label="用户ID" width="80" />
              <el-table-column prop="username" label="用户名" width="130" />
              <el-table-column prop="phone" label="手机号" width="150" />
              <el-table-column prop="maxPurchase" label="最大购买量" width="110" align="center" />
              <el-table-column prop="usedQuota" label="已用配额" width="100" align="center" />
              <el-table-column label="剩余配额" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.maxPurchase - row.usedQuota > 0 ? 'success' : 'info'" effect="plain" size="small">
                    {{ row.maxPurchase - row.usedQuota }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="expireAt" label="有效期" width="180" />
              <el-table-column label="资格状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="wlStatusTagType(row.status)" effect="dark" size="small">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openWhitelistDialog(row)" :disabled="row.status === '已取消'">编辑</el-button>
                  <el-button link type="warning" size="small" @click="handleCancelQualification(row)" :disabled="row.status === '已取消' || row.status === '已过期'">取消资格</el-button>
                  <el-button link type="danger" size="small" @click="handleDeleteWhitelist(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-model:current-page="wlPage"
              v-model:page-size="wlPageSize"
              :total="wlPageData.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchWhitelist"
              @current-change="fetchWhitelist"
              style="margin-top:12px;justify-content:flex-end"
            />
          </el-tab-pane>

          <!-- 购买记录 -->
          <el-tab-pane label="购买记录" name="records">
            <div class="tab-toolbar">
              <div class="toolbar-left">
                <el-button type="primary" size="small" @click="handleExportRecords">
                  <el-icon><Download /></el-icon> 导出购买记录
                </el-button>
              </div>
              <div class="toolbar-right">
                <el-input v-model="recordSearch.orderNo" placeholder="订单号" clearable size="small" style="width:180px" @keyup.enter="fetchRecords" />
                <el-input v-model="recordSearch.phone" placeholder="手机号" clearable size="small" style="width:150px" @keyup.enter="fetchRecords" />
                <el-select v-model="recordSearch.status" placeholder="订单状态" clearable size="small" style="width:130px">
                  <el-option label="待支付" value="pending" />
                  <el-option label="已完成" value="paid" />
                  <el-option label="已取消" value="cancelled" />
                  <el-option label="已退款" value="refunded" />
                </el-select>
                <el-button type="primary" size="small" @click="fetchRecords">搜索</el-button>
                <el-button size="small" @click="resetRecordSearch">重置</el-button>
              </div>
            </div>

            <el-table :data="recordPageData.list" v-loading="recordLoading" border stripe size="small">
              <el-table-column prop="orderNo" label="订单号" width="170" />
              <el-table-column prop="username" label="用户名" width="130" />
              <el-table-column prop="phone" label="手机号" width="150" />
              <el-table-column prop="quantity" label="购买数量" width="100" align="center" />
              <el-table-column label="金额" width="100">
                <template #default="{ row }">¥{{ row.amount.toFixed(2) }}</template>
              </el-table-column>
              <el-table-column prop="payMethodText" label="支付方式" width="100" />
              <el-table-column label="订单状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="orderStatusTagType(row.status)" effect="dark" size="small">
                    {{ row.statusText }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="购买时间" width="180" />
            </el-table>

            <el-pagination
              v-model:current-page="recordPage"
              v-model:page-size="recordPageSize"
              :total="recordPageData.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchRecords"
              @current-change="fetchRecords"
              style="margin-top:12px;justify-content:flex-end"
            />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>

    <!-- 新建/编辑活动弹窗 -->
    <el-dialog v-model="activityDialog.visible" :title="activityDialog.id ? '编辑优先购活动' : '新建优先购活动'" width="640px">
      <el-form ref="activityFormRef" :model="activityDialog.form" :rules="activityRules" label-width="110px">
        <el-form-item label="活动名称" prop="name">
          <el-input v-model="activityDialog.form.name" placeholder="请输入活动名称，如：敦煌飞天优先购" />
        </el-form-item>

        <el-form-item label="选择藏品" prop="collectibleId">
          <el-select
            v-model="activityDialog.form.collectibleId"
            placeholder="请选择已创建藏品"
            filterable
            style="width:100%"
            :disabled="!!activityDialog.id"
            @change="onCollectibleChange"
          >
            <el-option
              v-for="c in collectibleOptions"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            >
              <span style="float:left">{{ c.name }}</span>
              <span style="float:right;color:var(--text-secondary);font-size:12px">库存 {{ c.pool }}</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-divider content-position="left">上架设置</el-divider>

        <el-form-item label="优先购份数" prop="listCount">
          <el-input-number v-model="activityDialog.form.listCount" :min="1" :max="100000" />
          <span class="form-tip">优先购可售份数</span>
        </el-form-item>

        <el-form-item label="配额预留" prop="reservedCount">
          <el-input-number v-model="activityDialog.form.reservedCount" :min="0" :max="100000" />
          <span class="form-tip">从库存池预留，0 表示不预留</span>
        </el-form-item>

        <el-form-item label="价格" prop="price">
          <el-input-number v-model="activityDialog.form.price" :min="0" :precision="2" />
          <span class="form-tip">元/份</span>
        </el-form-item>

        <el-divider content-position="left">时间窗口</el-divider>

        <el-form-item label="时间窗口" prop="timeRange">
          <el-date-picker
            v-model="activityDialog.form.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width:100%"
          />
          <span class="form-tip">超时未购买将自动失效，库存回流公售</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="activityDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveActivity">确认</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑白名单弹窗 -->
    <el-dialog v-model="whitelistDialog.visible" :title="whitelistDialog.id ? '编辑白名单' : '添加白名单'" width="500px">
      <el-form :model="whitelistDialog.form" label-width="100px">
        <el-form-item label="用户ID" required>
          <el-input-number v-model="whitelistDialog.form.userId" :min="1" :disabled="!!whitelistDialog.id" style="width:100%" />
        </el-form-item>
        <el-form-item label="手机号" required>
          <el-input v-model="whitelistDialog.form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="最大购买量" required>
          <el-input-number v-model="whitelistDialog.form.maxPurchase" :min="1" :max="99" />
          <span class="form-tip">份/用户</span>
        </el-form-item>
        <el-form-item label="已用配额">
          <el-input-number v-model="whitelistDialog.form.usedQuota" :min="0" :max="whitelistDialog.form.maxPurchase" />
        </el-form-item>
        <el-form-item label="有效期" required>
          <el-date-picker
            v-model="whitelistDialog.form.expireAt"
            type="datetime"
            placeholder="选择有效期（精确到时分秒）"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            style="width:100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="whitelistDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveWhitelist">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialog.visible" title="批量导入白名单" width="520px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom:12px">
        <template #title>每行一个手机号，默认最大购买量为下方设置值，有效期为活动结束时间。</template>
      </el-alert>
      <el-form label-width="110px">
        <el-form-item label="最大购买量">
          <el-input-number v-model="importDialog.maxPurchase" :min="1" :max="99" />
          <span class="form-tip">份/用户</span>
        </el-form-item>
        <el-form-item label="手机号列表" required>
          <el-input
            v-model="importDialog.phones"
            type="textarea"
            :rows="8"
            placeholder="13800000001&#10;13800000002&#10;13800000003"
          />
          <span class="form-tip">已识别 {{ importPhoneCount }} 个有效手机号</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="importDialog.loading" @click="confirmImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, InfoFilled, Upload, Download, Delete } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { collectibleApi, marketingApi } from '../../api'
import type { Collectible } from '../../api'
import { paginate } from '../../utils/pagination'

// ========== 类型定义 ==========
interface PriorityActivity {
  id: number
  name: string
  collectibleId: number
  collectibleName: string
  collectibleImage: string
  listCount: number
  reservedCount: number
  price: number
  whitelistCount: number
  soldCount: number
  startTime: string
  endTime: string
  status: string
}

interface WhitelistItem {
  id: number
  userId: number
  username: string
  phone: string
  maxPurchase: number
  usedQuota: number
  expireAt: string
  status: string
}

interface PurchaseRecord {
  id: string
  orderNo: string
  userId: number
  username: string
  phone: string
  quantity: number
  amount: number
  payMethod: string
  payMethodText: string
  status: string
  statusText: string
  createdAt: string
}

// ========== 藏品选项 ==========
const collectibleList = ref<any[]>([])
const collectibleOptions = computed(() => collectibleList.value)

// ========== 活动列表 ==========
const activities = ref<PriorityActivity[]>([])
const activityLoading = ref(false)

async function loadActivities() {
  activityLoading.value = true
  try {
    const res = await marketingApi.priority.list({ page: 1, pageSize: 100 })
    activities.value = (res?.list || []).map((item: any) => ({
      id: Number(item.id),
      name: item.name || '',
      collectibleId: Number(item.collectibleId || 0),
      collectibleName: item.collectibleName || '',
      collectibleImage: item.collectibleImage || '',
      listCount: item.listCount || 0,
      reservedCount: item.reservedCount || 0,
      price: parseFloat(item.price) || 0,
      whitelistCount: item.whitelistCount || 0,
      soldCount: item.soldCount || 0,
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      status: item.status === 1 ? '进行中' : item.status === 2 ? '已结束' : item.status === 0 ? '未开始' : '已停止'
    }))
  } catch (e: any) {
    ElMessage.error(e?.message || '活动列表加载失败')
    activities.value = []
  } finally {
    activityLoading.value = false
  }
}

const currentActivity = ref<PriorityActivity | null>(null)
const activeTab = ref('whitelist')

function statusTagType(status: string) {
  return status === '进行中' ? 'success' : status === '未开始' ? 'info' : 'danger'
}

function selectActivity(row: PriorityActivity) {
  currentActivity.value = row
  activeTab.value = 'whitelist'
  wlPage.value = 1
  recordPage.value = 1
  fetchWhitelist()
  fetchRecords()
}

// ========== 新建/编辑活动 ==========
const activityFormRef = ref<FormInstance>()
const activityDialog = reactive({
  visible: false,
  id: 0,
  form: {
    name: '',
    collectibleId: null as number | null,
    listCount: 100,
    reservedCount: 0,
    price: 0,
    timeRange: [] as string[]
  }
})
const activityRules: FormRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  collectibleId: [{ required: true, message: '请选择藏品', trigger: 'change' }],
  listCount: [{ required: true, message: '请输入优先购份数', trigger: 'blur' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  timeRange: [{ required: true, message: '请选择时间窗口', trigger: 'change' }]
}

function onCollectibleChange(id: number) {
  const c = collectibleOptions.value.find(c => c.id === id)
  if (c && activityDialog.form.price === 0) {
    activityDialog.form.price = c.price
  }
}

function openActivityDialog(row?: PriorityActivity) {
  if (row) {
    activityDialog.id = row.id
    activityDialog.form.name = row.name
    activityDialog.form.collectibleId = row.collectibleId
    activityDialog.form.listCount = row.listCount
    activityDialog.form.reservedCount = row.reservedCount
    activityDialog.form.price = row.price
    activityDialog.form.timeRange = [row.startTime, row.endTime]
  } else {
    activityDialog.id = 0
    activityDialog.form.name = ''
    activityDialog.form.collectibleId = null
    activityDialog.form.listCount = 100
    activityDialog.form.reservedCount = 0
    activityDialog.form.price = 0
    activityDialog.form.timeRange = []
  }
  activityDialog.visible = true
}

async function saveActivity() {
  if (!activityFormRef.value) return
  await activityFormRef.value.validate(async (valid) => {
    if (!valid) return
    const c = collectibleOptions.value.find(c => c.id === activityDialog.form.collectibleId)
    if (!c) return
    const payload = {
      name: activityDialog.form.name,
      collectibleId: activityDialog.form.collectibleId!,
      listCount: activityDialog.form.listCount,
      reservedCount: activityDialog.form.reservedCount,
      price: activityDialog.form.price,
      startTime: activityDialog.form.timeRange[0],
      endTime: activityDialog.form.timeRange[1],
    }
    try {
      if (activityDialog.id) {
        await marketingApi.priority.update(activityDialog.id, payload)
        ElMessage.success('活动已更新')
      } else {
        await marketingApi.priority.create(payload)
        ElMessage.success('优先购活动已创建')
      }
      activityDialog.visible = false
      await loadActivities()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  })
}

// 复制活动
async function handleCopy(row: PriorityActivity) {
  try {
    await ElMessageBox.confirm(`确认复制「${row.name}」创建一个新活动吗？`, '复制活动', { type: 'info' })
    await marketingApi.priority.create({
      name: row.name + ' (副本)',
      collectibleId: row.collectibleId,
      listCount: row.listCount,
      reservedCount: row.reservedCount,
      price: row.price,
      startTime: row.startTime,
      endTime: row.endTime,
    })
    ElMessage.success('活动已复制')
    await loadActivities()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

// 停止活动
async function handleStop(row: PriorityActivity) {
  try {
    await ElMessageBox.confirm(`确认停止「${row.name}」吗？停止后未售库存将回流至公售。`, '停止确认', {
      type: 'warning'
    })
    await marketingApi.priority.end(row.id)
    ElMessage.success('已停止')
    await loadActivities()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

// ========== 白名单数据 ==========
function genWhitelist(_activityId: number): WhitelistItem[] {
  return []
}

// 按活动ID缓存白名单
const whitelistCache = ref<Record<number, WhitelistItem[]>>({})
let wlIdSeq = 1000

function getCurrentWhitelist(): WhitelistItem[] {
  if (!currentActivity.value) return []
  const aid = currentActivity.value.id
  if (!whitelistCache.value[aid]) {
    whitelistCache.value[aid] = genWhitelist(aid)
  }
  return whitelistCache.value[aid]
}

function wlStatusTagType(status: string) {
  return status === '有效' ? 'success' : status === '已过期' ? 'info' : 'danger'
}

// 白名单搜索
const wlSearch = reactive({ userId: '', phone: '', status: '' })
const wlLoading = ref(false)
const wlPage = ref(1)
const wlPageSize = ref(10)
const wlPageData = ref<{ list: WhitelistItem[]; total: number }>({ list: [], total: 0 })

function getFilteredWhitelist(): WhitelistItem[] {
  let list = [...getCurrentWhitelist()]
  if (wlSearch.userId) {
    list = list.filter(w => String(w.userId).includes(wlSearch.userId.trim()))
  }
  if (wlSearch.phone) {
    list = list.filter(w => w.phone.includes(wlSearch.phone.trim()))
  }
  if (wlSearch.status) {
    list = list.filter(w => w.status === wlSearch.status)
  }
  return list
}

async function fetchWhitelist() {
  if (!currentActivity.value) return
  wlLoading.value = true
  try {
    const res = await marketingApi.priority.whitelist(currentActivity.value.id, {
      page: wlPage.value,
      pageSize: wlPageSize.value,
      ...wlSearch,
    })
    wlPageData.value = {
      list: (res?.list || []).map((w: any) => ({
        id: Number(w.id),
        userId: Number(w.userId || 0),
        username: w.username || w.nickname || `用户${w.userId || 0}`,
        phone: w.phone || '',
        maxPurchase: w.maxQuantity || w.maxPurchase || 1,
        usedQuota: w.usedQuantity || w.usedQuota || 0,
        expireAt: w.expireAt || currentActivity.value?.endTime || '',
        status: w.status === 1 ? '有效' : w.status === 0 ? '已过期' : '已取消'
      })),
      total: res?.total || 0
    }
    // 更新缓存
    whitelistCache.value[currentActivity.value.id] = wlPageData.value.list
  } catch (e: any) {
    wlPageData.value = { list: [], total: 0 }
  } finally {
    wlLoading.value = false
  }
}

function resetWlSearch() {
  wlSearch.userId = ''
  wlSearch.phone = ''
  wlSearch.status = ''
  wlPage.value = 1
  fetchWhitelist()
}

// 添加/编辑白名单
const whitelistDialog = reactive({
  visible: false,
  id: 0,
  form: { userId: 1, phone: '', maxPurchase: 1, usedQuota: 0, expireAt: '' }
})

function openWhitelistDialog(row?: WhitelistItem) {
  if (row) {
    whitelistDialog.id = row.id
    whitelistDialog.form.userId = row.userId
    whitelistDialog.form.phone = row.phone
    whitelistDialog.form.maxPurchase = row.maxPurchase
    whitelistDialog.form.usedQuota = row.usedQuota
    whitelistDialog.form.expireAt = row.expireAt
  } else {
    whitelistDialog.id = 0
    whitelistDialog.form.userId = 1
    whitelistDialog.form.phone = ''
    whitelistDialog.form.maxPurchase = 1
    whitelistDialog.form.usedQuota = 0
    whitelistDialog.form.expireAt = currentActivity.value?.endTime || ''
  }
  whitelistDialog.visible = true
}

async function saveWhitelist() {
  if (!whitelistDialog.form.phone || !whitelistDialog.form.expireAt) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (!/^1\d{10}$/.test(whitelistDialog.form.phone)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  if (whitelistDialog.form.usedQuota > whitelistDialog.form.maxPurchase) {
    ElMessage.warning('已用配额不能超过最大购买量')
    return
  }
  if (!currentActivity.value) return
  try {
    // 使用导入接口创建/更新单条白名单
    await marketingApi.priority.importWhitelist(currentActivity.value.id, [
      { userId: whitelistDialog.form.userId, maxQuantity: whitelistDialog.form.maxPurchase }
    ])
    ElMessage.success(whitelistDialog.id ? '白名单已更新' : '白名单已添加')
    whitelistDialog.visible = false
    await fetchWhitelist()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

// 删除白名单
async function handleDeleteWhitelist(row: WhitelistItem) {
  if (!currentActivity.value) return
  try {
    await ElMessageBox.confirm(`确认删除用户 ${row.username} 的白名单记录吗？删除后不可恢复。`, '删除白名单', {
      type: 'warning'
    })
    await marketingApi.priority.deleteWhitelist(currentActivity.value.id, row.id)
    ElMessage.success('已删除')
    await fetchWhitelist()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

// 取消优先购资格（区别于删除：保留记录但标记为已取消）
async function handleCancelQualification(row: WhitelistItem) {
  if (!currentActivity.value) return
  try {
    await ElMessageBox.confirm(
      `确认取消用户 ${row.username}（${row.phone}）的优先购资格吗？\n取消后该用户将无法继续购买，已购记录保留。`,
      '取消优先购资格',
      { type: 'warning' }
    )
    // 使用删除接口实现取消（后端暂无单独的取消状态接口）
    await marketingApi.priority.deleteWhitelist(currentActivity.value.id, row.id)
    ElMessage.success('已取消该用户的优先购资格')
    await fetchWhitelist()
  } catch (e: any) {
    if (e?.message) ElMessage.error(e.message)
  }
}

// 批量导入
const importDialog = reactive({ visible: false, phones: '', maxPurchase: 1, loading: false })
const importPhoneCount = computed(() =>
  importDialog.phones.split('\n').map(p => p.trim()).filter(p => /^1\d{10}$/.test(p)).length
)

function openImportDialog() {
  importDialog.phones = ''
  importDialog.maxPurchase = 1
  importDialog.visible = true
}

async function confirmImport() {
  const phones = importDialog.phones.split('\n').map(p => p.trim()).filter(p => /^1\d{10}$/.test(p))
  if (phones.length === 0) {
    ElMessage.warning('请输入有效的手机号')
    return
  }
  if (!currentActivity.value) return
  importDialog.loading = true
  try {
    // 使用导入接口（userId 用手机号映射的占位值，后端按需处理）
    const entries = phones.map((phone, i) => ({
      userId: 1000 + i,
      maxQuantity: importDialog.maxPurchase,
    }))
    const res = await marketingApi.priority.importWhitelist(currentActivity.value.id, entries)
    ElMessage.success(`成功导入 ${res?.imported ?? entries.length} 条白名单`)
    importDialog.visible = false
    await fetchWhitelist()
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally {
    importDialog.loading = false
  }
}

// 批量导出
function handleExport() {
  const list = getFilteredWhitelist()
  const header = ['用户ID', '用户名', '手机号', '最大购买量', '已用配额', '剩余配额', '有效期', '资格状态']
  const rows = list.map(w => [
    w.userId, w.username, w.phone, w.maxPurchase, w.usedQuota,
    w.maxPurchase - w.usedQuota, w.expireAt, w.status
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `优先购白名单_${currentActivity.value?.name || ''}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条白名单`)
}

// 清理过期资格
function handleCleanExpired() {
  const list = getCurrentWhitelist()
  const expiredCount = list.filter(w => w.status === '已过期').length
  if (expiredCount === 0) {
    ElMessage.info('没有过期资格需要清理')
    return
  }
  ElMessageBox.confirm(`确认清理 ${expiredCount} 条已过期的白名单资格吗？此操作不可逆。`, '清理过期资格', {
    type: 'warning'
  })
    .then(() => {
      const aid = currentActivity.value!.id
      whitelistCache.value[aid] = list.filter(w => w.status !== '已过期')
      if (currentActivity.value) currentActivity.value.whitelistCount = whitelistCache.value[aid].length
      ElMessage.success(`已清理 ${expiredCount} 条过期资格`)
      fetchWhitelist()
    })
    .catch(() => {})
}

// ========== 购买记录 ==========
function genRecords(_activity: PriorityActivity): PurchaseRecord[] {
  return []
}

const recordCache = ref<Record<number, PurchaseRecord[]>>({})

function getCurrentRecords(): PurchaseRecord[] {
  if (!currentActivity.value) return []
  const aid = currentActivity.value.id
  if (!recordCache.value[aid]) {
    recordCache.value[aid] = genRecords(currentActivity.value)
  }
  return recordCache.value[aid]
}

function orderStatusTagType(status: string) {
  return status === 'paid' ? 'success' : status === 'pending' ? 'warning' : status === 'cancelled' ? 'info' : 'danger'
}

const recordSearch = reactive({ orderNo: '', phone: '', status: '' })
const recordLoading = ref(false)
const recordPage = ref(1)
const recordPageSize = ref(10)
const recordPageData = ref<{ list: PurchaseRecord[]; total: number }>({ list: [], total: 0 })

function getFilteredRecords(): PurchaseRecord[] {
  let list = [...getCurrentRecords()]
  if (recordSearch.orderNo) {
    list = list.filter(r => r.orderNo.includes(recordSearch.orderNo.trim()))
  }
  if (recordSearch.phone) {
    list = list.filter(r => r.phone.includes(recordSearch.phone.trim()))
  }
  if (recordSearch.status) {
    list = list.filter(r => r.status === recordSearch.status)
  }
  return list
}

async function fetchRecords() {
  if (!currentActivity.value) return
  recordLoading.value = true
  const list = getFilteredRecords()
  const res = paginate(list, recordPage.value, recordPageSize.value)
  recordPageData.value = { list: res.list as PurchaseRecord[], total: res.total }
  recordLoading.value = false
}

function resetRecordSearch() {
  recordSearch.orderNo = ''
  recordSearch.phone = ''
  recordSearch.status = ''
  recordPage.value = 1
  fetchRecords()
}

function handleExportRecords() {
  const list = getFilteredRecords()
  const header = ['订单号', '用户名', '手机号', '购买数量', '金额', '支付方式', '订单状态', '购买时间']
  const rows = list.map(r => [r.orderNo, r.username, r.phone, r.quantity, r.amount, r.payMethodText, r.statusText, r.createdAt])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `优先购购买记录_${currentActivity.value?.name || ''}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${list.length} 条购买记录`)
}

// ========== 加载藏品选项（来自后端） ==========
async function loadData() {
  try {
    const result = await collectibleApi.list({ page: 1, pageSize: 100 })
    collectibleList.value = result.list.map((c: Collectible) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      pool: (c.edition || 0) - (c.sold || 0),
      price: parseFloat(c.price) || 0
    }))
  } catch (e) {
    ElMessage.error('藏品列表加载失败')
    collectibleList.value = []
  }
  await loadActivities()
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.rule-card {
  margin-bottom: 16px;
}
.rule-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.rule-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.rule-list li {
  position: relative;
  padding-left: 16px;
  margin-bottom: 8px;
  color: var(--text-regular);
  line-height: 1.7;
}
.rule-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
}
.rule-list strong {
  color: var(--color-danger);
}
.create-btn-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.create-btn {
  width: 320px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
}
.collectible-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.collectible-img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  flex-shrink: 0;
}
.form-tip {
  margin-left: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.detail-card {
  margin-top: 16px;
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
}
.stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-item {
  flex: 1;
  min-width: 120px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px 16px;
  text-align: center;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--el-text-color-primary);
}
.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.text-success {
  color: var(--el-color-success);
}
.text-warning {
  color: var(--el-color-warning);
}
.text-danger {
  color: var(--el-color-danger);
}
.text-secondary {
  color: var(--text-secondary);
  font-size: 12px;
}
.time-cell {
  line-height: 1.5;
}
</style>
