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

  // Availability
  availableForPlans: string[]
  availableRegions?: string[]
  requiredFeatures?: string[]

  // Metadata
  version: string
  releaseDate?: string
  lastUpdated?: string
  vendor?: {
    name: string
    website?: string
    supportEmail?: string
  }

  createdAt: Date | string
  updatedAt: Date | string
}

export interface SetupField {
  name: string
  label: string
  type: 'text' | 'password' | 'select' | 'checkbox' | 'url'
  required: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  helpText?: string
}

// App Entitlement Types
export interface TenantAppEntitlement {
  _id?: string
  tenantId: string
  appId: string
  status: 'active' | 'suspended' | 'expired'
  grantedAt: Date | string
  grantedBy: string // Admin who granted the app
  expiresAt?: Date | string
  suspendedAt?: Date | string
  suspendedReason?: string

  // Configuration specific to this tenant
  config?: Record<string, any>

  // Usage limits specific to this entitlement
  limits?: {
    users?: number
    apiCalls?: number
    storage?: number
    customLimits?: Record<string, number>
  }

  // Current usage
  usage?: {
    users?: number
    apiCalls?: number
    storage?: number
    customUsage?: Record<string, number>
    lastUpdated: Date | string
  }

  // Users within the tenant who can access this app
  enabledForUsers?: string[] // User IDs, empty = all users
  requiredRole?: string // Minimum role required
}

// Activity/Audit Types
export interface TenantActivity {
  _id?: string
  tenantId: string
  userId: string
  userEmail: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date | string
}

// Invitation Types
export interface TenantInvitation {
  _id?: string
  id: string
  tenantId: string
  email: string
  role: string
  invitedBy: string
  invitedAt: Date | string
  expiresAt: Date | string
  acceptedAt?: Date | string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
}

// Export all tenant admin types
export * from './tenant-admin'