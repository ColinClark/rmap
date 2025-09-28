/**
 * User Profile Routes
 * Endpoints for users to manage their own profile and settings
 */

import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { requireAuth } from '../middleware/auth'
import { userService } from '../services/UserService'
import { mongoService } from '../services/mongodb'
import { Logger } from '../utils/logger'
import * as bcrypt from 'bcrypt'

const logger = new Logger('UserRoutes')
const userRoutes = new Hono()

// ============ User Profile Management ============

/**
 * GET /user/profile
 * Get current user's profile
 */
userRoutes.get('/profile', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    const user = await userService.getUserById(userId)

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Get tenant associations
    const tenantAssociations = await userService.getUserTenants(userId)

    // Return user profile (without sensitive data)
    return c.json({
      id: user.id || user._id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      tenants: tenantAssociations.map(ta => ({
        tenantId: ta.tenantId,
        role: ta.tenantRole,
        companyRole: ta.companyRole,
        phoneNumber: ta.phoneNumber
      }))
    })
  } catch (error) {
    logger.error('Error fetching user profile:', error)
    return c.json({ error: 'Failed to fetch profile' }, 500)
  }
})

/**
 * PATCH /user/profile
 * Update current user's profile
 */
userRoutes.patch('/profile',
  requireAuth,
  zValidator('json', z.object({
    name: z.string().min(1).optional(),
    phoneNumber: z.string().optional(),
    companyRole: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      inApp: z.boolean().optional(),
      marketing: z.boolean().optional()
    }).optional()
  })),
  async (c) => {
    try {
      const userId = c.get('userId')
      const tenantId = c.get('tenantId')
      const updates = c.req.valid('json')

      // Update user basic info
      const userUpdates: any = {}
      if (updates.name) userUpdates.name = updates.name
      if (updates.timezone) userUpdates.timezone = updates.timezone
      if (updates.language) userUpdates.language = updates.language
      if (updates.notifications) userUpdates.notifications = updates.notifications

      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = new Date().toISOString()

        await mongoService
          .getControlDB()
          .collection('users')
          .updateOne(
            { id: userId },
            { $set: userUpdates }
          )
      }

      // Update tenant-specific info if provided
      if (tenantId && (updates.phoneNumber !== undefined || updates.companyRole !== undefined)) {
        const tenantUserUpdates: any = {}
        if (updates.phoneNumber !== undefined) tenantUserUpdates.phoneNumber = updates.phoneNumber
        if (updates.companyRole !== undefined) tenantUserUpdates.companyRole = updates.companyRole
        tenantUserUpdates.updatedAt = new Date().toISOString()

        await mongoService
          .getControlDB()
          .collection('tenant_users')
          .updateOne(
            { userId, tenantId },
            { $set: tenantUserUpdates }
          )
      }

      logger.info(`Updated profile for user ${userId}`)
      return c.json({ success: true, message: 'Profile updated successfully' })
    } catch (error) {
      logger.error('Error updating user profile:', error)
      return c.json({ error: 'Failed to update profile' }, 500)
    }
  }
)

/**
 * POST /user/change-password
 * Change current user's password
 */
userRoutes.post('/change-password',
  requireAuth,
  zValidator('json', z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8).regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  })),
  async (c) => {
    try {
      const userId = c.get('userId')
      const { currentPassword, newPassword } = c.req.valid('json')

      // Get user with password hash
      const user = await mongoService
        .getControlDB()
        .collection('users')
        .findOne({ id: userId })

      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValidPassword) {
        return c.json({ error: 'Current password is incorrect' }, 400)
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10)

      // Update password
      await mongoService
        .getControlDB()
        .collection('users')
        .updateOne(
          { id: userId },
          {
            $set: {
              passwordHash: newPasswordHash,
              updatedAt: new Date().toISOString()
            },
            $unset: {
              passwordResetToken: '',
              passwordResetExpires: ''
            }
          }
        )

      logger.info(`Password changed for user ${userId}`)
      return c.json({ success: true, message: 'Password changed successfully' })
    } catch (error) {
      logger.error('Error changing password:', error)
      return c.json({ error: 'Failed to change password' }, 500)
    }
  }
)

/**
 * POST /user/enable-2fa
 * Enable two-factor authentication
 */
