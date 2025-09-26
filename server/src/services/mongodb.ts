import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '../utils/logger';
import { databaseConfig, validateDatabaseConfig, getDedicatedDatabaseName, isSharedTenant } from '../config';

export interface TenantDataLocation {
  database: string;
  type: 'shared' | 'dedicated';
}

/**
 * MongoDB Database Manager
 * Manages connections to control plane and data plane databases
 */
export class MongoDBService {
  private static instance: MongoDBService;
  private client: MongoClient | null = null;
  private logger = new Logger('MongoDBService');

  private constructor() {
    // Validate configuration on initialization
    try {
      validateDatabaseConfig();
    } catch (error: any) {
      this.logger.error('Database configuration error:', error.message);
      throw error;
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MongoDBService {
    if (!MongoDBService.instance) {
      MongoDBService.instance = new MongoDBService();
    }
    return MongoDBService.instance;
  }

  /**
   * Connect to MongoDB Atlas
   */
  public async connect(): Promise<void> {
    if (this.client) {
      this.logger.info('MongoDB already connected');
      return;
    }

    try {
      this.logger.info('Connecting to MongoDB Atlas...');

      this.client = new MongoClient(databaseConfig.uri, databaseConfig.options);

      await this.client.connect();

      // Verify connection
      await this.client.db('admin').command({ ping: 1 });

      this.logger.info('Successfully connected to MongoDB Atlas');

      // Set up graceful shutdown
      process.on('SIGINT', this.disconnect.bind(this));
      process.on('SIGTERM', this.disconnect.bind(this));
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.logger.info('Disconnected from MongoDB');
    }
  }

  /**
   * Get control plane database
   * Contains: tenants, users, subscriptions, platform_admins, audit_logs
   */
  public getControlDB(): Db {
    if (!this.client) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.client.db(databaseConfig.databases.controlPlane);
  }

  /**
   * Get data plane database for a tenant
   * Returns appropriate database based on tenant's subscription plan
   */
  public async getTenantDB(tenantId: string): Promise<Db> {
    if (!this.client) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }

    // Look up tenant to determine data location
    const tenant = await this.getControlDB()
      .collection('tenants')
      .findOne({ _id: tenantId });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Determine database based on subscription plan
    const plan = tenant.subscription?.plan || 'free';

    if (plan === 'professional' || plan === 'enterprise' || plan === 'custom') {
      // Dedicated database for professional/enterprise tenants
      return this.client.db(`rmap_tenant_${tenant.slug}`);
    } else {
      // Shared database for free/starter tenants
      return this.client.db('rmap_shared');
    }
  }

  /**
   * Get tenant data location info
   * Useful for routing and optimization
   */
  public async getTenantDataLocation(tenantId: string): Promise<TenantDataLocation> {
    const tenant = await this.getControlDB()
      .collection('tenants')
      .findOne({ _id: tenantId });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const plan = tenant.subscription?.plan || 'free';

    if (plan === 'professional' || plan === 'enterprise' || plan === 'custom') {
      return {
        database: `rmap_tenant_${tenant.slug}`,
        type: 'dedicated'
      };
    } else {
      return {
        database: 'rmap_shared',
        type: 'shared'
      };
    }
  }

  /**
   * Check if MongoDB is connected
   */
  public isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get collection with tenant filtering (for shared databases)
   */
  public async getTenantCollection<T = any>(
    tenantId: string,
    collectionName: string
  ): Promise<Collection<T>> {
    const db = await this.getTenantDB(tenantId);
    const location = await this.getTenantDataLocation(tenantId);

    const collection = db.collection<T>(collectionName);

    // For shared databases, we'll need to filter by tenantId
    // This is handled at the query level, not here
    // Return collection with metadata about whether filtering is needed
    (collection as any)._requiresTenantFilter = location.type === 'shared';
    (collection as any)._tenantId = tenantId;

    return collection;
  }

  /**
   * Initialize databases and collections
   */
  public async initializeDatabases(): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB not connected');
    }

    this.logger.info('Initializing MongoDB databases...');

    // Initialize Control Plane Database
    const controlDB = this.getControlDB();

    // Create collections with validation schemas
    const collections = [
      { name: 'tenants', indexes: [{ key: { slug: 1 }, unique: true }] },
      { name: 'users', indexes: [{ key: { email: 1 }, unique: true }] },
      { name: 'tenant_users', indexes: [
        { key: { userId: 1, tenantId: 1 }, unique: true },
        { key: { tenantId: 1 } }
      ]},
      { name: 'sessions', indexes: [
        { key: { refreshToken: 1 }, unique: true },
        { key: { userId: 1 } },
        { key: { expiresAt: 1 }, expireAfterSeconds: 0 }
      ]},
      { name: 'platform_admins', indexes: [{ key: { email: 1 }, unique: true }] },
      { name: 'audit_logs', indexes: [
        { key: { tenantId: 1, timestamp: -1 } },
        { key: { userId: 1, timestamp: -1 } }
      ]},
      { name: 'usage_events', indexes: [
        { key: { tenantId: 1, timestamp: -1 } },
        { key: { timestamp: 1 }, expireAfterSeconds: 2592000 } // 30 days
      ]}
    ];

