export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  mfaEnabled?: boolean;
  backupCodes?: string[];
  failedLoginAttempts?: number;
  isBlocked?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  logo: string;
  notes: string;
  telegramToken?: string;
  telegramChatId?: string;
}

export interface Product {
  id: string;
  customerId: string;
  name: string;
  licenseId: string;
  // Basic Information
  licenseType: 'Per User' | 'Per Device' | 'Subscription' | 'Perpetual';
  version: string;
  licenseKey: string;
  description: string;
  // Quantity & Usage
  totalLicenses: number;
  licensesUsed: number;
  autoCalculateUsage: boolean;
  allowOverAllocation: boolean;
  // Date Management
  purchaseDate: string;
  startDate: string;
  renewalDate: string;
  expiryDate: string;
  autoReminder: boolean;
  // Attachments
  licenseAgreementUrl?: string;
  invoiceUrl?: string;
  proofUrl?: string;
  
  diagramUrl?: string;
  diagramType?: 'pdf' | 'svg';
}

export interface Component {
  id: string;
  productId: string;
  name: string;
  type: string;
  site: string;
  owner: string;
  ip: string;
  version: string;
  icon: string;
  notes: string;
  position?: { x: number, y: number };
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  protocol: string;
  port: string;
  allowedIp: string;
  behavior: string;
  urls: string[];
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface SettingItem {
  id: string;
  name: string;
}

export interface Notification {
  id: string;
  type: 'expiry' | 'system' | 'security';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
  customerId?: string;
}

export interface AlertSettings {
  reminderThresholds: number[];
  telegramTemplate: string;
  globalTelegramToken: string;
  globalTelegramChatId: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalProducts: number;
  expiryStats: {
    expired: number;
    critical: number;
    warning: number;
    notice: number;
    healthy: number;
  };
  topRiskCustomers: Customer[];
  customers: Customer[];
  products: Product[];
  components: Component[];
  expiredProducts: Product[];
  expiringSoonProducts: Product[];
  recentNotifications: any[];
  siteStats: { name: string, count: number }[];
}
