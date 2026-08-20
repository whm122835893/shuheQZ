<template>
  <div class="qualification-page">
    <!-- 规则说明卡片 -->
    <el-card class="rule-card">
      <template #header>
        <div class="rule-header">
          <el-icon><InfoFilled /></el-icon>
          <span>资格购规则说明</span>
        </div>
      </template>
      <ul class="rule-list">
        <li>资格购为<strong>无公售</strong>模式，仅有资格的用户可在指定时间内购买。</li>
        <li>资格购配置<strong>仅可选择发售计划中已设置为「资格购」模式的藏品</strong>，需先在发售计划页面创建资格购计划。</li>
        <li>资格购与<strong>优先购互斥</strong>，同一藏品不可同时配置资格购与优先购。</li>
        <li>资格购<strong>白名单仅限该藏品</strong>，不与其他藏品或活动互通。</li>
        <li>购买条件支持：持有指定藏品、签到天数、邀请人数，条件类型可选「满足全部」或「满足任一」。</li>
      </ul>
    </el-card>

    <!-- 新建资格购配置按钮 -->
    <div class="create-btn-bar">
      <el-button type="primary" size="large" :icon="Plus" class="create-btn" @click="openCreate">新建资格购配置</el-button>
    </div>

    <el-card>
      <div class="page-header">
        <span class="page-title">资格购配置列表</span>
      </div>

      <el-table :data="qualList" border>
        <el-table-column prop="name" label="藏品名称" min-width="180">
          <template #default="{ row }">
            <div class="collectible-cell">
              <el-image :src="row.image" class="collectible-img" fit="cover" />
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="condition_type" label="条件类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" type="warning" effect="plain">{{ row.condition_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="whitelist_count" label="白名单数量" width="110" />
        <el-table-column prop="price" label="发售价格" width="110">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="valid_range" label="有效期" min-width="200" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === '生效中' ? 'success' : row.status === '未开始' ? 'info' : 'danger'">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openWhitelist(row)">白名单管理</el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDisable(row)">停用</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑资格购配置 Dialog -->
    <el-dialog v-model="configVisible" :title="editingRow ? '编辑资格购配置' : '新建资格购配置'" width="640px">
      <el-form ref="configFormRef" :model="configForm" :rules="configRules" label-width="110px">
        <el-form-item label="选择藏品" prop="collectible_id">
          <el-select
            v-model="configForm.collectible_id"
            placeholder="请选择已创建藏品"
            filterable
            style="width: 100%"
            :disabled="!!editingRow"
          >
            <el-option
              v-for="c in collectibleOptions"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-divider content-position="left">购买条件</el-divider>

        <el-form-item label="条件类型" prop="condition_type">
          <el-radio-group v-model="configForm.condition_type">
            <el-radio value="all">满足全部条件</el-radio>
            <el-radio value="any">满足任一条件</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="持有指定藏品">
          <el-select
            v-model="configForm.hold_collectibles"
            multiple
            filterable
            placeholder="选择需要持有的藏品（可多选）"
            style="width: 100%"
          >
            <el-option v-for="c in collectibleOptions" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="签到天数">
          <el-input-number v-model="configForm.checkin_days" :min="0" :max="365" />
          <span class="form-tip">0 表示不限制</span>
        </el-form-item>

        <el-form-item label="邀请人数">
          <el-input-number v-model="configForm.invite_count" :min="0" :max="9999" />
          <span class="form-tip">0 表示不限制</span>
        </el-form-item>

        <el-divider content-position="left">白名单</el-divider>

        <el-form-item label="白名单手机号">
          <el-input
            v-model="configForm.phones"
            type="textarea"
            :rows="5"
            placeholder="多个手机号用换行分隔，例如：&#10;13800000001&#10;13800000002"
          />
          <span class="form-tip">已识别 {{ phoneCount }} 个手机号</span>
        </el-form-item>

        <el-divider content-position="left">发售设置</el-divider>

        <el-form-item label="发售价格" prop="price">
          <el-input-number v-model="configForm.price" :min="0" :precision="2" />
        </el-form-item>

        <el-form-item label="有效期" prop="valid_range">
          <el-date-picker
            v-model="configForm.valid_range"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" @click="submitConfig">确认</el-button>
      </template>
    </el-dialog>

    <!-- 白名单管理 Dialog -->
    <el-dialog v-model="whitelistVisible" title="白名单管理" width="640px">
      <div class="whitelist-header">
        <span>藏品：{{ currentRow?.name }}</span>
        <div class="whitelist-header-right">
          <span class="whitelist-count">共 {{ whitelist.length }} 条</span>
          <el-button type="success" size="small" @click="handleExportWhitelist">
            <el-icon><Download /></el-icon>
            导出名单
          </el-button>
        </div>
      </div>
      <div class="whitelist-add">
        <el-input
          v-model="newPhone"
          placeholder="输入手机号后回车添加"
          @keyup.enter="addWhitelist"
          style="flex: 1"
        />
        <el-button type="primary" @click="addWhitelist">添加</el-button>
      </div>
      <el-table :data="whitelist" border max-height="320" style="margin-top: 12px">
        <el-table-column type="index" label="#" width="60" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column label="操作" width="100">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="removeWhitelist($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="whitelistVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, InfoFilled, Download } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { collectibleApi, userApi } from '../../api'
import type { Collectible } from '../../api'
import { getQualificationCollectibles, salePlanApi } from '../../api/salePlan'

// 藏品列表（来自后端），用于补全资格购配置的藏品信息
const collectibleList = ref<any[]>([])

// 资格购藏品列表（异步加载）
const qualificationPlans = ref<any[]>([])
const collectibleOptions = computed(() =>
  qualificationPlans.value.map(p => {
    const c = collectibleList.value.find((x: any) => x.id === p.collectible_id)
    return { id: p.collectible_id, name: c?.name || p.collectible_name, image: c?.image || p.collectible_image }
  })
)

interface QualItem {
  id: number
  collectible_id: number
  config_id: number
  name: string
  image: string
  condition_type: string
  whitelist_count: number
  price: number
  valid_range: string
  status: string
  phones: string[]
}

// 从发售计划中获取已设置为资格购的藏品
const qualList = ref<QualItem[]>([])

async function loadData() {
  // 加载藏品列表（父资源，来自后端）
  try {
    const result = await collectibleApi.list({ page: 1, pageSize: 100 })
    collectibleList.value = result.list.map((c: Collectible) => ({
      id: Number(c.id),
      name: c.name || '',
      image: c.image || '',
      price: parseFloat(c.price) || 0
    }))
  } catch (e) {
    ElMessage.error('数据加载失败')
    collectibleList.value = []
  }
  // 构建资格购配置列表（从发售计划获取）
  const plans = await getQualificationCollectibles()
  qualificationPlans.value = plans
  qualList.value = plans.map((p) => {
    const c = collectibleList.value.find((x: any) => x.id === p.collectible_id)
    return {
      id: p.id,
      collectible_id: p.collectible_id,
      config_id: 0,
      name: c?.name || p.collectible_name,
      image: c?.image || p.collectible_image,
      condition_type: '-',
      whitelist_count: 0,
      price: c?.price ?? p.price,
      valid_range: '-',
      status: '未开始',
      phones: []
    }
  })
}

// 新建/编辑
const configVisible = ref(false)
const configFormRef = ref<FormInstance>()
const editingRow = ref<QualItem | null>(null)
const configForm = reactive({
  collectible_id: null as number | null,
  condition_type: 'all',
  hold_collectibles: [] as number[],
  checkin_days: 0,
  invite_count: 0,
  phones: '',
  price: 0,
  valid_range: [] as string[]
})
const configRules: FormRules = {
  collectible_id: [{ required: true, message: '请选择藏品', trigger: 'change' }],
  condition_type: [{ required: true, message: '请选择条件类型', trigger: 'change' }],
  price: [{ required: true, message: '请输入发售价格', trigger: 'blur' }],
  valid_range: [{ required: true, message: '请选择有效期', trigger: 'change' }]
}
const phoneCount = computed(() =>
  configForm.phones.split('\n').map((p) => p.trim()).filter((p) => /^1\d{10}$/.test(p)).length
)

function openCreate() {
  editingRow.value = null
  Object.assign(configForm, {
    collectible_id: null,
    condition_type: 'all',
    hold_collectibles: [],
    checkin_days: 0,
    invite_count: 0,
    phones: '',
    price: 0,
    valid_range: []
  })
  configVisible.value = true
}

function openEdit(row: QualItem) {
  editingRow.value = row
  Object.assign(configForm, {
    collectible_id: row.collectible_id,
    condition_type: row.condition_type === '满足全部' ? 'all' : 'any',
    hold_collectibles: [],
    checkin_days: 3,
    invite_count: 2,
    phones: row.phones.join('\n'),
    price: row.price,
    valid_range: row.valid_range !== '-' ? row.valid_range.split(' 至 ') : []
  })
  configVisible.value = true
}

async function submitConfig() {
  if (!configFormRef.value) return
  await configFormRef.value.validate(async (valid) => {
    if (!valid) return
    const phones = configForm.phones.split('\n').map((p) => p.trim()).filter(Boolean)
    const collectible = collectibleOptions.value.find((c) => c.id === configForm.collectible_id)
    if (!collectible) return

    const rules: Record<string, unknown> = {
      conditionType: configForm.condition_type,
      holdCollectibles: configForm.hold_collectibles,
      checkinDays: configForm.checkin_days,
      inviteCount: configForm.invite_count,
      price: configForm.price,
      validRange: configForm.valid_range,
    }

    try {
      if (editingRow.value) {
        // 编辑：更新本地状态（后端暂无更新接口）
        editingRow.value.condition_type = configForm.condition_type === 'all' ? '满足全部' : '满足任一'
        editingRow.value.price = configForm.price
        editingRow.value.whitelist_count = phones.length || editingRow.value.whitelist_count
        editingRow.value.valid_range = configForm.valid_range.join(' 至 ')
        editingRow.value.phones = phones
        ElMessage.success('配置已更新')
      } else {
        // 新建：调用后端创建资格购配置
        const configRes = await collectibleApi.createQualificationConfig(
          configForm.collectible_id!,
          {
            name: collectible.name + ' 资格购',
            activityType: 'collectible',
            rules,
          }
        ) as any
        const configId = Number(configRes?.id || 0)

        // 如果有白名单手机号，查找用户并导入
        if (phones.length > 0 && configId > 0) {
          const lookupResults = await Promise.all(
            phones.map(async (phone) => {
              try {
                const res = await userApi.list({ keyword: phone, page: 1, pageSize: 50 })
                const matched = (res?.list || []).find((u: any) => u.phone === phone)
                return { phone, userId: matched ? Number(matched.id) : 0 }
              } catch {
                return { phone, userId: 0 }
              }
            })
          )
          const userIds = lookupResults.filter(r => r.userId > 0).map(r => r.userId)
          if (userIds.length > 0) {
            await collectibleApi.importQualificationWhitelist(
              configForm.collectible_id!,
              { configId, userIds }
            )
          }
        }

        qualList.value.unshift({
          id: collectible.id,
          collectible_id: configForm.collectible_id!,
          config_id: configId,
          name: collectible.name,
          image: collectible.image,
          condition_type: configForm.condition_type === 'all' ? '满足全部' : '满足任一',
          whitelist_count: phones.length,
          price: configForm.price,
          valid_range: configForm.valid_range.join(' 至 '),
          status: '未开始',
          phones
        })
        ElMessage.success('资格购配置已创建')
      }
      configVisible.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  })
}

// 白名单管理
const whitelistVisible = ref(false)
const currentRow = ref<QualItem | null>(null)
const whitelist = ref<string[]>([])
const newPhone = ref('')

function openWhitelist(row: QualItem) {
  currentRow.value = row
  whitelist.value = [...row.phones]
  newPhone.value = ''
  whitelistVisible.value = true
}

async function addWhitelist() {
  const phone = newPhone.value.trim()
  if (!/^1\d{10}$/.test(phone)) {
    ElMessage.warning('请输入正确的手机号')
    return
  }
  if (whitelist.value.includes(phone)) {
    ElMessage.warning('该手机号已存在')
    return
  }
  if (!currentRow.value) return

  try {
    // 查找用户
    const res = await userApi.list({ keyword: phone, page: 1, pageSize: 50 })
    const matched = (res?.list || []).find((u: any) => u.phone === phone)
    if (!matched) {
      ElMessage.warning(`未找到手机号 ${phone} 对应的用户`)
      return
    }
    const userId = Number(matched.id)

    // 如果没有config_id，先创建配置
    if (currentRow.value.config_id === 0) {
      const configRes = await collectibleApi.createQualificationConfig(
        currentRow.value.collectible_id,
        { name: currentRow.value.name + ' 资格购', activityType: 'collectible' }
      ) as any
      currentRow.value.config_id = Number(configRes?.id || 0)
    }

    if (currentRow.value.config_id > 0) {
      await collectibleApi.importQualificationWhitelist(
        currentRow.value.collectible_id,
        { configId: currentRow.value.config_id, userIds: [userId] }
      )
    }

    whitelist.value.push(phone)
    currentRow.value.phones = [...whitelist.value]
    currentRow.value.whitelist_count = whitelist.value.length
    newPhone.value = ''
    ElMessage.success('已添加')
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  }
}

function removeWhitelist(index: number) {
  whitelist.value.splice(index, 1)
  if (currentRow.value) {
    currentRow.value.phones = [...whitelist.value]
    currentRow.value.whitelist_count = whitelist.value.length
  }
  ElMessage.success('已删除')
}

// 停用
async function handleDisable(row: QualItem) {
  try {
    await ElMessageBox.confirm(`确认停用「${row.name}」的资格购配置吗？停用后白名单用户将无法购买。`, '停用确认', {
      type: 'warning'
    })
    await salePlanApi.unpublish(row.id)
    row.status = '已结束'
    ElMessage.success('已停用')
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) ElMessage.error(e.message)
  }
}

// 导出白名单
function handleExportWhitelist() {
  if (whitelist.value.length === 0) {
    ElMessage.warning('白名单为空，无可导出数据')
    return
  }
  const header = ['序号', '手机号']
  const rows = whitelist.value.map((phone, i) => [i + 1, phone])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `资格购白名单_${currentRow.value?.name || ''}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出 ${whitelist.value.length} 条白名单`)
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.rule-card {
  margin-bottom: 16px;
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
.whitelist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
}
.whitelist-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.whitelist-count {
  color: var(--text-secondary);
  font-size: 13px;
}
.whitelist-add {
  display: flex;
  gap: 8px;
}
</style>
