<template>
  <div class="address-page">
    <NavBar title="收货地址" />

    <div class="address-list">
      <div v-for="addr in addresses" :key="addr.id" class="address-card">
        <div class="address-main">
          <div class="address-user">
            <span class="address-name">{{ addr.name }}</span>
            <span class="address-phone">{{ addr.phone }}</span>
            <span v-if="addr.is_default" class="address-tag">默认</span>
          </div>
          <div class="address-detail">{{ addr.full_address }}</div>
          <div class="address-default-btn" v-if="!addr.is_default" @click="setDefault(addr)">设为默认</div>
        </div>
        <div class="address-actions">
          <van-icon name="edit" size="18" color="#6B7280" @click="onEdit(addr)" />
          <van-icon name="delete-o" size="18" color="#EF4444" @click="onDelete(addr)" />
        </div>
      </div>

      <EmptyState v-if="addresses.length === 0" text="暂无收货地址" />
    </div>

    <div class="address-bottom">
      <button class="address-add-btn" @click="onAdd">
        <van-icon name="plus" size="18" color="#fff" />
        新建收货地址
      </button>
    </div>

    <!-- Add/Edit form popup -->
    <van-popup v-model:show="showFormPopup" position="bottom" round :close-on-click-overlay="false">
      <div class="address-form">
        <div class="address-form__title">{{ editingId ? '编辑收货地址' : '新建收货地址' }}</div>
        <div class="address-form__item">
          <label class="address-form__label">收货人</label>
          <input
            v-model="formName"
            class="address-form__input"
            type="text"
            placeholder="请输入收货人姓名"
          />
        </div>
        <div class="address-form__item">
          <label class="address-form__label">手机号</label>
          <input
            v-model="formPhone"
            class="address-form__input"
            type="tel"
            placeholder="请输入手机号"
          />
        </div>
        <div class="address-form__item">
          <label class="address-form__label">所在地区</label>
          <input
            v-model="formRegion"
            class="address-form__input"
            type="text"
            placeholder="如：北京市 北京市 朝阳区"
          />
        </div>
        <div class="address-form__item">
          <label class="address-form__label">详细地址</label>
          <input
            v-model="formDetail"
            class="address-form__input"
            type="text"
            placeholder="请输入详细地址"
          />
        </div>
        <div class="address-form__btns">
          <button class="address-form__btn address-form__btn--cancel" @click="closeForm">取消</button>
          <button class="address-form__btn address-form__btn--save" @click="onSave">保存</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast, showDialog } from 'vant'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'

// 地址列表（API 数据）
const addresses = ref([])

async function fetchAddresses() {
  try {
    const res = await request.get('/user/addresses')
    addresses.value = res.data?.list || []
  } catch (e) {
    addresses.value = []
  }
}

// Form popup state
const showFormPopup = ref(false)
const editingId = ref(null)
const formName = ref('')
const formPhone = ref('')
const formRegion = ref('')
const formDetail = ref('')

function onAdd() {
  editingId.value = null
  formName.value = ''
  formPhone.value = ''
  formRegion.value = ''
  formDetail.value = ''
  showFormPopup.value = true
}

function onEdit(addr) {
  editingId.value = addr.id
  formName.value = addr.name
  formPhone.value = addr.phone
  formRegion.value = `${addr.province} ${addr.city} ${addr.district}`
  formDetail.value = addr.detail
  showFormPopup.value = true
}

function closeForm() {
  showFormPopup.value = false
  editingId.value = null
}

// 将地区字符串拆分为省市区
function parseRegion(region) {
  const parts = region.trim().split(/\s+/)
  return {
    province: parts[0] || '',
    city: parts[1] || '',
    district: parts[2] || '',
  }
}

async function onSave() {
  if (!formName.value.trim()) {
    showToast('请输入收货人姓名')
    return
  }
  if (!/^1[3-9]\d{9}$/.test(formPhone.value.trim())) {
    showToast('请输入正确的手机号')
    return
  }
  if (!formRegion.value.trim()) {
    showToast('请输入所在地区')
    return
  }
  if (!formDetail.value.trim()) {
    showToast('请输入详细地址')
    return
  }

  const { province, city, district } = parseRegion(formRegion.value)
  const payload = {
    name: formName.value.trim(),
    phone: formPhone.value.trim(),
    province,
    city,
    district,
    detail: formDetail.value.trim(),
  }

  try {
    if (editingId.value) {
      await request.put(`/user/addresses/${editingId.value}`, payload)
      showToast('修改成功')
    } else {
      await request.post('/user/addresses', payload)
      showToast('添加成功')
    }
    closeForm()
    fetchAddresses()
  } catch (e) {
    // 错误提示已由拦截器处理
  }
}

function onDelete(addr) {
  showDialog({
    title: '提示',
    message: `确定删除 ${addr.name} 的收货地址吗？`,
    showCancelButton: true,
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    try {
      await request.delete(`/user/addresses/${addr.id}`)
      showToast('删除成功')
      fetchAddresses()
    } catch (e) {
      // 拦截器处理
    }
  }).catch(() => {})
}

async function setDefault(addr) {
  try {
    await request.put(`/user/addresses/${addr.id}/default`)
    showToast('已设为默认地址')
    fetchAddresses()
  } catch (e) {
    // 拦截器处理
  }
}

onMounted(() => {
  fetchAddresses()
})
</script>

<style scoped>
.address-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
  padding-bottom: calc(70px + env(safe-area-inset-bottom));
}

.address-list {
  padding: 12px;
}
.address-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  box-shadow: var(--ht-shadow-card);
}
.address-main {
  flex: 1;
  min-width: 0;
}
.address-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.address-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.address-phone {
  font-size: 14px;
  color: var(--ht-text-secondary);
}
.address-tag {
  background: var(--ht-red);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}
.address-detail {
  margin-top: 8px;
  font-size: 14px;
  color: var(--ht-text-secondary);
  line-height: 1.5;
}
.address-default-btn {
  display: inline-block;
  margin-top: 10px;
  font-size: 12px;
  color: #3B82F6;
  cursor: pointer;
}
.address-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid var(--ht-border-light);
}

.address-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 24px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid var(--ht-border-light);
  z-index: 100;
}
.address-add-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* Form popup */
.address-form {
  padding: 20px 24px calc(20px + env(safe-area-inset-bottom));
}
.address-form__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
  text-align: center;
  margin-bottom: 20px;
}
.address-form__item {
  display: flex;
  align-items: center;
  height: 52px;
  border: 1px solid var(--ht-border);
  border-radius: 12px;
  padding: 0 16px;
  margin-bottom: 14px;
}
.address-form__label {
  width: 72px;
  flex-shrink: 0;
  font-size: 15px;
  color: var(--ht-text-primary);
}
.address-form__input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 15px;
  color: var(--ht-text-primary);
  background: transparent;
  border: none;
  outline: none;
}
.address-form__input::placeholder {
  color: var(--ht-text-tertiary);
}
.address-form__btns {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
.address-form__btn {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
.address-form__btn--cancel {
  background: var(--ht-bg-gray);
  color: var(--ht-text-primary);
}
.address-form__btn--save {
  background: #3B82F6;
  color: #fff;
}
</style>
