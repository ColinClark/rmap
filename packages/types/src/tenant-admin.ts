/**
 * Tenant Admin Types - Group and Permission Management
 */

// Group-based permission management
export interface TenantGroup {
  _id?: string
  id: string
  tenantId: string
  name: string
  description?: string

  // Apps assigned to this group
  appPermissions: AppPermission[]

  // Group members (user IDs)
  members: string[]
  memberCount: number // Denormalized for performance

  // Metadata
  metadata: {
    createdBy: string
    createdAt: Date | string
    updatedAt: Date | string
    lastModifiedBy: string
  }
}

// Permission for an app (can be assigned to user or group)
export interface AppPermission {
  appId: string
  permissions: string[] // ['view', 'create', 'export', etc.]
  grantedAt: Date | string
  grantedBy: string
  expiresAt?: Date | string // Optional expiration
  lastNotification?: Date | string // Track expiration notifications
}

// Enhanced user with group support
export interface EnhancedTenantUser {
  // Existing user fields...
  id: string
  email: string
  emailDomain: string // Auto-extracted for validation
  name: string
  phoneNumber?: string
  companyRole?: string // Role in their company
  tenantRole: 'owner' | 'admin' | 'employee' // Simplified roles

  // Group memberships
  groups?: string[] // Array of group IDs

  // Direct app permissions (override groups)
  directAppPermissions?: AppPermission[]

  // Cached effective permissions (recalculated on login)
  effectivePermissions?: {
    lastCalculated: Date | string
    apps: Record<string, string[]> // appId -> permissions[]
  }
}

// Enhanced tenant settings
export interface TenantAdminSettings {
  requireEmailDomainMatch: boolean
  defaultEmployeePermissions: string[]
  sessionTimeoutMinutes?: number
  allowEmployeeInvites: boolean
  notificationSettings: {
    expirationAlerts: number[] // Days before expiration [30, 14, 7, 1]
    emailAdmin: boolean
    emailUser: boolean
  }
}

// Enhanced tenant with admin features
export interface EnhancedTenant {
  // Existing tenant fields...
  id: string
  name: string
  slug: string

  // Email domain restrictions
  allowedEmailDomains: string[] // ['acme.com', 'acme.co.uk']

  // Admin settings
  adminSettings: TenantAdminSettings

  // Statistics (denormalized for performance)
  stats?: {
    totalGroups: number
    totalEmployees: number
    totalAdmins: number
  }
}

// Enhanced app entitlement
export interface EnhancedAppEntitlement {
  tenantId: string
  appId: string

  // Can tenant admins manage this app?
  adminManageable: boolean
  maxUsers?: number // null = unlimited

  // Group assignments
  groupAssignments?: {
    groupId: string
    permissions: string[]
    assignedAt: Date | string
    assignedBy: string
    expiresAt?: Date | string
  }[]

  // Individual user assignments
  userAssignments?: {
    userId: string
    permissions: string[]
    assignedAt: Date | string
    assignedBy: string
    expiresAt?: Date | string
  }[]
}

// Permission expiration notification
export interface PermissionNotification {
  _id?: string
  type: 'expiration_warning' | 'expired' | 'granted' | 'revoked'
  recipientId: string
  recipientEmail: string
  tenantId: string

  details: {
    appId: string
    appName: string
    expiresAt?: Date | string
    daysUntilExpiration?: number
    permissionSource: 'group' | 'direct'
    sourceId?: string // Group ID or null for direct
  }

  status: 'pending' | 'sent' | 'failed'
  sentAt?: Date | string
  error?: string

  metadata: {
    createdAt: Date | string
    scheduledFor: Date | string
    attempts: number
  }
}

// API Request/Response types
export interface OnboardTenantAdminRequest {
  admin: {
    email: string
    name: string
    phoneNumber: string
    companyRole: string
    temporaryPassword?: string
  }
  emailDomains: string[]
  settings?: Partial<TenantAdminSettings>
  initialApps?: {
    appId: string
    adminManageable: boolean
  }[]
}

export interface AssignAppToGroupRequest {
  groupId: string
  permissions: string[]
  expiresAt?: string
}

export interface BulkInviteEmployeesRequest {
  employees: {
    email: string
    name: string
    groups?: string[]
    companyRole?: string
  }[]
  sendWelcomeEmail: boolean
}

// Permission resolution result
export interface EffectivePermissions {
  userId: string
  lastCalculated: Date | string
  permissions: Map<string, Set<string>> // appId -> Set of permissions
}

// Standard app permissions
export type StandardPermission =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'share'
  | 'admin'

// System permissions for tenant admins
export type SystemPermission =
  | 'invite_users'
  | 'manage_groups'
  | 'assign_apps'
  | 'view_analytics'
  | 'manage_billing'