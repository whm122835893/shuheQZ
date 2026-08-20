import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/home' },

  // Auth
  { path: '/auth/login', name: 'Login', component: () => import('@/views/auth/Login.vue'), meta: { showTab: false } },
  { path: '/auth/register', name: 'Register', component: () => import('@/views/auth/Register.vue'), meta: { showTab: false } },
  { path: '/auth/reset-password', name: 'ResetPassword', component: () => import('@/views/auth/ResetPassword.vue'), meta: { showTab: false } },
  { path: '/auth/operation-password', name: 'OperationPassword', component: () => import('@/views/auth/OperationPassword.vue'), meta: { showTab: false } },
  { path: '/auth/realname', name: 'Realname', component: () => import('@/views/auth/Realname.vue'), meta: { showTab: false } },
  { path: '/auth/user-agreement', name: 'UserAgreement', component: () => import('@/views/common/UserAgreement.vue'), meta: { showTab: false } },
  { path: '/auth/privacy-policy', name: 'PrivacyPolicy', component: () => import('@/views/common/PrivacyPolicy.vue'), meta: { showTab: false } },

  // Home (main tab - no auth required)
  { path: '/home', name: 'Home', component: () => import('@/views/home/Home.vue'), meta: { showTab: true } },
  // Home sub-pages - require auth
  { path: '/home/checkin', name: 'Checkin', component: () => import('@/views/home/Checkin.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/home/release/:id', name: 'ReleaseDetail', component: () => import('@/views/home/ReleaseDetail.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/home/museum', name: 'MuseumGallery', component: () => import('@/views/home/MuseumGallery.vue'), meta: { showTab: false, requiresAuth: true, title: '文物展馆' } },
  { path: '/home/museum/:id', name: 'ArtifactDetail', component: () => import('@/views/home/ArtifactDetail.vue'), meta: { showTab: false, requiresAuth: true, title: '文物详情' } },

  // Market (main tab - no auth required)
  { path: '/market', name: 'Market', component: () => import('@/views/market/Market.vue'), meta: { showTab: true } },
  // Market sub-pages - require auth
  { path: '/market/detail/:id', name: 'MarketDetail', component: () => import('@/views/market/Detail.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/market/album/:id', name: 'Album', component: () => import('@/views/market/Album.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/market/order/:id', name: 'Order', component: () => import('@/views/market/Order.vue'), meta: { showTab: false, requiresAuth: true } },

  // Activity (main tab - no auth required)
  { path: '/activity', name: 'Activity', component: () => import('@/views/activity/Activity.vue'), meta: { showTab: true } },
  // Activity sub-pages - require auth
  { path: '/activity/notice/:id', name: 'Notice', component: () => import('@/views/activity/Notice.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/activity/synthesis', name: 'Synthesis', component: () => import('@/views/activity/Synthesis.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/activity/synthesis/:id', name: 'SynthesisDetail', component: () => import('@/views/activity/SynthesisDetail.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/activity/invite', name: 'Invite', component: () => import('@/views/activity/Invite.vue'), meta: { showTab: false, requiresAuth: true } },

  // Profile (main tab - no auth required)
  { path: '/profile', name: 'Profile', component: () => import('@/views/profile/Profile.vue'), meta: { showTab: true } },
  // Profile sub-pages - require auth
  { path: '/profile/settings', name: 'Settings', component: () => import('@/views/profile/Settings.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/info', name: 'Info', component: () => import('@/views/profile/Info.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/wallet', name: 'Wallet', component: () => import('@/views/profile/Wallet.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/orders', name: 'Orders', component: () => import('@/views/profile/orders.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/consignments', name: 'Consignments', component: () => import('@/views/profile/Consignments.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/address', name: 'Address', component: () => import('@/views/profile/address.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/transaction-password', name: 'TransactionPassword', component: () => import('@/views/profile/transaction-password.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/certification', name: 'Certification', component: () => import('@/views/profile/Certification.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/resale-collectible/:id', name: 'ResaleCollectible', component: () => import('@/views/profile/ResaleCollectible.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/resale/:id', name: 'ResaleDetail', component: () => import('@/views/profile/ResaleDetail.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/transfer', name: 'Transfer', component: () => import('@/views/profile/Transfer.vue'), meta: { showTab: false, requiresAuth: true } },
  { path: '/profile/join-group', name: 'JoinGroup', component: () => import('@/views/profile/JoinGroup.vue'), meta: { showTab: false, requiresAuth: true } },

  // Empty pages (show empty state)
  { path: '/home/lucky-draw', name: 'LuckyDraw', component: () => import('@/views/home/LuckyDraw.vue'), meta: { showTab: false, requiresAuth: true, title: '幸运抽奖' } },
  { path: '/home/lottery', name: 'Lottery', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '抽签活动' } },
  { path: '/home/furnace', name: 'Furnace', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '幻化熔炉' } },
  { path: '/home/hall-of-fame', name: 'HallOfFame', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '名人堂' } },
  { path: '/home/beginner-guide', name: 'BeginnerGuide', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '新手指南' } },
  { path: '/home/release-calendar', name: 'ReleaseCalendar', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '发售日历' } },
  { path: '/profile/community', name: 'Community', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '社区共创' } },
  { path: '/profile/contact', name: 'Contact', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '联系我们' } },
  { path: '/profile/share', name: 'Share', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '分享App' } },
  { path: '/profile/privacy', name: 'Privacy', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '隐私协议' } },
  { path: '/profile/invoice', name: 'Invoice', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '我的发票' } },
  { path: '/profile/terms', name: 'Terms', component: () => import('@/views/common/EmptyPage.vue'), meta: { showTab: false, requiresAuth: true, title: '使用条款' } },

  // 404 catch-all route
  { path: '/:pathMatch(.*)*', redirect: '/home' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Global navigation guard - check auth for sub-pages
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const data = localStorage.getItem('ht_user')
      const user = data ? JSON.parse(data) : null
      if (!user?.isLoggedIn) {
        // Redirect to login, remember the intended destination
        next({ path: '/auth/login', query: { redirect: to.fullPath } })
        return
      }
    } catch (e) {
      next({ path: '/auth/login', query: { redirect: to.fullPath } })
      return
    }
  }
  next()
})

export default router
