/**
 * Authentication middleware for protecting routes
 */

import { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import { userService } from '../services/UserService'
import { Logger } from '../utils/logger'

const logger = new Logger('AuthMiddleware')

interface JWTPayload {
  userId: string
  email: string
  tenantId?: string
  role?: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

/**
 * Middleware to verify JWT tokens and attach user info to request
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('No valid authorization header provided')
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'

    try {
      // Verify the token
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload

      // Check token type
      if (decoded.type !== 'access') {
        logger.warn('Invalid token type provided')
        return c.json({ error: 'Invalid token type' }, 401)
      }

      // Get user from database to ensure they still exist
      const user = await userService.getUser(decoded.userId)

      if (!user) {
        logger.warn(`User not found for token: ${decoded.userId}`)
        return c.json({ error: 'User not found' }, 401)
      }

      // Attach user info to context for use in routes
      c.set('userId', decoded.userId)
      c.set('userEmail', decoded.email)
      c.set('user', user)

      // If tenantId is in token, attach it as well
      if (decoded.tenantId) {
        c.set('tenantId', decoded.tenantId)

        // Get user's role in the tenant
        const tenantUsers = await userService.getTenantUsers(decoded.tenantId)
        const userInTenant = tenantUsers.find(tu => tu.userId === decoded.userId)

        if (userInTenant) {
          c.set('tenantRole', userInTenant.tenantRole)
          c.set('tenantPermissions', userInTenant.permissions || [])
        }
      }

      await next()
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token expired')
        return c.json({ error: 'Token expired' }, 401)
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Invalid token')
        return c.json({ error: 'Invalid token' }, 401)
      }
      throw error
    }
  } catch (error) {
    logger.error('Auth middleware error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
}

/**
 * Optional auth middleware - allows requests to proceed even without auth
 * but attaches user info if available
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, proceed without user context
      await next()
      return
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'

    try {
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload

      if (decoded.type === 'access') {
        const user = await userService.getUser(decoded.userId)

        if (user) {
          c.set('userId', decoded.userId)
          c.set('userEmail', decoded.email)
          c.set('user', user)

          if (decoded.tenantId) {
            c.set('tenantId', decoded.tenantId)
          }
        }
      }
    } catch {
      // Token invalid or expired, proceed without user context
      logger.debug('Invalid or expired token in optional auth')
    }

    await next()
  } catch (error) {
    logger.error('Optional auth middleware error:', error)
    await next()
  }
}