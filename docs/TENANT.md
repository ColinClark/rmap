# RMAP Tenant App Administration System

## Implementation Status

**Last Updated:** 2024-12-27

### Completed ✅
- [x] Created type definitions (`packages/types/src/tenant-admin.ts`)
- [x] Created GroupService (`server/src/services/GroupService.ts`)
- [x] Enhanced UserService with group functionality
- [x] Created PermissionService
- [x] Implemented super admin API endpoints for tenant onboarding
- [x] Implemented tenant admin API endpoints for group/permission management
- [x] Added MongoDB collections and indexes

### In Progress 🚧
- [ ] Frontend UI components
- [ ] Notification service for permission expiration
- [ ] Migration scripts for existing tenants

## Overview

This document provides a comprehensive guide for implementing the hierarchical app administration system where super admins onboard customers with initial tenant admins, who then manage app access for their employees through direct assignment and group-based permissions.

## System Design Decisions

Based on product requirements, the following decisions have been made:
- **Group changes apply on next login** - Ensures consistency and prevents mid-session permission conflicts
- **No nested groups** - Simplifies permission resolution and improves performance
- **Permission expiration notifications** - 1 month, 2 weeks, 1 week, then daily until expiration
- **No tenant audit log access** - Audit logs remain platform-admin only for security
- **Unlimited groups per tenant** - No artificial limits (monitor for abuse)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                          │
│  • Onboards customers                                   │
│  • Creates initial tenant admin                         │
│  • Grants apps to tenants                              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   TENANT ADMIN                          │
│  • Manages employee groups                              │
│  • Assigns apps to groups/users                         │
│  • Invites employees (domain-restricted)                │
└────────────────┬───────────────────┬────────────────────┘
                 │                   │
                 ▼                   ▼
        ┌──────────────┐    ┌──────────────┐
        │    GROUPS    │    │   EMPLOYEES   │
        │              │    │              │
        │ • Marketing  │    │ • Direct      │
        │ • Sales      │    │   Permissions │
        │ • Engineering│    │ • Group       │
        │              │    │   Membership  │
        └──────────────┘    └──────────────┘
