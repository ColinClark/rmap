import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  // TenantSchema,
  // TenantUserSchema,
  // TenantInvitationSchema,
  SUBSCRIPTION_PLANS,
  type Tenant,
  type TenantUser,
  type TenantInvitation
  // type UsageEvent, // TODO: Track usage events
  // type BillingEvent // TODO: Implement billing
} from '../types/tenant'
import { requireTenantRole } from '../middleware/tenant'
import { tenantService } from '../services/TenantService'
import { userService } from '../services/UserService'
import { invitationService } from '../services/InvitationService'
import { activityService } from '../services/ActivityService'

export const tenantRoutes = new Hono()

// Note: All data now stored in MongoDB via services

// Get current tenant info
tenantRoutes.get('/current', async (c) => {
  const tenant = c.get('tenant') as Tenant
  const user = c.get('user') as TenantUser

  // Get fresh tenant data from database
  const currentTenant = await tenantService.getTenant(tenant.id)

  if (!currentTenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  return c.json({
    tenant: {
      id: currentTenant.id,
      name: currentTenant.name,
      slug: currentTenant.slug,
      logo: currentTenant.logo,
      subscription: currentTenant.subscription,
      settings: currentTenant.settings,
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.tenantRole,
      permissions: user.permissions,
    },
    limits: currentTenant.subscription.limits,
    usage: currentTenant.subscription.usage,
    features: currentTenant.settings.features,
  })
})

// Update tenant settings (admin only)
tenantRoutes.patch(
  '/settings',
  requireTenantRole('owner', 'admin'),
  zValidator('json', z.object({
    name: z.string().optional(),
    logo: z.string().url().optional(),
    contactEmail: z.string().email().optional(),
    contactName: z.string().optional(),
    contactPhone: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    }).optional(),
    settings: z.object({
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      currency: z.string().optional(),
      language: z.string().optional(),
    }).optional(),
  })),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const updates = c.req.valid('json')

    // Update tenant in database
    const updatedTenant = await tenantService.updateTenant(tenant.id, updates)

    if (!updatedTenant) {
      return c.json({ error: 'Failed to update tenant settings' }, 500)
    }

    return c.json({ success: true, tenant: updatedTenant })
  }
)

// Get team members
tenantRoutes.get('/users',
  requireTenantRole('owner', 'admin', 'manager'),
  async (c) => {
    const tenant = c.get('tenant') as Tenant

    // Get all users for this tenant from database
    const tenantUsers = await userService.getTenantUsers(tenant.id)

    // Get full user details for each tenant user
    const usersWithDetails = await Promise.all(
      tenantUsers.map(async (tu) => {
        const user = await userService.getUser(tu.userId)
        if (!user) return null

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          tenantId: tu.tenantId,
          tenantRole: tu.tenantRole,
          permissions: tu.permissions,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled || false,
          status: tu.status,
          lastLoginAt: user.lastLoginAt,
          joinedAt: tu.joinedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      })
    )

    // Filter out any nulls
    const users = usersWithDetails.filter(u => u !== null)

    return c.json({ users, total: users.length })
  }
)

// Invite user
tenantRoutes.post('/users/invite',
  requireTenantRole('owner', 'admin'),
  zValidator('json', z.object({
    email: z.string().email(),
    role: z.enum(['admin', 'manager', 'member', 'viewer']),
    permissions: z.array(z.string()).optional(),
  })),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const userId = c.get('userId') as string
    const { email, role, permissions } = c.req.valid('json')

    // Check user limit
    if (tenant.subscription.limits.users !== -1 &&
      tenant.subscription.usage.users >= tenant.subscription.limits.users) {
      return c.json({
        error: 'User limit reached. Please upgrade your subscription.'
      }, 403)
    }

    // Check if user already exists in this tenant
    const existingUser = await userService.getUser(email)
    if (existingUser) {
      const tenantUsers = await userService.getTenantUsers(tenant.id)
      const userInTenant = tenantUsers.find(tu => tu.userId === existingUser._id)
      if (userInTenant) {
        return c.json({ error: 'User is already a member of this organization' }, 400)
      }
    }

    // Create invitation
    const invitation = await invitationService.createInvitation({
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: email.toLowerCase(),
      role,
      permissions: permissions || [],
      invitedBy: userId
    })

    if (!invitation) {
      return c.json({ error: 'Failed to create invitation' }, 500)
    }

    return c.json({ success: true, invitation })
  }
)

