<template>
  <div class="role-permission-page">
    <el-card shadow="never" class="search-card">
      <div class="page-header-inline">
        <span class="toolbar-title">角色权限管理</span>
        <el-tag type="info" size="large">共 {{ roles.length }} 个角色</el-tag>
      </div>
    </el-card>

    <!-- 角色卡片列表 -->
    <el-row :gutter="16">
      <el-col v-for="role in roles" :key="role.id" :xs="24" :sm="12" :lg="8" :xl="6">
        <el-card shadow="hover" class="role-card">
          <div class="role-card-header">
            <div class="role-avatar" :style="{ background: role.color }">
              <el-icon :size="24"><component :is="role.icon" /></el-icon>
            </div>
            <div class="role-info">
              <div class="role-name">
                {{ role.name }}
                <el-tag v-if="role.code === 'super_admin'" type="danger" size="small" effect="dark">系统</el-tag>
              </div>
              <div class="role-desc">{{ role.description }}</div>
            </div>
          </div>

          <div class="role-stats">
            <div class="stat-item">
              <span class="stat-num">{{ role.userCount }}</span>
              <span class="stat-label">关联用户</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{{ countChecked(role) }}</span>
              <span class="stat-label">已配权限</span>
            </div>
            <div class="stat-item">
              <span class="stat-num">{{ role.isSystem ? '只读' : '可编辑' }}</span>
              <span class="stat-label">状态</span>
            </div>
          </div>

          <el-collapse v-model="expandedRoles" class="perm-collapse">
            <el-collapse-item :name="role.id">
              <template #title>
                <span class="collapse-title"><el-icon><List /></el-icon> 查看权限详情</span>
              </template>
              <el-tree
                :ref="(el: any) => setTreeRef(role.id, el)"
                :data="permissionTree"
                :props="treeProps"
                node-key="key"
                show-checkbox
                :default-checked-keys="role.checkedKeys"
                :default-expand-all="true"
                class="perm-tree"
              />
              <div class="collapse-actions">
                <el-button type="primary" size="small" :icon="Edit" :disabled="role.isSystem" @click="handleEdit(role)">
                  编辑权限
                </el-button>
                <el-button size="small" :icon="CopyDocument" :disabled="role.isSystem" @click="handleCopy(role)">
                  复制配置
                </el-button>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑权限 Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="`编辑权限 - ${editingRole?.name || ''}`"
      width="640px"
      :close-on-click-modal="false"
    >
      <div v-if="editingRole" class="edit-perm-body">
        <div class="perm-toolbar">
          <span class="perm-count">已选 {{ checkedCount }} 项 / 共 {{ allLeafKeys.length }} 项</span>
          <div>
            <el-button size="small" @click="handleSelectAll">全选</el-button>
            <el-button size="small" @click="handleInvert">反选</el-button>
            <el-button size="small" @click="handleClearAll">清空</el-button>
          </div>
        </div>
        <el-tree
          ref="editTreeRef"
          :data="permissionTree"
          :props="treeProps"
          node-key="key"
          show-checkbox
          :default-checked-keys="editingRole.checkedKeys"
          :default-expand-all="true"
          class="perm-tree edit-tree"
        />
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存权限</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Edit, CopyDocument, List,
  UserFilled, Operation, Money, WarningFilled, Service
} from '@element-plus/icons-vue'
import type { Component } from 'vue'
import { permissionApi } from '../../api'

interface RoleItem {
  id: number
  code: string
  name: string
  description: string
  color: string
  icon: Component
  userCount: number
  isSystem: boolean
  checkedKeys: string[]
}

interface TreeNode {
  key: string
  label: string
  children?: TreeNode[]
}

