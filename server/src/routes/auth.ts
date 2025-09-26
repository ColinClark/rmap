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
    tenant: result.tenant ? {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug,
      subscription: result.tenant.subscription
    } : null,
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
    tenant: result.tenant ? {
      id: result.tenant.id,
      name: result.tenant.name,
      slug: result.tenant.slug
    } : null,
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
      const userInTenant = tenantUsers.find(tu => tu.userId === userId)

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
 * POST /auth/forgot-password
 * Request password reset
 */
authRoutes.post('/forgot-password',
  zValidator('json', z.object({
    email: z.string().email()
  })),
  async (c) => {
    const { email } = c.req.valid('json')

    try {
      // Get user by email
      const user = await userService.getUser(email)

      if (user) {
        // Generate reset token
        const resetToken = await userService.setPasswordResetToken(email)

        if (resetToken) {
          // Get tenant info for email branding
          const userTenants = await userService.getUserTenants(user._id!)
          const tenantId = userTenants[0]?.tenantId
          const tenant = tenantId ? await tenantService.getTenant(tenantId) : null
          const tenantName = tenant?.name || 'RMAP Platform'

          // Send password reset email
          await emailService.sendPasswordResetEmail(email, resetToken, tenantName)

          logger.info(`Password reset email sent to ${email}`)
        }
      }

      // Always return success to prevent email enumeration
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    } catch (error) {
      logger.error('Error in forgot-password', error)
      // Still return success to prevent email enumeration
      return c.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    }
  }
)

/**
 * POST /auth/reset-password
 * Reset password with token
 */
authRoutes.post('/reset-password',
  zValidator('json', z.object({
    token: z.string(),
    newPassword: z.string().min(8)
  })),
  async (c) => {
    const { token, newPassword } = c.req.valid('json')

    try {
      // Find user with valid reset token
      const usersCollection = userService['usersCollection']
      const user = await usersCollection.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      })

      if (!user) {
        return c.json({
          error: 'Invalid or expired reset token'
        }, 400)
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // Update user password and clear reset token
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash,
            updatedAt: new Date().toISOString()
          },
          $unset: {
            passwordResetToken: '',
            passwordResetExpires: ''
          }
        }
      )

      logger.info(`Password reset successful for user ${user.email}`)

      return c.json({
        success: true,
        message: 'Password has been reset successfully. You can now login with your new password.'
      })
    } catch (error) {
      logger.error('Error in reset-password', error)
      return c.json({
        error: 'Failed to reset password'
      }, 500)
    }
  }
)

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