/**
 * Admin Portal API Routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { platformAdminService } from '../services/PlatformAdminService'
import { appEntitlementService } from '../services/AppEntitlementService'
import { tenantService } from '../services/TenantService'
import { requireAdminAuth, requireAdminPermission } from '../middleware/admin'
import { Logger } from '../utils/logger'

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