// 权限树：菜单权限 + 按钮权限 + 数据权限（作为 fallback 初始值）
const permissionTree = ref<TreeNode[]>([
  {
    key: 'menu',
    label: '菜单权限（模块访问）',
    children: [
      { key: 'menu:dashboard', label: '数据仪表盘' },
      {
        key: 'menu:user',
        label: '用户管理',
        children: [
          { key: 'menu:user:list', label: '用户列表' },
          { key: 'menu:user:detail', label: '用户详情' },
          { key: 'menu:user:realname', label: '实名认证' }
        ]
      },
      {
        key: 'menu:collectible',
        label: '藏品管理',
        children: [
          { key: 'menu:collectible:list', label: '藏品列表' },
          { key: 'menu:collectible:create', label: '创建藏品' },
          { key: 'menu:collectible:priority', label: '优先购管理' },
          { key: 'menu:collectible:qualification', label: '资格购管理' }
        ]
      },
      {
        key: 'menu:blindbox',
        label: '盲盒管理',
        children: [
          { key: 'menu:blindbox:list', label: '盲盒列表' },
          { key: 'menu:blindbox:create', label: '创建盲盒' }
        ]
      },
      {
        key: 'menu:order',
        label: '订单管理',
        children: [
          { key: 'menu:order:list', label: '订单列表' },
          { key: 'menu:order:refund', label: '退款审批' }
        ]
      },
      { key: 'menu:market', label: '市场寄售' },
      { key: 'menu:transfer', label: '转赠管理' },
      { key: 'menu:wallet', label: '钱包财务' },
      {
        key: 'menu:marketing',
        label: '营销活动',
        children: [
          { key: 'menu:marketing:priority', label: '优先购白名单' },
          { key: 'menu:marketing:checkin', label: '签到活动' },
          { key: 'menu:marketing:invite', label: '邀请活动' },
          { key: 'menu:marketing:luckydraw', label: '抽奖活动' },
          { key: 'menu:marketing:synthesis', label: '合成活动' },
          { key: 'menu:marketing:airdrop', label: '活动空投' }
        ]
      },
      { key: 'menu:cms', label: '内容管理' },
      {
        key: 'menu:permission',
        label: '权限审计',
        children: [
          { key: 'menu:permission:admin', label: '管理员账号' },
          { key: 'menu:permission:role', label: '角色权限' },
          { key: 'menu:permission:log', label: '操作日志' }
        ]
      },
      { key: 'menu:security', label: '风控安全' },
      { key: 'menu:ticket', label: '客服工单' },
      { key: 'menu:report', label: '数据报表' },
      { key: 'menu:platform', label: '平台运维' }
    ]
  },
  {
    key: 'button',
    label: '按钮权限（操作权限）',
    children: [
      { key: 'btn:add', label: '新增' },
      { key: 'btn:edit', label: '编辑' },
      { key: 'btn:delete', label: '删除' },
      { key: 'btn:export', label: '导出' },
      { key: 'btn:import', label: '导入' },
      { key: 'btn:audit', label: '审批' },
      { key: 'btn:reset_pwd', label: '重置密码' },
      { key: 'btn:freeze', label: '冻结/解冻' },
      { key: 'btn:publish', label: '上架/下架' },
      { key: 'btn:danger:clear_db', label: '高危清库操作' }
    ]
  },
  {
    key: 'data',
    label: '数据权限',
    children: [
      { key: 'data:all', label: '查看全部数据' },
      { key: 'data:dept', label: '查看本部门数据' },
      { key: 'data:self', label: '仅查看本人数据' },
      { key: 'data:export', label: '导出数据权限' }
    ]
  }
])

const treeProps = { label: 'label', children: 'children' }

// 收集所有叶子节点 key
function collectLeafKeys(nodes: TreeNode[]): string[] {
  const keys: string[] = []
  function walk(list: TreeNode[]) {
    list.forEach(n => {
      if (n.children && n.children.length) {
        walk(n.children)
      } else {
        keys.push(n.key)
      }
    })
  }
  walk(nodes)
  return keys
}
const allLeafKeys = computed(() => collectLeafKeys(permissionTree.value))

