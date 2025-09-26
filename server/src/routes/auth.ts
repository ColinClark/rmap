/**
 * Authentication routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authService } from '../services/AuthService'
import { Logger } from '../utils/logger'

const logger = new Logger('AuthRoutes')

export const authRoutes = new Hono()

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantId: z.string().optional()
})

// Register schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  tenantName: z.string().min(2).optional()
})

// Refresh token schema
const refreshSchema = z.object({
  refreshToken: z.string()
})

/**
 * POST /auth/login
 * Login user
 */
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password, tenantId } = c.req.valid('json')

  // Get IP and user agent for session tracking
  const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const userAgent = c.req.header('user-agent')

  const result = await authService.login(
    email,
    password,
    tenantId,
    ipAddress,
    userAgent
  )

  if (!result.success) {
    return c.json({ error: result.error }, 401)
  }

  // Set session cookie for web app
  c.header('Set-Cookie', `session=${result.session?.sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`)

  return c.json({
    success: true,
    user: {
      id: result.user?._id,
      email: result.user?.email,
      name: result.user?.name,
      emailVerified: result.user?.emailVerified
    },
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    session: {
      sessionToken: result.session?.sessionToken,
      expiresAt: result.session?.expiresAt
    }
  })
})

/**
 * POST /auth/register
 * Register new user
 */
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name, tenantName } = c.req.valid('json')

  const result = await authService.register(
    email,
    password,
    name,
    tenantName
  )

  if (!result.success) {
    return c.json({ error: result.error }, 400)
  }

  // Set session cookie for web app
  c.header('Set-Cookie', `session=${result.session?.sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`)

  return c.json({
    success: true,
    user: {
      id: result.user?._id,
      email: result.user?.email,
      name: result.user?.name,
      emailVerified: result.user?.emailVerified
    },
    tokens: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    },
    session: {
      sessionToken: result.session?.sessionToken,
      expiresAt: result.session?.expiresAt
    }
  })
})

/**
 * POST /auth/refresh
 * Refresh access token
 */
authRoutes.post('/refresh', zValidator('json', refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid('json')

  const result = await authService.refreshAccessToken(refreshToken)

  if (!result.success) {
    return c.json({ error: result.error }, 401)
  }

  return c.json({
    success: true,
    accessToken: result.accessToken
  })
})

/**
 * POST /auth/logout
 * Logout user
 */
authRoutes.post('/logout', async (c) => {
  // Get session token from cookie or header
  const cookie = c.req.header('Cookie')
  let sessionToken: string | undefined

  if (cookie) {
    const sessionMatch = cookie.match(/session=([^;]+)/)
    if (sessionMatch) {
      sessionToken = sessionMatch[1]
    }
  }

  if (!sessionToken) {
    // Try to get from authorization header
    const auth = c.req.header('Authorization')
    if (auth?.startsWith('Bearer ')) {
      sessionToken = auth.substring(7)
    }
  }

  if (!sessionToken) {
    return c.json({ error: 'No session found' }, 400)
  }

  const success = await authService.logout(sessionToken)

  if (!success) {
    return c.json({ error: 'Failed to logout' }, 500)
  }

  // Clear session cookie
  c.header('Set-Cookie', 'session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0')

  return c.json({
    success: true,
    message: 'Logged out successfully'
  })
})

/**
 * GET /auth/me
 * Get current user info (requires authentication)
 */
authRoutes.get('/me', async (c) => {
  // This endpoint requires the tenant middleware to have run
  // It will be used when we apply auth middleware
  const user = c.get('user')
  const tenant = c.get('tenant')

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.tenantRole,
      permissions: user.permissions
    },
    tenant: tenant ? {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    } : null
  })
})