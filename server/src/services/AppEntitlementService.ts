/**
 * App Entitlement Service - Manages app/utility tiles and tenant entitlements
 */

import { Collection, Db } from 'mongodb'
import { mongoService } from './mongodb'
import type { AppTile, TenantAppEntitlement } from '../types/admin'
import { Logger } from '../utils/logger'

const logger = new Logger('AppEntitlementService')

class AppEntitlementService {
  private appsCollection!: Collection<AppTile>
  private entitlementsCollection!: Collection<TenantAppEntitlement>

  constructor() {
    // Collections will be initialized when needed
  }

  private initializeCollections() {
    if (!this.appsCollection) {
      const db = mongoService.getControlDB()
      this.appsCollection = db.collection<AppTile>('apps')
      this.entitlementsCollection = db.collection<TenantAppEntitlement>('tenant_app_entitlements')
    }
  }

  private ensureInitialized() {
    this.initializeCollections()
  }

  /**
   * Initialize default apps (Retail Media and Data Query)
   */
  async initializeDefaultApps(): Promise<void> {
    try {
      this.ensureInitialized()
      const defaultApps: AppTile[] = [
        {
          id: 'retail-media-planner',
          name: 'Retail Media Audience Planner',
          shortDescription: 'AI-powered audience segmentation for retail media campaigns',
          fullDescription: 'Build and optimize audience segments for retail media campaigns with advanced AI capabilities. Create cohorts using natural language, refine demographics, generate strategies, and export to major retail media platforms.',
          category: 'marketing',
          tags: ['retail', 'audience', 'campaigns', 'AI', 'segmentation', 'targeting'],

          // Visual Assets
          icon: 'ShoppingCart',
          color: 'bg-blue-500',
          badge: 'Most Popular',

          // Status
          status: 'active',
          permission: 'retail_media',
          rating: 4.8,
          reviewCount: 234,
          installs: 1250,
          popularity: 95,

          // Features
          highlights: [
            'Natural language audience building',
            'AI-powered strategy generation',
            'Export to 15+ platforms',
            'Real-time performance tracking',
            'Collaborative campaign planning'
          ],
          features: [
            { name: 'AI Cohort Builder', description: 'Build audiences using natural language queries', icon: 'Brain' },
            { name: 'Audience Refinement', description: 'Fine-tune demographics and behaviors', icon: 'Sliders' },
            { name: 'Strategy Generator', description: 'AI-generated campaign strategies', icon: 'Sparkles' },
            { name: 'Campaign Export', description: 'Direct export to retail media platforms', icon: 'Upload' },
            { name: 'Performance Monitoring', description: 'Real-time campaign analytics', icon: 'ChartBar' }
          ],
          useCases: ['Retail media campaigns', 'Audience targeting', 'Campaign optimization'],
          industries: ['Retail', 'E-commerce', 'CPG', 'Fashion'],

          // Configuration
          config: {
            route: '/workflows/retail-media',
            requiresSetup: false,
            integrations: ['Amazon DSP', 'Walmart Connect', 'Target Roundel', 'Kroger Precision'],
            limitations: {
              starter: { campaigns: 10, audiences: 50 },
              professional: { campaigns: 100, audiences: 500 },
              enterprise: { campaigns: -1, audiences: -1 }
            }
          },

          // Pricing
          pricing: {
            model: 'included',
            includedInPlans: ['starter', 'professional', 'enterprise', 'custom']
          },

          // Metadata
          version: '2.0.0',
          releaseDate: '2024-01-15',
          lastUpdated: new Date(),
          documentation: '/docs/retail-media-planner',
          supportEmail: 'support@rmap.com',
          vendor: 'RMAP Platform',

          availableForPlans: ['starter', 'professional', 'enterprise', 'custom'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'data-query',
          name: 'Data Query',
          shortDescription: 'Advanced data exploration with SQL and visual query builder',
          fullDescription: 'Powerful data exploration and analysis tool with both SQL interface and visual query builder. Connect to multiple data sources, build complex queries visually, save and share queries, and export results in various formats.',
          category: 'data',
          tags: ['data', 'analytics', 'SQL', 'database', 'exploration', 'visualization'],

          // Visual Assets
          icon: 'Database',
          color: 'bg-green-500',
          badge: 'New',

          // Status
          status: 'active',
          permission: 'data_query',
          rating: 4.6,
          reviewCount: 156,
          installs: 890,
          popularity: 82,

          // Features
          highlights: [
            'Visual query builder for non-technical users',
            'Advanced SQL editor with autocomplete',
            'Connect to multiple data sources',
            'Export to CSV, Excel, JSON',
            'Save and share queries with team'
          ],
          features: [
            { name: 'Visual Query Builder', description: 'Drag-and-drop interface for building queries', icon: 'Grid' },
            { name: 'SQL Editor', description: 'Full-featured SQL editor with syntax highlighting', icon: 'Code' },
            { name: 'Data Export', description: 'Export results in multiple formats', icon: 'Download' },
            { name: 'Saved Queries', description: 'Save and organize frequently used queries', icon: 'Save' },
            { name: 'Real-time Results', description: 'See query results instantly as you type', icon: 'Zap' },
            { name: 'Data Visualization', description: 'Built-in charts and graphs', icon: 'ChartBar' }
          ],
          useCases: ['Data exploration', 'Ad-hoc reporting', 'Data validation', 'Customer insights'],
          industries: ['All industries'],

          // Configuration
          config: {
            route: '/workflows/data-query',
            requiresSetup: true,
            setupFields: [
              {
                name: 'dataSource',
                label: 'Data Source',
                type: 'select',
                required: true,
                options: [
                  { label: 'SynthiePop (83M German Population)', value: 'synthiepop' },
                  { label: 'Custom Database', value: 'custom' }
                ]
              },
              {
                name: 'connectionString',
                label: 'Connection String',
                type: 'password',
                required: false,
                placeholder: 'Required for custom database',
                encrypted: true
              }
            ],
            integrations: ['PostgreSQL', 'MySQL', 'MongoDB', 'BigQuery', 'Snowflake', 'Redshift'],
            limitations: {
              starter: { queries_per_day: 100, export_rows: 1000 },
              professional: { queries_per_day: 1000, export_rows: 10000 },
              enterprise: { queries_per_day: -1, export_rows: -1 }
            }
          },

          // Pricing
          pricing: {
            model: 'included',
            includedInPlans: ['professional', 'enterprise', 'custom']
          },

          // Requirements
          requirements: {
            minPlan: 'professional',
            technicalRequirements: ['Database access credentials']
          },

          // Metadata
          version: '1.5.0',
          releaseDate: '2024-03-01',
          lastUpdated: new Date(),
          documentation: '/docs/data-query',
          supportEmail: 'support@rmap.com',
          vendor: 'RMAP Platform',

          availableForPlans: ['professional', 'enterprise', 'custom'],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      // Upsert each app
      for (const app of defaultApps) {
        await this.appsCollection.replaceOne(
          { id: app.id },
          app,
          { upsert: true }
        )
      }

      logger.info('Default apps initialized')
    } catch (error) {
      logger.error('Error initializing default apps:', error)
      throw error
    }
  }

  /**
   * Get all available apps
   */
  async getAllApps(): Promise<AppTile[]> {
    try {
      this.ensureInitialized()
      return await this.appsCollection.find({}).toArray()
    } catch (error) {
      logger.error('Error fetching apps:', error)
      return []
    }
  }

  /**
   * Get app catalog for tenant (shows all apps with entitlement status)
   */
  async getAppCatalogForTenant(tenantId: string): Promise<{
    app: AppTile
    entitled: boolean
    entitlement?: TenantAppEntitlement
  }[]> {
    try {
      const allApps = await this.getAllApps()
      const tenantEntitlements = await this.getTenantEntitlements(tenantId)

      return allApps.map(app => {
        const entitlement = tenantEntitlements.find(e => e.appId === app.id)
        return {
          app,
          entitled: !!entitlement,
          entitlement
        }
      })
    } catch (error) {
      logger.error('Error fetching app catalog:', error)
      return []
    }
  }

  /**
   * Get app by ID
   */
  async getApp(appId: string): Promise<AppTile | null> {
    try {
      this.ensureInitialized()
      return await this.appsCollection.findOne({ id: appId })
    } catch (error) {
      logger.error('Error fetching app:', error)
      return null
    }
  }

  /**
   * Create or update an app
   */
  async upsertApp(app: AppTile): Promise<AppTile | null> {
    try {
      this.ensureInitialized()
      app.updatedAt = new Date()
      if (!app.createdAt) {
        app.createdAt = new Date()
      }

      const result = await this.appsCollection.replaceOne(
        { id: app.id },
        app,
        { upsert: true }
      )

      if (result.acknowledged) {
        return app
      }
      return null
    } catch (error) {
      logger.error('Error upserting app:', error)
      return null
    }
  }

  /**
   * Grant app access to a tenant
   */
  async grantAppToTenant(
    tenantId: string,
    appId: string,
    adminId: string,
    config?: Partial<TenantAppEntitlement>
  ): Promise<TenantAppEntitlement | null> {
    try {
      this.ensureInitialized()
      const app = await this.getApp(appId)
      if (!app) {
        throw new Error('App not found')
      }

      const entitlement: TenantAppEntitlement = {
        tenantId,
        appId,
        status: 'active',
        activatedAt: new Date(),
        config: config?.config || {},
        limits: config?.limits || {},
        usage: {
          totalUses: 0,
          monthlyUses: 0,
          dailyUses: 0
        },
        enabledForUsers: config?.enabledForUsers || [],
        disabledForUsers: config?.disabledForUsers || [],
        requiredRole: config?.requiredRole,
        createdBy: adminId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await this.entitlementsCollection.replaceOne(
        { tenantId, appId },
        entitlement,
        { upsert: true }
      )

      logger.info(`Granted app ${appId} to tenant ${tenantId}`)
      return entitlement
    } catch (error) {
      logger.error('Error granting app to tenant:', error)
      return null
    }
  }

  /**
   * Revoke app access from a tenant
   */
  async revokeAppFromTenant(
    tenantId: string,
    appId: string,
    adminId: string
  ): Promise<boolean> {
    try {
      this.ensureInitialized()
      const result = await this.entitlementsCollection.updateOne(
        { tenantId, appId },
        {
          $set: {
            status: 'inactive',
            updatedBy: adminId,
            updatedAt: new Date()
          }
        }
      )

      logger.info(`Revoked app ${appId} from tenant ${tenantId}`)
      return result.acknowledged
    } catch (error) {
      logger.error('Error revoking app from tenant:', error)
      return false
    }
  }

  /**
   * Get all entitlements for a tenant
   */
  async getTenantEntitlements(tenantId: string): Promise<TenantAppEntitlement[]> {
    try {
      this.ensureInitialized()
      return await this.entitlementsCollection
        .find({ tenantId, status: { $in: ['active', 'trial'] } })
        .toArray()
    } catch (error) {
      logger.error('Error fetching tenant entitlements:', error)
      return []
    }
  }

  /**
   * Get tenant's entitled apps with full details
   */
  async getTenantApps(tenantId: string): Promise<AppTile[]> {
    try {
      this.ensureInitialized()
      const entitlements = await this.getTenantEntitlements(tenantId)
      const appIds = entitlements.map(e => e.appId)

      if (appIds.length === 0) {
        return []
      }

      const apps = await this.appsCollection
        .find({ id: { $in: appIds } })
        .toArray()

      // Merge entitlement config with app config
      return apps.map(app => {
        const entitlement = entitlements.find(e => e.appId === app.id)
        if (entitlement?.config) {
          app.config = { ...app.config, ...entitlement.config }
        }
        return app
      })
    } catch (error) {
      logger.error('Error fetching tenant apps:', error)
      return []
    }
  }

  /**
   * Check if tenant has access to an app
   */
  async tenantHasApp(tenantId: string, appId: string): Promise<boolean> {
    try {
      const entitlement = await this.entitlementsCollection.findOne({
        tenantId,
        appId,
        status: { $in: ['active', 'trial'] }
      })
      return entitlement !== null
    } catch (error) {
      logger.error('Error checking tenant app access:', error)
      return false
    }
  }

  /**
   * Track app usage
   */
  async trackAppUsage(tenantId: string, appId: string, userId?: string): Promise<void> {
    try {
      await this.entitlementsCollection.updateOne(
        { tenantId, appId },
        {
          $set: {
            'usage.lastUsed': new Date(),
            updatedAt: new Date()
          },
          $inc: {
            'usage.totalUses': 1,
            'usage.monthlyUses': 1,
            'usage.dailyUses': 1
          }
        }
      )
    } catch (error) {
      logger.error('Error tracking app usage:', error)
    }
  }

  /**
   * Get default initial apps for tenant onboarding based on subscription plan
   */
  async getDefaultInitialApps(plan: string): Promise<{appId: string, adminManageable: boolean}[]> {
    try {
      this.ensureInitialized()

      switch (plan) {
        case 'free':
          return [
            { appId: 'retail-media-planner', adminManageable: true }
          ]

        case 'starter':
          return [
            { appId: 'retail-media-planner', adminManageable: true }
          ]

        case 'professional':
        case 'enterprise':
        case 'custom':
          return [
            { appId: 'retail-media-planner', adminManageable: true },
            { appId: 'data-query', adminManageable: true }
          ]

        default:
          return [
            { appId: 'retail-media-planner', adminManageable: true }
          ]
      }
    } catch (error) {
      logger.error('Error getting default initial apps:', error)
      return []
    }
  }

  /**
   * Grant default apps to demo tenant
   */
  async grantDefaultAppsToDemo(): Promise<void> {
    try {
      const demoTenantId = 'demo-tenant-id'
      const adminId = 'system'

      // Grant both default apps to demo tenant
      await this.grantAppToTenant(demoTenantId, 'retail-media-planner', adminId)
      await this.grantAppToTenant(demoTenantId, 'data-query', adminId)

      logger.info('Granted default apps to demo tenant')
    } catch (error) {
      logger.error('Error granting default apps to demo:', error)
    }
  }
}

export const appEntitlementService = new AppEntitlementService()