    for (const collection of collections) {
      try {
        await controlDB.createCollection(collection.name);
        this.logger.info(`Created collection: ${collection.name}`);
      } catch (error: any) {
        if (error.code === 48) { // Collection already exists
          this.logger.info(`Collection already exists: ${collection.name}`);
        } else {
          throw error;
        }
      }

      // Create indexes
      if (collection.indexes) {
        for (const index of collection.indexes) {
          const options: any = {};
          if (index.unique !== undefined) options.unique = index.unique;
          if (index.expireAfterSeconds !== undefined) options.expireAfterSeconds = index.expireAfterSeconds;

          await controlDB.collection(collection.name).createIndex(index.key, options);
        }
      }
    }

    // Initialize Shared Data Plane Database
    const sharedDB = this.client.db('rmap_shared');

    const dataCollections = [
      { name: 'campaigns', indexes: [
        { key: { tenantId: 1, _id: 1 } },
        { key: { tenantId: 1, status: 1 } },
        { key: { tenantId: 1, createdAt: -1 } }
      ]},
      { name: 'audiences', indexes: [
        { key: { tenantId: 1, _id: 1 } },
        { key: { tenantId: 1, name: 1 } }
      ]},
      { name: 'analytics', indexes: [
        { key: { tenantId: 1, campaignId: 1, date: -1 } },
        { key: { tenantId: 1, date: -1 } }
      ]},
      { name: 'workflows', indexes: [
        { key: { tenantId: 1, _id: 1 } },
        { key: { tenantId: 1, type: 1, status: 1 } }
      ]}
    ];

    for (const collection of dataCollections) {
      try {
        await sharedDB.createCollection(collection.name);
        this.logger.info(`Created data collection: ${collection.name}`);
      } catch (error: any) {
        if (error.code === 48) {
          this.logger.info(`Data collection already exists: ${collection.name}`);
        } else {
          throw error;
        }
      }

      // Create indexes
      if (collection.indexes) {
        for (const index of collection.indexes) {
          await sharedDB.collection(collection.name).createIndex(index.key);
        }
      }
    }

    this.logger.info('Database initialization complete');
  }

  /**
   * Create a dedicated database for a tenant (when they upgrade)
   */
  public async createDedicatedTenantDB(tenantSlug: string): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB not connected');
    }

    const dbName = `rmap_tenant_${tenantSlug}`;
    const db = this.client.db(dbName);

    // Create collections without tenantId field
    const collections = ['campaigns', 'audiences', 'analytics', 'workflows'];

    for (const collectionName of collections) {
      await db.createCollection(collectionName);

      // Create appropriate indexes
      if (collectionName === 'campaigns') {
        await db.collection(collectionName).createIndex({ status: 1 });
        await db.collection(collectionName).createIndex({ createdAt: -1 });
      } else if (collectionName === 'analytics') {
        await db.collection(collectionName).createIndex({ campaignId: 1, date: -1 });
      }
    }

    this.logger.info(`Created dedicated database for tenant: ${tenantSlug}`);
  }

  /**
   * Migrate tenant from shared to dedicated database
   */
  public async migrateTenantToDedicated(tenantId: string, tenantSlug: string): Promise<void> {
    const sharedDB = this.client!.db('rmap_shared');
    const dedicatedDB = this.client!.db(`rmap_tenant_${tenantSlug}`);

    const collections = ['campaigns', 'audiences', 'analytics', 'workflows'];

    for (const collectionName of collections) {
      // Find all documents for this tenant
      const documents = await sharedDB
        .collection(collectionName)
        .find({ tenantId })
        .toArray();

      if (documents.length > 0) {
        // Remove tenantId field since it's not needed in dedicated DB
        const cleanedDocs = documents.map(doc => {
          const { tenantId, ...cleanDoc } = doc;
          return cleanDoc;
        });

        // Insert into dedicated database
        await dedicatedDB.collection(collectionName).insertMany(cleanedDocs);

        // Delete from shared database
        await sharedDB.collection(collectionName).deleteMany({ tenantId });
      }
    }

    // Update tenant record to point to dedicated database
    await this.getControlDB().collection('tenants').updateOne(
      { _id: tenantId },
      {
        $set: {
          'dataPlane.type': 'dedicated',
          'dataPlane.database': `rmap_tenant_${tenantSlug}`
        }
      }
    );

    this.logger.info(`Migrated tenant ${tenantId} to dedicated database`);
  }
}

// Export singleton instance
export const mongoService = MongoDBService.getInstance();