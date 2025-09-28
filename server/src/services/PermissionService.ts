/**
 * PermissionService - Manages permission resolution and validation
 */

import { Collection } from 'mongodb'
import { mongoService } from './mongodb'
import { Logger } from '../utils/logger'
import { userService } from './UserService'
import { groupService } from './GroupService'
import type {
  EnhancedTenantUser,
  AppPermission,
  TenantGroup,
  EffectivePermissions,
  StandardPermission,
  SystemPermission,
} from '@rmap/types'

const logger = new Logger('PermissionService')

export class PermissionService {
  /**
   * Check if a user has a specific permission for an app
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    appId: string,
    permission: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserAppPermissions(userId, tenantId, appId)
      return permissions.includes(permission)
    } catch (error) {
      logger.error('Error checking permission:', error)
      return false
    }
  }

  /**
   * Get all permissions for a user for a specific app
   */
  async getUserAppPermissions(
    userId: string,
    tenantId: string,
    appId: string
  ): Promise<string[]> {
    try {
      const effectivePermissions = await userService.calculateEffectivePermissions(
        userId,
        tenantId
      )
      return effectivePermissions[appId] || []
    } catch (error) {
      logger.error('Error getting user app permissions:', error)
      return []
    }
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    tenantId: string,
    appId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserAppPermissions(userId, tenantId, appId)
      return permissions.some(p => userPermissions.includes(p))
    } catch (error) {
      logger.error('Error checking permissions:', error)
      return false
    }
  }

  /**
   * Check if a user has all of the specified permissions
   */
  async hasAllPermissions(
    userId: string,
    tenantId: string,
    appId: string,
    permissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserAppPermissions(userId, tenantId, appId)
      return permissions.every(p => userPermissions.includes(p))
    } catch (error) {
      logger.error('Error checking permissions:', error)
      return false
    }
  }

  /**
   * Get all apps a user has access to
   */
  async getUserAccessibleApps(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    try {
      const effectivePermissions = await userService.calculateEffectivePermissions(
        userId,
        tenantId
      )
      return Object.keys(effectivePermissions)
    } catch (error) {
      logger.error('Error getting user accessible apps:', error)
      return []
    }
  }

  /**
   * Check if tenant admin can manage an app
   */
  async canTenantAdminManageApp(
    tenantId: string,
    appId: string
  ): Promise<boolean> {
    try {
      const entitlement = await mongoService
        .getControlDB()
        .collection('tenant_app_entitlements')
        .findOne({
          tenantId,
          appId,
          status: 'active'
        })

      return entitlement?.adminManageable === true
    } catch (error) {
      logger.error('Error checking tenant admin app management:', error)
      return false
    }
  }

  /**
   * Get all manageable apps for a tenant admin
   */
  async getTenantManageableApps(tenantId: string): Promise<string[]> {
    try {
      const entitlements = await mongoService
        .getControlDB()
        .collection('tenant_app_entitlements')
        .find({
          tenantId,
          status: 'active',
          adminManageable: true
        })
        .toArray()

      return entitlements.map(e => e.appId)
    } catch (error) {
      logger.error('Error getting tenant manageable apps:', error)
      return []
    }
  }

  /**
   * Process expired permissions (called periodically)
   */
  async processExpiredPermissions(): Promise<void> {
    try {
      const now = new Date()

      // Process group permissions
      await groupService.processExpiredPermissions()

      // Remove expired direct permissions from users
      await mongoService
        .getControlDB()
        .collection('tenant_users')
        .updateMany(
          {
            'directAppPermissions.expiresAt': { $lte: now }
          },
          {
            $pull: {
              directAppPermissions: { expiresAt: { $lte: now } }
            }
          }
        )

      // Clear affected users' permission caches
      const affectedUsers = await mongoService
        .getControlDB()
        .collection('tenant_users')
        .find({
          $or: [
            { 'directAppPermissions.expiresAt': { $lte: now } },
            { groups: { $exists: true, $ne: [] } }
          ]
        })
        .toArray()

      for (const user of affectedUsers) {
        await userService.clearEffectivePermissionsCache(user.id, user.tenantId)
      }

      logger.info('Processed expired permissions')
    } catch (error) {
      logger.error('Error processing expired permissions:', error)
    }
  }

  /**
   * Get permission statistics for a tenant
   */
  async getPermissionStats(tenantId: string): Promise<{
    totalGroups: number
    totalUsersWithDirectPermissions: number
    totalAppsAssigned: number
    expiringPermissions: number
  }> {
    try {
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

      // Count groups
      const totalGroups = await mongoService
        .getControlDB()
        .collection('tenant_groups')
        .countDocuments({ tenantId })

      // Count users with direct permissions
      const totalUsersWithDirectPermissions = await mongoService
        .getControlDB()
        .collection('tenant_users')
        .countDocuments({
          tenantId,
          directAppPermissions: { $exists: true, $ne: [] }
        })

      // Count unique apps assigned
      const groups = await groupService.getGroupsByTenant(tenantId, false, true)
      const users = await mongoService
        .getControlDB()
        .collection('tenant_users')
        .find({ tenantId })
        .toArray()

      const uniqueApps = new Set<string>()

      // Add apps from groups
      for (const group of groups) {
        for (const appPerm of group.appPermissions) {
          uniqueApps.add(appPerm.appId)
        }
      }

      // Add apps from direct permissions
      for (const user of users) {
        if (user.directAppPermissions) {
          for (const appPerm of user.directAppPermissions) {
            uniqueApps.add(appPerm.appId)
          }
        }
      }

      // Count expiring permissions
      let expiringPermissions = 0

      // Check group permissions
      for (const group of groups) {
        for (const appPerm of group.appPermissions) {
          if (appPerm.expiresAt && new Date(appPerm.expiresAt) <= oneMonthFromNow) {
            expiringPermissions++
          }
        }
      }

      // Check direct permissions
      for (const user of users) {
        if (user.directAppPermissions) {
          for (const appPerm of user.directAppPermissions) {
            if (appPerm.expiresAt && new Date(appPerm.expiresAt) <= oneMonthFromNow) {
              expiringPermissions++
            }
          }
        }
      }

      return {
        totalGroups,
        totalUsersWithDirectPermissions,
        totalAppsAssigned: uniqueApps.size,
        expiringPermissions
      }
    } catch (error) {
      logger.error('Error getting permission stats:', error)
      return {
        totalGroups: 0,
        totalUsersWithDirectPermissions: 0,
        totalAppsAssigned: 0,
        expiringPermissions: 0
      }
    }
  }

  /**
   * Validate permission string
   */
  isValidPermission(permission: string): boolean {
    const standardPermissions: StandardPermission[] = [
      'view',
      'create',
      'edit',
      'delete',
      'export',
      'share',
      'admin'
    ]

    const systemPermissions: SystemPermission[] = [
      'invite_users',
      'manage_groups',
      'assign_apps',
      'view_analytics',
      'manage_billing'
    ]

    return (
      standardPermissions.includes(permission as StandardPermission) ||
      systemPermissions.includes(permission as SystemPermission) ||
      permission.startsWith('custom:') // Allow custom permissions
    )
  }

  /**
   * Validate permission set
   */
  validatePermissions(permissions: string[]): {
    valid: string[]
    invalid: string[]
  } {
    const valid: string[] = []
    const invalid: string[] = []

    for (const permission of permissions) {
      if (this.isValidPermission(permission)) {
        valid.push(permission)
      } else {
        invalid.push(permission)
      }
    }

    return { valid, invalid }
  }
}

// Export singleton instance
export const permissionService = new PermissionService()