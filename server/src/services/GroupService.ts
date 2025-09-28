/**
 * GroupService - Manages tenant groups and group-based permissions
 */

import { Collection, ObjectId } from 'mongodb'
import { mongoService } from './mongodb'
import { Logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import type {
  TenantGroup,
  AppPermission,
  PermissionNotification,
} from '@rmap/types'

const logger = new Logger('GroupService')

export class GroupService {
  private get groupsCollection(): Collection<TenantGroup> {
    return mongoService.getControlDB().collection<TenantGroup>('tenant_groups')
  }

  private get notificationsCollection(): Collection<PermissionNotification> {
    return mongoService
      .getControlDB()
      .collection<PermissionNotification>('permission_notifications')
  }

  /**
   * Create a new group for a tenant
   */
  async createGroup(
    tenantId: string,
    data: {
      name: string
      description?: string
      memberIds?: string[]
    },
    createdBy: string
  ): Promise<TenantGroup | null> {
    try {
      // Check if group name already exists for this tenant
      const existing = await this.groupsCollection.findOne({
        tenantId,
        name: data.name,
      })

      if (existing) {
        logger.warn(`Group name "${data.name}" already exists for tenant ${tenantId}`)
        return null
      }

      const group: TenantGroup = {
        id: `group-${uuidv4()}`,
        tenantId,
        name: data.name,
        description: data.description,
        appPermissions: [],
        members: data.memberIds || [],
        memberCount: (data.memberIds || []).length,
        metadata: {
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastModifiedBy: createdBy,
        },
      }

      await this.groupsCollection.insertOne(group)
      logger.info(`Created group ${group.id} for tenant ${tenantId}`)

      return group
    } catch (error) {
      logger.error('Error creating group:', error)
      return null
    }
  }

  /**
   * Update a group
   */
  async updateGroup(
    groupId: string,
    updates: {
      name?: string
      description?: string
    },
    updatedBy: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        ...updates,
        'metadata.updatedAt': new Date(),
        'metadata.lastModifiedBy': updatedBy,
      }

      const result = await this.groupsCollection.updateOne(
        { id: groupId },
        { $set: updateData }
      )

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error updating group:', error)
      return false
    }
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string): Promise<boolean> {
    try {
      // TODO: Remove group ID from all users' groups array
      const result = await this.groupsCollection.deleteOne({ id: groupId })
      return result.deletedCount > 0
    } catch (error) {
      logger.error('Error deleting group:', error)
      return false
    }
  }

  /**
   * Add members to a group
   */
  async addMembers(
    groupId: string,
    userIds: string[],
    updatedBy: string
  ): Promise<boolean> {
    try {
      const result = await this.groupsCollection.updateOne(
        { id: groupId },
        {
          $addToSet: { members: { $each: userIds } },
          $inc: { memberCount: userIds.length },
          $set: {
            'metadata.updatedAt': new Date(),
            'metadata.lastModifiedBy': updatedBy,
          },
        }
      )

      // TODO: Update users' groups array

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error adding members to group:', error)
      return false
    }
  }

  /**
   * Remove members from a group
   */
  async removeMembers(
    groupId: string,
    userIds: string[],
    updatedBy: string
  ): Promise<boolean> {
    try {
      const result = await this.groupsCollection.updateOne(
        { id: groupId },
        {
          $pull: { members: { $in: userIds } },
          $inc: { memberCount: -userIds.length },
          $set: {
            'metadata.updatedAt': new Date(),
            'metadata.lastModifiedBy': updatedBy,
          },
        }
      )

      // TODO: Update users' groups array

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error removing members from group:', error)
      return false
    }
  }

  /**
   * Get all groups for a tenant
   */
  async getGroupsByTenant(
    tenantId: string,
    includeMembers = false,
    includePermissions = false
  ): Promise<TenantGroup[]> {
    try {
      const projection: any = { _id: 0 }

      if (!includeMembers) {
        projection.members = 0
      }

      if (!includePermissions) {
        projection.appPermissions = 0
      }

      const groups = await this.groupsCollection
        .find({ tenantId }, { projection })
        .toArray()

      return groups
    } catch (error) {
      logger.error('Error fetching groups:', error)
      return []
    }
  }

  /**
   * Get a single group by ID
   */
  async getGroup(groupId: string): Promise<TenantGroup | null> {
    try {
      return await this.groupsCollection.findOne({ id: groupId })
    } catch (error) {
      logger.error('Error fetching group:', error)
      return null
    }
  }

  /**
   * Get groups for a specific user
   */
  async getUserGroups(tenantId: string, userId: string): Promise<TenantGroup[]> {
    try {
      const groups = await this.groupsCollection
        .find({
          tenantId,
          members: userId,
        })
        .toArray()

      return groups
    } catch (error) {
      logger.error('Error fetching user groups:', error)
      return []
    }
  }

  /**
   * Assign app permissions to a group
   */
  async assignAppToGroup(
    groupId: string,
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
        expiresAt,
      }

      // Remove existing permission for this app if it exists
      await this.groupsCollection.updateOne(
        { id: groupId },
        { $pull: { appPermissions: { appId } } }
      )

      // Add new permission
      const result = await this.groupsCollection.updateOne(
        { id: groupId },
        {
          $push: { appPermissions: appPermission },
          $set: {
            'metadata.updatedAt': new Date(),
            'metadata.lastModifiedBy': assignedBy,
          },
        }
      )

      // Schedule expiration notifications if needed
      if (expiresAt) {
        await this.scheduleExpirationNotifications(groupId, appId, expiresAt)
      }

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error assigning app to group:', error)
      return false
    }
  }

  /**
   * Remove app permissions from a group
   */
  async removeAppFromGroup(
    groupId: string,
    appId: string,
    removedBy: string
  ): Promise<boolean> {
    try {
      const result = await this.groupsCollection.updateOne(
        { id: groupId },
        {
          $pull: { appPermissions: { appId } },
          $set: {
            'metadata.updatedAt': new Date(),
            'metadata.lastModifiedBy': removedBy,
          },
        }
      )

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error removing app from group:', error)
      return false
    }
  }

  /**
   * Schedule expiration notifications
   */
  private async scheduleExpirationNotifications(
    groupId: string,
    appId: string,
    expiresAt: Date
  ): Promise<void> {
    try {
      const group = await this.getGroup(groupId)
      if (!group) return

      const notificationDays = [30, 14, 7, 1] // Days before expiration
      const now = new Date()

      for (const days of notificationDays) {
        const notificationDate = new Date(expiresAt)
        notificationDate.setDate(notificationDate.getDate() - days)

        if (notificationDate > now) {
          const notification: PermissionNotification = {
            type: 'expiration_warning',
            recipientId: groupId, // Group notifications go to admin
            recipientEmail: '', // Will be filled by notification processor
            tenantId: group.tenantId,
            details: {
              appId,
              appName: appId, // Will be resolved by notification processor
              expiresAt,
              daysUntilExpiration: days,
              permissionSource: 'group',
              sourceId: groupId,
            },
            status: 'pending',
            metadata: {
              createdAt: now,
              scheduledFor: notificationDate,
              attempts: 0,
            },
          }

          await this.notificationsCollection.insertOne(notification)
        }
      }
    } catch (error) {
      logger.error('Error scheduling notifications:', error)
    }
  }

  /**
   * Check for expired permissions and remove them
   */
  async processExpiredPermissions(): Promise<void> {
    try {
      const now = new Date()

      // Remove expired permissions from groups
      await this.groupsCollection.updateMany(
        {
          'appPermissions.expiresAt': { $lte: now },
        },
        {
          $pull: {
            appPermissions: { expiresAt: { $lte: now } },
          },
        }
      )

      logger.info('Processed expired group permissions')
    } catch (error) {
      logger.error('Error processing expired permissions:', error)
    }
  }
}

export const groupService = new GroupService()