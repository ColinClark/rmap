/**
 * Admin and Platform Management Types
 */

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

/**
 * App/Utility Tile Configuration - App Store Style
 */
export interface AppTile {
  _id?: string
  id: string
  name: string
  shortDescription: string // Brief one-liner for tile display
  fullDescription: string // Detailed description for app details page
  category: 'marketing' | 'analytics' | 'data' | 'automation' | 'integration' | 'utility'
  tags: string[] // Searchable tags like ['retail', 'audience', 'campaigns']

  // Visual Assets
  icon: string // Icon name or URL
  color: string // Primary brand color (Tailwind class)
  screenshots?: string[] // URLs to screenshot images
  videoUrl?: string // Demo video URL
  thumbnail?: string // Card thumbnail image

  // App Status
  status: 'active' | 'beta' | 'coming_soon' | 'deprecated' | 'new'
  badge?: string // Display badge like 'New', 'Popular', 'Limited Time'
  permission: string // Permission key required

  // App Store Metrics
  rating?: number // Average rating (1-5)
  reviewCount?: number // Number of reviews
  installs?: number // Number of installations
  popularity?: number // Popularity score for sorting

  // Features & Benefits
  highlights: string[] // Key features/benefits (bullet points)
  features: {
    name: string
    description: string
    icon?: string
  }[] // Detailed features list

  useCases?: string[] // Example use cases
  industries?: string[] // Target industries

  // Configuration
  config: {
    route?: string // Frontend route
    apiEndpoint?: string // Backend API endpoint
    externalUrl?: string // For external apps
    requiresSetup?: boolean
    setupFields?: SetupField[]
    limitations?: Record<string, any> // Per-plan limitations
    integrations?: string[] // Available integrations
  }

  // Pricing & Availability
  pricing: {
    model: 'included' | 'addon' | 'usage_based' | 'contact'
    includedInPlans: string[] // Plans that include this app
    addonPrice?: number // Monthly price if addon
    usageRate?: { // Usage-based pricing
      metric: string
      rate: number
      unit: string
    }
  }

  // Requirements
  requirements?: {
    minPlan?: string // Minimum plan required
    requiredApps?: string[] // Other apps that must be installed
    technicalRequirements?: string[] // e.g., 'API access', 'Custom domain'
  }

  // Metadata
  version: string
  releaseDate?: Date | string
  lastUpdated?: Date | string
  releaseNotes?: string
  documentation?: string
  supportEmail?: string
  vendor?: string // Company/team that built it

  // Usage tracking
  usageMetrics?: {
    monthlyActiveUsers?: number
    totalLaunches?: number
    averageSessionTime?: number
    lastUsedAt?: Date | string
  }

  // Visibility
  availableForPlans: string[] // Which subscription plans can use this
  requiredAddons?: string[] // Additional purchases required
  betaTesters?: string[] // Tenant IDs in beta
  isHidden?: boolean // Hide from catalog

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
  validation?: string // Regex pattern
  encrypted?: boolean // Should be encrypted in storage
}

/**
 * Tenant App Entitlement
 */
export interface TenantAppEntitlement {
  _id?: string
  tenantId: string
  appId: string

  // Entitlement details
  status: 'active' | 'inactive' | 'suspended' | 'trial'
  activatedAt?: Date | string
  expiresAt?: Date | string
  trialEndsAt?: Date | string

  // Configuration overrides
  config?: Record<string, any> // Tenant-specific configuration
  limits?: Record<string, number> // Tenant-specific limits

  // Usage tracking
  usage?: {
    lastUsed?: Date | string
    totalUses?: number
    monthlyUses?: number
    dailyUses?: number
  }

  // Permissions
  enabledForUsers?: string[] // Specific user IDs, or empty for all
  disabledForUsers?: string[] // Specific user IDs to exclude
  requiredRole?: string // Minimum role required

  createdBy: string // Admin who enabled it
  updatedBy?: string
  createdAt: Date | string
  updatedAt: Date | string
}

/**
 * Admin Activity Log
 */
export interface AdminActivityLog {
  _id?: string
  adminId: string
  adminEmail: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date | string
}

/**
 * Platform Statistics
 */
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
    mrr: number // Monthly Recurring Revenue
    arr: number // Annual Recurring Revenue
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