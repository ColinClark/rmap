/**
 * Platform Admin Service - Manages platform administrators
 */

import { Collection } from 'mongodb'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { mongoService } from './mongodb'
import type { PlatformAdmin, AdminActivityLog, PlatformStats } from '../types/admin'
import { appConfig } from '../config'
import { Logger } from '../utils/logger'

const logger = new Logger('PlatformAdminService')

class PlatformAdminService {
  private adminsCollection!: Collection<PlatformAdmin>
  private adminLogsCollection!: Collection<AdminActivityLog>

  constructor() {
    // Collections will be initialized when needed
  }

  private initializeCollections() {
    if (!this.adminsCollection) {
      const db = mongoService.getControlDB()
      this.adminsCollection = db.collection<PlatformAdmin>('platform_admins')
      this.adminLogsCollection = db.collection<AdminActivityLog>('admin_activity_logs')
    }
  }

  /**
   * Initialize default super admin
   */
  async initializeDefaultAdmin(): Promise<void> {
    try {
      this.initializeCollections()
      const existingAdmin = await this.adminsCollection.findOne({ email: 'admin@rmap.com' })
      if (existingAdmin) {
        logger.info('Default admin already exists')
        return
      }

      const passwordHash = await bcrypt.hash('Admin123', 10)
      const defaultAdmin: PlatformAdmin = {
        id: 'admin-001',
        email: 'admin@rmap.com',
        name: 'Platform Admin',
        passwordHash,
        role: 'super_admin',
        permissions: [
          'manage_tenants',
          'view_tenants',
          'manage_billing',
          'manage_apps',
          'view_analytics',
          'manage_admins',
          'view_logs',
          'manage_support'
        ],
        twoFactorEnabled: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.adminsCollection.insertOne(defaultAdmin)
      logger.info('Default super admin created: admin@rmap.com / Admin123!@#')
    } catch (error) {
      logger.error('Error initializing default admin:', error)
    }
  }

  /**
   * Authenticate admin
   */
  async authenticateAdmin(email: string, password: string): Promise<{
    success: boolean
    admin?: PlatformAdmin
    token?: string
    error?: string
  }> {
    try {
      this.initializeCollections()
      logger.debug(`Looking for admin with email: ${email.toLowerCase()}`)
      const admin = await this.adminsCollection.findOne({ email: email.toLowerCase() })

      if (!admin) {
        logger.debug('Admin not found')
        return { success: false, error: 'Invalid credentials' }
      }

      logger.debug(`Found admin: ${admin.email}`)
      logger.debug(`Password hash exists: ${!!admin.passwordHash}`)

      if (admin.status !== 'active') {
        logger.debug(`Account status: ${admin.status}`)
        return { success: false, error: 'Account is not active' }
      }

      if (!admin.passwordHash) {
        logger.debug('Password hash is missing')
        return { success: false, error: 'Password not set' }
      }

      logger.debug('Comparing passwords...')
      const isValid = await bcrypt.compare(password, admin.passwordHash)
      logger.debug(`Password comparison result: ${isValid}`)

      if (!isValid) {
        return { success: false, error: 'Invalid credentials' }
      }

      // Update last login
      await this.adminsCollection.updateOne(
        { id: admin.id },
        { $set: { lastLoginAt: new Date() } }
      )

      // Generate admin token
      const token = jwt.sign(
        {
          adminId: admin.id,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          type: 'admin'
        },
        appConfig.security.jwtSecret,
        { expiresIn: '8h' }
      )

      // Log activity
      await this.logAdminActivity(admin.id, admin.email, 'login', 'admin_auth')

      // Remove password hash from response
      delete admin.passwordHash

      return { success: true, admin, token }
    } catch (error) {
      logger.error('Admin authentication error:', error)
      logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
      return { success: false, error: 'Authentication failed' }
    }
  }

  /**
   * Verify admin token
   */
  verifyAdminToken(token: string): any {
    try {
      return jwt.verify(token, appConfig.security.jwtSecret)
    } catch (error) {
      logger.error('Admin token verification failed:', error)
      return null
    }
  }

  /**
   * Create new admin
   */
  async createAdmin(
    data: Omit<PlatformAdmin, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<PlatformAdmin | null> {
    try {
      this.initializeCollections()
      const existingAdmin = await this.adminsCollection.findOne({ email: data.email.toLowerCase() })
      if (existingAdmin) {
        throw new Error('Admin with this email already exists')
      }

      const adminId = `admin-${Date.now()}`
      const passwordHash = data.passwordHash || await bcrypt.hash(Math.random().toString(36).slice(-8), 10)

      const newAdmin: PlatformAdmin = {
        ...data,
        id: adminId,
        email: data.email.toLowerCase(),
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.adminsCollection.insertOne(newAdmin)

      // Log activity
      await this.logAdminActivity(createdBy, '', 'create_admin', 'admin', adminId, {
        adminEmail: newAdmin.email,
        role: newAdmin.role
      })

      delete newAdmin.passwordHash
      return newAdmin
    } catch (error) {
      logger.error('Error creating admin:', error)
      return null
    }
  }

  /**
   * Get all admins
   */
  async getAllAdmins(): Promise<PlatformAdmin[]> {
    try {
      this.initializeCollections()
      const admins = await this.adminsCollection.find({}).toArray()
      // Remove password hashes
      return admins.map(admin => {
        delete admin.passwordHash
        return admin
      })
    } catch (error) {
      logger.error('Error fetching admins:', error)
      return []
    }
  }

  /**
   * Update admin
   */
  async updateAdmin(
    adminId: string,
    updates: Partial<PlatformAdmin>,
    updatedBy: string
  ): Promise<boolean> {
    try {
      this.initializeCollections()
      delete updates.id
      delete updates.createdAt
      updates.updatedAt = new Date()

      const result = await this.adminsCollection.updateOne(
        { id: adminId },
        { $set: updates }
      )

      if (result.acknowledged) {
        await this.logAdminActivity(updatedBy, '', 'update_admin', 'admin', adminId, updates)
      }

      return result.acknowledged
    } catch (error) {
      logger.error('Error updating admin:', error)
      return false
    }
  }

  /**
   * Log admin activity
   */
  async logAdminActivity(
    adminId: string,
    adminEmail: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      this.initializeCollections()
      const log: AdminActivityLog = {
        adminId,
        adminEmail,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        timestamp: new Date()
      }

      await this.adminLogsCollection.insertOne(log)
    } catch (error) {
      logger.error('Error logging admin activity:', error)
    }
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      this.initializeCollections()
      const db = mongoService.getControlDB()

      // Get tenant stats
      const tenantsCollection = db.collection('tenants')
      const tenants = await tenantsCollection.find({}).toArray()

      const tenantsByPlan: Record<string, number> = {}
      let activeTenantsCount = 0
      let trialTenantsCount = 0
      let suspendedTenantsCount = 0

      tenants.forEach(tenant => {
        const plan = tenant.subscription?.plan || 'free'
        tenantsByPlan[plan] = (tenantsByPlan[plan] || 0) + 1

        if (tenant.subscription?.status === 'active') activeTenantsCount++
        if (tenant.subscription?.status === 'trialing') trialTenantsCount++
        if (tenant.status === 'suspended') suspendedTenantsCount++
      })

      // Get user stats
      const usersCollection = db.collection('users')
      const totalUsers = await usersCollection.countDocuments()

      // Get app usage stats
      const entitlementsCollection = db.collection('tenant_app_entitlements')
      const appUsage = await entitlementsCollection.aggregate([
        { $group: {
          _id: '$appId',
          totalUses: { $sum: '$usage.totalUses' }
        }},
        { $sort: { totalUses: -1 }},
        { $limit: 5 }
      ]).toArray()

      // Calculate revenue (mock data for now)
      const mrr = tenants.reduce((sum, tenant) => {
        const planPrices: Record<string, number> = {
          free: 0,
          starter: 299,
          professional: 999,
          enterprise: 2999,
          custom: 5000
        }
        return sum + (planPrices[tenant.subscription?.plan] || 0)
      }, 0)

      return {
        tenants: {
          total: tenants.length,
          active: activeTenantsCount,
          trial: trialTenantsCount,
          suspended: suspendedTenantsCount,
          byPlan: tenantsByPlan
        },
        users: {
          total: totalUsers,
          activeDaily: Math.floor(totalUsers * 0.4), // Mock
          activeMonthly: Math.floor(totalUsers * 0.8) // Mock
        },
        apps: {
          total: 2, // We have 2 default apps
          active: 2,
          mostUsed: appUsage.map(app => ({
            appId: app._id,
            name: app._id,
            uses: app.totalUses || 0
          }))
        },
        revenue: {
          mrr,
          arr: mrr * 12,
          churnRate: 5.2, // Mock
          growthRate: 12.5 // Mock
        },
        system: {
          uptime: 99.99, // Mock
          apiLatency: 45, // Mock ms
          errorRate: 0.1, // Mock %
          storageUsed: 1024 // Mock GB
        }
      }
    } catch (error) {
      logger.error('Error getting platform stats:', error)
      // Return empty stats on error
      return {
        tenants: { total: 0, active: 0, trial: 0, suspended: 0, byPlan: {} },
        users: { total: 0, activeDaily: 0, activeMonthly: 0 },
        apps: { total: 0, active: 0, mostUsed: [] },
        revenue: { mrr: 0, arr: 0, churnRate: 0, growthRate: 0 },
        system: { uptime: 0, apiLatency: 0, errorRate: 0, storageUsed: 0 }
      }
    }
  }
}

export const platformAdminService = new PlatformAdminService()