/**
 * UserService - Handles all user-related operations
 */

import { Collection, ObjectId } from 'mongodb'
import { mongoService } from './mongodb'
import { Logger } from '../utils/logger'
import { TenantUser, type Tenant } from '../types/tenant'
import type { EnhancedTenantUser, AppPermission, TenantGroup } from '@rmap/types'
import { groupService } from './GroupService'
import * as crypto from 'crypto'

const logger = new Logger('UserService')

export interface User {
  _id?: string
  email: string
  name: string
  passwordHash?: string
  emailVerified: boolean
  emailVerificationToken?: string
  passwordResetToken?: string
  passwordResetExpires?: Date
  twoFactorSecret?: string
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface Session {
  _id?: string
  sessionToken: string
  refreshToken: string
  userId: string
  tenantId: string
  ipAddress?: string
  userAgent?: string
  lastActivity: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export class UserService {
  private get usersCollection(): Collection<User> {
    return mongoService.getControlDB().collection<User>('users')
  }

  private get tenantUsersCollection(): Collection<TenantUser> {
    return mongoService.getControlDB().collection<TenantUser>('tenant_users')
  }

  private get sessionsCollection(): Collection<Session> {
    return mongoService.getControlDB().collection<Session>('sessions')
  }

  /**
   * Get user by ID or email
   */
  async getUser(identifier: string): Promise<User | null> {
    try {
      // Check if identifier looks like an ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier)

      const user = await this.usersCollection.findOne({
        $or: [
          isObjectId ? { _id: new ObjectId(identifier) } : { _id: identifier },
          { email: identifier.toLowerCase() }
        ]
      })
      return user
    } catch (error) {
      logger.error('Error fetching user', error)
      return null
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string
    name: string
    passwordHash?: string
    emailVerified?: boolean
  }): Promise<User> {
    const user: User = {
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      emailVerified: data.emailVerified || false,
      emailVerificationToken: !data.emailVerified ? this.generateToken() : undefined,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await this.usersCollection.insertOne(user as any)
    user._id = result.insertedId

    logger.info(`Created new user: ${user.email}`)
    return user
  }

  /**
   * Add user to tenant (enhanced with group support)
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: TenantUser['tenantRole'] = 'member',
    permissions: string[] = [],
    data?: {
      phoneNumber?: string
      companyRole?: string
      groups?: string[]
    }
  ): Promise<EnhancedTenantUser> {
    logger.info(`Adding user ${userId} to tenant ${tenantId}`)
    const user = await this.getUser(userId)
    if (!user) {
      logger.error(`User not found for ID: ${userId}`)
      throw new Error('User not found')
    }

    // Extract email domain for validation
    const emailDomain = user.email.split('@')[1]?.toLowerCase()

    const tenantUser: any = {
      id: `tu_${Date.now()}`,
      userId,  // Add the userId field for the index
      tenantId,  // Add the tenantId field for the index
      email: user.email,
      emailDomain,
      name: user.name,
      phoneNumber: data?.phoneNumber,
      companyRole: data?.companyRole,
      tenantRole: role === 'owner' || role === 'admin'
        ? role
        : 'employee', // Map old roles to new schema
      groups: data?.groups || [],
      directAppPermissions: [],
      effectivePermissions: {
        lastCalculated: new Date().toISOString(),
        apps: {}
      }
    }

    await this.tenantUsersCollection.insertOne(tenantUser)
    logger.info(`Added user ${user.email} to tenant ${tenantId} with role ${role}`)

    // Add user to specified groups
    if (data?.groups && data.groups.length > 0) {
      for (const groupId of data.groups) {
        await groupService.addMembers(groupId, [tenantUser.id], tenantUser.id)
      }
    }

    return tenantUser
  }

  /**
   * Get user's tenant relationships
   */
  async getUserTenants(userId: string): Promise<TenantUser[]> {
    try {
      logger.info(`Fetching tenants for user: ${userId}`)
      const tenants = await this.tenantUsersCollection.find({
        userId
      }).toArray()
      logger.info(`Found ${tenants.length} tenants for user ${userId}`)
      return tenants
    } catch (error) {
      logger.error('Error fetching user tenants', error)
      return []
    }
  }

  /**
   * Get users in a tenant
   */
  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    try {
      const users = await this.tenantUsersCollection.find({
        tenantId
      }).toArray()
      return users
    } catch (error) {
      logger.error('Error fetching tenant users', error)
      return []
    }
  }

  /**
   * Update user role in tenant
   */
  async updateUserRole(
    userId: string,
    tenantId: string,
    newRole: TenantUser['tenantRole'],
    permissions?: string[]
  ): Promise<boolean> {
    try {
      const update: any = {
        tenantRole: newRole,
        updatedAt: new Date().toISOString()
      }

      if (permissions) {
        update.permissions = permissions
      }

      const result = await this.tenantUsersCollection.updateOne(
        { userId, tenantId },
        { $set: update }
      )

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error updating user role', error)
      return false
    }
  }

  /**
   * Remove user from tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<boolean> {
    try {
      const result = await this.tenantUsersCollection.deleteOne({
        userId,
        tenantId
      })
      return result.deletedCount > 0
    } catch (error) {
      logger.error('Error removing user from tenant', error)
      return false
    }
  }

  /**
   * Create a session
   */
  async createSession(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const session: Session = {
      sessionToken: this.generateToken(),
      refreshToken: this.generateToken(),
      userId,
      tenantId,
      ipAddress,
      userAgent,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await this.sessionsCollection.insertOne(session as any)
    session._id = result.insertedId.toString()

    logger.info(`Created session for user ${userId} in tenant ${tenantId}`)
    return session
  }

  /**
   * Get session by token
   */
  async getSession(sessionToken: string): Promise<Session | null> {
    try {
      const session = await this.sessionsCollection.findOne({
        sessionToken,
        expiresAt: { $gt: new Date() }
      })
      return session
    } catch (error) {
      logger.error('Error fetching session', error)
      return null
    }
  }

  /**
   * Get session by refresh token
   */
  async getSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    try {
      const session = await this.sessionsCollection.findOne({
        refreshToken,
        expiresAt: { $gt: new Date() }
      })
      return session
    } catch (error) {
      logger.error('Error fetching session by refresh token', error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    await this.sessionsCollection.updateOne(
      { sessionToken },
      {
        $set: {
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      }
    )
  }

  /**
   * Delete session (logout)
   */
  async deleteSession(sessionToken: string): Promise<boolean> {
    try {
      const result = await this.sessionsCollection.deleteOne({
        sessionToken
      })
      return result.deletedCount > 0
    } catch (error) {
      logger.error('Error deleting session', error)
      return false
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const result = await this.sessionsCollection.deleteMany({
        userId
      })
      return result.deletedCount
    } catch (error) {
      logger.error('Error deleting user sessions', error)
      return 0
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
    try {
      const result = await this.usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            ...updates,
            updatedAt: new Date().toISOString()
          }
        }
      )
      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error updating user', error)
      return false
    }
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(email: string): Promise<string | null> {
    const token = this.generateToken()
    const expires = new Date(Date.now() + 3600000) // 1 hour

    const result = await this.usersCollection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          passwordResetToken: token,
          passwordResetExpires: expires
        }
      }
    )

    return result.modifiedCount > 0 ? token : null
  }

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<any | null> {
    try {
      // Find user with valid token
      const user = await this.usersCollection.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      })

      if (!user) {
        return null
      }

      // Hash new password
      const bcrypt = await import('bcrypt')
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // Update password and clear reset token
      await this.usersCollection.updateOne(
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
      return user
    } catch (error) {
      logger.error('Error resetting password with token:', error)
      return null
    }
  }

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(email: string): Promise<string | null> {
    const token = this.generateToken()
    const expires = new Date(Date.now() + 86400000) // 24 hours

    const result = await this.usersCollection.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          emailVerificationToken: token,
          emailVerificationExpires: expires
        }
      }
    )

    return result.modifiedCount > 0 ? token : null
  }

  /**
   * Update user's role and permissions in tenant
   */
  async updateUserInTenant(
    userId: string,
    tenantId: string,
    role: string,
    permissions?: string[]
  ): Promise<boolean> {
    try {
      const result = await this.tenantUsersCollection.updateOne(
        { userId, tenantId },
        {
          $set: {
            tenantRole: role,
            permissions: permissions || [],
            updatedAt: new Date().toISOString()
          }
        }
      )

      logger.info(`Updated user ${userId} in tenant ${tenantId}: role=${role}`)
      return result.modifiedCount > 0
    } catch (error) {
      logger.error(`Error updating user in tenant`, error)
      return false
    }
  }


  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<boolean> {
    const result = await this.usersCollection.updateOne(
      {
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() }
      },
      {
        $set: {
          emailVerified: true,
          updatedAt: new Date().toISOString()
        },
        $unset: {
          emailVerificationToken: '',
          emailVerificationExpires: ''
        }
      }
    )

    return result.modifiedCount > 0
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Validate email domain for tenant
   */
  async validateEmailDomain(
    email: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      const emailDomain = email.split('@')[1]?.toLowerCase()
      if (!emailDomain) return false

      const tenant = await mongoService
        .getControlDB()
        .collection('tenants')
        .findOne({ id: tenantId })

      if (!tenant) return false

      // Check if tenant has domain restrictions
      const allowedDomains = tenant.allowedEmailDomains || []
      if (allowedDomains.length === 0) return true // No restrictions

      return allowedDomains.includes(emailDomain)
    } catch (error) {
      logger.error('Error validating email domain:', error)
      return false
    }
  }

  /**
   * Assign direct app permissions to user
   */
  async assignDirectAppPermission(
    userId: string,
    tenantId: string,
    appId: string,
    permissions: string[],
    assignedBy: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const appPermission: AppPermission = {
        appId,
        permissions,
        grantedAt: new Date(),
        grantedBy: assignedBy,
        expiresAt
      }

      // Remove existing permission for this app if it exists
      await this.tenantUsersCollection.updateOne(
        { id: userId, tenantId },
        { $pull: { directAppPermissions: { appId } } }
      )

      // Add new permission
      const result = await this.tenantUsersCollection.updateOne(
        { id: userId, tenantId },
        {
          $push: { directAppPermissions: appPermission },
          $set: { updatedAt: new Date().toISOString() }
        }
      )

      // Clear effective permissions cache to force recalculation
      if (result.modifiedCount > 0) {
        await this.clearEffectivePermissionsCache(userId, tenantId)
      }

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error assigning direct app permission:', error)
      return false
    }
  }

  /**
   * Calculate effective permissions for user (direct + group permissions)
   */
  async calculateEffectivePermissions(
    userId: string,
    tenantId: string
  ): Promise<Record<string, string[]>> {
    try {
      const user = await this.tenantUsersCollection.findOne({
        id: userId,
        tenantId
      }) as EnhancedTenantUser

      if (!user) return {}

      const effectivePermissions: Record<string, Set<string>> = {}

      // Add direct permissions
      if (user.directAppPermissions) {
        for (const appPerm of user.directAppPermissions) {
          if (!appPerm.expiresAt || new Date(appPerm.expiresAt) > new Date()) {
            if (!effectivePermissions[appPerm.appId]) {
              effectivePermissions[appPerm.appId] = new Set()
            }
            appPerm.permissions.forEach(p =>
              effectivePermissions[appPerm.appId].add(p)
            )
          }
        }
      }

      // Add group permissions
      if (user.groups && user.groups.length > 0) {
        const groups = await groupService.getGroupsByTenant(
          tenantId,
          false,
          true
        )

        for (const group of groups) {
          if (user.groups.includes(group.id)) {
            for (const appPerm of group.appPermissions) {
              if (!appPerm.expiresAt || new Date(appPerm.expiresAt) > new Date()) {
                if (!effectivePermissions[appPerm.appId]) {
                  effectivePermissions[appPerm.appId] = new Set()
                }
                appPerm.permissions.forEach(p =>
                  effectivePermissions[appPerm.appId].add(p)
                )
              }
            }
          }
        }
      }

      // Convert Sets to arrays
      const result: Record<string, string[]> = {}
      for (const [appId, perms] of Object.entries(effectivePermissions)) {
        result[appId] = Array.from(perms)
      }

      // Cache the calculated permissions
      await this.tenantUsersCollection.updateOne(
        { id: userId, tenantId },
        {
          $set: {
            effectivePermissions: {
              lastCalculated: new Date(),
              apps: result
            }
          }
        }
      )

      return result
    } catch (error) {
      logger.error('Error calculating effective permissions:', error)
      return {}
    }
  }

  /**
   * Clear effective permissions cache (when groups or direct permissions change)
   */
  async clearEffectivePermissionsCache(
    userId: string,
    tenantId: string
  ): Promise<void> {
    await this.tenantUsersCollection.updateOne(
      { id: userId, tenantId },
      {
        $unset: { effectivePermissions: '' }
      }
    )
  }

  /**
   * Bulk invite employees with email domain validation
   */
  async bulkInviteEmployees(
    tenantId: string,
    invitedBy: string,
    employees: Array<{
      email: string
      name: string
      groups?: string[]
      companyRole?: string
    }>
  ): Promise<{ success: string[]; failed: Array<{ email: string; reason: string }> }> {
    const success: string[] = []
    const failed: Array<{ email: string; reason: string }> = []

    for (const employee of employees) {
      try {
        // Validate email domain
        const isValidDomain = await this.validateEmailDomain(employee.email, tenantId)
        if (!isValidDomain) {
          failed.push({
            email: employee.email,
            reason: 'Email domain not allowed for this tenant'
          })
          continue
        }

        // Check if user already exists
        let user = await this.getUser(employee.email)
        if (!user) {
          // Create new user with temporary password
          const tempPassword = crypto.randomBytes(12).toString('hex')
          const bcrypt = await import('bcrypt')
          const passwordHash = await bcrypt.hash(tempPassword, 10)

          user = await this.createUser({
            email: employee.email,
            name: employee.name,
            passwordHash,
            emailVerified: false
          })
        }

        // Add to tenant as employee
        await this.addUserToTenant(
          user._id!,
          tenantId,
          'member', // Will be mapped to 'employee'
          [],
          {
            companyRole: employee.companyRole,
            groups: employee.groups
          }
        )

        success.push(employee.email)
      } catch (error: any) {
        failed.push({
          email: employee.email,
          reason: error.message || 'Unknown error'
        })
      }
    }

    return { success, failed }
  }
}

// Export singleton instance
export const userService = new UserService()