// Update user role
tenantRoutes.put('/users/:userId',
  requireTenantRole('owner', 'admin'),
  zValidator('json', z.object({
    role: z.enum(['admin', 'manager', 'member', 'viewer']),
    permissions: z.array(z.string()).optional(),
  })),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const targetUserId = c.req.param('userId')
    const currentUserId = c.get('userId') as string
    const { role, permissions } = c.req.valid('json')

    // Prevent users from modifying their own role
    if (targetUserId === currentUserId) {
      return c.json({ error: 'Cannot modify your own role' }, 403)
    }

    // Update user's role and permissions in the tenant
    const success = await userService.updateUserInTenant(
      targetUserId,
      tenant.id,
      role,
      permissions
    )

    if (!success) {
      return c.json({ error: 'Failed to update user role' }, 500)
    }

    return c.json({ success: true, userId: targetUserId, role, permissions })
  }
)

// Remove user
tenantRoutes.delete('/users/:userId',
  requireTenantRole('owner', 'admin'),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const targetUserId = c.req.param('userId')
    const currentUserId = c.get('userId') as string

    // Prevent users from removing themselves
    if (targetUserId === currentUserId) {
      return c.json({ error: 'Cannot remove yourself from the organization' }, 403)
    }

    // Check if user is the last owner
    const tenantUsers = await userService.getTenantUsers(tenant.id)
    const owners = tenantUsers.filter(tu => tu.tenantRole === 'owner')
    const targetUser = tenantUsers.find(tu => tu.userId === targetUserId)

    if (targetUser?.tenantRole === 'owner' && owners.length === 1) {
      return c.json({ error: 'Cannot remove the last owner' }, 403)
    }

    // Remove user from tenant
    const success = await userService.removeUserFromTenant(targetUserId, tenant.id)

    if (!success) {
      return c.json({ error: 'Failed to remove user' }, 500)
    }

    // Update usage count
    await tenantService.updateTenant(tenant.id, {
      'subscription.usage.users': Math.max(0, tenant.subscription.usage.users - 1)
    })

    return c.json({ success: true, userId: targetUserId })
  }
)

// Get usage statistics
tenantRoutes.get('/usage', (c) => {
  const tenant = c.get('tenant') as Tenant
  
  // const now = new Date() // TODO: Use for date calculations
  // const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1) // TODO: Use for filtering
  
  return c.json({
    current: tenant.subscription.usage,
    limits: tenant.subscription.limits,
    period: {
      start: tenant.subscription.currentPeriodStart,
      end: tenant.subscription.currentPeriodEnd,
    },
    trends: {
      apiCalls: {
        today: Math.floor(Math.random() * 100),
        yesterday: Math.floor(Math.random() * 100),
        thisWeek: Math.floor(Math.random() * 500),
        thisMonth: tenant.subscription.usage.apiCalls,
      },
      campaigns: {
        active: Math.floor(tenant.subscription.usage.campaigns * 0.6),
        draft: Math.floor(tenant.subscription.usage.campaigns * 0.2),
        completed: Math.floor(tenant.subscription.usage.campaigns * 0.2),
      },
      storage: {
        documents: tenant.subscription.usage.storage * 0.3,
        images: tenant.subscription.usage.storage * 0.5,
        exports: tenant.subscription.usage.storage * 0.2,
      },
    },
  })
})

// Get billing info
tenantRoutes.get('/billing',
  requireTenantRole('owner', 'admin'),
  (c) => {
    const tenant = c.get('tenant') as Tenant
    const plan = SUBSCRIPTION_PLANS[tenant.subscription.plan]
    
    return c.json({
      subscription: {
        plan: plan,
        status: tenant.subscription.status,
        billingCycle: tenant.subscription.billingCycle,
        currentPeriod: {
          start: tenant.subscription.currentPeriodStart,
          end: tenant.subscription.currentPeriodEnd,
        },
        trialEndsAt: tenant.subscription.trialEndsAt,
        nextInvoice: {
          date: tenant.subscription.currentPeriodEnd,
          amount: plan.prices[tenant.subscription.billingCycle],
        },
      },
      paymentMethod: {
        type: 'card',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025,
      },
      invoices: [
        {
          id: 'inv_1',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: plan.prices[tenant.subscription.billingCycle],
          status: 'paid',
          downloadUrl: '#',
        },
      ],
    })
  }
)