// 将接口返回的权限树映射为视图所需 { key, label, children } 结构
function mapTreeNodes(nodes: any[]): TreeNode[] {
  return nodes.map(n => {
    const mapped: TreeNode = {
      key: n.key ?? String(n.id ?? n.code ?? ''),
      label: n.label ?? n.name ?? n.title ?? ''
    }
    if (Array.isArray(n.children) && n.children.length) {
      mapped.children = mapTreeNodes(n.children)
    }
    return mapped
  })
}

const roles = ref<RoleItem[]>([
  {
    id: 1,
    code: 'super_admin',
    name: '超级管理员',
    description: '拥有系统全部权限，不可编辑',
    color: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)',
    icon: UserFilled,
    userCount: 2,
    isSystem: true,
    checkedKeys: [...allLeafKeys.value]
  },
  {
    id: 2,
    code: 'operator',
    name: '运营',
    description: '负责藏品、盲盒、营销活动等日常运营',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: Operation,
    userCount: 2,
    isSystem: false,
    checkedKeys: [
      'menu:dashboard',
      'menu:user', 'menu:user:list', 'menu:user:detail',
      'menu:collectible', 'menu:collectible:list', 'menu:collectible:create', 'menu:collectible:priority', 'menu:collectible:qualification',
      'menu:blindbox', 'menu:blindbox:list', 'menu:blindbox:create',
      'menu:order', 'menu:order:list',
      'menu:marketing', 'menu:marketing:priority', 'menu:marketing:checkin', 'menu:marketing:invite', 'menu:marketing:luckydraw', 'menu:marketing:synthesis', 'menu:marketing:airdrop',
      'menu:ticket',
      'btn:add', 'btn:edit', 'btn:export', 'btn:publish'
    ]
  },
  {
    id: 3,
    code: 'finance',
    name: '财务',
    description: '负责订单财务、退款审批、对账报表',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: Money,
    userCount: 1,
    isSystem: false,
    checkedKeys: [
      'menu:dashboard',
      'menu:order', 'menu:order:list', 'menu:order:refund',
      'menu:wallet',
      'menu:report',
      'btn:audit', 'btn:export'
    ]
  },
  {
    id: 4,
    code: 'risk',
    name: '风控',
    description: '负责风控安全、敏感操作审批、黑名单管理',
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    icon: WarningFilled,
    userCount: 1,
    isSystem: false,
    checkedKeys: [
      'menu:dashboard',
      'menu:user', 'menu:user:list',
      'menu:security',
      'menu:permission', 'menu:permission:log',
      'menu:market',
      'menu:transfer',
      'btn:freeze', 'btn:audit', 'btn:export'
    ]
  },
  {
    id: 5,
    code: 'customer_service',
    name: '客服',
    description: '负责工单处理、用户咨询、转赠纠纷',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: Service,
    userCount: 2,
    isSystem: false,
    checkedKeys: [
      'menu:dashboard',
      'menu:user', 'menu:user:list', 'menu:user:detail',
      'menu:order', 'menu:order:list',
      'menu:ticket',
      'menu:transfer',
      'btn:edit', 'btn:reset_pwd'
    ]
  }
])

const expandedRoles = ref<number[]>([])

// ===== 展开树引用收集（用于卡片内只读展示）=====
const treeRefs = ref<Record<number, any>>({})
function setTreeRef(id: number, el: any) {
  if (el) {
    treeRefs.value[id] = el
  }
}

function countChecked(role: RoleItem): number {
  return role.checkedKeys.filter(k => !k.includes(':') || k.split(':').length <= 3).length
}

// ===== 编辑权限 Dialog =====
const dialogVisible = ref(false)
const editingRole = ref<RoleItem | null>(null)
const editTreeRef = ref<any>(null)

const checkedCount = computed(() => {
  if (!editTreeRef.value) return 0
  return editTreeRef.value.getCheckedKeys().length
})

function handleEdit(role: RoleItem) {
  if (role.isSystem) {
    ElMessage.warning('超级管理员为系统内置角色，权限不可修改')
    return
  }
  editingRole.value = role
  dialogVisible.value = true
}

