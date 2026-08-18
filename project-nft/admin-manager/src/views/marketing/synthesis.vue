<template>
  <div class="synthesis-page">
    <div class="page-header">
      <span class="page-title">合成活动</span>
    </div>

    <!-- 创建合成规则 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header>
        <div class="card-header">
          <span>创建合成规则</span>
          <el-button type="primary" size="small" @click="resetRuleForm">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
        </div>
      </template>
      <el-form :model="ruleForm" label-width="140px" style="max-width:800px">
        <el-form-item label="目标藏品" required>
          <el-select v-model="ruleForm.targetCollectible" placeholder="请选择合成目标藏品" filterable style="width:300px">
            <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.name" />
          </el-select>
        </el-form-item>

        <el-form-item label="所需材料" required>
          <div class="materials-area">
            <div v-for="(mat, index) in ruleForm.materials" :key="index" class="material-row">
              <el-select v-model="mat.collectible" placeholder="选择材料藏品" filterable style="width:280px">
                <el-option v-for="c in []" :key="c.id" :label="c.name" :value="c.name" />
              </el-select>
              <el-input-number v-model="mat.quantity" :min="1" :max="99" placeholder="数量" style="margin:0 8px" />
              <el-button type="danger" link @click="removeMaterial(index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" link @click="addMaterial">
              <el-icon><Plus /></el-icon>添加材料
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="每人限合成次数" required>
          <el-input-number v-model="ruleForm.perUserLimit" :min="0" :max="999" />
          <span class="sub-text" style="margin-left:8px">0 表示不限</span>
        </el-form-item>
        <el-form-item label="总限合成数量" required>
          <el-input-number v-model="ruleForm.totalLimit" :min="0" :max="99999" />
          <span class="sub-text" style="margin-left:8px">0 表示不限</span>
        </el-form-item>
        <el-form-item label="活动时间" required>
          <el-date-picker
            v-model="ruleForm.timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width:400px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveRule">创建合成规则</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 已有合成规则 -->
    <el-card shadow="never" style="margin-bottom:16px">
      <template #header><span>合成规则列表</span></template>
      <el-table :data="rules" border>
        <el-table-column prop="targetCollectible" label="目标藏品" min-width="150" />
        <el-table-column label="所需材料" min-width="250">
          <template #default="{ row }">
            <div v-for="(m, i) in row.materials" :key="i" class="sub-text">
              {{ m.collectible }} × {{ m.quantity }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="perUserLimit" label="每人限制" width="100" align="center">
          <template #default="{ row }">{{ row.perUserLimit === 0 ? '不限' : row.perUserLimit + ' 次' }}</template>
        </el-table-column>
        <el-table-column label="已合成/总量" width="120" align="center">
          <template #default="{ row }">
            {{ row.synthesized }} / {{ row.totalLimit === 0 ? '不限' : row.totalLimit }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" effect="dark">
              {{ row.status === 'active' ? '进行中' : '已结束' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="170" />
        <el-table-column prop="endTime" label="结束时间" width="170" />
      </el-table>
    </el-card>

    <!-- 合成记录 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>合成记录</span>
          <div>
            <el-input v-model="searchForm.username" placeholder="用户名" clearable style="width:140px;margin-right:8px" />
            <el-input v-model="searchForm.target" placeholder="目标藏品" clearable style="width:160px;margin-right:8px" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </div>
        </div>
      </template>

      <el-table :data="pageData.list" v-loading="loading" border stripe>
        <el-table-column prop="username" label="用户" width="140" />
        <el-table-column prop="targetCollectible" label="合成目标" min-width="150" />
        <el-table-column label="消耗材料" min-width="220">
          <template #default="{ row }">
            <div v-for="(m, i) in row.materials" :key="i" class="sub-text">
              {{ m.collectible }} × {{ m.quantity }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" effect="dark">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="synthTime" label="合成时间" width="170" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { paginate } from '../../utils/pagination'
import { marketingApi } from '../../api'
import type { SynthesisActivity } from '../../api'
import { post } from '../../api/request'

interface Material { collectible: string; quantity: number }

const ruleForm = reactive({
  targetCollectible: '',
  materials: [{ collectible: '', quantity: 1 }] as Material[],
  perUserLimit: 1,
  totalLimit: 100,
  timeRange: [] as string[]
})

function addMaterial() {
  ruleForm.materials.push({ collectible: '', quantity: 1 })
}
function removeMaterial(index: number) {
  if (ruleForm.materials.length <= 1) {
    ElMessage.warning('至少需要一种材料')
    return
  }
  ruleForm.materials.splice(index, 1)
}
function resetRuleForm() {
  ruleForm.targetCollectible = ''
  ruleForm.materials = [{ collectible: '', quantity: 1 }]
  ruleForm.perUserLimit = 1
  ruleForm.totalLimit = 100
  ruleForm.timeRange = []
  ElMessage.info('已重置')
}

interface SynthRule {
  id: number
  targetCollectible: string
  materials: Material[]
  perUserLimit: number
  totalLimit: number
  synthesized: number
  status: string
  startTime: string
  endTime: string
}

const rules = ref<SynthRule[]>([
  {
    id: 1,
    targetCollectible: '敦煌飞天 第1期',
    materials: [
      { collectible: '五牛图 第5期', quantity: 2 },
      { collectible: '步辇图 第7期', quantity: 1 }
    ],
    perUserLimit: 1,
    totalLimit: 100,
    synthesized: 35,
    status: 'active',
    startTime: '2026-08-10 10:00:00',
    endTime: '2026-08-25 22:00:00'
  }
])

async function saveRule() {
  if (!ruleForm.targetCollectible) {
    ElMessage.warning('请选择目标藏品')
    return
  }
  const validMaterials = ruleForm.materials.filter(m => m.collectible && m.quantity > 0)
  if (validMaterials.length === 0) {
    ElMessage.warning('请至少添加一种有效材料')
    return
  }
  if (ruleForm.timeRange.length !== 2) {
    ElMessage.warning('请选择活动时间')
    return
  }
  try {
    const res: any = await post('/marketing/synthesis/rules', {
      targetCollectible: ruleForm.targetCollectible,
      materials: validMaterials,
      perUserLimit: ruleForm.perUserLimit,
      totalLimit: ruleForm.totalLimit,
      startTime: ruleForm.timeRange[0],
      endTime: ruleForm.timeRange[1]
    })
    rules.value.unshift({
      id: res?.id ?? Date.now(),
      targetCollectible: ruleForm.targetCollectible,
      materials: validMaterials.map(m => ({ ...m })),
      perUserLimit: ruleForm.perUserLimit,
      totalLimit: ruleForm.totalLimit,
      synthesized: 0,
      status: 'active',
      startTime: ruleForm.timeRange[0],
      endTime: ruleForm.timeRange[1]
    })
    ElMessage.success('合成规则已创建')
    resetRuleForm()
  } catch (e: any) {
    ElMessage.error(e.message || '创建合成规则失败')
  }
}

// 合成记录
interface SynthRecord {
  id: number
  username: string
  targetCollectible: string
  materials: Material[]
  status: string
  synthTime: string
}
const records = ref<SynthRecord[]>([])

const searchForm = reactive({ username: '', target: '' })
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const pageData = ref<{ list: SynthRecord[]; total: number }>({ list: [], total: 0 })

function getFilteredList(): SynthRecord[] {
  let list = [...records.value]
  if (searchForm.username) list = list.filter(r => r.username.includes(searchForm.username.trim()))
  if (searchForm.target) list = list.filter(r => r.targetCollectible.includes(searchForm.target.trim()))
  return list
}
async function fetchData() {
  loading.value = true
  const list = getFilteredList()
  const res = paginate(list, page.value, pageSize.value)
  pageData.value = { list: res.list as SynthRecord[], total: res.total }
  loading.value = false
}
function handleSearch() { page.value = 1; fetchData() }
function handleReset() { searchForm.username = ''; searchForm.target = ''; page.value = 1; fetchData() }

// 加载真实 API 数据
async function loadData() {
  try {
    const res = await marketingApi.synthesis({ page: 1, pageSize: 9999 })
    const list = (res?.list || []) as SynthesisActivity[]
    records.value = list.map((item: any) => ({
      id: item.id,
      username: item.username || '',
      targetCollectible: item.targetCollectible || item.target_collectible || '',
      materials: Array.isArray(item.materials)
        ? item.materials.map((m: any) => ({
            collectible: m.collectible || m.collectible_name || '',
            quantity: m.quantity ?? 1
          }))
        : [],
      status: item.status || 'success',
      synthTime: item.synthTime || item.synth_time || ''
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
  line-height: 1.6;
}
.materials-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.material-row {
  display: flex;
  align-items: center;
}
</style>
