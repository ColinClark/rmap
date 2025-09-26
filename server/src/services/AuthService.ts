/**
 * AuthService - Handles authentication and authorization
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { userService, type User, type Session } from './UserService'
import { tenantService } from './TenantService'
import { emailService } from './EmailService'
import { Logger } from '../utils/logger'
import { appConfig } from '../config'

const logger = new Logger('AuthService')

interface JWTPayload {
  userId: string
  email: string
  tenantId?: string
  role?: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

interface LoginResult {
  success: boolean
  user?: User
  session?: Session
  accessToken?: string
  refreshToken?: string
  error?: string
}

export class AuthService {
  private readonly saltRounds = 10
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production'
  private readonly jwtExpiresIn = '15m' // Access token expires in 15 minutes
  private readonly refreshExpiresIn = '7d' // Refresh token expires in 7 days

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds)
  }

  /**
   * Verify a password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(userId: string, email: string, tenantId?: string, role?: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      tenantId,
      role,
      type: 'access'
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    })
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'refresh'
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshExpiresIn
    })
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload
      return decoded
    } catch (error) {
      logger.error('Token verification failed', error)
      return null
    }
  }

  /**
   * Login user
   */
  async login(
    email: string,
    password: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    try {
      // Get user by email
      const user = await userService.getUser(email.toLowerCase())

      if (!user) {
        logger.warn(`Login attempt for non-existent user: ${email}`)
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Check if user has a password set
      if (!user.passwordHash) {
        return {
          success: false,
          error: 'Password not set. Please use password reset.'
        }
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.passwordHash)

      if (!isPasswordValid) {
        logger.warn(`Failed login attempt for user: ${email}`)
        return {
          success: false,
          error: 'Invalid email or password'
        }
      }

      // Check email verification
      if (!user.emailVerified && appConfig.server.env === 'production') {
        return {
          success: false,
          error: 'Please verify your email before logging in'
        }
      }

      // If no tenantId provided, get user's first tenant
      if (!tenantId) {
        const userTenants = await userService.getUserTenants(user._id!)
        if (userTenants.length > 0) {
          tenantId = userTenants[0].tenantId
        }
      }

      // Verify user belongs to the tenant (if tenantId provided)
      if (tenantId) {
        const tenantUsers = await userService.getTenantUsers(tenantId)
        const userInTenant = tenantUsers.find(tu => tu.userId === user._id)

        if (!userInTenant) {
          return {
            success: false,
            error: 'You do not have access to this organization'
          }
        }
      }

      // Create session
      const session = await userService.createSession(
        user._id!,
        tenantId || 'default',
        ipAddress,
        userAgent
      )

      // Generate tokens
      const accessToken = this.generateAccessToken(
        user._id!,
        user.email,
        tenantId
      )

      const refreshToken = session.refreshToken

      logger.info(`User ${user.email} logged in successfully`)

      return {
        success: true,
        user,
        session,
        accessToken,
        refreshToken
      }
    } catch (error) {
      logger.error('Login error', error)
      return {
        success: false,
        error: 'An error occurred during login'
      }
    }
  }

  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    name: string,
    tenantName?: string
  ): Promise<LoginResult> {
    try {
      // Check if user already exists
      const existingUser = await userService.getUser(email.toLowerCase())

      if (existingUser) {
        return {
          success: false,
          error: 'Email already registered'
        }
      }

      // Hash password
      const passwordHash = await this.hashPassword(password)

      // Create user
      const user = await userService.createUser({
        email,
        name,
        passwordHash,
        emailVerified: appConfig.server.env !== 'production' // Auto-verify in dev
      })

      // If tenant name provided, create new tenant
      let tenantId: string | undefined
      if (tenantName) {
        const slug = this.generateTenantSlug(tenantName)
        const tenant = await tenantService.createTenant({
          name: tenantName,
          slug,
          contactEmail: email,
          contactName: name,
          plan: 'free'
        })
        tenantId = tenant.id

        // Add user as owner of the new tenant
        await userService.addUserToTenant(
          user._id!,
          tenant.id,
          'owner',
          ['*'] // All permissions for owner
        )
      }

      // Send verification email in production
      if (appConfig.server.env === 'production' || process.env.SEND_EMAILS === 'true') {
        const verificationToken = await userService.setEmailVerificationToken(email)
        if (verificationToken) {
          await emailService.sendVerificationEmail(
            email,
            verificationToken,
            tenantName || 'RMAP Platform'
          )
          logger.info(`Verification email sent to ${email}`)
        }
      }

      // Create session
      const session = await userService.createSession(
        user._id!,
        tenantId || 'default'
      )

      // Generate tokens
      const accessToken = this.generateAccessToken(
        user._id!,
        user.email,
        tenantId
      )

      logger.info(`New user registered: ${user.email}`)

      // Get tenant info if available
      const tenant = tenantId ? await tenantService.getTenant(tenantId) : null

      return {
        success: true,
        user,
        tenant,
        session,
        accessToken,
        refreshToken: session.refreshToken
      }
    } catch (error) {
      logger.error('Registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during registration'
      }
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<LoginResult> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken)

      if (!payload || payload.type !== 'refresh') {
        return {
          success: false,
          error: 'Invalid refresh token'
        }
      }

      // Get session
      const session = await userService.getSession(refreshToken)

      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        }
      }

      // Get user
      const user = await userService.getUser(session.userId)

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        }
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(
        user._id!,
        user.email,
        session.tenantId
      )

      // Update session activity
      await userService.updateSessionActivity(refreshToken)

      return {
        success: true,
        user,
        session,
        accessToken,
        refreshToken
      }
    } catch (error) {
      logger.error('Token refresh error', error)
      return {
        success: false,
        error: 'An error occurred during token refresh'
      }
    }
  }

  /**
   * Logout user
   */
  async logout(sessionToken: string): Promise<boolean> {
    try {
      const deleted = await userService.deleteSession(sessionToken)
      if (deleted) {
        logger.info(`User logged out successfully`)
      }
      return deleted
    } catch (error) {
      logger.error('Logout error', error)
      return false
    }
  }

  /**
   * Generate tenant slug from name
   */
  private generateTenantSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }
}

// Export singleton instance
export const authService = new AuthService()