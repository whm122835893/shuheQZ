import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const Layout = () => import('../layouts/MainLayout.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue'),
    meta: { title: '登录', hidden: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/index.vue'),
        meta: { title: '数据仪表盘', icon: 'Odometer' }
      }
    ]
  },
  {
    path: '/user',
    component: Layout,
    meta: { title: '用户管理', icon: 'User' },
    children: [
      {
        path: '',
        name: 'UserList',
        component: () => import('../views/user/index.vue'),
        meta: { title: '用户列表', icon: 'User' }
      },
      {
        path: 'realname',
        name: 'Realname',
        component: () => import('../views/realname/index.vue'),
        meta: { title: '实名认证', icon: 'Postcard' }
      },
      {
        path: 'detail/:id',
        name: 'UserDetail',
        component: () => import('../views/user/detail.vue'),
        meta: { title: '用户详情', hidden: true, activeMenu: '/user' }
      }
    ]
  },
  {
    path: '/collectible',
    component: Layout,
    meta: { title: '藏品管理', icon: 'Picture' },
    children: [
      {
        path: '',
        name: 'CollectibleList',
        component: () => import('../views/collectible/index.vue'),
        meta: { title: '藏品列表', icon: 'Picture' }
      },
      {
        path: 'create',
        name: 'CollectibleCreate',
        component: () => import('../views/collectible/create.vue'),
        meta: { title: '创建藏品', hidden: true, activeMenu: '/collectible' }
      },
      {
        path: 'detail/:id',
        name: 'CollectibleDetail',
        component: () => import('../views/collectible/detail.vue'),
        meta: { title: '藏品详情', hidden: true, activeMenu: '/collectible' }
      },
      {
        path: 'sale-plan',
        name: 'SalePlan',
        component: () => import('../views/collectible/sale-plan.vue'),
        meta: { title: '发售计划', icon: 'Calendar' }
      },
      {
        path: 'qualification',
        name: 'QualificationList',
        component: () => import('../views/collectible/qualification.vue'),
        meta: { title: '资格购管理', icon: 'Key' }
      },
      {
        path: 'priority',
        name: 'PriorityList',
        component: () => import('../views/collectible/priority.vue'),
        meta: { title: '优先购管理', icon: 'Timer' }
      },
      {
        path: 'airdrop',
        name: 'CollectibleAirdrop',
        component: () => import('../views/marketing/airdrop.vue'),
        meta: { title: '独立空投', icon: 'Coin' }
      },
      {
        path: 'category',
        name: 'CollectibleCategory',
        component: () => import('../views/collectible/category.vue'),
        meta: { title: '藏品分类', icon: 'Files' }
      },
      {
        path: 'onchain',
        name: 'CollectibleOnchain',
        component: () => import('../views/collectible/onchain.vue'),
        meta: { title: '藏品上链', icon: 'Link' }
      }
    ]
  },
  {
    path: '/blindbox',
    component: Layout,
    children: [
      {
        path: '',
        name: 'BlindboxList',
        component: () => import('../views/blindbox/index.vue'),
        meta: { title: '盲盒管理', icon: 'Box' }
      },
      {
        path: 'create',
        name: 'BlindboxCreate',
        component: () => import('../views/blindbox/create.vue'),
        meta: { title: '创建盲盒', hidden: true, activeMenu: '/blindbox' }
      },
      {
        path: 'detail/:id',
        name: 'BlindboxDetail',
        component: () => import('../views/blindbox/detail.vue'),
        meta: { title: '盲盒详情', hidden: true, activeMenu: '/blindbox' }
      }
    ]
  },
  {
    path: '/order',
    component: Layout,
    meta: { title: '订单管理', icon: 'Document' },
    children: [
      {
        path: '',
        name: 'OrderList',
        component: () => import('../views/order/index.vue'),
        meta: { title: '订单列表', icon: 'Document' }
      },
      {
        path: 'refund',
        name: 'RefundList',
        component: () => import('../views/refund/index.vue'),
        meta: { title: '退款审批', icon: 'RefreshLeft' }
      }
    ]
  },
  {
    path: '/market',
    component: Layout,
    meta: { title: '市场管理', icon: 'Shop' },
    children: [
      {
        path: '',
        name: 'MarketList',
        component: () => import('../views/market/index.vue'),
        meta: { title: '市场寄售', icon: 'Shop' }
      },
      {
        path: 'listings',
        name: 'MarketListings',
        component: () => import('../views/market/listings.vue'),
        meta: { title: '查看挂单', icon: 'Goods' }
      }
    ]
  },
  {
    path: '/transfer',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TransferList',
        component: () => import('../views/transfer/index.vue'),
        meta: { title: '转赠管理', icon: 'Share' }
      }
    ]
  },
  {
    path: '/marketing',
    component: Layout,
    meta: { title: '营销活动', icon: 'Present' },
    children: [
      {
        path: 'checkin',
        name: 'MarketingCheckin',
        component: () => import('../views/marketing/checkin.vue'),
        meta: { title: '签到活动', icon: 'Calendar' }
      },
      {
        path: 'invite',
        name: 'MarketingInvite',
        component: () => import('../views/marketing/invite.vue'),
        meta: { title: '邀请活动', icon: 'Promotion' }
      },
      {
        path: 'luckydraw',
        name: 'MarketingLuckyDraw',
        component: () => import('../views/marketing/luckydraw.vue'),
        meta: { title: '抽奖活动', icon: 'Trophy' }
      },
      {
        path: 'synthesis',
        name: 'MarketingSynthesis',
        component: () => import('../views/marketing/synthesis.vue'),
        meta: { title: '合成活动', icon: 'MagicStick' }
      },
      {
        path: 'register',
        name: 'MarketingRegister',
        component: () => import('../views/marketing/register.vue'),
        meta: { title: '注册福利', icon: 'GoldMedal' }
      }
    ]
  },
  {
    path: '/announcement',
    component: Layout,
    meta: { title: '公告资讯', icon: 'Bell' },
    children: [
      {
        path: '',
        name: 'Announcement',
        component: () => import('../views/cms/announcement.vue'),
        meta: { title: '公告管理', icon: 'Bell' }
      },
      {
        path: 'news',
        name: 'CmsNews',
        component: () => import('../views/cms/help.vue'),
        meta: { title: '新闻管理', icon: 'Document' }
      }
    ]
  },
  {
    path: '/cms',
    component: Layout,
    meta: { title: '内容管理', icon: 'Reading' },
    children: [
      {
        path: 'banner',
        name: 'CmsBanner',
        component: () => import('../views/cms/banner.vue'),
        meta: { title: 'Banner管理', icon: 'PictureFilled' }
      },
      {
        path: 'artifact',
        name: 'CmsArtifact',
        component: () => import('../views/cms/artifact.vue'),
        meta: { title: '藏品展览', icon: 'Place' }
      },
      {
        path: 'decoration',
        name: 'CmsDecoration',
        component: () => import('../views/cms/decoration.vue'),
        meta: { title: '网页装修', icon: 'Brush' }
      }
    ]
  },
  {
    path: '/wallet',
    component: Layout,
    meta: { title: '钱包财务', icon: 'Wallet' },
    children: [
      {
        path: '',
        name: 'WalletList',
        component: () => import('../views/wallet/index.vue'),
        meta: { title: '钱包总览', icon: 'Wallet' }
      },
      {
        path: 'recharge',
        name: 'WalletRecharge',
        component: () => import('../views/wallet/recharge.vue'),
        meta: { title: '充值记录', icon: 'CreditCard' }
      },
      {
        path: 'flow',
        name: 'WalletFlow',
        component: () => import('../views/wallet/flow.vue'),
        meta: { title: '资金流水', icon: 'List' }
      },
      {
        path: 'audit',
        name: 'WalletAudit',
        component: () => import('../views/wallet/audit.vue'),
        meta: { title: '对账管理', icon: 'ScaleToOriginal' }
      }
    ]
  },
  {
    path: '/system',
    component: Layout,
    meta: { title: '系统配置', icon: 'Setting' },
    children: [
      {
        path: '',
        name: 'SystemConfig',
        component: () => import('../views/system/index.vue'),
        meta: { title: '基础配置', icon: 'Setting' }
      },
      {
        path: 'payment',
        name: 'SystemPayment',
        component: () => import('../views/system/payment.vue'),
        meta: { title: '支付配置', icon: 'CreditCard' }
      },
      {
        path: 'thirdparty',
        name: 'SystemThirdparty',
        component: () => import('../views/system/thirdparty.vue'),
        meta: { title: '第三方服务', icon: 'Connection' }
      },
      {
        path: 'agreement',
        name: 'SystemAgreement',
        component: () => import('../views/system/agreement.vue'),
        meta: { title: '协议管理', icon: 'Document' }
      }
    ]
  },
  {
    path: '/permission',
    component: Layout,
    meta: { title: '权限审计', icon: 'Lock' },
    children: [
      {
        path: 'admin',
        name: 'PermissionAdmin',
        component: () => import('../views/permission/admin.vue'),
        meta: { title: '管理员账号', icon: 'UserFilled' }
      },
      {
        path: 'role',
        name: 'PermissionRole',
        component: () => import('../views/permission/role.vue'),
        meta: { title: '角色权限', icon: 'Key' }
      },
      {
        path: 'log',
        name: 'PermissionLog',
        component: () => import('../views/permission/log.vue'),
        meta: { title: '操作日志', icon: 'Tickets' }
      }
    ]
  },
  {
    path: '/security',
    component: Layout,
    meta: { title: '风控安全', icon: 'Shield' },
    children: [
      {
        path: '',
        name: 'SecurityList',
        component: () => import('../views/security/index.vue'),
        meta: { title: '风控总览', icon: 'Shield' }
      },
      {
        path: 'blacklist',
        name: 'SecurityBlacklist',
        component: () => import('../views/security/blacklist.vue'),
        meta: { title: '黑名单管理', icon: 'CircleClose' }
      },
      {
        path: 'alarm',
        name: 'SecurityAlarm',
        component: () => import('../views/security/alarm.vue'),
        meta: { title: '风控告警', icon: 'Warning' }
      },
      {
        path: 'approval',
        name: 'SecurityApproval',
        component: () => import('../views/security/approval.vue'),
        meta: { title: '交易审批', icon: 'Stamp' }
      }
    ]
  },
  {
    path: '/ticket',
    component: Layout,
    children: [
      {
        path: '',
        name: 'TicketList',
        component: () => import('../views/ticket/index.vue'),
        meta: { title: '客服工单', icon: 'ChatLineSquare' }
      }
    ]
  },
  {
    path: '/report',
    component: Layout,
    children: [
      {
        path: '',
        name: 'ReportList',
        component: () => import('../views/report/index.vue'),
        meta: { title: '数据报表', icon: 'TrendCharts' }
      }
    ]
  },
  {
    path: '/platform',
    component: Layout,
    children: [
      {
        path: '',
        name: 'PlatformList',
        component: () => import('../views/platform/index.vue'),
        meta: { title: '平台运维', icon: 'Tools' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