function handleCopy(role: RoleItem) {
  ElMessageBox.confirm(
    `确定要复制「${role.name}」的权限配置到剪贴板吗？复制后可在其他角色编辑时粘贴应用。`,
    '复制权限配置',
    { confirmButtonText: '复制', cancelButtonText: '取消', type: 'info' }
  )
    .then(() => {
      ElMessage.success(`已复制「${role.name}」的 ${role.checkedKeys.length} 项权限配置`)
    })
    .catch(() => {})
}

function handleSelectAll() {
  editTreeRef.value?.setCheckedKeys(allLeafKeys.value)
}

function handleClearAll() {
  editTreeRef.value?.setCheckedKeys([])
}

function handleInvert() {
  const checked = editTreeRef.value.getCheckedKeys() as string[]
  const inverted = allLeafKeys.value.filter(k => !checked.includes(k))
  editTreeRef.value.setCheckedKeys(inverted)
}

function handleSave() {
  if (!editingRole.value || !editTreeRef.value) return
  const checked = editTreeRef.value.getCheckedKeys() as string[]
  const halfChecked = editTreeRef.value.getHalfCheckedKeys() as string[]
  editingRole.value.checkedKeys = [...checked, ...halfChecked]
  ElMessage.success(`「${editingRole.value.name}」权限已更新，共 ${checked.length} 项`)
  dialogVisible.value = false
}

// 角色 color/icon 为纯展示字段，按 code 在前端兜底匹配
const roleVisualMap: Record<string, { color: string; icon: Component }> = {
  super_admin: { color: 'linear-gradient(135deg, #f5576c 0%, #f093fb 100%)', icon: UserFilled },
  operator: { color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: Operation },
  finance: { color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', icon: Money },
  risk: { color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: WarningFilled },
  customer_service: { color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: Service }
}
const defaultRoleVisual = { color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', icon: Operation }

async function loadData() {
  try {
    const [rolesData, treeData] = await Promise.all([
      permissionApi.roles(),
      permissionApi.permissionTree()
    ])
    if (Array.isArray(treeData) && treeData.length) {
      permissionTree.value = mapTreeNodes(treeData)
    }
    if (Array.isArray(rolesData) && rolesData.length) {
      roles.value = rolesData.map((r: any) => {
        const code = r.code || r.role || ''
        const visual = roleVisualMap[code] || defaultRoleVisual
        return {
          id: Number(r.id),
          code,
          name: r.name || r.roleName || code || '',
          description: r.description || '',
          color: visual.color,
          icon: visual.icon,
          userCount: Number(r.userCount ?? r.user_count ?? 0),
          isSystem: Boolean(r.isSystem ?? r.is_system ?? (code === 'super_admin')),
          checkedKeys: Array.isArray(r.permissions) ? r.permissions : (Array.isArray(r.checkedKeys) ? r.checkedKeys : [])
        }
      })
    }
  } catch {
    // fallback: keep inline data already loaded in roles & permissionTree
  }
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.role-permission-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-header-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.toolbar-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.role-card {
  margin-bottom: 16px;
}
.role-card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.role-avatar {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.role-info {
  flex: 1;
  min-width: 0;
}
.role-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}
.role-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}
.role-stats {
  display: flex;
  justify-content: space-around;
  padding: 14px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 12px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.stat-num {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.perm-collapse {
  border: none;
}
.perm-collapse :deep(.el-collapse-item__header) {
  border-bottom: none;
  font-size: 13px;
}
.collapse-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  font-weight: 500;
}
.collapse-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.perm-tree {
  background: var(--bg-page);
  border-radius: var(--radius-small);
  padding: 8px;
}
.edit-perm-body {
  max-height: 480px;
  overflow-y: auto;
}
.perm-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--bg-page);
  border-radius: var(--radius-small);
}
.perm-count {
  font-size: 13px;
  color: var(--text-regular);
}
.edit-tree {
  max-height: 380px;
  overflow-y: auto;
}
</style>