// Update subscription
tenantRoutes.post('/billing/subscription',
  requireTenantRole('owner'),
  zValidator('json', z.object({
    plan: z.enum(['free', 'starter', 'professional', 'enterprise']),
    billingCycle: z.enum(['monthly', 'annual']),
  })),
  (c) => {
    const tenant = c.get('tenant') as Tenant
    const { plan, billingCycle } = c.req.valid('json')
    
    // In production, update with Stripe
    tenant.subscription.plan = plan
    tenant.subscription.billingCycle = billingCycle
    tenant.subscription.limits = SUBSCRIPTION_PLANS[plan].limits
    tenant.settings.features = SUBSCRIPTION_PLANS[plan].features
    
    return c.json({ 
      success: true, 
      subscription: tenant.subscription,
      message: 'Subscription updated successfully'
    })
  }
)

// Get activity logs
tenantRoutes.get('/activity',
  requireTenantRole('owner', 'admin'),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')
    const userId = c.req.query('userId')
    const action = c.req.query('action')
    const resource = c.req.query('resource')

    // Parse date filters
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (c.req.query('startDate')) {
      startDate = new Date(c.req.query('startDate')!)
    }
    if (c.req.query('endDate')) {
      endDate = new Date(c.req.query('endDate')!)
    }

    const result = await activityService.getTenantActivities(tenant.id, {
      limit,
      offset,
      userId,
      action,
      resource,
      startDate,
      endDate
    })

    return c.json(result)
  }
)

// Get activity statistics
tenantRoutes.get('/activity/stats',
  requireTenantRole('owner', 'admin'),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const days = parseInt(c.req.query('days') || '30')

    const stats = await activityService.getActivityStats(tenant.id, days)

    return c.json(stats)
  }
)

// Tenant branding and customization
tenantRoutes.put('/branding',
  requireTenantRole('owner', 'admin'),
  zValidator('json', z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    customDomain: z.string().optional(),
    emailFromName: z.string().optional(),
    supportEmail: z.string().email().optional(),
    supportUrl: z.string().url().optional(),
    customCSS: z.string().optional(),
    favicon: z.string().url().optional(),
    loginMessage: z.string().optional(),
    footerText: z.string().optional(),
  })),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const branding = c.req.valid('json')

    // Update tenant branding in database
    const updatedTenant = await tenantService.updateTenant(tenant.id, {
      logo: branding.logo || tenant.logo,
      settings: {
        ...tenant.settings,
        branding: {
          ...(tenant.settings?.branding || {}),
          ...branding
        }
      }
    })

    if (!updatedTenant) {
      return c.json({ error: 'Failed to update branding' }, 500)
    }

    return c.json({
      success: true,
      branding: updatedTenant.settings.branding
    })
  }
)

// Security settings
tenantRoutes.patch('/security',
  requireTenantRole('owner', 'admin'),
  zValidator('json', z.object({
    enforceSSO: z.boolean().optional(),
    enforce2FA: z.boolean().optional(),
    ipWhitelist: z.array(z.string()).optional(),
    sessionTimeout: z.number().min(5).max(1440).optional(),
    passwordPolicy: z.object({
      minLength: z.number().min(6).max(32).optional(),
      requireUppercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
      expirationDays: z.number().optional(),
    }).optional(),
  })),
  async (c) => {
    const tenant = c.get('tenant') as Tenant
    const updates = c.req.valid('json')

    // Merge security settings with existing ones
    const currentSecurity = tenant.settings?.security || {}
    const mergedSecurity = {
      ...currentSecurity,
      ...updates,
      passwordPolicy: updates.passwordPolicy ? {
        ...(currentSecurity.passwordPolicy || {}),
        ...updates.passwordPolicy
      } : currentSecurity.passwordPolicy
    }

    // Update in database
    const updatedTenant = await tenantService.updateTenant(tenant.id, {
      settings: {
        ...tenant.settings,
        security: mergedSecurity
      }
    })

    if (!updatedTenant) {
      return c.json({ error: 'Failed to update security settings' }, 500)
    }

    return c.json({
      success: true,
      security: updatedTenant.settings.security
    })
  }
)