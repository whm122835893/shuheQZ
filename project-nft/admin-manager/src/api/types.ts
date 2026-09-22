// 前端 API 层类型桩定义（补充未实现但页面引用的类型）
// 后续可逐步替换为真实的 interface 定义
export type LoginResult = {
  token?: string;
  refresh_token?: string;
  expires_in?: number;
  [key: string]: any;
};

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
  [key: string]: any;
};

export type AdminUserListItem = Record<string, any>;
export type User = Record<string, any>;
export type Approval = Record<string, any>;
export type Blacklist = Record<string, any>;
export type BlindboxesReport = Record<string, any>;
export type ChainChannel = Record<string, any>;
export type CollectiblesReport = Record<string, any>;
export type Feedback = Record<string, any>;
export type FinanceDetailItem = Record<string, any>;
export type FinanceReport = Record<string, any>;
export type HoldingDistributionItem = Record<string, any>;
export type HotCollectibleItem = Record<string, any>;
export type InviteActivity = Record<string, any>;
export type LuckyDrawActivity = Record<string, any>;
export type OnchainTask = Record<string, any>;
export type OperationLog = Record<string, any>;
export type OrderListItem = Record<string, any>;
export type PrioritySale = Record<string, any>;
export type RetentionItem = Record<string, any>;
export type RiskAlert = Record<string, any>;
export type SalesReport = Record<string, any>;
export type SalesSummaryItem = Record<string, any>;
export type SecurityEvent = Record<string, any>;
export type SupportTicket = Record<string, any>;
export type SynthesisActivity = Record<string, any>;
export type UsersReport = Record<string, any>;
export type WalletTransaction = Record<string, any>;
