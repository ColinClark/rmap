import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Tenant, TenantUser } from '../types/tenant'
import { mongoService } from '../services/mongodb'
import { Logger } from '../utils/logger'

const logger = new Logger('TenantMiddleware')

// Extended context with tenant information
export interface TenantContext {
  tenant: Tenant
  user: TenantUser
  permissions: string[]
}

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
    // Remove port if present
    const hostname = host.split(':')[0]
    const subdomain = hostname.split('.')[0]
    // Only use subdomain if it's not localhost or an IP and has multiple parts
    if (subdomain && hostname.includes('.') && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost' && !subdomain.match(/^\d+$/)) {
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

  // 6. Default to demo tenant for localhost development
  const hostHeader = c.req.header('host')
  if (hostHeader && (hostHeader.startsWith('localhost') || hostHeader.startsWith('127.0.0.1'))) {
    return 'demo'
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