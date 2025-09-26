/**
 * Admin Authentication and Authorization Middleware
 */

import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { platformAdminService } from '../services/PlatformAdminService'
import type { PlatformAdmin, AdminPermission } from '../types/admin'
import { Logger } from '../utils/logger'

const logger = new Logger('AdminMiddleware')

/**
 * Require admin authentication
 */
export async function requireAdminAuth(c: Context, next: Next) {
  try {
    const authorization = c.req.header('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      throw new HTTPException(401, {
        message: 'Admin authentication required'
      })
    }

    const token = authorization.substring(7)
    const decoded = platformAdminService.verifyAdminToken(token)

    if (!decoded || decoded.type !== 'admin') {
      throw new HTTPException(401, {
        message: 'Invalid admin token'
      })
    }

    // Get fresh admin data
    const admins = await platformAdminService.getAllAdmins()
    const admin = admins.find(a => a.id === decoded.adminId)

    if (!admin) {
      throw new HTTPException(401, {
        message: 'Admin not found'
      })
    }

    if (admin.status !== 'active') {
      throw new HTTPException(403, {
        message: 'Admin account is not active'
      })
    }

    // Set admin in context
    c.set('admin', admin)
    c.set('adminId', admin.id)

    await next()
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error
    }

    logger.error('Admin auth error:', error)
    throw new HTTPException(401, {
      message: 'Authentication failed'
    })
  }
}

/**
 * Require specific admin permission
 */
export function requireAdminPermission(...permissions: AdminPermission[]) {
  return async (c: Context, next: Next) => {
    const admin = c.get('admin') as PlatformAdmin

    if (!admin) {
      throw new HTTPException(401, {
        message: 'Admin authentication required'
      })
    }

    // Super admin has all permissions
    if (admin.role === 'super_admin') {
      await next()
      return
    }

    // Check if admin has at least one required permission
    const hasPermission = permissions.some(p => admin.permissions.includes(p))

    if (!hasPermission) {
      logger.warn(`Admin ${admin.email} lacks permissions: ${permissions.join(', ')}`)
      throw new HTTPException(403, {
        message: 'Insufficient admin permissions'
      })
    }

    await next()
  }
}

/**
 * Log admin actions
 */
export async function logAdminAction(
  action: string,
  resource: string,
  resourceId?: string
) {
  return async (c: Context, next: Next) => {
    const admin = c.get('admin') as PlatformAdmin
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
    const userAgent = c.req.header('user-agent')

    await next()

    // Log after successful action
    if (admin) {
      await platformAdminService.logAdminActivity(
        admin.id,
        admin.email,
        action,
        resource,
        resourceId,
        c.req.body,
        ipAddress,
        userAgent
      )
    }
  }
}