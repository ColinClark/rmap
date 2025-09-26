/**
 * TenantService - Handles all tenant-related operations
 */

import { Collection, Db } from 'mongodb'
import { mongoService } from './mongodb'
import { Logger } from '../utils/logger'
import { Tenant, TenantUser, SUBSCRIPTION_PLANS, SubscriptionPlan } from '../types/tenant'

const logger = new Logger('TenantService')

export class TenantService {
  private get tenantsCollection(): Collection<Tenant> {
    return mongoService.getControlDB().collection<Tenant>('tenants')
  }

  private get usersCollection(): Collection<any> {
    return mongoService.getControlDB().collection('users')
  }

  private get tenantUsersCollection(): Collection<TenantUser> {
    return mongoService.getControlDB().collection<TenantUser>('tenant_users')
  }

  /**
   * Get tenant by ID or slug
   */
  async getTenant(identifier: string): Promise<Tenant | null> {
    try {
      const tenant = await this.tenantsCollection.findOne({
        $or: [
          { id: identifier },
          { _id: identifier },
          { slug: identifier }
        ]
      })
      return tenant as Tenant | null
    } catch (error) {
      logger.error('Error fetching tenant', error)
      return null
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: {
    name: string
    slug: string
    contactEmail: string
    contactName: string
    plan?: SubscriptionPlan
  }): Promise<Tenant> {
    const plan = data.plan || 'free'
    const limits = this.getPlanLimits(plan)

    const tenantId = `tenant_${Date.now()}`
    const tenant: Tenant = {
      _id: tenantId,
      id: tenantId,
      name: data.name,
      slug: data.slug,
      contactEmail: data.contactEmail,
      contactName: data.contactName,
      address: {
        country: 'USA'
      },
      subscription: {
        plan,
        status: 'active',
        billingCycle: plan === 'free' ? undefined : 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        limits,
        usage: {
          users: 0,
          campaigns: 0,
          apiCalls: 0,
          storage: 0
        }
      },
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        language: 'en',
        features: this.getPlanFeatures(plan),
        security: {
          enforceSSO: false,
          enforce2FA: false,
          sessionTimeout: 30,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialChars: false
          }
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      status: 'active'
    }

    await this.tenantsCollection.insertOne(tenant as any)
    logger.info(`Created new tenant: ${tenant.slug}`)

    return tenant
  }

  /**
   * Update tenant information
   */
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<boolean> {
    try {
      const result = await this.tenantsCollection.updateOne(
        { _id: tenantId },
        {
          $set: {
            ...updates,
            updatedAt: new Date().toISOString()
          }
        }
      )
      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error updating tenant', error)
      return false
    }
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(tenantId: string, newPlan: SubscriptionPlan): Promise<boolean> {
    try {
      const limits = this.getPlanLimits(newPlan)
      const features = this.getPlanFeatures(newPlan)

      const result = await this.tenantsCollection.updateOne(
        { _id: tenantId },
        {
          $set: {
            'subscription.plan': newPlan,
            'subscription.limits': limits,
            'subscription.currentPeriodStart': new Date().toISOString(),
            'subscription.currentPeriodEnd': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            'settings.features': features,
            updatedAt: new Date().toISOString()
          }
        }
      )

      if (result.modifiedCount > 0) {
        logger.info(`Updated subscription for tenant ${tenantId} to ${newPlan}`)

        // If upgrading to professional or enterprise, consider migrating to dedicated DB
        if (newPlan === 'professional' || newPlan === 'enterprise') {
          // TODO: Trigger migration to dedicated database
        }
      }

      return result.modifiedCount > 0
    } catch (error) {
      logger.error('Error updating subscription', error)
      return false
    }
  }

  /**
   * Track usage for a tenant
   */
  async trackUsage(tenantId: string, metric: 'apiCalls' | 'campaigns' | 'storage', amount: number = 1): Promise<void> {
    try {
      await this.tenantsCollection.updateOne(
        { _id: tenantId },
        {
          $inc: {
            [`subscription.usage.${metric}`]: amount
          }
        }
      )
    } catch (error) {
      logger.error('Error tracking usage', error)
    }
  }

  /**
   * Check if tenant has reached a limit
   */
  async checkLimit(tenantId: string, metric: 'users' | 'campaigns' | 'apiCalls' | 'storage'): Promise<boolean> {
    const tenant = await this.getTenant(tenantId)
    if (!tenant) return false

    const limit = tenant.subscription.limits[metric]
    const usage = tenant.subscription.usage[metric]

    return limit === -1 || usage < limit
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | null> {
    try {
      // Remove id from updates if present
      const { id: _id, ...updateData } = updates

      // Add updatedAt timestamp
      const dataWithTimestamp = {
        ...updateData,
        updatedAt: new Date().toISOString()
      }

      const result = await this.tenantsCollection.findOneAndUpdate(
        { id },
        { $set: dataWithTimestamp },
        { returnDocument: 'after' }
      )

      if (!result) {
        logger.warn(`Tenant not found for update: ${id}`)
        return null
      }

      logger.info(`Updated tenant: ${id}`)
      return result as Tenant
    } catch (error) {
      logger.error(`Error updating tenant ${id}`, error)
      return null
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(id: string, settings: Partial<Tenant['settings']>): Promise<Tenant | null> {
    try {
      const result = await this.tenantsCollection.findOneAndUpdate(
        { id },
        {
          $set: {
            settings,
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) {
        logger.warn(`Tenant not found for settings update: ${id}`)
        return null
      }

      logger.info(`Updated tenant settings: ${id}`)
      return result as Tenant
    } catch (error) {
      logger.error(`Error updating tenant settings ${id}`, error)
      return null
    }
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(id: string, subscription: Partial<Tenant['subscription']>): Promise<Tenant | null> {
    try {
      const result = await this.tenantsCollection.findOneAndUpdate(
        { id },
        {
          $set: {
            subscription,
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      )

      if (!result) {
        logger.warn(`Tenant not found for subscription update: ${id}`)
        return null
      }

      logger.info(`Updated tenant subscription: ${id}`)
      return result as Tenant
    } catch (error) {
      logger.error(`Error updating tenant subscription ${id}`, error)
      return null
    }
  }

  /**
   * Get all tenants (for admin)
   */
  async getAllTenants(filter?: { status?: string, plan?: string }): Promise<Tenant[]> {
    try {
      const query: any = {}
      if (filter?.status) query.status = filter.status
      if (filter?.plan) query['subscription.plan'] = filter.plan

      const tenants = await this.tenantsCollection.find(query).toArray()
      return tenants as Tenant[]
    } catch (error) {
      logger.error('Error fetching all tenants', error)
      return []
    }
  }

  /**
   * Get plan limits based on subscription plan
   */
  private getPlanLimits(plan: SubscriptionPlan) {
    switch (plan) {
      case 'free':
        return {
          users: 3,
          campaigns: 5,
          apiCalls: 1000,
          storage: 1, // GB
          workflows: ['retail_media']
        }
      case 'starter':
        return {
          users: 10,
          campaigns: 50,
          apiCalls: 10000,
          storage: 10,
          workflows: ['retail_media', 'google_ads']
        }
      case 'professional':
        return {
          users: 50,
          campaigns: 500,
          apiCalls: 100000,
          storage: 100,
          workflows: ['retail_media', 'google_ads', 'meta_ads', 'analytics']
        }
      case 'enterprise':
      case 'custom':
        return {
          users: -1, // Unlimited
          campaigns: -1,
          apiCalls: -1,
          storage: -1,
          workflows: ['*'] // All workflows
        }
      default:
        return {
          users: 3,
          campaigns: 5,
          apiCalls: 1000,
          storage: 1,
          workflows: ['retail_media']
        }
    }
  }

  /**
   * Get plan features based on subscription plan
   */
  private getPlanFeatures(plan: SubscriptionPlan) {
    switch (plan) {
      case 'free':
        return {
          sso: false,
          apiAccess: false,
          whiteLabel: false,
          customIntegrations: false,
          advancedAnalytics: false,
          prioritySupport: false
        }
      case 'starter':
        return {
          sso: false,
          apiAccess: true,
          whiteLabel: false,
          customIntegrations: false,
          advancedAnalytics: false,
          prioritySupport: false
        }
      case 'professional':
        return {
          sso: true,
          apiAccess: true,
          whiteLabel: false,
          customIntegrations: true,
          advancedAnalytics: true,
          prioritySupport: true
        }
      case 'enterprise':
      case 'custom':
        return {
          sso: true,
          apiAccess: true,
          whiteLabel: true,
          customIntegrations: true,
          advancedAnalytics: true,
          prioritySupport: true
        }
      default:
        return {
          sso: false,
          apiAccess: false,
          whiteLabel: false,
          customIntegrations: false,
          advancedAnalytics: false,
          prioritySupport: false
        }
    }
  }
}

// Export singleton instance
export const tenantService = new TenantService()