userRoutes.post('/enable-2fa',
  requireAuth,
  async (c) => {
    try {
      const userId = c.get('userId')

      // Generate 2FA secret
      const speakeasy = await import('speakeasy')
      const secret = speakeasy.generateSecret({
        name: `RMAP (${c.get('userEmail')})`
      })

      // Save secret to user
      await mongoService
        .getControlDB()
        .collection('users')
        .updateOne(
          { id: userId },
          {
            $set: {
              twoFactorSecret: secret.base32,
              twoFactorEnabled: false, // Not enabled until verified
              updatedAt: new Date().toISOString()
            }
          }
        )

      // Generate QR code
      const qrcode = await import('qrcode')
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!)

      return c.json({
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes: generateBackupCodes()
      })
    } catch (error) {
      logger.error('Error enabling 2FA:', error)
      return c.json({ error: 'Failed to enable 2FA' }, 500)
    }
  }
)

/**
 * POST /user/verify-2fa
 * Verify and activate 2FA
 */
userRoutes.post('/verify-2fa',
  requireAuth,
  zValidator('json', z.object({
    token: z.string().length(6)
  })),
  async (c) => {
    try {
      const userId = c.get('userId')
      const { token } = c.req.valid('json')

      // Get user's secret
      const user = await mongoService
        .getControlDB()
        .collection('users')
        .findOne({ id: userId })

      if (!user || !user.twoFactorSecret) {
        return c.json({ error: '2FA not set up' }, 400)
      }

      // Verify token
      const speakeasy = await import('speakeasy')
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2
      })

      if (!verified) {
        return c.json({ error: 'Invalid verification code' }, 400)
      }

      // Enable 2FA
      await mongoService
        .getControlDB()
        .collection('users')
        .updateOne(
          { id: userId },
          {
            $set: {
              twoFactorEnabled: true,
              updatedAt: new Date().toISOString()
            }
          }
        )

      logger.info(`2FA enabled for user ${userId}`)
      return c.json({ success: true, message: '2FA has been enabled' })
    } catch (error) {
      logger.error('Error verifying 2FA:', error)
      return c.json({ error: 'Failed to verify 2FA' }, 500)
    }
  }
)

/**
 * POST /user/disable-2fa
 * Disable two-factor authentication
 */
userRoutes.post('/disable-2fa',
  requireAuth,
  zValidator('json', z.object({
    password: z.string()
  })),
  async (c) => {
    try {
      const userId = c.get('userId')
      const { password } = c.req.valid('json')

      // Verify password
      const user = await mongoService
        .getControlDB()
        .collection('users')
        .findOne({ id: userId })

      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        return c.json({ error: 'Invalid password' }, 400)
      }

      // Disable 2FA
      await mongoService
        .getControlDB()
        .collection('users')
        .updateOne(
          { id: userId },
          {
            $set: {
              twoFactorEnabled: false,
              updatedAt: new Date().toISOString()
            },
            $unset: {
              twoFactorSecret: ''
            }
          }
        )

      logger.info(`2FA disabled for user ${userId}`)
      return c.json({ success: true, message: '2FA has been disabled' })
    } catch (error) {
      logger.error('Error disabling 2FA:', error)
      return c.json({ error: 'Failed to disable 2FA' }, 500)
    }
  }
)

/**
 * DELETE /user/account
 * Delete user account (soft delete)
 */
userRoutes.delete('/account',
  requireAuth,
  zValidator('json', z.object({
    password: z.string(),
    confirmation: z.string().regex(/DELETE MY ACCOUNT/)
  })),
  async (c) => {
    try {
      const userId = c.get('userId')
      const { password } = c.req.valid('json')

      // Verify password
      const user = await mongoService
        .getControlDB()
        .collection('users')
        .findOne({ id: userId })

      if (!user) {
        return c.json({ error: 'User not found' }, 404)
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        return c.json({ error: 'Invalid password' }, 400)
      }

      // Soft delete - mark as deleted but keep data
      await mongoService
        .getControlDB()
        .collection('users')
        .updateOne(
          { id: userId },
          {
            $set: {
              deleted: true,
              deletedAt: new Date().toISOString(),
              email: `deleted_${Date.now()}_${user.email}`, // Prevent email conflicts
              updatedAt: new Date().toISOString()
            }
          }
        )

      // Remove from all tenants
      await mongoService
        .getControlDB()
        .collection('tenant_users')
        .deleteMany({ userId })

      // Invalidate all sessions
      await mongoService
        .getControlDB()
        .collection('sessions')
        .deleteMany({ userId })

      logger.info(`Account deleted for user ${userId}`)
      return c.json({ success: true, message: 'Account has been deleted' })
    } catch (error) {
      logger.error('Error deleting account:', error)
      return c.json({ error: 'Failed to delete account' }, 500)
    }
  }
)

// Helper function to generate backup codes
function generateBackupCodes(count = 10): string[] {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    codes.push(code)
  }
  return codes
}

export default userRoutes