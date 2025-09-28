/**
 * Admin Portal API Routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { platformAdminService } from '../services/PlatformAdminService'
import { appEntitlementService } from '../services/AppEntitlementService'
import { tenantService } from '../services/TenantService'
import { userService } from '../services/UserService'
import { emailService } from '../services/EmailService'
import { mongoService } from '../services/mongodb'
import { requireAdminAuth, requireAdminPermission } from '../middleware/admin'
import { Logger } from '../utils/logger'
import * as crypto from 'crypto'

const logger = new Logger('AdminRoutes')

export const adminRoutes = new Hono()

// Public admin routes (no auth required)
adminRoutes.post('/auth/login',
  async (c) => {
    const { email, password } = await c.req.json()

    const result = await platformAdminService.authenticateAdmin(email, password)

    if (!result.success) {
      return c.json({ error: result.error }, 401)
    }

    return c.json({
      success: true,
      admin: result.admin,
      token: result.token
    })
  }
)

// All routes below require admin authentication
adminRoutes.use('/*', requireAdminAuth)

// Get current admin info
adminRoutes.get('/me', requireAdminAuth, async (c) => {
  const admin = c.get('admin')
  return c.json({ admin })
})

// Platform statistics (requires view_analytics permission)
adminRoutes.get('/stats',
  requireAdminAuth,
  requireAdminPermission('view_analytics'),
  async (c) => {
    const stats = await platformAdminService.getPlatformStats()
    return c.json(stats)
  }
)

// ============ Tenant Management ============

// Get all tenants
adminRoutes.get('/tenants',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    const tenants = await tenantService.getAllTenants()
    return c.json({ tenants, total: tenants.length })
  }
)

// Create a new tenant
adminRoutes.post('/tenants',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  zValidator('json', z.object({
    name: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
    contactEmail: z.string().email(),
    contactName: z.string(),
    plan: z.enum(['free', 'starter', 'professional', 'enterprise', 'custom']).optional()
  })),
  async (c) => {
    try {
      const data = c.req.valid('json')
      const admin = c.get('admin')

      // Check if slug already exists
      const existing = await tenantService.getTenant(data.slug)
      if (existing) {
        return c.json({ error: 'Tenant slug already exists' }, 400)
      }

      // Create the tenant
      const tenant = await tenantService.createTenant(data)

      // Log activity
      await platformAdminService.logAdminActivity(
        admin.id,
        admin.email,
        'create_tenant',
        'tenant',
        tenant.id,
        data
      )

      logger.info(`Created tenant ${tenant.id} (${data.slug})`)

      return c.json({ success: true, tenant })
    } catch (error) {
      logger.error('Error creating tenant:', error)
      return c.json({ error: 'Failed to create tenant' }, 500)
    }
  }
)

// Get tenant details
adminRoutes.get('/tenants/:tenantId',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const tenant = await tenantService.getTenant(tenantId)

    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404)
    }

    // Get tenant's apps
    const apps = await appEntitlementService.getTenantApps(tenantId)

    return c.json({ tenant, apps })
  }
)

// Update tenant
adminRoutes.patch('/tenants/:tenantId',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  zValidator('json', z.object({
    name: z.string().optional(),
    status: z.enum(['active', 'suspended', 'inactive']).optional(),
    subscription: z.object({
      plan: z.enum(['free', 'starter', 'professional', 'enterprise', 'custom']).optional(),
      status: z.enum(['active', 'trialing', 'past_due', 'canceled']).optional()
    }).optional()
  })),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const updates = c.req.valid('json')
    const admin = c.get('admin')

    const updatedTenant = await tenantService.updateTenant(tenantId, updates)

    if (!updatedTenant) {
      return c.json({ error: 'Failed to update tenant' }, 500)
    }

    // Log activity
    await platformAdminService.logAdminActivity(
      admin.id,
      admin.email,
      'update_tenant',
      'tenant',
      tenantId,
      updates
    )

    return c.json({ success: true, tenant: updatedTenant })
  }
)

// ============ Tenant Admin Onboarding ============
// NOTE: These routes must come BEFORE the generic :action route

// Onboard a tenant with initial admin
adminRoutes.post('/tenants/:tenantId/onboard-admin',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  zValidator('json', z.object({
    admin: z.object({
      email: z.string().email(),
      name: z.string(),
      phoneNumber: z.string(),
      companyRole: z.string(),
      temporaryPassword: z.string().optional()
    }),
    emailDomains: z.array(z.string()),
    settings: z.object({
      requireEmailDomainMatch: z.boolean().optional(),
      defaultEmployeePermissions: z.array(z.string()).optional(),
      sessionTimeoutMinutes: z.number().optional(),
      allowEmployeeInvites: z.boolean().optional(),
      notificationSettings: z.object({
        expirationAlerts: z.array(z.number()).optional(),
        emailAdmin: z.boolean().optional(),
        emailUser: z.boolean().optional()
      }).optional()
    }).optional(),
    initialApps: z.array(z.object({
      appId: z.string(),
      adminManageable: z.boolean()
    })).optional()
  })),
  async (c) => {
    try {
      const tenantId = c.req.param('tenantId')
      const body = c.req.valid('json')
      const adminId = c.get('admin').id

      // Validate tenant exists
      const tenant = await tenantService.getTenant(tenantId)
      if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404)
      }

      // Check if user already exists
      let user = await userService.getUser(body.admin.email)
      let tempPassword = body.admin.temporaryPassword
      let userCreated = false

      if (user) {
        logger.info(`User ${body.admin.email} already exists, adding to tenant ${tenantId}`)
        // User exists, we'll just add them to the tenant
        // Don't change their password unless explicitly provided
        if (!tempPassword) {
          tempPassword = '[User already exists - use existing password]'
        }
      } else {
        // Create new user
        tempPassword = tempPassword || crypto.randomBytes(12).toString('hex')
        const bcrypt = await import('bcrypt')
        const passwordHash = await bcrypt.hash(tempPassword, 10)

        user = await userService.createUser({
          email: body.admin.email,
          name: body.admin.name,
          passwordHash,
          emailVerified: false
        })
        userCreated = true
        logger.info(`Created new user ${body.admin.email} for tenant ${tenantId}`)
      }

      // Add user to tenant as admin with extra fields
      await userService.addUserToTenant(
        user._id!.toString(),
        tenantId,
        'admin',
        [],
        {
          phoneNumber: body.admin.phoneNumber,
          companyRole: body.admin.companyRole
        }
      )

      // Set allowed email domains for the tenant
      if (body.emailDomains && body.emailDomains.length > 0) {
        await mongoService
          .getControlDB()
          .collection('tenants')
          .updateOne(
            { id: tenantId },
            {
              $set: {
                allowedEmailDomains: body.emailDomains,
                adminSettings: body.settings || {
                  requireEmailDomainMatch: true,
                  defaultEmployeePermissions: ['view'],
                  allowEmployeeInvites: true,
                  notificationSettings: {
                    expirationAlerts: [30, 14, 7, 1],
                    emailAdmin: true,
                    emailUser: true
                  }
                }
              }
            }
          )
      }

      // Grant initial apps to tenant
      const initialApps = body.initialApps && body.initialApps.length > 0
        ? body.initialApps
        : await appEntitlementService.getDefaultInitialApps(tenant.subscription.plan)

      if (initialApps.length > 0) {
        for (const app of initialApps) {
          await mongoService
            .getControlDB()
            .collection('tenant_app_entitlements')
            .updateOne(
              { tenantId, appId: app.appId },
              {
                $set: {
                  tenantId,
                  appId: app.appId,
                  status: 'active',
                  grantedAt: new Date(),
                  grantedBy: adminId,
                  adminManageable: app.adminManageable,
                  config: {},
                  limits: {},
                  usage: {
                    totalUses: 0,
                    monthlyUses: 0,
                    dailyUses: 0,
                    lastUsed: null
                  },
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              },
              { upsert: true }
            )
        }
        logger.info(`Granted ${initialApps.length} initial apps to tenant ${tenantId}`)
      }

      // Send welcome email to the admin
      try {
        await emailService.sendTenantAdminWelcomeEmail(
          user.email,
          user.name,
          tenant.name,
          userCreated ? tempPassword : null,
          userCreated
        )
        logger.info(`Sent welcome email to ${user.email}`)
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError)
        // Don't fail the whole operation if email fails
      }

      logger.info(`Onboarded tenant admin for ${tenantId}: ${body.admin.email}`)

      return c.json({
        success: true,
        userCreated,
        message: userCreated
          ? `New admin user created for ${tenant.name}`
          : `Existing user ${user.email} added as admin to ${tenant.name}`,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          temporaryPassword: tempPassword
        }
      })
    } catch (error) {
      logger.error('Error onboarding tenant admin:', error)
      // Return more detailed error in development
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return c.json({
        error: 'Failed to onboard tenant admin',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, 500)
    }
  }
)

// Update app entitlement to make it tenant-admin manageable
adminRoutes.patch('/tenants/:tenantId/apps/:appId/entitlement',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  zValidator('json', z.object({
    adminManageable: z.boolean().optional(),
    maxUsers: z.number().optional(),
    expiresAt: z.string().optional(),
    config: z.record(z.any()).optional(),
    limits: z.record(z.number()).optional()
  })),
  async (c) => {
    try {
      const tenantId = c.req.param('tenantId')
      const appId = c.req.param('appId')
      const updates = c.req.valid('json')
      const adminId = c.get('admin').id

      const result = await mongoService
        .getControlDB()
        .collection('tenant_app_entitlements')
        .updateOne(
          { tenantId, appId },
          {
            $set: {
              ...updates,
              updatedAt: new Date(),
              updatedBy: adminId
            }
          }
        )

      if (result.matchedCount === 0) {
        return c.json({ error: 'Entitlement not found' }, 404)
      }

      logger.info(`Updated app entitlement for ${appId} in tenant ${tenantId}`)

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error updating app entitlement:', error)
      return c.json({ error: 'Failed to update entitlement' }, 500)
    }
  }
)

// Delete tenant (DANGER: This will delete all tenant data)
adminRoutes.delete('/tenants/:tenantId',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  async (c) => {
    try {
      const tenantId = c.req.param('tenantId')
      const admin = c.get('admin')

      // Only super_admin can delete tenants
      if (admin.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can delete tenants' }, 403)
      }

      // Get tenant first to ensure it exists
      const tenant = await tenantService.getTenant(tenantId)
      if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404)
      }

      // Delete all tenant data
      // 1. Find all users associated with this tenant
      const tenantUsers = await mongoService
        .getControlDB()
        .collection('tenant_users')
        .find({ tenantId })
        .toArray()

      const userIds = tenantUsers.map(tu => tu.userId)

      // 2. Delete the actual user records (if they're not associated with other tenants)
      for (const userId of userIds) {
        // Check if this user belongs to other tenants
        const otherTenants = await mongoService
          .getControlDB()
          .collection('tenant_users')
          .countDocuments({
            userId,
            tenantId: { $ne: tenantId }
          })

        // If user doesn't belong to any other tenant, delete the user record
        if (otherTenants === 0) {
          await mongoService
            .getControlDB()
            .collection('users')
            .deleteOne({ _id: userId })

          logger.info(`Deleted user ${userId} as they had no other tenant associations`)
        }
      }

      // 3. Delete tenant users associations
      await mongoService
        .getControlDB()
        .collection('tenant_users')
        .deleteMany({ tenantId })

      // 4. Delete tenant groups
      await mongoService
        .getControlDB()
        .collection('tenant_groups')
        .deleteMany({ tenantId })

      // 5. Delete tenant app entitlements
      await mongoService
        .getControlDB()
        .collection('tenant_app_entitlements')
        .deleteMany({ tenantId })

      // 6. Delete tenant activity logs
      await mongoService
        .getControlDB()
        .collection('tenant_activity')
        .deleteMany({ tenantId })

      // 7. Delete the tenant itself
      await mongoService
        .getControlDB()
        .collection('tenants')
        .deleteOne({ id: tenantId })

      // Log activity
      await platformAdminService.logAdminActivity(
        admin.id,
        admin.email,
        'delete_tenant',
        'tenant',
        tenantId,
        { tenantName: tenant.name }
      )

      logger.info(`Deleted tenant ${tenantId} (${tenant.name})`)

      return c.json({ success: true, message: `Tenant ${tenant.name} has been deleted` })
    } catch (error) {
      logger.error('Error deleting tenant:', error)
      return c.json({ error: 'Failed to delete tenant' }, 500)
    }
  }
)

// Get all employees for a tenant with details
adminRoutes.get('/tenants/:tenantId/employees',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    try {
      const tenantId = c.req.param('tenantId')

      // Get tenant to verify it exists
      const tenant = await tenantService.getTenant(tenantId)
      if (!tenant) {
        return c.json({ error: 'Tenant not found' }, 404)
      }

      // Get all users in the tenant
      const tenantUsers = await mongoService
        .getControlDB()
        .collection('tenant_users')
        .find({ tenantId })
        .toArray()

      // Get user details for each tenant user
      const employees = []
      for (const tu of tenantUsers) {
        const user = await mongoService
          .getControlDB()
          .collection('users')
          .findOne({ _id: tu.userId })

        if (user) {
          // Get groups for this user
          const groups = await mongoService
            .getControlDB()
            .collection('tenant_groups')
            .find({
              tenantId,
              members: tu.id
            })
            .project({ name: 1, id: 1 })
            .toArray()

          employees.push({
            id: tu.id,
            userId: tu.userId,
            email: user.email,
            name: user.name,
            tenantRole: tu.tenantRole || tu.role,
            phoneNumber: tu.phoneNumber,
            companyRole: tu.companyRole,
            emailDomain: tu.emailDomain,
            groups: groups.map(g => ({ id: g.id, name: g.name })),
            directAppPermissions: tu.directAppPermissions || [],
            joinedAt: tu.createdAt || user.createdAt,
            lastLoginAt: user.lastLoginAt,
            emailVerified: user.emailVerified,
            twoFactorEnabled: user.twoFactorEnabled
          })
        }
      }

      // Sort by role (admin first) then by name
      employees.sort((a, b) => {
        const roleOrder = { owner: 0, admin: 1, manager: 2, member: 3, employee: 3, viewer: 4 }
        const roleCompare = (roleOrder[a.tenantRole] || 5) - (roleOrder[b.tenantRole] || 5)
        if (roleCompare !== 0) return roleCompare
        return a.name.localeCompare(b.name)
      })

      return c.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug
        },
        employees,
        total: employees.length
      })
    } catch (error) {
      logger.error('Error fetching tenant employees:', error)
      return c.json({ error: 'Failed to fetch tenant employees' }, 500)
    }
  }
)

// Find and clean up orphaned users (users with no tenant associations)
adminRoutes.get('/users/orphaned',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  async (c) => {
    try {
      const admin = c.get('admin')

      // Only super_admin can clean orphaned users
      if (admin.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can view orphaned users' }, 403)
      }

      // Find all users
      const allUsers = await mongoService
        .getControlDB()
        .collection('users')
        .find({})
        .toArray()

      // Find orphaned users (those with no tenant associations)
      const orphanedUsers = []
      for (const user of allUsers) {
        const tenantCount = await mongoService
          .getControlDB()
          .collection('tenant_users')
          .countDocuments({ userId: user._id })

        if (tenantCount === 0) {
          orphanedUsers.push({
            id: user._id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
          })
        }
      }

      return c.json({ orphanedUsers })
    } catch (error) {
      logger.error('Error finding orphaned users:', error)
      return c.json({ error: 'Failed to find orphaned users' }, 500)
    }
  }
)

// Clean up orphaned users
adminRoutes.delete('/users/orphaned',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  async (c) => {
    try {
      const admin = c.get('admin')

      // Only super_admin can clean orphaned users
      if (admin.role !== 'super_admin') {
        return c.json({ error: 'Only super admins can delete orphaned users' }, 403)
      }

      // Find all users
      const allUsers = await mongoService
        .getControlDB()
        .collection('users')
        .find({})
        .toArray()

      // Find and delete orphaned users
      let deletedCount = 0
      const deletedUsers = []

      for (const user of allUsers) {
        const tenantCount = await mongoService
          .getControlDB()
          .collection('tenant_users')
          .countDocuments({ userId: user._id })

        if (tenantCount === 0) {
          await mongoService
            .getControlDB()
            .collection('users')
            .deleteOne({ _id: user._id })

          deletedUsers.push(user.email)
          deletedCount++
          logger.info(`Deleted orphaned user: ${user.email} (${user._id})`)
        }
      }

      // Log activity
      await platformAdminService.logAdminActivity(
        admin.id,
        admin.email,
        'clean_orphaned_users',
        'users',
        null,
        { deletedCount, deletedUsers }
      )

      return c.json({
        success: true,
        message: `Deleted ${deletedCount} orphaned users`,
        deletedUsers
      })
    } catch (error) {
      logger.error('Error cleaning orphaned users:', error)
      return c.json({ error: 'Failed to clean orphaned users' }, 500)
    }
  }
)

// Suspend/activate tenant
adminRoutes.post('/tenants/:tenantId/:action',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const action = c.req.param('action')
    const admin = c.get('admin')

    if (!['suspend', 'activate'].includes(action)) {
      return c.json({ error: 'Invalid action' }, 400)
    }

    const status = action === 'suspend' ? 'suspended' : 'active'
    const updatedTenant = await tenantService.updateTenant(tenantId, { status })

    if (!updatedTenant) {
      return c.json({ error: 'Failed to update tenant status' }, 500)
    }

    // Log activity
    await platformAdminService.logAdminActivity(
      admin.id,
      admin.email,
      `${action}_tenant`,
      'tenant',
      tenantId
    )

    return c.json({ success: true, tenant: updatedTenant })
  }
)

// ============ App Entitlement Management ============

// Get all apps
adminRoutes.get('/apps',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    const apps = await appEntitlementService.getAllApps()
    return c.json({ apps })
  }
)

// Get app catalog for tenant onboarding (shows apps available for specific subscription plan)
adminRoutes.get('/apps/catalog/:plan',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    try {
      const plan = c.req.param('plan')

      // Get all apps
      const allApps = await appEntitlementService.getAllApps()

      // Filter apps based on subscription plan
      const availableApps = allApps.filter(app => {
        if (app.availableForPlans.includes('*')) return true
        return app.availableForPlans.includes(plan)
      })

      // Get default initial apps for this plan
      const defaultInitialApps = await appEntitlementService.getDefaultInitialApps(plan)

      // Mark which apps are included by default
      const catalogApps = availableApps.map(app => ({
        ...app,
        isDefaultForPlan: defaultInitialApps.some(defaultApp => defaultApp.appId === app.id),
        adminManageable: defaultInitialApps.find(defaultApp => defaultApp.appId === app.id)?.adminManageable || true
      }))

      return c.json({
        plan,
        apps: catalogApps,
        defaultApps: defaultInitialApps
      })
    } catch (error) {
      logger.error('Error fetching app catalog:', error)
      return c.json({ error: 'Failed to fetch app catalog' }, 500)
    }
  }
)

// Create/update app
adminRoutes.put('/apps/:appId',
  requireAdminAuth,
  requireAdminPermission('manage_apps'),
  zValidator('json', z.object({
    name: z.string(),
    description: z.string(),
    category: z.enum(['marketing', 'analytics', 'data', 'automation', 'integration', 'utility']),
    icon: z.string(),
    color: z.string(),
    status: z.enum(['active', 'beta', 'coming_soon', 'deprecated']),
    permission: z.string(),
    config: z.object({
      route: z.string().optional(),
      apiEndpoint: z.string().optional(),
      externalUrl: z.string().optional(),
      requiresSetup: z.boolean().optional(),
      features: z.array(z.string()).optional(),
      limitations: z.record(z.any()).optional()
    }).optional(),
    availableForPlans: z.array(z.string())
  })),
  async (c) => {
    const appId = c.req.param('appId')
    const appData = c.req.valid('json')
    const admin = c.get('admin')

    const app = await appEntitlementService.upsertApp({
      ...appData,
      id: appId,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    if (!app) {
      return c.json({ error: 'Failed to save app' }, 500)
    }

    // Log activity
    await platformAdminService.logAdminActivity(
      admin.id,
      admin.email,
      'upsert_app',
      'app',
      appId,
      appData
    )

    return c.json({ success: true, app })
  }
)

// Grant app to tenant
adminRoutes.post('/tenants/:tenantId/apps/:appId/grant',
  requireAdminAuth,
  requireAdminPermission('manage_apps'),
  zValidator('json', z.object({
    config: z.record(z.any()).optional(),
    limits: z.record(z.number()).optional(),
    enabledForUsers: z.array(z.string()).optional(),
    requiredRole: z.string().optional()
  }).optional()),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const appId = c.req.param('appId')
    const config = c.req.valid('json') || {}
    const admin = c.get('admin')

    const entitlement = await appEntitlementService.grantAppToTenant(
      tenantId,
      appId,
      admin.id,
      config
    )

    if (!entitlement) {
      return c.json({ error: 'Failed to grant app' }, 500)
    }

    // Log activity
    await platformAdminService.logAdminActivity(
      admin.id,
      admin.email,
      'grant_app',
      'entitlement',
      `${tenantId}:${appId}`,
      config
    )

    return c.json({ success: true, entitlement })
  }
)

// Revoke app from tenant
adminRoutes.post('/tenants/:tenantId/apps/:appId/revoke',
  requireAdminAuth,
  requireAdminPermission('manage_apps'),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const appId = c.req.param('appId')
    const admin = c.get('admin')

    const success = await appEntitlementService.revokeAppFromTenant(
      tenantId,
      appId,
      admin.id
    )

    if (!success) {
      return c.json({ error: 'Failed to revoke app' }, 500)
    }

    // Log activity
    await platformAdminService.logAdminActivity(
      admin.id,
      admin.email,
      'revoke_app',
      'entitlement',
      `${tenantId}:${appId}`
    )

    return c.json({ success: true })
  }
)

// Get tenant's entitled apps
adminRoutes.get('/tenants/:tenantId/apps',
  requireAdminAuth,
  requireAdminPermission('view_tenants'),
  async (c) => {
    const tenantId = c.req.param('tenantId')
    const apps = await appEntitlementService.getTenantApps(tenantId)
    return c.json({ apps })
  }
)

// ============ Admin Management ============

// Get all admins
adminRoutes.get('/admins',
  requireAdminAuth,
  requireAdminPermission('manage_admins'),
  async (c) => {
    const admins = await platformAdminService.getAllAdmins()
    return c.json({ admins })
  }
)

// Create new admin
adminRoutes.post('/admins',
  requireAdminAuth,
  requireAdminPermission('manage_admins'),
  zValidator('json', z.object({
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['admin', 'support']),
    permissions: z.array(z.string()),
    password: z.string().min(8).optional()
  })),
  async (c) => {
    const adminData = c.req.valid('json')
    const currentAdmin = c.get('admin')

    // Only super_admin can create other admins
    if (currentAdmin.role !== 'super_admin') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    const newAdmin = await platformAdminService.createAdmin(
      {
        ...adminData,
        status: 'active',
        twoFactorEnabled: false
      },
      currentAdmin.id
    )

    if (!newAdmin) {
      return c.json({ error: 'Failed to create admin' }, 500)
    }

    return c.json({ success: true, admin: newAdmin })
  }
)

// Update admin
adminRoutes.patch('/admins/:adminId',
  requireAdminAuth,
  requireAdminPermission('manage_admins'),
  zValidator('json', z.object({
    name: z.string().optional(),
    role: z.enum(['admin', 'support']).optional(),
    permissions: z.array(z.string()).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
  })),
  async (c) => {
    const adminId = c.req.param('adminId')
    const updates = c.req.valid('json')
    const currentAdmin = c.get('admin')

    // Only super_admin can update other admins
    if (currentAdmin.role !== 'super_admin') {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    const success = await platformAdminService.updateAdmin(
      adminId,
      updates,
      currentAdmin.id
    )

    if (!success) {
      return c.json({ error: 'Failed to update admin' }, 500)
    }

    return c.json({ success: true })
  }
)


// Update app entitlement to make it tenant-admin manageable
adminRoutes.patch('/tenants/:tenantId/apps/:appId/entitlement',
  requireAdminAuth,
  requireAdminPermission('manage_tenants'),
  zValidator('json', z.object({
    adminManageable: z.boolean().optional(),
    maxUsers: z.number().optional(),
    expiresAt: z.string().optional(),
    config: z.record(z.any()).optional(),
    limits: z.record(z.number()).optional()
  })),
  async (c) => {
    try {
      const tenantId = c.req.param('tenantId')
      const appId = c.req.param('appId')
      const updates = c.req.valid('json')
      const adminId = c.get('admin').id

      const result = await mongoService
        .getControlDB()
        .collection('tenant_app_entitlements')
        .updateOne(
          { tenantId, appId },
          {
            $set: {
              ...updates,
              updatedAt: new Date(),
              updatedBy: adminId
            }
          }
        )

      if (result.matchedCount === 0) {
        return c.json({ error: 'Entitlement not found' }, 404)
      }

      logger.info(`Updated app entitlement for ${appId} in tenant ${tenantId}`)

      return c.json({ success: true })
    } catch (error) {
      logger.error('Error updating app entitlement:', error)
      return c.json({ error: 'Failed to update entitlement' }, 500)
    }
  }
)

// Get admin activity logs
adminRoutes.get('/logs',
  requireAdminAuth,
  requireAdminPermission('view_logs'),
  async (c) => {
    const limit = parseInt(c.req.query('limit') || '100')
    const offset = parseInt(c.req.query('offset') || '0')

    // For now, return empty array (would query adminLogsCollection)
    return c.json({ logs: [], total: 0 })
  }
)