/**
 * Authentication routes
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authService } from '../services/AuthService'
import { userService } from '../services/UserService'
import { emailService } from '../services/EmailService'
import { tenantService } from '../services/TenantService'
import { authMiddleware } from '../middleware/auth'
import { Logger } from '../utils/logger'
import * as bcrypt from 'bcrypt'

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

// Forgot password schema
const forgotPasswordSchema = z.object({
  email: z.string().email()
})

// Reset password schema
const resetPasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string().min(8)
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

  // Get user permissions for the tenant
  let tenantInfo = null
  if (result.tenant) {
    const tenantUsers = await userService.getTenantUsers(result.tenant.id)
    const userInTenant = tenantUsers.find(tu => {
      const tuUserId = tu.userId?.toString()
      const resultUserId = result.user?._id?.toString()
      return tuUserId === resultUserId
    })

    tenantInfo = {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      role: userInTenant?.tenantRole || 'member',
      permissions: userInTenant?.permissions || [],
      subscription: result.tenant.subscription
    }
  }

  return c.json({
    success: true,
    user: {
      id: result.user?._id,
      email: result.user?.email,
      name: result.user?.name,
      emailVerified: result.user?.emailVerified
    },
    tenant: tenantInfo,
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

  // Get user permissions for the tenant
  let tenantInfo = null
  if (result.tenant) {
    const tenantUsers = await userService.getTenantUsers(result.tenant.id)
    const userInTenant = tenantUsers.find(tu => {
      const tuUserId = tu.userId?.toString()
      const resultUserId = result.user?._id?.toString()
      return tuUserId === resultUserId
    })

    tenantInfo = {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      role: userInTenant?.tenantRole || 'member',
      permissions: userInTenant?.permissions || [],
      subscription: result.tenant.subscription
    }
  }

  return c.json({
    success: true,
    user: {
      id: result.user?._id,
      email: result.user?.email,
      name: result.user?.name,
      emailVerified: result.user?.emailVerified
    },
    tenant: tenantInfo,
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
 * POST /auth/forgot-password
 * Request password reset
 */
authRoutes.post('/forgot-password', zValidator('json', forgotPasswordSchema), async (c) => {
  const { email } = c.req.valid('json')

  try {
    // Generate password reset token
    const token = await userService.setPasswordResetToken(email)

    if (!token) {
      // Don't reveal if email exists or not
      return c.json({ success: true, message: 'If an account exists, a reset email has been sent' })
    }

    // Get user's tenant for email branding
    const user = await userService.getUser(email)
    const tenantName = 'RMAP Platform' // Default tenant name

    // Send password reset email
    await emailService.sendPasswordResetEmail(email, token, tenantName)

    logger.info(`Password reset email sent to ${email}`)

    return c.json({
      success: true,
      message: 'If an account exists, a reset email has been sent'
    })
  } catch (error) {
    logger.error('Forgot password error:', error)
    // Don't reveal internal errors
    return c.json({
      success: true,
      message: 'If an account exists, a reset email has been sent'
    })
  }
})

/**
 * POST /auth/reset-password
 * Reset password with token
 */
authRoutes.post('/reset-password', zValidator('json', resetPasswordSchema), async (c) => {
  const { token, newPassword } = c.req.valid('json')

  try {
    // Verify token and reset password
    const result = await userService.resetPasswordWithToken(token, newPassword)

    if (!result) {
      return c.json({ error: 'Invalid or expired reset token' }, 400)
    }

    logger.info(`Password reset successful for user ${result.email}`)

    return c.json({
      success: true,
      message: 'Password has been reset successfully'
    })
  } catch (error) {
    logger.error('Reset password error:', error)
    return c.json({ error: 'Failed to reset password' }, 500)
  }
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
authRoutes.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  const userId = c.get('userId')
  const tenantId = c.get('tenantId')

  if (!user) {
    return c.json({ error: 'Not authenticated' }, 401)
  }

  // Get tenant info if tenantId is present
  let tenantInfo = null
  if (tenantId) {
    const tenant = await tenantService.getTenant(tenantId)
    if (tenant) {
      // Get user's role in this tenant
      const tenantUsers = await userService.getTenantUsers(tenantId)
      logger.info(`Found ${tenantUsers.length} users in tenant ${tenantId}`)

      // Handle both ObjectId and string userId formats
      const userInTenant = tenantUsers.find(tu => {
        const tuUserId = tu.userId?.toString()
        const userIdStr = userId?.toString()
        return tuUserId === userIdStr
      })

      logger.info(`User in tenant: ${JSON.stringify(userInTenant)}`)

      tenantInfo = {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        role: userInTenant?.tenantRole || 'member',
        permissions: userInTenant?.permissions || []
      }
    }
  }

  return c.json({
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified
    },
    tenant: tenantInfo
  })
})


/**
 * POST /auth/verify-email
 * Verify email with token
 */
authRoutes.post('/verify-email',
  zValidator('json', z.object({
    token: z.string()
  })),
  async (c) => {
    const { token } = c.req.valid('json')

    try {
      const success = await userService.verifyEmail(token)

      if (!success) {
        return c.json({
          error: 'Invalid or expired verification token'
        }, 400)
      }

      logger.info('Email verification successful')

      return c.json({
        success: true,
        message: 'Email verified successfully. You can now access all features.'
      })
    } catch (error) {
      logger.error('Error in verify-email', error)
      return c.json({
        error: 'Failed to verify email'
      }, 500)
    }
  }
)