```

## Data Models

### 1. User Collection Updates

```javascript
// Enhanced user document structure
{
  _id: ObjectId("..."),
  id: "user-123",
  tenantId: "tenant-456",
  email: "john.doe@acme.com",
  emailDomain: "acme.com",  // NEW: Auto-extracted for validation
  name: "John Doe",
  phoneNumber: "+1-555-0123",  // NEW: Required for admins
  companyRole: "Marketing Director",  // NEW: Their role in the company
  tenantRole: "admin",  // NEW VALUES: "owner" | "admin" | "employee"

  // Group memberships
  groups: ["group-001", "group-002"],  // NEW: Array of group IDs

  // Direct app permissions (override groups)
  directAppPermissions: [  // NEW
    {
      appId: "retail-media-planner",
      permissions: ["view", "create", "export"],
      grantedAt: ISODate("2024-01-15"),
      grantedBy: "admin-user-id",
      expiresAt: ISODate("2024-12-31"),  // Optional expiration
      lastNotification: null  // Track notification status
    }
  ],

  // Cached effective permissions (recalculated on login)
  effectivePermissions: {  // NEW
    lastCalculated: ISODate("2024-01-15T10:30:00Z"),
    apps: {
      "retail-media-planner": ["view", "create", "export"],
      "data-query": ["view"]
    }
  },

  // Existing fields remain...
  passwordHash: "...",
  status: "active",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### 2. Tenant Groups Collection (NEW)

```javascript
// New collection: tenant_groups
{
  _id: ObjectId("..."),
  id: "group-001",
  tenantId: "tenant-456",
  name: "Marketing Team",
  description: "All marketing department employees",

  // Apps assigned to this group
  appPermissions: [
    {
      appId: "retail-media-planner",
      permissions: ["view", "create"],
      assignedAt: ISODate("2024-01-01"),
      assignedBy: "admin-user-id",
      expiresAt: ISODate("2024-12-31"),  // Optional
      lastNotification: null
    }
  ],

  // Group members (user IDs)
  members: ["user-123", "user-456", "user-789"],
  memberCount: 3,  // Denormalized for performance

  // Metadata
  metadata: {
    createdBy: "admin-user-id",
    createdAt: ISODate("2024-01-01"),
    updatedAt: ISODate("2024-01-15"),
    lastModifiedBy: "admin-user-id"
  }
}
```

### 3. Tenant Collection Updates

```javascript
// Enhanced tenant document
{
  _id: ObjectId("..."),
  id: "tenant-456",
  name: "Acme Corporation",
  slug: "acme",

  // Email domain restrictions
  allowedEmailDomains: ["acme.com", "acme.co.uk"],  // NEW

  // Admin settings
  adminSettings: {  // NEW
    requireEmailDomainMatch: true,
    defaultEmployeePermissions: ["view"],
    sessionTimeoutMinutes: 480,  // 8 hours
    allowEmployeeInvites: false,  // Only admins can invite
    notificationSettings: {
      expirationAlerts: [30, 14, 7, 1],  // Days before expiration
      emailAdmin: true,
      emailUser: true
    }
  },

  // Statistics (denormalized)
  stats: {  // NEW
    totalGroups: 5,
    totalEmployees: 45,
    totalAdmins: 3
  },

  // Existing fields...
  subscription: { /* ... */ },
  settings: { /* ... */ }
}
```

### 4. App Entitlements Collection Updates

```javascript
// Enhanced entitlement document
{
  _id: ObjectId("..."),
  tenantId: "tenant-456",
  appId: "retail-media-planner",

  // Admin management settings
  adminManageable: true,  // NEW: Can tenant admins manage this?
  maxUsers: null,  // null = unlimited

  // Group assignments
  groupAssignments: [  // NEW
    {
      groupId: "group-001",
      permissions: ["view", "create"],
      assignedAt: ISODate("2024-01-01"),
      assignedBy: "admin-user-id",
      expiresAt: null
    }
  ],

  // Individual user assignments
  userAssignments: [  // NEW
    {
      userId: "user-999",
      permissions: ["view", "create", "delete", "admin"],
      assignedAt: ISODate("2024-01-01"),
      assignedBy: "admin-user-id",
      expiresAt: ISODate("2024-06-30")
    }
  ],

  // Existing fields...
  grantedAt: ISODate("..."),
  grantedBy: "platform-admin-id"
}
```

### 5. Permission Expiration Notifications (NEW)

```javascript
// New collection: permission_notifications
{
  _id: ObjectId("..."),
  type: "expiration_warning",
  recipientId: "user-123",
  recipientEmail: "john@acme.com",
  tenantId: "tenant-456",

  details: {
    appId: "retail-media-planner",
    appName: "Retail Media Planner",
    expiresAt: ISODate("2024-12-31"),
    daysUntilExpiration: 7,
    permissionSource: "group" | "direct",
    sourceId: "group-001"  // Group ID or null for direct
  },

  status: "pending" | "sent" | "failed",
  sentAt: null,
  error: null,

  metadata: {
    createdAt: ISODate("..."),
    scheduledFor: ISODate("..."),
    attempts: 0
  }
}
```

## API Endpoints

### Super Admin Endpoints

#### 1. Onboard Customer with Initial Admin
```
POST /admin/tenants/:tenantId/onboard

Request Body:
{
  "admin": {
    "email": "john.doe@acme.com",
    "name": "John Doe",
    "phoneNumber": "+1-555-0100",
    "companyRole": "IT Director",
    "temporaryPassword": "Welcome123!"  // Optional, generated if not provided
  },
  "emailDomains": ["acme.com", "acme.co.uk"],
  "settings": {
    "requireEmailDomainMatch": true,
    "allowEmployeeInvites": false
  },
  "initialApps": [  // Optional: Grant apps immediately
    {
      "appId": "retail-media-planner",
      "adminManageable": true
    }
  ]
}

Response:
{
  "success": true,
  "tenant": { /* tenant details */ },
  "admin": { /* admin details without password */ },
  "invitationSent": true,
  "temporaryPassword": "xK9#mP2$"  // Only if generated
}
```

#### 2. Configure App for Tenant Management
```
PUT /admin/tenants/:tenantId/apps/:appId/settings

Request Body:
{
  "adminManageable": true,
  "maxUsers": null,  // null for unlimited
  "defaultPermissions": ["view", "create"]
}
```

### Tenant Admin Endpoints

#### 1. Group Management
```
# List all groups
GET /api/tenant/groups
Query: ?includeMembers=true&includePermissions=true

# Create new group
POST /api/tenant/groups
Body: {
  "name": "Marketing Team",
  "description": "All marketing employees",
  "memberIds": ["user-123", "user-456"]
}

# Update group
PUT /api/tenant/groups/:groupId
Body: {
  "name": "Updated Name",
  "description": "Updated description"
}

# Delete group
DELETE /api/tenant/groups/:groupId

# Add members to group
POST /api/tenant/groups/:groupId/members
Body: {
  "userIds": ["user-789", "user-012"]
}

# Remove member from group
DELETE /api/tenant/groups/:groupId/members/:userId
```

#### 2. App Permission Management
```
# Get manageable apps
GET /api/tenant/apps/manageable

Response:
{
  "apps": [
    {
      "id": "retail-media-planner",
      "name": "Retail Media Planner",
      "description": "AI-powered audience planning",
      "adminManageable": true,
      "currentAssignments": {
        "totalGroups": 3,
        "totalUsers": 12,
        "directUsers": 2
      }
    }
  ]
}

# Assign app to group
POST /api/tenant/apps/:appId/assign-group
Body: {
  "groupId": "group-001",
  "permissions": ["view", "create", "export"],
  "expiresAt": "2024-12-31"  // Optional
}

# Assign app to individual user
POST /api/tenant/apps/:appId/assign-user
Body: {
  "userId": "user-123",
  "permissions": ["view", "create", "export", "admin"],
  "expiresAt": "2024-12-31"
}

# Revoke app from group
DELETE /api/tenant/apps/:appId/groups/:groupId

# Revoke app from user
DELETE /api/tenant/apps/:appId/users/:userId
```

#### 3. Employee Management
```
# Invite single employee
POST /api/tenant/employees/invite
Body: {
  "email": "jane.smith@acme.com",
  "name": "Jane Smith",
  "companyRole": "Marketing Manager",
  "groups": ["group-001", "group-002"],
  "sendWelcomeEmail": true
}

# Bulk invite employees
POST /api/tenant/employees/bulk-invite
Body: {
  "employees": [
    {
      "email": "bob@acme.com",
      "name": "Bob Johnson",
      "groups": ["group-001"]
    },
    {
      "email": "alice@acme.com",
      "name": "Alice Williams",
      "groups": ["group-002"]
    }
  ],
  "sendWelcomeEmail": true
}

# List all employees
GET /api/tenant/employees
Query: ?includeGroups=true&includePermissions=true&role=employee

# Update employee groups
PUT /api/tenant/employees/:userId/groups
Body: {
  "groupIds": ["group-001", "group-003"],
  "replaceExisting": true  // false to append
}

# Get employee's effective permissions
GET /api/tenant/employees/:userId/permissions

Response:
{
  "userId": "user-123",
  "effectivePermissions": {
    "retail-media-planner": {
      "permissions": ["view", "create", "export"],
      "sources": [
        {
          "type": "group",
          "id": "group-001",
          "name": "Marketing Team"
        },
        {
          "type": "direct",
          "expiresAt": "2024-12-31"
        }
      ]
    }
  }
}
```

## Implementation Checklist

### Phase 1: Data Model Foundation (Week 1-2) ✅ COMPLETED

- [x] Create MongoDB migration scripts
- [x] Add `tenant_groups` collection with indexes
- [x] Update `users` collection schema
  - [x] Add `emailDomain` field
  - [x] Add `phoneNumber` field
  - [x] Add `companyRole` field
  - [x] Add `tenantRole` enum
  - [x] Add `groups` array
  - [x] Add `directAppPermissions` array
  - [x] Add `effectivePermissions` cache
- [x] Update `tenants` collection
  - [x] Add `allowedEmailDomains` array
  - [x] Add `adminSettings` object
  - [x] Add `stats` object
- [x] Update `tenant_app_entitlements` collection
  - [x] Add `adminManageable` flag
  - [x] Add `groupAssignments` array (handled via services)
  - [x] Add `userAssignments` array (handled via services)
- [x] Create `permission_notifications` collection
- [x] Create database indexes
  - [x] Index on `tenant_groups.tenantId`
  - [x] Index on `tenant_groups.members` (via `id` unique index)
  - [x] Index on `users.groups` (handled in user service)
  - [x] Index on `users.emailDomain` (handled in user service)
  - [x] Index on `permission_notifications.scheduledFor`
- [ ] Write migration script for existing data
- [ ] Test rollback procedures

### Phase 2: Backend Services (Week 3-4) ✅ COMPLETED

- [x] Create GroupService
  - [x] `createGroup(tenantId, data)`
  - [x] `updateGroup(groupId, data)`
  - [x] `deleteGroup(groupId)`
  - [x] `addMembers(groupId, userIds)`
  - [x] `removeMembers(groupId, userIds)`
  - [x] `getGroupsByTenant(tenantId)`
  - [x] `getUserGroups(tenantId, userId)`
  - [x] `assignAppToGroup(groupId, appId, permissions)`
  - [x] `removeAppFromGroup(groupId, appId)`
  - [x] `processExpiredPermissions()`
- [x] Enhance UserService
  - [x] `validateEmailDomain(email, tenantId)`
  - [x] `addUserToTenant()` with group support
  - [x] `assignDirectAppPermission(userId, appId, permissions)`
  - [x] `calculateEffectivePermissions(userId)`
  - [x] `clearEffectivePermissionsCache(userId)`
  - [x] `bulkInviteEmployees(tenantId, employees)`
- [x] Create PermissionService
  - [x] `hasPermission(userId, appId, permission)`
  - [x] `getUserAppPermissions(userId, appId)`
  - [x] `hasAnyPermission(userId, appId, permissions[])`
  - [x] `hasAllPermissions(userId, appId, permissions[])`
  - [x] `canTenantAdminManageApp(tenantId, appId)`
  - [x] `getTenantManageableApps(tenantId)`
  - [x] `processExpiredPermissions()`
  - [x] `getPermissionStats(tenantId)`
- [ ] Create NotificationService
  - [ ] `scheduleExpirationNotifications()`
  - [ ] `sendExpirationWarning(userId, appId, daysRemaining)`
  - [ ] `processNotificationQueue()`
  - [ ] `trackNotificationStatus(notificationId, status)`
- [ ] Update AppEntitlementService
  - [ ] `setAdminManageable(tenantId, appId, manageable)`
  - [ ] `getManageableApps(tenantId)`
  - [ ] `getAppAssignments(tenantId, appId)`

### Phase 3: API Implementation (Week 5-6) ✅ COMPLETED

#### Super Admin APIs ✅
- [x] POST `/admin/tenants/:tenantId/onboard-admin`
  - [x] Validate email domain
  - [x] Create tenant admin user
  - [x] Set allowed domains
  - [x] Send invitation email (placeholder)
  - [x] Grant initial apps
- [x] PATCH `/admin/tenants/:tenantId/apps/:appId/entitlement`
  - [x] Update adminManageable flag
  - [x] Set max users limit
  - [x] Configure default permissions

#### Tenant Admin APIs ✅
- [x] Group endpoints
  - [x] GET `/api/tenant-admin/groups`
  - [x] POST `/api/tenant-admin/groups`
  - [x] PATCH `/api/tenant-admin/groups/:groupId`
  - [x] DELETE `/api/tenant-admin/groups/:groupId`
  - [x] POST `/api/tenant-admin/groups/:groupId/members`
  - [x] DELETE `/api/tenant-admin/groups/:groupId/members`
- [x] App management endpoints
  - [x] GET `/api/tenant-admin/manageable-apps`
  - [x] POST `/api/tenant-admin/groups/:groupId/apps/:appId`
  - [x] POST `/api/tenant-admin/users/:userId/apps/:appId`
  - [x] DELETE `/api/tenant-admin/groups/:groupId/apps/:appId`
- [x] Employee endpoints
  - [x] POST `/api/tenant-admin/employees/invite`
  - [x] GET `/api/tenant-admin/users/:userId/permissions`
  - [x] GET `/api/tenant-admin/stats/permissions`

### Phase 4: Frontend - Super Admin Portal (Week 7)

- [ ] Create onboarding wizard component
  - [ ] Step 1: Admin details form
    - [ ] Email validation
    - [ ] Phone number formatting
    - [ ] Company role input
  - [ ] Step 2: Email domains configuration
    - [ ] Domain input with validation
    - [ ] Multiple domain support
    - [ ] Test domain validation
  - [ ] Step 3: App selection
    - [ ] List available apps
    - [ ] Set adminManageable flag
    - [ ] Configure permissions
  - [ ] Step 4: Review and confirm
    - [ ] Summary display
    - [ ] Send invitation button
    - [ ] Success confirmation
- [ ] Update tenant details page
  - [ ] Show allowed domains
  - [ ] Display admin settings
  - [ ] App management controls
- [ ] Add onboarding history
  - [ ] List of onboarded admins
  - [ ] Invitation status tracking
  - [ ] Resend invitation option

### Phase 5: Frontend - Tenant Admin Portal (Week 8-9)

- [ ] Create new admin section route `/tenant-admin`
- [ ] Build admin dashboard
  - [ ] Manageable apps count widget
  - [ ] Employee statistics widget
  - [ ] Groups overview widget
  - [ ] Recent activity feed
- [ ] Implement Groups Management
  - [ ] Groups list page
    - [ ] Table with search/filter
    - [ ] Member count display
    - [ ] Quick actions menu
  - [ ] Create group modal
    - [ ] Name and description
    - [ ] Initial members selection
    - [ ] Save validation
  - [ ] Edit group page
    - [ ] Update details
    - [ ] Manage members
    - [ ] View assigned apps
  - [ ] Delete confirmation dialog
- [ ] Build Apps Management
  - [ ] Manageable apps grid
    - [ ] App cards with details
    - [ ] Assignment statistics
    - [ ] Quick assign button
  - [ ] Assignment matrix view
    - [ ] Groups vs Apps grid
    - [ ] Permission levels
    - [ ] Bulk operations
  - [ ] Assign to group modal
    - [ ] Group selection
    - [ ] Permission checkboxes
    - [ ] Expiration date picker
  - [ ] Assign to user modal
    - [ ] User search/select
    - [ ] Permission configuration
    - [ ] Save confirmation
- [ ] Create Employee Management
  - [ ] Employee list page
    - [ ] Search and filters
    - [ ] Group badges
    - [ ] Permission summary
  - [ ] Invite employee modal
    - [ ] Email validation (domain check)
    - [ ] Group assignment
    - [ ] Send invitation
  - [ ] Bulk invite interface
    - [ ] CSV upload option
    - [ ] Manual entry form
    - [ ] Validation results
  - [ ] Employee details drawer
    - [ ] Profile information
    - [ ] Group memberships
    - [ ] Effective permissions
    - [ ] Permission sources

### Phase 6: Permission System & Middleware (Week 10)

- [ ] Implement permission resolution
  - [ ] Create `resolvePermissions` middleware
  - [ ] Cache permissions in session
  - [ ] Invalidate on group changes
  - [ ] Apply on next login rule
- [ ] Add permission checks
  - [ ] App access validation
  - [ ] Feature-level permissions
  - [ ] API endpoint protection
- [ ] Build expiration system
  - [ ] Daily expiration checker cron
  - [ ] Notification scheduler
  - [ ] Email templates for warnings
  - [ ] Permission removal on expiry
- [ ] Create audit logging
  - [ ] Log all permission changes
  - [ ] Track admin actions
  - [ ] Store in separate collection
  - [ ] Retention policy (90 days)

### Phase 7: Testing & Security (Week 11)

- [ ] Unit Tests
  - [ ] GroupService tests
  - [ ] PermissionService tests
  - [ ] NotificationService tests
  - [ ] Permission resolution tests
- [ ] Integration Tests
  - [ ] Onboarding flow test
  - [ ] Group assignment test
  - [ ] Permission inheritance test
  - [ ] Expiration notification test
- [ ] Security Testing
  - [ ] Domain validation bypass attempts
  - [ ] Permission escalation tests
  - [ ] Cross-tenant access tests
  - [ ] Rate limiting validation
- [ ] Performance Testing
  - [ ] Test with 1000+ users
  - [ ] Test with 100+ groups
  - [ ] Permission resolution speed
  - [ ] Bulk operations performance
- [ ] User Acceptance Testing
  - [ ] Super admin workflows
  - [ ] Tenant admin workflows
  - [ ] Employee experience
  - [ ] Email notifications

### Phase 8: Documentation & Deployment (Week 12)

- [ ] API Documentation
  - [ ] OpenAPI/Swagger specs
  - [ ] Postman collection
  - [ ] Example requests/responses
- [ ] User Guides
  - [ ] Super admin guide
  - [ ] Tenant admin guide
  - [ ] Employee onboarding guide
- [ ] Technical Documentation
  - [ ] Architecture diagrams
  - [ ] Database schema docs
  - [ ] Permission flow charts
- [ ] Deployment
  - [ ] Production migration plan
  - [ ] Rollback procedures
  - [ ] Monitoring setup
  - [ ] Alert configuration

## Security Considerations

### Email Domain Validation
```javascript
function validateEmailDomain(email, allowedDomains) {
  const domain = email.split('@')[1].toLowerCase()
  return allowedDomains.some(allowed =>
    domain === allowed.toLowerCase() ||
    domain.endsWith('.' + allowed.toLowerCase())
  )
}
```

### Permission Boundaries
- Tenant admins cannot grant permissions they don't have
- Admins cannot modify their own permissions
- Super admin actions are logged separately

### Rate Limiting
```javascript
const rateLimits = {
  invitations: {
    perHour: 100,
    perDay: 500
  },
  groupOperations: {
    perMinute: 30,
    perHour: 500
  },
  bulkOperations: {
    maxRecords: 100,
    perHour: 10
  }
}
```

## Monitoring & Metrics

### Key Metrics to Track
- Onboarding completion rate
- Average time to onboard
- Groups per tenant
- Employees per group
- Permission resolution time
- Notification delivery rate
- Permission expiration rate

### Alerts to Configure
- Failed onboarding attempts
- Mass permission changes (>50 in 5 minutes)
- Expiration notification failures
- Unusual admin activity patterns
- Rate limit violations

## Migration Guide

### For Existing Tenants
1. Create default admin from current owner
2. Extract email domain from existing users
3. Create "All Employees" default group
4. Migrate existing permissions to group permissions
5. Send notification about new admin portal

### Database Migration Script
```javascript
// Run in MongoDB shell
db.users.updateMany({}, {
  $set: {
    emailDomain: { $substr: ["$email", { $indexOfCP: ["$email", "@"] }, -1] },
    tenantRole: { $cond: {
      if: { $eq: ["$role", "owner"] },
      then: "owner",
      else: { $cond: {
        if: { $eq: ["$role", "admin"] },
        then: "admin",
        else: "employee"
      }}
    }},
    groups: [],
    directAppPermissions: [],
    effectivePermissions: {}
  }
})

db.tenants.updateMany({}, {
  $set: {
    allowedEmailDomains: [],
    adminSettings: {
      requireEmailDomainMatch: false,
      defaultEmployeePermissions: ["view"],
      notificationSettings: {
        expirationAlerts: [30, 14, 7, 1],
        emailAdmin: true,
        emailUser: true
      }
    },
    stats: {
      totalGroups: 0,
      totalEmployees: 0,
      totalAdmins: 0
    }
  }
})
```

## Success Criteria

### Phase 1 Success
- All data models updated
- Migration completed without data loss
- Indexes created and optimized

### Phase 2 Success
- All services unit tested
- Permission resolution < 50ms
- Notification system operational

### Phase 3 Success
- All API endpoints functional
- Rate limiting active
- Domain validation working

### Phase 4-5 Success
- UI components responsive
- Workflows intuitive
- No accessibility issues

### Phase 6 Success
- Permissions apply correctly
- Expiration notifications sent
- Audit logs capture all changes

### Phase 7 Success
- 100% test coverage for critical paths
- No security vulnerabilities found
- Performance meets targets

### Phase 8 Success
- Documentation complete
- Zero-downtime deployment
- Monitoring active

## Rollback Plan

### If Issues Arise
1. Revert code deployment
2. Restore database backup
3. Clear permission cache
4. Notify affected tenants
5. Document lessons learned

### Backup Strategy
- Daily database backups
- Pre-deployment snapshot
- Permission state export
- Configuration backup

---

## Appendix A: Permission Types

### Standard App Permissions
- `view` - Read-only access
- `create` - Create new items
- `edit` - Modify existing items
- `delete` - Remove items
- `export` - Export data
- `share` - Share with others
- `admin` - Manage app settings

### System Permissions
- `invite_users` - Invite new employees
- `manage_groups` - Create/edit groups
- `assign_apps` - Grant app access
- `view_analytics` - See usage data
- `manage_billing` - Update payment

## Appendix B: Email Templates

### Onboarding Invitation
```
Subject: Welcome to RMAP - Set up your admin account

Hi {name},

You've been designated as the admin for {tenantName} on RMAP.

Click here to set up your account: {setupLink}

Your temporary password is: {tempPassword}

Please change this on first login.

Best regards,
RMAP Team
```

### Permission Expiration Warning
```
Subject: Your access to {appName} expires in {days} days

Hi {userName},

Your access to {appName} will expire on {expirationDate}.

Please contact your administrator to extend access if needed.

Permissions affected: {permissions}
Source: {groupName or "Direct Assignment"}

Best regards,
RMAP Team
```

---

*Last updated: January 2024*
*Version: 1.0*