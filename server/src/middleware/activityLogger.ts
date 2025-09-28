/**
 * Activity Logger Middleware
 * Automatically logs important tenant activities
 */

import { Context, Next } from 'hono'
import { activityService } from '../services/ActivityService'
import type { Tenant, TenantUser } from '../types/tenant'

interface ActivityConfig {
  action: string
  resource: string
  extractResourceId?: (c: Context) => string
  extractMetadata?: (c: Context) => Record<string, any>
}

// Define activity logging rules for different routes
const activityRules: Record<string, ActivityConfig> = {
  // Tenant management
  'PATCH /api/tenant/settings': {
    action: 'tenant.updated',
    resource: 'Tenant',
    extractMetadata: async (c) => ({ updates: await c.req.json().catch(() => ({})) })
  },

  // User management
  'POST /api/tenant/users/invite': {
    action: 'user.invited',
    resource: 'User',
    extractMetadata: async (c) => {
      const body = await c.req.json().catch(() => ({}))
      return { email: body?.email, role: body?.role }
    }
  },
  'PUT /api/tenant/users/:userId': {
    action: 'user.role_updated',
    resource: 'User',
    extractResourceId: (c) => c.req.param('userId'),
    extractMetadata: async (c) => {
      const body = await c.req.json().catch(() => ({}))
      return { role: body?.role }
    }
  },
  'DELETE /api/tenant/users/:userId': {
    action: 'user.removed',
    resource: 'User',
    extractResourceId: (c) => c.req.param('userId')
  },

  // Subscription management
  'POST /api/tenant/billing/subscription': {
    action: 'subscription.updated',
    resource: 'Subscription',
    extractMetadata: async (c) => {
      const body = await c.req.json().catch(() => ({}))
      return { plan: body?.plan, billingCycle: body?.billingCycle }
    }
  },

  // Security settings
  'PATCH /api/tenant/security': {
    action: 'security.updated',
    resource: 'Security',
    extractMetadata: async (c) => ({ updates: await c.req.json().catch(() => ({})) })
  },

  // Campaign management (if needed)
  'POST /api/campaign': {
    action: 'campaign.created',
    resource: 'Campaign',
    extractMetadata: async (c) => {
      const body = await c.req.json().catch(() => ({}))
      return { name: body?.name }
    }
  },
  'PUT /api/campaign/:id': {
    action: 'campaign.updated',
    resource: 'Campaign',
    extractResourceId: (c) => c.req.param('id')
  },
  'DELETE /api/campaign/:id': {
    action: 'campaign.deleted',
    resource: 'Campaign',
    extractResourceId: (c) => c.req.param('id')
  }
}

/**
 * Activity logger middleware
 */
export const activityLogger = async (c: Context, next: Next) => {
  // Get request details
  const method = c.req.method
  const path = c.req.path
  const routeKey = `${method} ${path.replace(/\/[^/]+$/, '/:id')}` // Normalize param routes

  // Check if this route should be logged
  const config = activityRules[routeKey] || activityRules[`${method} ${path}`]

  // Continue to next middleware
  await next()

  // Log activity after successful request
  if (config && c.res.status >= 200 && c.res.status < 300) {
    try {
      const tenant = c.get('tenant') as Tenant | undefined
      const user = c.get('user') as TenantUser | undefined
      const userId = c.get('userId') as string | undefined

      if (tenant && userId) {
        await activityService.logActivity(
          tenant.id,
          userId,
          config.action,
          config.resource,
          {
            resourceId: config.extractResourceId?.(c),
            metadata: config.extractMetadata?.(c),
            userName: user?.name,
            userEmail: user?.email,
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
            userAgent: c.req.header('user-agent')
          }
        )
      }
    } catch (error) {
      // Don't fail the request if activity logging fails
      console.error('Failed to log activity:', error)
    }
  }
}