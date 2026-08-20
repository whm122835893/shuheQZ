<template>
  <div class="onchain-page">
    <el-tabs v-model="activeTab" class="onchain-tabs">
      <!-- ========== Tab 1: 渠道配置 ========== -->
      <el-tab-pane label="渠道配置" name="channels">
        <div class="tab-header">
          <span class="page-title">上链渠道</span>
          <el-button type="primary" :icon="Plus" @click="openChannelDialog()">新增渠道</el-button>
        </div>

        <el-card>
          <el-table :data="channelList" v-loading="loadingChannels" border>
            <el-table-column label="渠道名称" min-width="120">
              <template #default="{ row }">
                <div class="channel-name-cell">
                  <el-icon :size="18" :color="getChainColor(row.code)"><Link /></el-icon>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="渠道编码" width="120" />
            <el-table-column label="链类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ chainTypeText(row.chain_type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Token标准" width="100">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.token_standard === 1 ? 'ERC-721' : 'ERC-1155' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="合约地址" min-width="180">
              <template #default="{ row }">
                <span class="mono-text">{{ row.contract_address_masked || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.is_active === 1"
                  @change="(val: boolean) => toggleChannel(row, val)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openChannelDialog(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="deleteChannel(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- ========== Tab 2: 藏品上链 ========== -->
      <el-tab-pane label="藏品上链" name="collectibles">
        <div class="tab-header">
          <span class="page-title">藏品上链管理</span>
          <div class="header-actions">
            <el-button type="primary" :icon="Upload" :disabled="selectedIds.length === 0" @click="openMintDialog">
              批量上链 ({{ selectedIds.length }})
            </el-button>
          </div>
        </div>

        <el-card class="search-card">
          <el-form :inline="true" :model="collectibleSearch">
            <el-form-item label="藏品名称">
              <el-input v-model="collectibleSearch.name" placeholder="搜索藏品名称" clearable style="width: 180px" />
            </el-form-item>
            <el-form-item label="上链状态">
              <el-select v-model="collectibleSearch.onchainStatus" placeholder="全部状态" clearable style="width: 140px">
                <el-option label="已上链" value="onchain" />
                <el-option label="未上链" value="offchain" />
                <el-option label="上链中" value="pending" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearchCollectible">查询</el-button>
              <el-button @click="resetCollectibleSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <el-table :data="collectiblePageData.list" v-loading="loadingCollectibles" border @selection-change="handleSelectionChange">
            <el-table-column type="selection" width="45" />
            <el-table-column label="藏品" min-width="200">
              <template #default="{ row }">
                <div class="collectible-cell">
                  <el-image :src="row.image" class="collectible-img" fit="cover" />
                  <div class="collectible-info">
                    <span class="collectible-name">{{ row.name }}</span>
                    <span class="collectible-meta">编号 {{ row.serial_prefix }}{{ row.serial_current }} / 发行 {{ row.edition }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="上链状态" width="100">
              <template #default="{ row }">
                <el-tag :type="onchainStatusTag(row.onchain_status)" effect="dark" size="small">
                  {{ onchainStatusText(row.onchain_status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="上链渠道" width="100">
              <template #default="{ row }">
                <span v-if="row.chain_name">{{ row.chain_name }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="合约地址" min-width="160">
              <template #default="{ row }">
                <span v-if="row.contract_address_masked" class="mono-text">{{ row.contract_address_masked }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="已上链/总量" width="110">
              <template #default="{ row }">
                <span>{{ row.minted_count }} / {{ row.edition }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openMintDialog(row)">发起上链</el-button>
                <el-button link type="warning" size="small" @click="openRetroactiveDialog(row)">补录上链</el-button>
                <el-dropdown @command="(cmd: string) => handleCollectibleCommand(cmd, row)" trigger="click">
                  <el-button link type="primary" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="random">不上链·随机标识</el-dropdown-item>
                      <el-dropdown-item command="records">上链记录</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="collectiblePage"
            v-model:page-size="collectiblePageSize"
            :total="collectiblePageData.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </el-card>
      </el-tab-pane>

      <!-- ========== Tab 3: 上链记录 ========== -->
      <el-tab-pane label="上链记录" name="tasks">
        <div class="tab-header">
          <span class="page-title">上链任务记录</span>
        </div>

        <el-card class="search-card">
          <el-form :inline="true" :model="taskSearch">
            <el-form-item label="任务类型">
              <el-select v-model="taskSearch.type" placeholder="全部类型" clearable style="width: 140px">
                <el-option label="铸造(mint)" value="mint" />
                <el-option label="转赠(transfer)" value="transfer" />
                <el-option label="补录(retroactive)" value="retroactive" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="taskSearch.status" placeholder="全部状态" clearable style="width: 140px">
                <el-option label="待执行" :value="0" />
                <el-option label="执行中" :value="1" />
                <el-option label="成功" :value="2" />
                <el-option label="失败" :value="3" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSearchTask">查询</el-button>
              <el-button @click="resetTaskSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card>
          <el-table :data="taskPageData.list" v-loading="loadingTasks" border>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="藏品" min-width="160">
              <template #default="{ row }">
                <span>{{ row.collectible_name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="任务类型" width="100">
              <template #default="{ row }">
                <el-tag size="small" effect="plain" :type="taskTypeTag(row.task_type)">
                  {{ taskTypeText(row.task_type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="渠道" width="90">
              <template #default="{ row }">
                <span>{{ row.channel_name || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="taskStatusTag(row.status)" effect="dark" size="small">
                  {{ taskStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Tx Hash" min-width="180">
              <template #default="{ row }">
                <span v-if="row.tx_hash" class="mono-text">{{ maskHash(row.tx_hash) }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="Token ID" min-width="160">
              <template #default="{ row }">
                <span v-if="row.token_id" class="mono-text">{{ maskHash(row.token_id) }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
            <el-table-column label="执行时间" width="160">
              <template #default="{ row }">
                <span>{{ row.executed_at || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 3" link type="primary" size="small" @click="retryTask(row)">重试</el-button>
                <el-button link type="info" size="small" @click="viewTaskDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-pagination
            v-model:current-page="taskPage"
            v-model:page-size="taskPageSize"
            :total="taskPageData.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ========== 渠道新增/编辑 Dialog ========== -->
    <el-dialog v-model="channelDialog.visible" :title="channelDialog.isEdit ? '编辑渠道' : '新增渠道'" width="560px">
      <el-form :model="channelDialog.form" label-width="110px">
        <el-form-item label="渠道名称" required>
          <el-input v-model="channelDialog.form.name" placeholder="如：文昌链" />
        </el-form-item>
        <el-form-item label="渠道编码" required>
          <el-input v-model="channelDialog.form.code" placeholder="如：wenchang" :disabled="channelDialog.isEdit" />
        </el-form-item>
        <el-form-item label="链类型" required>
          <el-select v-model="channelDialog.form.chain_type" placeholder="选择链类型" style="width: 100%">
            <el-option label="以太坊" :value="1" />
            <el-option label="Polygon" :value="2" />
            <el-option label="联盟链" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item label="Token标准" required>
          <el-radio-group v-model="channelDialog.form.token_standard">
            <el-radio :value="1">ERC-721</el-radio>
            <el-radio :value="2">ERC-1155</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="API地址">
          <el-input v-model="channelDialog.form.api_endpoint" placeholder="https://api.wenchang.example.com" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="channelDialog.form.api_key" placeholder="渠道提供的 API Key" show-password />
        </el-form-item>
        <el-form-item label="API Secret">
          <el-input v-model="channelDialog.form.api_secret" placeholder="渠道提供的 API Secret" show-password />
        </el-form-item>
        <el-form-item label="合约地址">
          <el-input v-model="channelDialog.form.contract_address" placeholder="0x开头的42位十六进制地址" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="channelDialog.form.sort_order" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="channelDialog.form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="channelDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitChannel">确认</el-button>
      </template>
    </el-dialog>

    <!-- ========== 发起上链 Dialog ========== -->
    <el-dialog v-model="mintDialog.visible" title="发起上链" width="520px">
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        选择上链渠道后，系统将异步调用链上接口完成 mint，上链成功后回填 tx_hash 和 token_id。
      </el-alert>
      <el-form :model="mintDialog.form" label-width="100px">
        <el-form-item label="藏品">
          <el-input :model-value="mintDialog.collectibleNames" type="textarea" :rows="2" disabled />
        </el-form-item>
        <el-form-item label="上链渠道" required>
          <el-select v-model="mintDialog.form.channel_id" placeholder="选择渠道" style="width: 100%">
            <el-option
              v-for="ch in activeChannels"
              :key="ch.id"
              :label="`${ch.name} (${chainTypeText(ch.chain_type)})`"
              :value="ch.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作密码" required>
          <el-input v-model="mintDialog.form.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mintDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitMint">确认上链</el-button>
      </template>
    </el-dialog>

    <!-- ========== 补录上链 Dialog ========== -->
    <el-dialog v-model="retroactiveDialog.visible" title="补录上链" width="520px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        补录上链针对历史未上链藏品，系统将批量创建上链任务并异步执行。
      </el-alert>
      <el-form :model="retroactiveDialog.form" label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="retroactiveDialog.collectibleName" disabled />
        </el-form-item>
        <el-form-item label="已发行">
          <el-input :model-value="String(retroactiveDialog.edition)" disabled />
        </el-form-item>
        <el-form-item label="上链渠道" required>
          <el-select v-model="retroactiveDialog.form.channel_id" placeholder="选择渠道" style="width: 100%">
            <el-option
              v-for="ch in activeChannels"
              :key="ch.id"
              :label="`${ch.name} (${chainTypeText(ch.chain_type)})`"
              :value="ch.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作密码" required>
          <el-input v-model="retroactiveDialog.form.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="retroactiveDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitRetroactive">确认补录</el-button>
      </template>
    </el-dialog>

    <!-- ========== 随机标识 Dialog ========== -->
    <el-dialog v-model="randomDialog.visible" title="不上链·随机链上标识" width="520px">
      <el-alert type="warning" :closable="false" show-icon style="margin-bottom: 16px">
        藏品不上链，但生成随机 tx_hash 和 token_id 用于前端展示。依赖 serial_no 唯一约束 + operation_logs 审计保障安全。
      </el-alert>
      <el-form :model="randomDialog.form" label-width="100px">
        <el-form-item label="藏品名称">
          <el-input :model-value="randomDialog.collectibleName" disabled />
        </el-form-item>
        <el-form-item label="标识数量">
          <el-input :model-value="String(randomDialog.edition)" disabled />
          <span class="form-tip">将为所有发行量生成随机标识</span>
        </el-form-item>
        <el-form-item label="操作密码" required>
          <el-input v-model="randomDialog.form.password" type="password" show-password placeholder="请输入操作密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="randomDialog.visible = false">取消</el-button>
        <el-button type="warning" @click="submitRandom">确认生成</el-button>
      </template>
    </el-dialog>

    <!-- ========== 任务详情 Dialog ========== -->
    <el-dialog v-model="taskDetailDialog.visible" title="上链任务详情" width="600px">
      <el-descriptions :column="2" border v-if="taskDetailDialog.data">
        <el-descriptions-item label="任务ID">{{ taskDetailDialog.data.id }}</el-descriptions-item>
        <el-descriptions-item label="藏品">{{ taskDetailDialog.data.collectible_name }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ taskTypeText(taskDetailDialog.data.task_type) }}</el-descriptions-item>
        <el-descriptions-item label="渠道">{{ taskDetailDialog.data.channel_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="taskStatusTag(taskDetailDialog.data.status)" size="small" effect="dark">
            {{ taskStatusText(taskDetailDialog.data.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操作人">{{ taskDetailDialog.data.operator }}</el-descriptions-item>
        <el-descriptions-item label="Tx Hash" :span="2">
          <span class="mono-text">{{ taskDetailDialog.data.tx_hash || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="Token ID" :span="2">
          <span class="mono-text">{{ taskDetailDialog.data.token_id || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="区块号">{{ taskDetailDialog.data.block_number || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ taskDetailDialog.data.created_at }}</el-descriptions-item>
        <el-descriptions-item label="执行时间">{{ taskDetailDialog.data.executed_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ taskDetailDialog.data.completed_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="taskDetailDialog.data.error_message">
          <span class="error-text">{{ taskDetailDialog.data.error_message }}</span>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="taskDetailDialog.visible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, ArrowDown, Link } from '@element-plus/icons-vue'
import { chainApi } from '../../api'
import type { ChainChannel, Collectible, OnchainTask } from '../../api'
import { paginate } from '../../utils/pagination'

// ==================== Tab 状态 ====================
const activeTab = ref('channels')

// ==================== Tab 1: 渠道配置 ====================
const loadingChannels = ref(false)
const channelList = ref<any[]>([])

const channelDialog = reactive({
  visible: false,
  isEdit: false,
  editId: null as number | null,
  form: {
    name: '',
    code: '',
    chain_type: 3,
    token_standard: 1,
    api_endpoint: '',
    api_key: '',
    api_secret: '',
    contract_address: '',
    sort_order: 0,
    remark: '',
  },
})

async function loadChannels() {
  loadingChannels.value = true
  try {
    const result = await chainApi.channels({ page: 1, pageSize: 100 })
    channelList.value = result.list.map((c: ChainChannel) => ({
      ...c,
      chain_type: typeof c.chainType === 'string' ? 3 : c.chainType,
      is_active: c.status,
      contract_address_masked: c.contractAddress ? maskHash(c.contractAddress) : null,
      api_endpoint: c.rpcUrl || '',
      sort_order: 0,
      remark: '',
    }))
  } catch {
    // fallback to empty
    channelList.value = []
  }
  loadingChannels.value = false
}

function openChannelDialog(row?: any) {
  if (row) {
    channelDialog.isEdit = true
    channelDialog.editId = row.id
    Object.assign(channelDialog.form, {
      name: row.name,
      code: row.code,
      chain_type: row.chain_type,
      token_standard: row.token_standard,
      api_endpoint: row.api_endpoint,
      api_key: '',
      api_secret: '',
      contract_address: row.contract_address || '',
      sort_order: row.sort_order,
      remark: row.remark || '',
    })
  } else {
    channelDialog.isEdit = false
    channelDialog.editId = null
    Object.assign(channelDialog.form, {
      name: '', code: '', chain_type: 3, token_standard: 1,
      api_endpoint: '', api_key: '', api_secret: '',
      contract_address: '', sort_order: 0, remark: '',
    })
  }
  channelDialog.visible = true
}

async function submitChannel() {
  if (!channelDialog.form.name || !channelDialog.form.code) {
    ElMessage.warning('请填写渠道名称和编码')
    return
  }
  try {
    if (channelDialog.isEdit && channelDialog.editId !== null) {
      await chainApi.updateChannel(channelDialog.editId, {
        name: channelDialog.form.name,
        chainType: String(channelDialog.form.chain_type),
        rpcUrl: channelDialog.form.api_endpoint,
        contractAddress: channelDialog.form.contract_address || null,
      })
      ElMessage.success('渠道已更新')
    } else {
      await chainApi.createChannel({
        code: channelDialog.form.code,
        name: channelDialog.form.name,
        chainType: String(channelDialog.form.chain_type),
        rpcUrl: channelDialog.form.api_endpoint || '',
        contractAddress: channelDialog.form.contract_address || null,
        status: 1,
      })
      ElMessage.success('渠道已新增')
    }
    channelDialog.visible = false
    loadChannels()
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

async function toggleChannel(row: any, val: boolean) {
  try {
    await ElMessageBox.confirm(`确认${val ? '启用' : '禁用'}渠道「${row.name}」吗？`, '提示', { type: 'warning' })
    await chainApi.toggleChannel(row.id)
    row.is_active = val ? 1 : 0
    row.status = val ? 1 : 0
    ElMessage.success(`渠道已${val ? '启用' : '禁用'}`)
  } catch {
    // 取消
  }
}

async function deleteChannel(row: ChainChannel) {
  try {
    await ElMessageBox.confirm(`确认删除渠道「${row.name}」吗？`, '删除确认', { type: 'error' })
    await chainApi.deleteChannel(row.id)
    ElMessage.success('渠道已删除')
    loadChannels()
  } catch {
    // 取消
  }
}

// ==================== Tab 2: 藏品上链 ====================
const loadingCollectibles = ref(false)
const collectibleList = ref<any[]>([])
const collectiblePage = ref(1)
const collectiblePageSize = ref(10)
const selectedIds = ref<number[]>([])

const collectibleSearch = reactive({
  name: '',
  onchainStatus: '',
})

const activeChannels = computed(() => channelList.value.filter((c) => c.is_active === 1))

const filteredCollectibles = computed(() => {
  return collectibleList.value.filter((item) => {
    if (collectibleSearch.name && !item.name.includes(collectibleSearch.name)) return false
    if (collectibleSearch.onchainStatus && item.onchain_status !== collectibleSearch.onchainStatus) return false
    return true
  })
})

const collectiblePageData = computed(() =>
  paginate(filteredCollectibles.value, collectiblePage.value, collectiblePageSize.value)
)

async function loadCollectibles() {
  loadingCollectibles.value = true
  try {
    const result = await chainApi.collectibles({ page: 1, pageSize: 100 })
    collectibleList.value = result.list.map((c: Collectible) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      edition: c.edition || 0,
      minted_count: c.sold || 0,
      onchain_status: c.isOnChain === 1 ? 'onchain' : 'offchain',
      chain_name: c.chainType || null,
      chain_type: null,
      contract_address: c.contractAddress || null,
      contract_address_masked: c.contractAddress ? maskHash(c.contractAddress) : null,
      serial_prefix: '#',
      serial_current: 0,
      is_on_chain: c.isOnChain || 0,
    }))
  } catch {
    collectibleList.value = []
  }
  loadingCollectibles.value = false
}

function handleSelectionChange(rows: any[]) {
  selectedIds.value = rows.map((r) => r.id)
}

function handleSearchCollectible() {
  collectiblePage.value = 1
}
function resetCollectibleSearch() {
  collectibleSearch.name = ''
  collectibleSearch.onchainStatus = ''
  collectiblePage.value = 1
}

// 发起上链
const mintDialog = reactive({
  visible: false,
  collectibleNames: '',
  isBatch: false,
  form: { channel_id: null as number | null, password: '' },
})

function openMintDialog(row?: Collectible) {
  if (row) {
    mintDialog.isBatch = false
    mintDialog.collectibleNames = row.name
  } else {
    mintDialog.isBatch = true
    mintDialog.collectibleNames = selectedIds.value
      .map((id) => collectibleList.value.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join('、')
  }
  mintDialog.form.channel_id = null
  mintDialog.form.password = ''
  mintDialog.visible = true
}

async function submitMint() {
  if (!mintDialog.form.channel_id) {
    ElMessage.warning('请选择上链渠道')
    return
  }
  try {
    if (mintDialog.isBatch) {
      await chainApi.batchMint({
        channelId: mintDialog.form.channel_id,
        collectibleIds: selectedIds.value,
      } as any)
      ElMessage.success(`已为 ${selectedIds.value.length} 个藏品发起上链`)
      selectedIds.value = []
    } else {
      await chainApi.batchMint({
        channelId: mintDialog.form.channel_id,
        collectibleIds: [Number(mintDialog.collectibleNames)],
      } as any)
      ElMessage.success('上链任务已提交')
    }
    mintDialog.visible = false
    loadCollectibles()
  } catch (err: any) {
    ElMessage.error(err.message || '上链失败')
  }
}

// 补录上链
const retroactiveDialog = reactive({
  visible: false,
  collectibleName: '',
  edition: 0,
  form: { channel_id: null as number | null, password: '' },
})

function openRetroactiveDialog(row: Collectible) {
  retroactiveDialog.collectibleName = row.name
  retroactiveDialog.edition = row.edition
  retroactiveDialog.form.channel_id = null
  retroactiveDialog.form.password = ''
  retroactiveDialog.visible = true
}

async function submitRetroactive() {
  if (!retroactiveDialog.form.channel_id) {
    ElMessage.warning('请选择上链渠道')
    return
  }
  try {
    await chainApi.retroactiveMint({
      channelId: retroactiveDialog.form.channel_id,
      collectibleId: 0,
      userIds: [],
    } as any)
    ElMessage.success('补录上链任务已提交')
    retroactiveDialog.visible = false
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

// 随机标识
const randomDialog = reactive({
  visible: false,
  collectibleName: '',
  edition: 0,
  form: { password: '' },
})

function handleCollectibleCommand(cmd: string, row: Collectible) {
  if (cmd === 'random') {
    randomDialog.collectibleName = row.name
    randomDialog.edition = row.edition
    randomDialog.form.password = ''
    randomDialog.visible = true
  } else if (cmd === 'records') {
    activeTab.value = 'tasks'
    taskSearch.name = row.name
    handleSearchTask()
  }
}

async function submitRandom() {
  if (!randomDialog.form.password) {
    ElMessage.warning('请输入操作密码')
    return
  }
  try {
    await chainApi.generateOffchain({
      collectibleIds: [],
    } as any)
    ElMessage.success('随机链上标识已生成')
    randomDialog.visible = false
    loadCollectibles()
  } catch (err: any) {
    ElMessage.error(err.message || '操作失败')
  }
}

// ==================== Tab 3: 上链记录 ====================
const loadingTasks = ref(false)
const taskList = ref<any[]>([])
const taskPage = ref(1)
const taskPageSize = ref(10)

const taskSearch = reactive({
  name: '',
  type: '',
  status: '' as string | number,
})

const filteredTasks = computed(() => {
  return taskList.value.filter((item) => {
    if (taskSearch.name && !item.collectible_name.includes(taskSearch.name)) return false
    if (taskSearch.type && item.task_type !== taskSearch.type) return false
    if (taskSearch.status !== '' && item.status !== Number(taskSearch.status)) return false
    return true
  })
})

const taskPageData = computed(() => paginate(filteredTasks.value, taskPage.value, taskPageSize.value))

async function loadTasks() {
  loadingTasks.value = true
  try {
    const result = await chainApi.tasks({ page: 1, pageSize: 100 })
    taskList.value = result.list.map((t: any) => ({
      id: Number(t.id),
      collectible_id: t.targetId || 0,
      collectible_name: t.payload?.name || `任务#${t.id}`,
      channel_name: '',
      task_type: t.type || 'mint',
      status: t.status,
      tx_hash: t.txHash || null,
      token_id: null,
      block_number: t.blockNumber || null,
      error_message: t.errorMessage || null,
      operator: '',
      executed_at: t.processedAt || null,
      completed_at: t.confirmedAt || null,
      created_at: t.createdAt || '',
    }))
  } catch {
    taskList.value = []
  }
  loadingTasks.value = false
}

function handleSearchTask() {
  taskPage.value = 1
}
function resetTaskSearch() {
  taskSearch.name = ''
  taskSearch.type = ''
  taskSearch.status = ''
  taskPage.value = 1
}

async function retryTask(row: OnchainTask) {
  try {
    await ElMessageBox.confirm(`确认重试任务 #${row.id} 吗？`, '重试确认', { type: 'warning' })
    await chainApi.retryTask(row.id)
    ElMessage.success('重试任务已提交')
    loadTasks()
  } catch {
    // 取消
  }
}

// 任务详情
const taskDetailDialog = reactive({
  visible: false,
  data: null as any,
})

function viewTaskDetail(row: OnchainTask) {
  taskDetailDialog.data = row
  taskDetailDialog.visible = true
}

// ==================== 工具函数 ====================
function chainTypeText(type: number) {
  return { 1: '以太坊', 2: 'Polygon', 3: '联盟链' }[type] || '-'
}

function getChainColor(_code: string) {
  return '#7c3aed'
}

function onchainStatusText(status: string) {
  return { onchain: '已上链', offchain: '未上链', pending: '上链中' }[status] || status
}

function onchainStatusTag(status: string) {
  return ({ onchain: 'success', offchain: 'info', pending: 'warning' } as Record<string, string>)[status] || 'info'
}

function taskTypeText(type: string) {
  return { mint: '铸造', transfer: '转赠', retroactive: '补录' }[type] || type
}

function taskTypeTag(type: string) {
  return ({ mint: 'primary', transfer: 'warning', retroactive: 'info' } as Record<string, string>)[type] || 'info'
}

function taskStatusText(status: number) {
  return { 0: '待执行', 1: '执行中', 2: '成功', 3: '失败', 5: '已取消' }[status] || '-'
}

function taskStatusTag(status: number) {
  return ({ 0: 'info', 1: 'warning', 2: 'success', 3: 'danger', 5: 'info' } as Record<string, string>)[status] || 'info'
}

function maskHash(hash: string | null | undefined): string {
  if (!hash) return '-'
  if (hash.length <= 16) return hash
  return hash.slice(0, 8) + '****' + hash.slice(-6)
}

// ==================== 初始化 ====================
onMounted(() => {
  loadChannels()
  loadCollectibles()
  loadTasks()
})
</script>

<style scoped>
.onchain-page {
  padding: 0;
}
.onchain-tabs {
  min-height: 600px;
}
.onchain-tabs :deep(.el-tabs__header) {
  margin-bottom: 16px;
}
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.header-actions {
  display: flex;
  gap: 8px;
}
.search-card {
  margin-bottom: 16px;
}
.channel-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.collectible-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.collectible-img {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  flex-shrink: 0;
}
.collectible-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.collectible-name {
  font-weight: 500;
  font-size: 14px;
}
.collectible-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.mono-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.text-muted {
  color: var(--el-text-color-placeholder);
}
.form-tip {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.error-text {
  color: var(--el-color-danger);
  font-size: 13px;
}
</style>
