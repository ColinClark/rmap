import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Tenant, TenantUser } from '../types/tenant'

// Extended context with tenant information
export interface TenantContext {
  tenant: Tenant
  user: TenantUser
  permissions: string[]
}

// Mock tenant store - replace with database
const tenants = new Map<string, Tenant>()
const users = new Map<string, TenantUser>()

// Initialize demo tenant
const demoTenant: Tenant = {
  id: 'demo-tenant-id',
  name: 'Demo Company',
  slug: 'demo',
  contactEmail: 'admin@demo.com',
  contactName: 'Demo Admin',
  address: {
    country: 'USA',
  },
  subscription: {
    plan: 'professional',
    status: 'active',
    billingCycle: 'monthly',
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    limits: {
      users: 50,
      campaigns: 500,
      apiCalls: 100000,
      storage: 100,
      workflows: ['retail_media', 'google_ads', 'meta_ads', 'analytics'],
    },
    usage: {
      users: 5,
      campaigns: 23,
      apiCalls: 1523,
      storage: 2.5,
    },
  },
  settings: {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    language: 'en',
    features: {
      sso: true,
      apiAccess: true,
      whiteLabel: false,
      customIntegrations: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
    security: {
      enforceSSO: false,
      enforce2FA: false,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      },
    },
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system',
  status: 'active',
}

tenants.set('demo', demoTenant)
tenants.set('demo-tenant-id', demoTenant) // Also register by ID
tenants.set('test-tenant', demoTenant) // Add test-tenant alias
tenants.set('test', demoTenant) // Add test alias

// Tenant identification strategies
export function identifyTenant(c: Context): string | null {
  // 1. Check custom header (for API clients) - HIGHEST PRIORITY
  const tenantHeader = c.req.header('X-Tenant-ID') || c.req.header('X-Tenant-Slug')
  if (tenantHeader) {
    return tenantHeader
  }

  // 2. Check subdomain (e.g., acme.app.com)
  const host = c.req.header('host')
  if (host) {
    const subdomain = host.split('.')[0]
    // Only use subdomain if it's not localhost or an IP
    if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost' && !subdomain.match(/^\d+$/)) {
      return subdomain
    }
  }

  // 3. Check JWT token claims
  const authorization = c.req.header('Authorization')
  if (authorization?.startsWith('Bearer ')) {
    // In production, decode JWT and extract tenant claim
    // For demo, return demo tenant
    return 'demo'
  }

  // 4. Check API key
  const apiKey = c.req.header('X-API-Key')
  if (apiKey) {
    // Look up tenant by API key
    return 'demo'
  }

  // 5. Check session/cookie (for web app)
  const cookie = c.req.header('Cookie')
  if (cookie?.includes('tenant=')) {
    const tenantMatch = cookie.match(/tenant=([^;]+)/)
    if (tenantMatch) {
      return tenantMatch[1]
    }
  }

  return null
}

// Tenant middleware
export async function tenantMiddleware(c: Context, next: Next) {
  const tenantId = identifyTenant(c)
  
  if (!tenantId) {
    console.error('No tenant ID identified from request')
    console.log('Headers:', c.req.header())
    throw new HTTPException(400, {
      message: 'Tenant identification required. Please provide X-Tenant-ID or X-Tenant-Slug header',
    })
  }

  const tenant = tenants.get(tenantId)
  
  if (!tenant) {
    console.error(`Tenant not found: ${tenantId}`)
    console.log('Available tenants:', Array.from(tenants.keys()))
    throw new HTTPException(404, {
      message: `Tenant '${tenantId}' not found`,
    })
  }

  // Check tenant status
  if (tenant.status === 'suspended') {
    throw new HTTPException(403, {
      message: 'Tenant account is suspended',
    })
  }

  if (tenant.status === 'deleted') {
    throw new HTTPException(404, {
      message: 'Tenant not found',
    })
  }

  // Check subscription status
  if (tenant.subscription.status === 'canceled' || tenant.subscription.status === 'suspended') {
    throw new HTTPException(403, {
      message: 'Subscription is not active. Please update your billing information.',
    })
  }

  // Mock user for demo - in production, get from JWT/session
  const user: TenantUser = {
    id: 'demo-user-id',
    email: 'user@demo.com',
    name: 'Demo User',
    tenantId: tenant.id,
    tenantRole: 'admin',
    permissions: ['retail_media', 'google_ads', 'meta_ads', 'analytics'],
    emailVerified: true,
    twoFactorEnabled: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Attach tenant context to request
  c.set('tenant', tenant)
  c.set('user', user)
  c.set('tenantContext', {
    tenant,
    user,
    permissions: user.permissions,
  } as TenantContext)

  await next()
}

// Rate limiting per tenant
export async function tenantRateLimitMiddleware(c: Context, next: Next) {
  const tenant = c.get('tenant') as Tenant
  
  if (!tenant) {
    await next()
    return
  }

  // Check API call limits
  const limits = tenant.subscription.limits
  const usage = tenant.subscription.usage

  if (limits.apiCalls !== -1 && usage.apiCalls >= limits.apiCalls) {
    throw new HTTPException(429, {
      message: 'API call limit exceeded for this billing period',
    })
  }

  // In production, increment usage counter
  // await incrementUsage(tenant.id, 'apiCalls')

  await next()
}

// Check tenant permissions for specific features
export function requireTenantFeature(feature: keyof Tenant['settings']['features']) {
  return async (c: Context, next: Next) => {
    const tenant = c.get('tenant') as Tenant
    
    if (!tenant) {
      throw new HTTPException(403, {
        message: 'Tenant context required',
      })
    }

    if (!tenant.settings.features[feature]) {
      throw new HTTPException(403, {
        message: `This feature (${feature}) is not available in your subscription plan`,
      })
    }

    await next()
  }
}

// Check user role within tenant
export function requireTenantRole(...roles: TenantUser['tenantRole'][]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as TenantUser
    
    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    if (!roles.includes(user.tenantRole)) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions',
      })
    }

    await next()
  }
}

// Check workflow access based on subscription
export function requireWorkflow(workflowId: string) {
  return async (c: Context, next: Next) => {
    const tenant = c.get('tenant') as Tenant
    
    if (!tenant) {
      throw new HTTPException(403, {
        message: 'Tenant context required',
      })
    }

    const allowedWorkflows = tenant.subscription.limits.workflows
    
    if (!allowedWorkflows.includes('*') && !allowedWorkflows.includes(workflowId)) {
      throw new HTTPException(403, {
        message: `Workflow '${workflowId}' is not available in your subscription plan`,
      })
    }

    await next()
  }
}

// Data isolation helper
export function addTenantFilter<T extends { tenantId?: string }>(
  query: T,
  c: Context
): T & { tenantId: string } {
  const tenant = c.get('tenant') as Tenant
  
  if (!tenant) {
    throw new HTTPException(403, {
      message: 'Tenant context required',
    })
  }

  return {
    ...query,
    tenantId: tenant.id,
  }
}