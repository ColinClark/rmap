// Re-export all shared types from both frontend and backend

// User and Auth Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer'
  tenantId: string
  status: 'active' | 'inactive' | 'pending'
  lastLoginAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

// Tenant Types
export interface Tenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'cancelled'
  subscription: TenantSubscription
  settings: TenantSettings
  createdAt: Date | string
  updatedAt: Date | string
}

export interface TenantSubscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom'
  status: 'active' | 'trialing' | 'past_due' | 'cancelled' | 'suspended'
  currentPeriodEnd?: Date | string
  trialEnd?: Date | string
  limits: SubscriptionLimits
  usage: SubscriptionUsage
}

export interface SubscriptionLimits {
  users: number
  campaigns: number
  audiences: number
  apiCalls: number
  storage: number
}

export interface SubscriptionUsage {
  users: number
  campaigns: number
  audiences: number
  apiCalls: number
  storage: number
}

export interface TenantSettings {
  features: string[]
  security: {
    ssoEnabled: boolean
    mfaRequired: boolean
    ipWhitelist?: string[]
  }
  branding?: {
    primaryColor?: string
    logo?: string
  }
}

// Admin Types
export interface PlatformAdmin {
  _id?: string
  id: string
  email: string
  name: string
  passwordHash?: string
  role: 'super_admin' | 'admin' | 'support'
  permissions: AdminPermission[]
  lastLoginAt?: Date | string
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  status: 'active' | 'inactive' | 'suspended'
  createdAt: Date | string
  updatedAt: Date | string
}

export type AdminPermission =
  | 'manage_tenants'
  | 'view_tenants'
  | 'manage_billing'
  | 'manage_apps'
  | 'view_analytics'
  | 'manage_admins'
  | 'view_logs'
  | 'manage_support'

// App/Utility Tile Types
export interface AppTile {
  _id?: string
  id: string
  name: string
  shortDescription: string
  fullDescription: string
  category: 'marketing' | 'analytics' | 'data' | 'automation' | 'integration' | 'utility'
  tags: string[]

  // Visual Assets
  icon: string
  color: string
  screenshots?: string[]
  videoUrl?: string
  thumbnail?: string
  badge?: string

  // App Status
  status: 'active' | 'beta' | 'coming_soon' | 'deprecated' | 'new'
  permission: string

  // App Store Metrics
  rating?: number
  reviewCount?: number
  installs?: number
  popularity?: number

  // Features
  highlights: string[]
  features: {
    name: string
    description: string
    icon?: string
  }[]

  useCases?: string[]
  industries?: string[]

  // Configuration
  config: {
    route?: string
    apiEndpoint?: string
    externalUrl?: string
    requiresSetup?: boolean
    setupFields?: SetupField[]
    limitations?: Record<string, any>
    integrations?: string[]
  }

  // Pricing
  pricing: {
    model: 'included' | 'addon' | 'usage_based' | 'contact'
    includedInPlans: string[]
    addonPrice?: number
    usageRate?: {
      metric: string
      rate: number
      unit: string
    }
  }

  // Requirements
  requirements?: {
    minPlan?: string
    requiredApps?: string[]
    technicalRequirements?: string[]
  }

  // Metadata
  version: string
  releaseDate?: Date | string
  lastUpdated?: Date | string
  releaseNotes?: string
  documentation?: string
  supportEmail?: string
  vendor?: string

  availableForPlans: string[]
  requiredAddons?: string[]
  betaTesters?: string[]
  isHidden?: boolean

  createdAt: Date | string
  updatedAt: Date | string
}

export interface SetupField {
  name: string
  label: string
  type: 'text' | 'password' | 'select' | 'checkbox' | 'json'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  validation?: string
  encrypted?: boolean
}

export interface TenantAppEntitlement {
  _id?: string
  tenantId: string
  appId: string
  status: 'active' | 'inactive' | 'suspended' | 'trial'
  activatedAt?: Date | string
  expiresAt?: Date | string
  trialEndsAt?: Date | string
  config?: Record<string, any>
  limits?: Record<string, number>
  usage?: {
    lastUsed?: Date | string
    totalUses?: number
    monthlyUses?: number
    dailyUses?: number
  }
  enabledForUsers?: string[]
  disabledForUsers?: string[]
  requiredRole?: string
  createdBy: string
  updatedBy?: string
  createdAt: Date | string
  updatedAt: Date | string
}

// Platform Statistics
export interface PlatformStats {
  tenants: {
    total: number
    active: number
    trial: number
    suspended: number
    byPlan: Record<string, number>
  }
  users: {
    total: number
    activeDaily: number
    activeMonthly: number
  }
  apps: {
    total: number
    active: number
    mostUsed: { appId: string; name: string; uses: number }[]
  }
  revenue: {
    mrr: number
    arr: number
    churnRate: number
    growthRate: number
  }
  system: {
    uptime: number
    apiLatency: number
    errorRate: number
    storageUsed: number
  }
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}