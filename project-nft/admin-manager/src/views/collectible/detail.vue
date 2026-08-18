<template>
  <div class="collectible-detail" v-loading="loading">
    <template v-if="info">
      <!-- 顶部数据卡片 -->
      <el-row :gutter="16" class="stat-row">
        <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
          <div class="stat-card grad-blue">
            <div class="stat-info">
              <div class="stat-label">发行总量</div>
              <div class="stat-value">{{ info.edition.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Files /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
          <div class="stat-card grad-green">
            <div class="stat-info">
              <div class="stat-label">已售出发售</div>
              <div class="stat-value">{{ info.sold.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><SoldOut /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
          <div class="stat-card grad-orange">
            <div class="stat-info">
              <div class="stat-label">已配置配额</div>
              <div class="stat-value">{{ info.reserved_count.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Tickets /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
          <div class="stat-card grad-cyan">
            <div class="stat-info">
              <div class="stat-label">库存池</div>
              <div class="stat-value">{{ info.pool.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Box /></el-icon></div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="8" :md="4" :lg="24 / 5">
          <div class="stat-card grad-pink">
            <div class="stat-info">
              <div class="stat-label">流通量</div>
              <div class="stat-value">{{ info.circulation.toLocaleString() }}</div>
            </div>
            <div class="stat-icon"><el-icon><Promotion /></el-icon></div>
          </div>
        </el-col>
      </el-row>

      <el-card>
        <div class="page-header">
          <div class="header-left">
            <el-image :src="info.image" class="detail-img" fit="cover" />
            <div>
              <span class="page-title">{{ info.name }}</span>
              <div class="header-sub">
                <el-tag size="small">{{ info.category }}</el-tag>
                <el-tag size="small" :type="statusTagType(info.status)" style="margin-left: 8px">
                  {{ statusText(info.status) }}
                </el-tag>
              </div>
            </div>
          </div>
          <el-button @click="router.back()">返回</el-button>
        </div>

        <el-tabs v-model="activeTab">
          <!-- 基本信息 -->
          <el-tab-pane label="基本信息" name="info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="藏品名称">{{ info.name }}</el-descriptions-item>
              <el-descriptions-item label="分类">{{ info.category }}</el-descriptions-item>
              <el-descriptions-item label="发行总量">{{ info.edition.toLocaleString() }}</el-descriptions-item>
              <el-descriptions-item label="发行方">{{ info.creator }}</el-descriptions-item>
              <el-descriptions-item label="创作者">{{ info.creator }}</el-descriptions-item>
              <el-descriptions-item label="版税比例">{{ royaltyText }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ info.created_at }}</el-descriptions-item>
              <el-descriptions-item label="藏品ID">{{ info.id }}</el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <!-- 发售信息 -->
          <el-tab-pane label="发售信息" name="sale">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="发售模式">
                <el-tag :type="info.sale_mode === 0 ? 'info' : info.sale_mode === 1 ? '' : 'warning'" effect="plain">
                  {{ info.sale_mode_text }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="发售价格">¥{{ info.price.toFixed(2) }}</el-descriptions-item>
              <el-descriptions-item label="每人限购">{{ info.per_user_limit === 0 ? '不限购' : info.per_user_limit + ' 份' }}</el-descriptions-item>
              <el-descriptions-item label="发售时间">{{ info.onsale_at }}</el-descriptions-item>
              <el-descriptions-item label="寄售开关">
                <el-tag :type="info.is_resaleable ? 'success' : 'info'">{{ info.is_resaleable ? '已开启' : '已关闭' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="转赠开关">
                <el-tag :type="info.is_transferable ? 'success' : 'info'">{{ info.is_transferable ? '已开启' : '已关闭' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="寄售价格区间" v-if="info.resale_price_mode === 1">
                ¥{{ info.resale_price_min }} ~ ¥{{ info.resale_price_max }}
              </el-descriptions-item>
              <el-descriptions-item label="寄售价格区间" v-else>不限价</el-descriptions-item>
            </el-descriptions>

            <!-- 操作按钮区 -->
            <div class="sale-actions">
              <el-button type="danger" @click="openForceSell">强制售罄</el-button>
              <el-button type="warning" @click="openTakeOff">手动下架</el-button>
              <el-button v-if="info.status === 'off_shelf'" type="success" @click="handleRelist">重新上架</el-button>
              <span class="switch-item">
                <span class="switch-label">寄售开关</span>
                <el-switch :model-value="info.is_resaleable" @change="handleResaleChange" />
              </span>
              <span class="switch-item">
                <span class="switch-label">转赠开关</span>
                <el-switch :model-value="info.is_transferable" @change="handleTransferChange" />
              </span>
            </div>
          </el-tab-pane>

          <!-- 配额列表 -->
          <el-tab-pane label="配额列表" name="quota">
            <div class="toolbar-row">
              <el-button type="primary" @click="openAddQuota">新增配额</el-button>
            </div>
            <el-table :data="quotaList" border>
              <el-table-column prop="channel" label="配额渠道" />
              <el-table-column prop="count" label="配额数量" width="120" />
              <el-table-column prop="used" label="已使用" width="120" />
              <el-table-column label="使用率" width="180">
                <template #default="{ row }">
                  <el-progress :percentage="row.used ? Math.round((row.used / row.count) * 100) : 0" />
                </template>
              </el-table-column>
              <el-table-column prop="expire" label="有效期" width="180" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === '生效中' ? 'success' : 'info'">{{ row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openEditQuota(row)">编辑</el-button>
                  <el-button link type="warning" size="small" @click="handleDisableQuota(row)">
                    {{ row.status === '生效中' ? '停用' : '启用' }}
                  </el-button>
                  <el-button link type="danger" size="small" @click="handleDeleteQuota(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-alert
              type="info"
              :closable="false"
              show-icon
              style="margin-top: 12px"
              title="库存计算公式"
              description="库存池 = 发行总量 - 已配置配额 - 已售出 - 已空投 - 已销毁"
            />
          </el-tab-pane>

          <!-- 空投记录 -->
          <el-tab-pane label="空投记录" name="airdrop">
            <el-table :data="airdropRecords" border>
              <el-table-column prop="batch" label="批次号" width="160" />
              <el-table-column prop="count" label="空投数量" width="100" />
              <el-table-column prop="receivers" label="接收人数" width="100" />
              <el-table-column prop="operator" label="操作人" width="120" />
              <el-table-column prop="time" label="操作时间" />
            </el-table>
          </el-tab-pane>

          <!-- 销毁记录 -->
          <el-tab-pane label="销毁记录" name="destroy">
            <div class="toolbar-row">
              <el-button type="danger" @click="openDestroy">销毁库存</el-button>
            </div>
            <el-table :data="destroyRecords" border>
              <el-table-column prop="batch" label="批次号" width="160" />
              <el-table-column prop="count" label="销毁数量" width="100" />
              <el-table-column prop="reason" label="销毁原因" />
              <el-table-column prop="operator" label="操作人" width="120" />
              <el-table-column prop="time" label="操作时间" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
    <el-empty v-else-if="!loading" description="未找到藏品信息" />

    <!-- 强制售罄弹窗 -->
    <el-dialog v-model="forceSellDialog.visible" title="强制售罄" width="460px" :close-on-click-modal="false">
      <el-form label-width="90px">
        <el-form-item label="原因" required>
          <el-input v-model="forceSellDialog.reason" type="textarea" placeholder="请输入强制售罄原因" />
        </el-form-item>
        <el-form-item label="操作密码" required>
          <el-input v-model="forceSellDialog.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="forceSellDialog.visible = false">取消</el-button>
        <el-button type="danger" @click="confirmForceSell">确认</el-button>
      </template>
    </el-dialog>

    <!-- 手动下架弹窗 -->
    <el-dialog v-model="takeOffDialog.visible" title="手动下架" width="460px" :close-on-click-modal="false">
      <el-form label-width="90px">
        <el-form-item label="原因" required>
          <el-input v-model="takeOffDialog.reason" type="textarea" placeholder="请输入下架原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="takeOffDialog.visible = false">取消</el-button>
        <el-button type="warning" @click="confirmTakeOff">确认</el-button>
      </template>
    </el-dialog>

    <!-- 寄售开关确认弹窗 -->
    <el-dialog v-model="resaleDialog.visible" title="寄售开关确认" width="460px" :close-on-click-modal="false">
      <el-alert :title="`即将${resaleDialog.target ? '开启' : '关闭'}寄售`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-form label-width="90px">
        <el-form-item label="操作密码" required>
          <el-input v-model="resaleDialog.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
        <el-form-item label="原因" required>
          <el-input v-model="resaleDialog.reason" type="textarea" placeholder="请输入原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelResale">取消</el-button>
        <el-button type="primary" @click="confirmResale">确认</el-button>
      </template>
    </el-dialog>

    <!-- 新增/编辑配额弹窗 -->
    <el-dialog v-model="quotaDialog.visible" :title="quotaDialog.isEdit ? '编辑配额' : '新增配额'" width="480px" :close-on-click-modal="false">
      <el-form label-width="90px">
        <el-form-item label="配额渠道" required>
          <el-select v-model="quotaDialog.form.channel" placeholder="请选择配额渠道" style="width: 100%">
            <el-option v-for="ch in quotaChannels" :key="ch" :label="ch" :value="ch" />
          </el-select>
        </el-form-item>
        <el-form-item label="配额数量" required>
          <el-input-number v-model="quotaDialog.form.count" :min="1" :step="1" style="width: 200px" />
        </el-form-item>
        <el-form-item label="有效期" required>
          <el-date-picker v-model="quotaDialog.form.expire" type="datetime" placeholder="请选择有效期" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmQuota">确认</el-button>
      </template>
    </el-dialog>

    <!-- 销毁库存弹窗 -->
    <el-dialog v-model="destroyDialog.visible" title="销毁库存" width="480px" :close-on-click-modal="false">
      <el-form label-width="90px">
        <el-form-item label="当前库存池">
          <span>{{ info?.pool?.toLocaleString() || 0 }} 份</span>
        </el-form-item>
        <el-form-item label="销毁数量" required>
          <el-input-number v-model="destroyDialog.count" :min="1" :max="info?.pool || 0" style="width: 200px" />
        </el-form-item>
        <el-form-item label="销毁原因" required>
          <el-input v-model="destroyDialog.reason" type="textarea" placeholder="请输入销毁原因" />
        </el-form-item>
        <el-form-item label="操作密码" required>
          <el-input v-model="destroyDialog.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destroyDialog.visible = false">取消</el-button>
        <el-button type="danger" @click="confirmDestroy">确认销毁</el-button>
      </template>
    </el-dialog>

    <!-- 密码验证弹窗（通用） -->
    <el-dialog v-model="pwdDialog.visible" title="安全验证" width="420px" :close-on-click-modal="false">
      <el-alert :title="`正在进行高危操作：${pwdDialog.action}`" type="warning" :closable="false" show-icon style="margin-bottom:16px" />
      <el-alert v-if="pwdDialog.tip" :title="pwdDialog.tip" type="info" :closable="false" show-icon style="margin-bottom:16px" />
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Files, SoldOut, Tickets, Box, Promotion } from '@element-plus/icons-vue'
import { collectibleApi } from '../../api'
import type { Collectible } from '../../api'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const info = ref<any>(null)
const activeTab = ref('info')

const royaltyText = computed(() => {
  if (!info.value) return '-'
  // 版税字段暂无后端支持，显示占位
  return '-'
})

const statusText = (status: string) =>
  ({ draft: '草稿', on_sale: '发售中', sold_out: '已售罄', off_shelf: '已下架' }[status] || status)
const statusTagType = (status: string) =>
  ({ draft: 'info', on_sale: 'success', sold_out: 'danger', off_shelf: 'warning' }[status] || 'info')

// 配额列表
const quotaList = ref<any[]>([])

// 空投记录
const airdropRecords = ref<any[]>([])

// 销毁记录
const destroyRecords = ref<any[]>([])

// ===== 通用密码验证弹窗 =====
const pwdDialog = reactive({
  visible: false,
  password: '',
  action: '',
  tip: '',
  resolve: null as ((v: boolean) => void) | null
})
function requirePassword(action: string, tip = ''): Promise<boolean> {
  return new Promise(resolve => {
    pwdDialog.action = action
    pwdDialog.password = ''
    pwdDialog.tip = tip
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

// ===== 强制售罄 =====
const forceSellDialog = reactive({ visible: false, reason: '', password: '' })
function openForceSell() {
  forceSellDialog.reason = ''
  forceSellDialog.password = ''
  forceSellDialog.visible = true
}
async function confirmForceSell() {
  if (!forceSellDialog.reason) {
    ElMessage.warning('请输入原因')
    return
  }
  if (!forceSellDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  if (info.value) {
    info.value.status = 'sold_out'
  }
  forceSellDialog.visible = false
  ElMessage.success('已强制售罄')
}

// ===== 手动下架 =====
const takeOffDialog = reactive({ visible: false, reason: '' })
function openTakeOff() {
  takeOffDialog.reason = ''
  takeOffDialog.visible = true
}
async function confirmTakeOff() {
  if (!takeOffDialog.reason) {
    ElMessage.warning('请输入原因')
    return
  }
  if (info.value) {
    info.value.status = 'off_shelf'
  }
  takeOffDialog.visible = false
  ElMessage.success('已手动下架')
}

// ===== 重新上架（密码验证）=====
async function handleRelist() {
  const ok = await requirePassword('重新上架')
  if (!ok) return
  if (info.value) {
    info.value.status = 'on_sale'
  }
  ElMessage.success('已重新上架')
}

// ===== 寄售开关（密码 + 原因）=====
const resaleDialog = reactive({ visible: false, password: '', reason: '', target: false })
function handleResaleChange(val: boolean) {
  resaleDialog.target = val
  resaleDialog.password = ''
  resaleDialog.reason = ''
  resaleDialog.visible = true
}
async function confirmResale() {
  if (!resaleDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  if (!resaleDialog.reason) {
    ElMessage.warning('请输入原因')
    return
  }
  if (info.value) {
    info.value.is_resaleable = resaleDialog.target
  }
  resaleDialog.visible = false
  ElMessage.success(`寄售已${resaleDialog.target ? '开启' : '关闭'}`)
}
function cancelResale() {
  resaleDialog.visible = false
}

// ===== 转赠开关（直接切换）=====
function handleTransferChange(val: boolean) {
  if (info.value) {
    info.value.is_transferable = val
  }
  ElMessage.success(`转赠已${val ? '开启' : '关闭'}`)
}

// ===== 配额管理 =====
const quotaChannels = ['优先购预留', '资格购白名单', '活动奖励', '其他']
const quotaDialog = reactive({
  visible: false,
  isEdit: false,
  editingId: 0,
  form: { channel: '', count: 0, expire: '' }
})
function openAddQuota() {
  quotaDialog.isEdit = false
  quotaDialog.editingId = 0
  quotaDialog.form = { channel: '', count: 0, expire: '' }
  quotaDialog.visible = true
}
function openEditQuota(row: any) {
  quotaDialog.isEdit = true
  quotaDialog.editingId = row.id
  quotaDialog.form = { channel: row.channel, count: row.count, expire: row.expire }
  quotaDialog.visible = true
}
async function confirmQuota() {
  if (!quotaDialog.form.channel) {
    ElMessage.warning('请选择配额渠道')
    return
  }
  if (!quotaDialog.form.count || quotaDialog.form.count <= 0) {
    ElMessage.warning('请输入配额数量')
    return
  }
  if (!quotaDialog.form.expire) {
    ElMessage.warning('请选择有效期')
    return
  }
  if (quotaDialog.isEdit) {
    const target = quotaList.value.find(q => q.id === quotaDialog.editingId)
    if (target) {
      target.channel = quotaDialog.form.channel
      target.count = quotaDialog.form.count
      target.expire = quotaDialog.form.expire
    }
    ElMessage.success('配额已更新')
  } else {
    const newId = (quotaList.value.reduce((max, q) => Math.max(max, q.id || 0), 0)) + 1
    quotaList.value.push({
      id: newId,
      channel: quotaDialog.form.channel,
      count: quotaDialog.form.count,
      used: 0,
      expire: quotaDialog.form.expire,
      status: '生效中'
    })
    ElMessage.success('配额已新增')
  }
  quotaDialog.visible = false
}
async function handleDisableQuota(row: any) {
  if (row.status === '已结束') {
    ElMessage.warning('已结束的配额无法操作')
    return
  }
  row.status = row.status === '生效中' ? '已停用' : '生效中'
  ElMessage.success(`配额已${row.status === '生效中' ? '启用' : '停用'}`)
}
async function handleDeleteQuota(row: any) {
  const ok = await requirePassword('删除配额')
  if (!ok) return
  quotaList.value = quotaList.value.filter(q => q.id !== row.id)
  ElMessage.success('配额已删除')
}

// ===== 销毁库存 =====
const destroyDialog = reactive({ visible: false, count: 0, reason: '', password: '' })
function openDestroy() {
  destroyDialog.count = 0
  destroyDialog.reason = ''
  destroyDialog.password = ''
  destroyDialog.visible = true
}
async function confirmDestroy() {
  if (!destroyDialog.count || destroyDialog.count <= 0) {
    ElMessage.warning('请输入销毁数量')
    return
  }
  if (destroyDialog.count > (info.value?.pool || 0)) {
    ElMessage.warning('销毁数量不能超过库存池')
    return
  }
  if (!destroyDialog.reason) {
    ElMessage.warning('请输入销毁原因')
    return
  }
  if (!destroyDialog.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  const seq = String(destroyRecords.value.length + 1).padStart(3, '0')
  const batch = 'DES' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + seq
  destroyRecords.value.unshift({
    batch,
    count: destroyDialog.count,
    reason: destroyDialog.reason,
    operator: '当前管理员',
    time: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  })
  if (info.value) {
    info.value.pool -= destroyDialog.count
    info.value.destroyed_count += destroyDialog.count
  }
  destroyDialog.visible = false
  ElMessage.success('销毁成功')
}

async function loadData() {
  loading.value = true
  const id = route.params.id
  try {
    const c: Collectible = await collectibleApi.detail(id as string)
    info.value = {
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      category: '',
      edition: c.edition || 0,
      sold: c.sold || 0,
      reserved_count: 0,
      pool: (c.edition || 0) - (c.sold || 0),
      circulation: c.circulate || 0,
      creator: c.creator || c.issuer || '',
      created_at: c.createdAt || '',
      status: c.status === 2 ? 'on_sale' : c.status === 3 ? 'sold_out' : c.status === 0 ? 'draft' : 'off_shelf',
      sale_mode: c.isRelease === 1 ? 1 : 0,
      sale_mode_text: c.isRelease === 1 ? '公售' : '未配置',
      price: parseFloat(c.price) || 0,
      per_user_limit: 0,
      onsale_at: '',
      is_resaleable: c.isTransferable,
      is_transferable: c.isTransferable,
      resale_price_mode: 0,
      resale_price_min: 0,
      resale_price_max: 0,
      destroyed_count: 0
    }
    // 并行加载配额、空投、销毁记录
    const [quotas, airdrops, destroys] = await Promise.all([
      collectibleApi.quotas(id as string).catch(() => []),
      collectibleApi.airdropRecords(id as string, { page: 1, page_size: 20 }).catch(() => ({ list: [] })),
      collectibleApi.destroyRecords(id as string, { page: 1, page_size: 20 }).catch(() => ({ list: [] })),
    ])
    quotaList.value = (quotas || []).map((q: any) => ({
      id: q.id,
      channel: q.channel || q.name || '-',
      count: q.totalCount || q.count || 0,
      used: q.usedCount || q.used || 0,
      expire: q.expireAt || q.expire || '-',
      status: q.status === 1 ? '生效中' : q.status === 0 ? '未开始' : '已结束'
    }))
    airdropRecords.value = ((airdrops as any)?.list || []).map((r: any) => ({
      batch: 'AD' + String(r.id).padStart(12, '0'),
      count: r.quantity || 1,
      receivers: r.quantity || 1,
      operator: r.adminId ? `管理员#${r.adminId}` : '-',
      time: r.createdAt || '-'
    }))
    destroyRecords.value = ((destroys as any)?.list || []).map((r: any) => ({
      batch: 'DES' + String(r.id).padStart(12, '0'),
      count: 1,
      reason: r.reason || '-',
      operator: r.adminId ? `管理员#${r.adminId}` : '-',
      time: r.createdAt || '-'
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    info.value = null
  }
  loading.value = false
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.stat-row .el-col {
  margin-bottom: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.detail-img {
  width: 72px;
  height: 72px;
  border-radius: 8px;
}
.header-sub {
  margin-top: 6px;
}
.sale-actions {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.switch-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}
.switch-label {
  font-size: 14px;
  color: #606266;
}
.toolbar-row {
  margin-bottom: 12px;
}
</style>
