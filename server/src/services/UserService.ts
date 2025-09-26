/**
 * UserService - Handles all user-related operations
 */

import { Collection } from 'mongodb'
import { mongoService } from './mongodb'
import { Logger } from '../utils/logger'
import { TenantUser, type Tenant } from '../types/tenant'
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
  private usersCollection: Collection<User>
  private tenantUsersCollection: Collection<TenantUser>
  private sessionsCollection: Collection<Session>

  constructor() {
    const controlDB = mongoService.getControlDB()
    this.usersCollection = controlDB.collection<User>('users')
    this.tenantUsersCollection = controlDB.collection<TenantUser>('tenant_users')
    this.sessionsCollection = controlDB.collection<Session>('sessions')
  }

  /**
   * Get user by ID or email
   */
  async getUser(identifier: string): Promise<User | null> {
    try {
      const user = await this.usersCollection.findOne({
        $or: [
          { _id: identifier },
          { email: identifier }
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
    user._id = result.insertedId.toString()

    logger.info(`Created new user: ${user.email}`)
    return user
  }

  /**
   * Add user to tenant
   */
  async addUserToTenant(
    userId: string,
    tenantId: string,
    role: TenantUser['tenantRole'] = 'member',
    permissions: string[] = []
  ): Promise<TenantUser> {
    const user = await this.getUser(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const tenantUser: TenantUser = {
      id: `tu_${Date.now()}`,
      userId: user._id!,
      email: user.email,
      name: user.name,
      tenantId,
      tenantRole: role,
      permissions,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await this.tenantUsersCollection.insertOne(tenantUser as any)
    logger.info(`Added user ${user.email} to tenant ${tenantId} with role ${role}`)

    return tenantUser
  }

  /**
   * Get user's tenant relationships
   */
  async getUserTenants(userId: string): Promise<TenantUser[]> {
    try {
      const tenants = await this.tenantUsersCollection.find({
        userId
      }).toArray()
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
   * Verify email
   */
  async verifyEmail(token: string): Promise<boolean> {
    const result = await this.usersCollection.updateOne(
      { emailVerificationToken: token },
      {
        $set: {
          emailVerified: true,
          emailVerificationToken: null
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
}

// Export singleton instance
export const userService = new UserService()