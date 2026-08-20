<template>
  <div class="transfer-page">
    <NavBar title="转赠" />

    <!-- Tab switch -->
    <div class="transfer-tabs">
      <div
        class="transfer-tab"
        :class="{ 'transfer-tab--active': activeTab === 0 }"
        @click="activeTab = 0"
      >转赠藏品</div>
      <div
        class="transfer-tab"
        :class="{ 'transfer-tab--active': activeTab === 1 }"
        @click="activeTab = 1"
      >转赠记录</div>
    </div>

    <!-- Tab 1: Transfer collectibles -->
    <template v-if="activeTab === 0">
      <!-- Inventory list -->
      <div v-if="transferableItems.length > 0" class="transfer-list">
        <div
          v-for="item in transferableItems"
          :key="item.id"
          class="transfer-card"
          :class="{ 'transfer-card--selected': selectedItemId === item.id }"
          @click="onSelectItem(item)"
        >
          <div class="transfer-card__thumb">
            <img v-if="item.image" :src="item.image" :alt="item.name" class="transfer-card__thumb-img" />
            <van-icon v-else name="music-o" size="28" color="rgba(255,255,255,0.9)" />
          </div>
          <div class="transfer-card__info">
            <div class="transfer-card__name">{{ item.name }}</div>
            <div class="transfer-card__serial">{{ item.serial }}</div>
            <div class="transfer-card__meta">持仓 {{ getDaysHeld(item.acquiredAt) }} 天 · 购入价 ¥{{ Number(item.price).toFixed(2) }}</div>
          </div>
          <div class="transfer-card__check" v-if="selectedItemId === item.id">
            <van-icon name="success" size="16" color="#3B82F6" />
          </div>
        </div>
      </div>
      <EmptyState v-else text="暂无可转赠的藏品" />

      <!-- Bottom spacer -->
      <div class="transfer-bottom-spacer" v-if="transferableItems.length > 0"></div>

      <!-- Bottom action bar -->
      <div class="transfer-bottom" v-if="transferableItems.length > 0">
        <button
          class="transfer-btn"
          :class="{ 'transfer-btn--disabled': !selectedItemId }"
          :disabled="!selectedItemId"
          @click="showTransferPopup = true"
        >
          选择藏品转赠
        </button>
      </div>
    </template>

    <!-- Tab 2: Transfer records -->
    <template v-else>
      <div v-if="transferRecords.length > 0" class="records-list">
        <div v-for="record in transferRecords" :key="record.id" class="record-card">
          <div class="record-card__body">
            <div class="record-card__thumb">
              <img v-if="record.image" :src="record.image" :alt="record.name" class="record-card__thumb-img" />
              <van-icon v-else name="music-o" size="24" color="rgba(255,255,255,0.9)" />
            </div>
            <div class="record-card__info">
              <div class="record-card__name">{{ record.name }}</div>
              <div class="record-card__serial">{{ record.serial }}</div>
              <div class="record-card__time">{{ record.createdAt }}</div>
            </div>
            <div class="record-card__action">
              <div class="record-card__to">{{ record.direction === 'sent' ? '转赠至' : '接收自' }}</div>
              <div class="record-card__phone">{{ record.toPhone }}</div>
              <span class="record-card__status">{{ statusTextMap[record.status] || '未知' }}</span>
              <div class="record-card__actions" v-if="record.status === 1">
                <button v-if="record.direction === 'received'" class="record-action-btn record-action-btn--primary" @click="onConfirmTransfer(record.id)">确认接收</button>
                <button v-if="record.direction === 'received'" class="record-action-btn" @click="onRejectTransfer(record.id)">拒绝</button>
                <button v-if="record.direction === 'sent'" class="record-action-btn" @click="onCancelTransfer(record.id)">取消转赠</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EmptyState v-else text="暂无转赠记录" />
    </template>

    <!-- Transfer confirmation popup -->
    <van-popup v-model:show="showTransferPopup" position="bottom" round :style="{ maxHeight: '80%' }">
      <div class="transfer-popup">
        <div class="transfer-popup__header">
          <span class="transfer-popup__title">确认转赠</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="showTransferPopup = false" />
        </div>

        <!-- Selected item preview -->
        <div class="transfer-popup__item" v-if="selectedItem">
          <div class="transfer-popup__item-thumb">
            <img v-if="selectedItem.image" :src="selectedItem.image" :alt="selectedItem.name" class="transfer-popup__item-img" />
            <van-icon v-else name="music-o" size="32" color="rgba(255,255,255,0.9)" />
          </div>
          <div class="transfer-popup__item-info">
            <div class="transfer-popup__item-name">{{ selectedItem.name }}</div>
            <div class="transfer-popup__item-serial">{{ selectedItem.serial }}</div>
          </div>
        </div>

        <!-- Recipient phone input -->
        <div class="transfer-popup__field">
          <label class="transfer-popup__label">对方手机号</label>
          <div class="transfer-popup__input-wrap">
            <van-field
              v-model="recipientPhone"
              placeholder="请输入对方手机号"
              type="digit"
              maxlength="11"
              clearable
              :border="false"
            />
          </div>
        </div>

        <!-- Warning -->
        <div class="transfer-popup__warning">
          <van-icon name="warning-o" size="14" color="#F59E0B" />
          <span>藏品转赠后将从您的仓库中移除，请确认对方手机号无误。</span>
        </div>

        <!-- Confirm button -->
        <div class="transfer-popup__btn-wrap">
          <button
            class="transfer-popup__btn"
            :class="{ 'transfer-popup__btn--disabled': !recipientPhone || recipientPhone === phone }"
            :disabled="!recipientPhone || recipientPhone === phone"
            @click="onSubmitTransfer"
          >
            确认转赠
          </button>
        </div>
      </div>
    </van-popup>

    <!-- Transaction password popup -->
    <van-popup v-model:show="showPwdPopup" position="bottom" round :close-on-click-overlay="false">
      <div class="pwd-popup">
        <div class="pwd-popup__header">
          <span class="pwd-popup__title">请输入交易密码</span>
          <van-icon name="cross" size="20" color="#9CA3AF" @click="closePwdPopup" />
        </div>
        <div class="pwd-popup__hint">转赠藏品需要验证交易密码</div>
        <div class="pwd-input-row">
          <input
            v-model="password"
            class="pwd-input"
            type="password"
            maxlength="6"
            placeholder="请输入6位交易密码"
            @keyup.enter="verifyPwd"
          />
        </div>
        <div v-if="pwdError" class="pwd-popup__error">
          <van-icon name="warning-o" size="14" color="#EF4444" />
          {{ pwdError }}
        </div>
        <div class="pwd-popup__tip" @click="goSetPassword">未设置交易密码？去设置</div>
        <button class="pwd-confirm-btn" @click="verifyPwd">确认转赠</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog, showDialog } from 'vant'
