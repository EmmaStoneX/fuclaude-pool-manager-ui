
export interface AccountStatus {
  isValid: boolean;
  lastChecked: number;
  message?: string;
}

export interface EmailSkMapEntry {
  index: number;
  email: string;
  sk_preview: string;
  status?: AccountStatus;
}

export interface HealthCheckStats {
  total: number;
  valid: number;
  invalid: number;
}

export interface HealthCheckResponse {
  message: string;
  stats: HealthCheckStats;
  results: Record<string, AccountStatus>;
}

export interface AdminBatchAction {
  action: 'add' | 'delete';
  email: string;
  sk?: string;
}

export interface AdminBatchResultItem {
  email: string;
  status: string;
  reason?: string;
}

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export type LoginPayload = {
  mode: 'random' | 'specific';
  email?: string;
  unique_name?: string;
  expires_in?: number;
};

export type LoginResponse = {
  login_url: string;
  warning?: string;
};

export interface AdminRequestBase {
  admin_password: string;
}

export interface AdminLoginPayload extends LoginPayload, AdminRequestBase { }

export type AdminAddPayload = {
  email: string;
  sk: string;
} & AdminRequestBase;

export type AdminUpdatePayload = {
  email: string;
  new_email?: string;
  new_sk?: string;
} & AdminRequestBase;

export type AdminDeletePayload = {
  email: string;
} & AdminRequestBase;

export type AdminBatchPayload = {
  actions: AdminBatchAction[];
} & AdminRequestBase;

export type AdminApiResponse = {
  message: string;
};

export type AdminBatchApiResponse = AdminApiResponse & {
  results: AdminBatchResultItem[];
};

// Auth Provider Type
export type AuthProvider = 'linuxdo' | 'github' | 'email';

// Unified User Management Types (supports LinuxDO and GitHub)
export interface LinuxDoUserInfo {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  trust_level?: number;
  email?: string;
  first_login: string;
  last_login: string;
  login_count: number;
  is_banned: boolean;
  auth_provider: AuthProvider;
}

export interface AdminUsersResponse {
  users: LinuxDoUserInfo[];
  banned_count: number;
  linuxdo_count?: number;
  github_count?: number;
  email_count?: number;
}

export type AdminBanPayload = {
  user_id: number;
  auth_provider?: AuthProvider;
} & AdminRequestBase;

export type AdminUnbanPayload = AdminBanPayload;
