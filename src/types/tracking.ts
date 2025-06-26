// User tracking and whitelist management types

export interface UserSession {
  id: string;
  email: string;
  fullName?: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  city?: string;
  device: string;
  browser: string;
  referrer?: string;
  sessionStart: Date;
  lastActivity: Date;
  resumesGenerated: number;
  freeResumesUsed: number;
  accountType: 'regular' | 'admin' | 'beta' | 'influencer' | 'partner';
  whitelistStatus?: string;
  flagged: boolean;
  flaggedReason?: string;
  discountPercent?: number;
  notes?: string;
}

export interface WhitelistEntry {
  id: string;
  type: 'email' | 'domain' | 'ip_range';
  value: string; // email, domain pattern, or IP range
  privilege: {
    freeResumes: number | 'unlimited';
    discountPercent?: number;
    premiumAccess?: boolean;
  };
  accountType: 'admin' | 'beta' | 'partner' | 'influencer';
  addedBy: string; // admin who added this entry
  addedDate: Date;
  expiryDate?: Date;
  notes?: string;
  active: boolean;
}

export interface AbusePattern {
  id: string;
  type: 'multiple_emails_same_ip' | 'rapid_usage' | 'disposable_email' | 'vpn_proxy' | 'geographic_anomaly';
  severity: 'low' | 'medium' | 'high';
  description: string;
  ipAddress?: string;
  emails: string[];
  detectedAt: Date;
  resolved: boolean;
  notes?: string;
}

export interface AdminUser {
  username: string;
  email: string;
  passwordHash: string;
  lastLogin?: Date;
  sessionToken?: string;
  sessionExpiry?: Date;
}

export interface UsageStats {
  totalUsers: number;
  activeToday: number;
  freeResumesToday: number;
  paidResumesToday: number;
  flaggedUsers: number;
  topCountries: { country: string; count: number }[];
  revenueToday: number;
  conversionRate: number;
}

// Predefined whitelist entries
export const DEFAULT_WHITELIST: Omit<WhitelistEntry, 'id' | 'addedDate'>[] = [
  {
    type: 'email',
    value: 'adamhoemberg@gmail.com',
    privilege: { freeResumes: 'unlimited', premiumAccess: true },
    accountType: 'admin',
    addedBy: 'system',
    notes: 'Admin - Adam Hoemberg',
    active: true
  },
  {
    type: 'email', 
    value: 'jhoemberg75@gmail.com',
    privilege: { freeResumes: 'unlimited', premiumAccess: true },
    accountType: 'beta',
    addedBy: 'system',
    notes: 'Beta Tester - Jessica Hoemberg',
    active: true
  },
  {
    type: 'domain',
    value: '*.mikeroweWORKS.org',
    privilege: { freeResumes: 'unlimited' },
    accountType: 'partner',
    addedBy: 'system',
    notes: 'Mike Rowe Foundation Partnership',
    active: true
  },
  {
    type: 'domain',
    value: '*.eku.edu',
    privilege: { freeResumes: 1, discountPercent: 25 },
    accountType: 'partner',
    addedBy: 'system',
    notes: 'EKU Alumni - 25% discount',
    active: true
  }
];