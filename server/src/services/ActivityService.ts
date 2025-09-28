/**
 * ActivityService - Tracks and manages tenant activity logs
 */

import { MongoClient, Db, Collection } from 'mongodb'
import { Logger } from '../utils/logger'

const logger = new Logger('ActivityService')

export interface ActivityLog {
  id: string
  tenantId: string
  userId: string
  userName?: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export class ActivityService {
  private db: Db | null = null
  private activitiesCollection!: Collection<ActivityLog>

  constructor() {
    this.initDB()
  }

  private async initDB() {
    try {
      const mongoUrl = process.env.MONGODB_URI
      if (!mongoUrl) {
        throw new Error('MONGODB_URI environment variable is required')
      }
      const client = await MongoClient.connect(mongoUrl)
      this.db = client.db()
      this.activitiesCollection = this.db.collection<ActivityLog>('activities')

      // Create indexes
      await this.activitiesCollection.createIndex({ tenantId: 1, timestamp: -1 })
      await this.activitiesCollection.createIndex({ userId: 1, timestamp: -1 })
      await this.activitiesCollection.createIndex({ action: 1 })
      await this.activitiesCollection.createIndex({ timestamp: -1 })

      logger.info('ActivityService initialized with MongoDB')
    } catch (error) {
      logger.error('Failed to initialize ActivityService', error)
    }
  }

  /**
   * Log an activity
   */
  async logActivity(
    tenantId: string,
    userId: string,
    action: string,
    resource: string,
    options?: {
      resourceId?: string
      metadata?: Record<string, any>
      userName?: string
      userEmail?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<ActivityLog | null> {
    try {
      const activity: ActivityLog = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        tenantId,
        userId,
        userName: options?.userName,
        userEmail: options?.userEmail,
        action,
        resource,
        resourceId: options?.resourceId,
        metadata: options?.metadata,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        timestamp: new Date().toISOString()
      }

      await this.activitiesCollection.insertOne(activity as any)
      logger.info(`Activity logged: ${action} on ${resource} by user ${userId}`)

      return activity
    } catch (error) {
      logger.error('Error logging activity', error)
      return null
    }
  }

  /**
   * Get activities for a tenant
   */
  async getTenantActivities(
    tenantId: string,
    options?: {
      limit?: number
      offset?: number
      userId?: string
      action?: string
      resource?: string
      startDate?: Date
      endDate?: Date
    }
  ): Promise<{ activities: ActivityLog[], total: number }> {
    try {
      const query: any = { tenantId }

      if (options?.userId) query.userId = options.userId
      if (options?.action) query.action = options.action
      if (options?.resource) query.resource = options.resource

      if (options?.startDate || options?.endDate) {
        query.timestamp = {}
        if (options.startDate) {
          query.timestamp.$gte = options.startDate.toISOString()
        }
        if (options.endDate) {
          query.timestamp.$lte = options.endDate.toISOString()
        }
      }

      const limit = options?.limit || 50
      const offset = options?.offset || 0

      const [activities, total] = await Promise.all([
        this.activitiesCollection
          .find(query)
          .sort({ timestamp: -1 })
          .skip(offset)
          .limit(limit)
          .toArray(),
        this.activitiesCollection.countDocuments(query)
      ])

      return {
        activities: activities as ActivityLog[],
        total
      }
    } catch (error) {
      logger.error('Error fetching tenant activities', error)
      return { activities: [], total: 0 }
    }
  }

  /**
   * Get user activities
   */
  async getUserActivities(
    userId: string,
    options?: {
      limit?: number
      offset?: number
      tenantId?: string
    }
  ): Promise<ActivityLog[]> {
    try {
      const query: any = { userId }
      if (options?.tenantId) query.tenantId = options.tenantId

      const limit = options?.limit || 50
      const offset = options?.offset || 0

      const activities = await this.activitiesCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .toArray()

      return activities as ActivityLog[]
    } catch (error) {
      logger.error('Error fetching user activities', error)
      return []
    }
  }

  /**
   * Clean up old activities (retention policy)
   */
  async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.activitiesCollection.deleteMany({
        timestamp: { $lt: cutoffDate.toISOString() }
      })

      logger.info(`Cleaned up ${result.deletedCount} old activity logs`)
      return result.deletedCount
    } catch (error) {
      logger.error('Error cleaning up old activities', error)
      return 0
    }
  }

  /**
   * Get activity statistics for a tenant
   */
  async getActivityStats(
    tenantId: string,
    days: number = 30
  ): Promise<{
    totalActivities: number
    activeUsers: number
    topActions: Array<{ action: string, count: number }>
    dailyActivity: Array<{ date: string, count: number }>
  }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const pipeline = [
        {
          $match: {
            tenantId,
            timestamp: { $gte: startDate.toISOString() }
          }
        },
        {
          $facet: {
            totalActivities: [{ $count: 'count' }],
            activeUsers: [
              { $group: { _id: '$userId' } },
              { $count: 'count' }
            ],
            topActions: [
              { $group: { _id: '$action', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 },
              { $project: { action: '$_id', count: 1, _id: 0 } }
            ],
            dailyActivity: [
              {
                $group: {
                  _id: { $substr: ['$timestamp', 0, 10] },
                  count: { $sum: 1 }
                }
              },
              { $sort: { _id: 1 } },
              { $project: { date: '$_id', count: 1, _id: 0 } }
            ]
          }
        }
      ]

      const results = await this.activitiesCollection.aggregate(pipeline).toArray()
      const stats = results[0] || {}

      return {
        totalActivities: stats.totalActivities?.[0]?.count || 0,
        activeUsers: stats.activeUsers?.[0]?.count || 0,
        topActions: stats.topActions || [],
        dailyActivity: stats.dailyActivity || []
      }
    } catch (error) {
      logger.error('Error fetching activity stats', error)
      return {
        totalActivities: 0,
        activeUsers: 0,
        topActions: [],
        dailyActivity: []
      }
    }
  }
}

// Export singleton instance
export const activityService = new ActivityService()