import NavBar from '@/components/NavBar.vue'
import EmptyState from '@/components/EmptyState.vue'
import request from '@/api/request'
import { useUser } from '@/composables/useUser'

const router = useRouter()
const activeTab = ref(0)
const selectedItemId = ref(null)
const showTransferPopup = ref(false)
const recipientPhone = ref('')

const { phone, hasTransactionPassword } = useUser()

// ===== 可转赠藏品列表（API 数据）=====
const inventoryItems = ref([])
const transferRecords = ref([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try {
    const [itemsRes, recordsRes] = await Promise.all([
      request.get('/user/collectibles', { params: { page: 1, page_size: 200, holding_status: 1 } }),
      request.get('/transfers', { params: { page: 1, page_size: 50 } }),
    ])
    inventoryItems.value = (itemsRes.data?.list || []).map(item => ({
      id: item.id,
      collectibleId: item.collectible_id,
      name: item.collectible_name,
      image: item.collectible_image,
      gradient: null,
      icon: 'music-o',
      serial: item.serial_no,
      acquiredAt: item.acquired_at,
      price: Number(item.acquired_price) || 0,
      isConsigned: item.status === 2,
    }))
    transferRecords.value = (recordsRes.data?.list || []).map(r => ({
      id: r.id,
      direction: r.direction,
      name: r.collectible_name,
      image: r.collectible_image,
      gradient: null,
      icon: 'music-o',
      serial: r.serial_no,
      toPhone: r.to_phone,
      toNickname: r.to_nickname,
      status: r.status,
      createdAt: r.created_at,
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// Mask phone number: 138****8888
function maskPhone(phoneNum) {
  if (!phoneNum || phoneNum.length < 7) return phoneNum || ''
  return phoneNum.substring(0, 3) + '****' + phoneNum.substring(phoneNum.length - 4)
}

// Items that can be transferred (not consigned)
const transferableItems = computed(() => {
  return inventoryItems.value.filter(item => !item.isConsigned)
})

const selectedItem = computed(() => {
  return inventoryItems.value.find(item => item.id === selectedItemId.value) || null
})

function getDaysHeld(acquiredAt) {
  if (!acquiredAt) return 0
  const acquired = new Date(String(acquiredAt).replace(/-/g, '/'))
  const now = new Date()
  return Math.max(0, Math.floor((now - acquired) / (1000 * 60 * 60 * 24)))
}

function onSelectItem(item) {
  selectedItemId.value = selectedItemId.value === item.id ? null : item.id
}

function onSubmitTransfer() {
  if (!recipientPhone.value) {
    showToast('请输入对方手机号')
    return
  }
  if (recipientPhone.value.length !== 11) {
    showToast('请输入正确的11位手机号')
    return
  }
  if (recipientPhone.value === phone.value) {
    showToast('不能转赠给自己')
    return
  }
  if (!selectedItemId.value) {
    showToast('请选择要转赠的藏品')
    return
  }

  showConfirmDialog({
    title: '转赠确认',
    message: `确定要将藏品转赠给手机号为 ${recipientPhone.value} 的用户吗？转赠后藏品将从您的仓库中移除。`
  }).then(() => {
    if (!hasTransactionPassword()) {
      showDialog({
        title: '提示',
        message: '您还未设置交易密码，是否前往设置？',
        showCancelButton: true,
        confirmButtonText: '去设置'
      }).then(() => {
        router.push('/profile/transaction-password')
      }).catch(() => {})
      return
    }
    showTransferPopup.value = false
    showPwdPopup.value = true
  }).catch(() => {})
}

// Transaction password state
const showPwdPopup = ref(false)
const password = ref('')
const pwdError = ref('')
const transferring = ref(false)

function closePwdPopup() {
  showPwdPopup.value = false
  password.value = ''
  pwdError.value = ''
}

function goSetPassword() {
  closePwdPopup()
  router.push('/profile/transaction-password')
}

async function verifyPwd() {
  if (password.value.length !== 6) {
    pwdError.value = '请输入6位交易密码'
    return
  }
  if (transferring.value) return
  transferring.value = true

  try {
    await request.post('/transfers', {
      user_collectible_id: Number(selectedItemId.value),
      to_phone: recipientPhone.value,
      transaction_password: password.value,
    })

    showToast('转赠成功')
    selectedItemId.value = null
    recipientPhone.value = ''
    password.value = ''
    showPwdPopup.value = false
    activeTab.value = 1
    // 刷新转赠记录
    fetchData()
  } catch (err) {
    // 错误提示已由拦截器处理
    password.value = ''
  } finally {
    transferring.value = false
  }
}

// ===== 转赠记录操作（确认接收 / 拒绝 / 取消）=====
async function fetchTransferRecords() {
  try {
    const recordsRes = await request.get('/transfers', { params: { page: 1, page_size: 50 } })
    transferRecords.value = (recordsRes.data?.list || []).map(r => ({
      id: r.id,
      direction: r.direction,
      name: r.collectible_name,
      image: r.collectible_image,
      gradient: null,
      icon: 'music-o',
      serial: r.serial_no,
      toPhone: r.to_phone,
      toNickname: r.to_nickname,
      status: r.status,
      createdAt: r.created_at,
    }))
  } catch (err) {
    // 错误提示已由拦截器处理
  }
}

async function onConfirmTransfer(id) {
  try {
    await request.put(`/transfers/${id}/confirm`)
    showToast('已确认接收')
    fetchTransferRecords()
  } catch (e) { /* 拦截器处理 */ }
}

async function onRejectTransfer(id) {
  try {
    await request.put(`/transfers/${id}/reject`)
    showToast('已拒绝转赠')
    fetchTransferRecords()
  } catch (e) { /* 拦截器处理 */ }
}

async function onCancelTransfer(id) {
  try {
    await request.put(`/transfers/${id}/cancel`)
    showToast('已取消转赠')
    fetchTransferRecords()
  } catch (e) { /* 拦截器处理 */ }
}

// 转赠状态文本映射
const statusTextMap = { 1: '待确认', 2: '已接受', 3: '已拒绝', 4: '已取消' }
</script>

<style scoped>
.transfer-page {
  min-height: 100vh;
  background: var(--ht-bg-page);
}

/* Tabs */
.transfer-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid var(--ht-border-light);
}
.transfer-tab {
  flex: 1;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  color: var(--ht-text-secondary);
  position: relative;
  cursor: pointer;
}
.transfer-tab--active {
  color: var(--ht-text-primary);
  font-weight: 600;
}
.transfer-tab--active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  background: var(--ht-text-primary);
  border-radius: 2px;
}

/* Transfer list */
.transfer-list {
  padding: 12px;
}
.transfer-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--ht-shadow-card);
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.transfer-card--selected {
  border-color: #3B82F6;
}
.transfer-card__thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.transfer-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.transfer-card__info {
  flex: 1;
  min-width: 0;
}
.transfer-card__name {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.transfer-card__serial {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.transfer-card__meta {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.transfer-card__check {
  flex-shrink: 0;
}

/* Bottom bar */
.transfer-bottom-spacer {
  height: 70px;
}
.transfer-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-top: 1px solid var(--ht-border-light);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  z-index: 50;
}
.transfer-btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.transfer-btn--disabled {
  background: #D1D5DB;
}

/* Records list */
.records-list {
  padding: 12px;
}
.record-card {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  box-shadow: var(--ht-shadow-card);
}
.record-card__body {
  display: flex;
  align-items: center;
  gap: 12px;
}
.record-card__thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.record-card__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.record-card__info {
  flex: 1;
  min-width: 0;
}
.record-card__name {
  font-size: 15px;
  color: var(--ht-text-primary);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-card__serial {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.record-card__time {
  font-size: 12px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.record-card__action {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.record-card__to {
  font-size: 12px;
  color: var(--ht-text-tertiary);
}
.record-card__phone {
  font-size: 13px;
  color: var(--ht-text-secondary);
  font-weight: 500;
}
.record-card__status {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 2px;
}
.record-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}
.record-action-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid var(--ht-border, #E5E7EB);
  background: #fff;
  color: var(--ht-text-primary, #1F2937);
  cursor: pointer;
}
.record-action-btn--primary {
  background: #3B82F6;
  color: #fff;
  border-color: #3B82F6;
}

/* Transfer popup */
.transfer-popup {
  padding: 20px 16px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}
.transfer-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.transfer-popup__title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.transfer-popup__item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--ht-bg-page);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
}
.transfer-popup__item-thumb {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.transfer-popup__item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.transfer-popup__item-info {
  flex: 1;
}
.transfer-popup__item-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.transfer-popup__item-serial {
  font-size: 13px;
  color: var(--ht-text-tertiary);
  margin-top: 4px;
}
.transfer-popup__field {
  margin-bottom: 16px;
}
.transfer-popup__label {
  display: block;
  font-size: 14px;
  color: var(--ht-text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}
.transfer-popup__input-wrap {
  background: var(--ht-bg-page);
  border-radius: 8px;
  overflow: hidden;
}
.transfer-popup__input-wrap :deep(.van-field) {
  padding: 10px 12px;
}
.transfer-popup__warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: #FEF3C7;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 20px;
}
.transfer-popup__warning span {
  font-size: 12px;
  color: #92400E;
  line-height: 1.5;
}
.transfer-popup__btn-wrap {
  padding-top: 4px;
}
.transfer-popup__btn {
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 22px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.transfer-popup__btn--disabled {
  background: #D1D5DB;
}

/* Transaction password popup */
.pwd-popup {
  padding: 20px 24px 32px;
}
.pwd-popup__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.pwd-popup__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ht-text-primary);
}
.pwd-popup__hint {
  text-align: center;
  font-size: 13px;
  color: var(--ht-text-tertiary);
  margin-bottom: 20px;
}
.pwd-popup__error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 13px;
  color: #EF4444;
}
.pwd-popup__tip {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--ht-text-secondary);
  cursor: pointer;
}
.pwd-input-row {
  margin: 0 auto;
}
.pwd-input {
  width: 100%;
  height: 48px;
  text-align: center;
  font-size: 20px;
  letter-spacing: 8px;
  border: 1px solid var(--ht-border);
  border-radius: 8px;
  background: var(--ht-bg-page);
  color: var(--ht-text-primary);
  outline: none;
}
.pwd-input:focus {
  border-color: #9CA3AF;
}
.pwd-confirm-btn {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: #3B82F6;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border: none;
  margin-top: 20px;
}
</style>
