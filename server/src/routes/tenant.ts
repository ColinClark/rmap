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

export const tenantRoutes = new Hono()

// In-memory storage for demo (replace with database)
// const tenants = new Map<string, Tenant>() // TODO: Implement tenant store
const invitations = new Map<string, TenantInvitation>()
// const usageEvents: UsageEvent[] = [] // TODO: Track usage events
// const billingEvents: BillingEvent[] = [] // TODO: Implement billing events

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
  (c) => {
    const tenant = c.get('tenant') as Tenant
    const updates = c.req.valid('json')
    
    // Update tenant (in production, save to database)
    Object.assign(tenant, updates, {
      updatedAt: new Date().toISOString(),
    })
    
    return c.json({ success: true, tenant })
  }
)

// Get team members
tenantRoutes.get('/users', 
  requireTenantRole('owner', 'admin', 'manager'),
  (c) => {
    const tenant = c.get('tenant') as Tenant
    
    // Mock team members
    const users: TenantUser[] = [
      {
        id: 'user-1',
        email: 'admin@demo.com',
        name: 'Admin User',
        tenantId: tenant.id,
        tenantRole: 'owner',
        permissions: ['*'],
        emailVerified: true,
        twoFactorEnabled: true,
        status: 'active',
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'user-2',
        email: 'manager@demo.com',
        name: 'Marketing Manager',
        tenantId: tenant.id,
        tenantRole: 'manager',
        permissions: ['retail_media', 'google_ads', 'meta_ads'],
        emailVerified: true,
        twoFactorEnabled: false,
        status: 'active',
        lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    
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
  (c) => {
    const tenant = c.get('tenant') as Tenant
    const user = c.get('user') as TenantUser
    const { email, role, permissions } = c.req.valid('json')
    
    // Check user limit
    if (tenant.subscription.limits.users !== -1 && 
        tenant.subscription.usage.users >= tenant.subscription.limits.users) {
      return c.json({ 
        error: 'User limit reached. Please upgrade your subscription.' 
      }, 403)
    }
    
    // Create invitation
    const invitation: TenantInvitation = {
      id: `inv_${Date.now()}`,
      tenantId: tenant.id,
      email,
      role,
      permissions: permissions || [],
      invitedBy: user.id,
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      token: Math.random().toString(36).substring(2),
    }
    
    invitations.set(invitation.id, invitation)
    
    // In production, send invitation email
    
    return c.json({ success: true, invitation })
  }
)

// Remove user
tenantRoutes.delete('/users/:userId',
  requireTenantRole('owner', 'admin'),
  (c) => {
    const userId = c.req.param('userId')
    // const tenant = c.get('tenant') as Tenant // TODO: Use for updating usage
    
    // In production, remove user from database
    // Update usage count
    
    return c.json({ success: true, userId })
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
  (c) => {
    // const tenant = c.get('tenant') as Tenant // TODO: Filter by tenant
    
    // Mock activity logs
    const activities = [
      {
        id: '1',
        userId: 'user-1',
        userName: 'Admin User',
        action: 'campaign.created',
        resource: 'Campaign',
        resourceId: 'camp_123',
        metadata: { name: 'Holiday Campaign' },
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        userId: 'user-2',
        userName: 'Marketing Manager',
        action: 'user.invited',
        resource: 'User',
        resourceId: 'user-3',
        metadata: { email: 'newuser@demo.com' },
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]
    
    return c.json({ activities, total: activities.length })
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
  (c) => {
    const tenant = c.get('tenant') as Tenant
    const updates = c.req.valid('json')
    
    // Update security settings
    Object.assign(tenant.settings.security, updates)
    
    return c.json({ 
      success: true, 
      security: tenant.settings.security 
    })
  }
)