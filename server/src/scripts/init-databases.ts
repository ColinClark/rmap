#!/usr/bin/env node
/**
 * Initialize MongoDB databases and collections for RMAP
 * Run: npx tsx src/scripts/init-databases.ts
 */

import { mongoService } from '../services/mongodb';
import { Logger } from '../utils/logger';
import { appConfig, databaseConfig } from '../config';

const logger = new Logger('InitDatabases');

async function initializeDatabases() {
  try {
    // Check for MongoDB URI
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI not found in .env file');
      logger.info('Please follow the instructions in MONGODB_SETUP.md to get your connection string');
      process.exit(1);
    }

    logger.info('Connecting to MongoDB Atlas...');
    await mongoService.connect();

    logger.info('Running health check...');
    const healthy = await mongoService.healthCheck();
    if (!healthy) {
      throw new Error('Health check failed');
    }

    logger.info('Initializing databases and collections...');
    await mongoService.initializeDatabases();

    logger.info('Creating demo tenant...');
    await createDemoTenant();

    logger.info('✅ Database initialization complete!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Create a platform admin: npx tsx src/scripts/create-admin.ts');
    logger.info('2. Start the server: npm run dev');

    process.exit(0);
  } catch (error) {
    logger.error('Failed to initialize databases', error);
    process.exit(1);
  }
}

async function createDemoTenant() {
  const controlDB = mongoService.getControlDB();
  const tenantsCollection = controlDB.collection('tenants');

  // Check if demo tenant already exists
  const existingTenant = await tenantsCollection.findOne({ slug: 'demo' });
  if (existingTenant) {
    logger.info('Demo tenant already exists');
    return;
  }

  // Create demo tenant
  const demoTenant = {
    _id: 'demo-tenant-id',
    slug: 'demo',
    name: 'Demo Company',
    contactEmail: 'admin@demo.com',
    contactName: 'Demo Admin',
    address: {
      country: 'USA',
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      limits: {
        users: 50,
        campaigns: 500,
        apiCalls: 100000,
        storage: 100,
        workflows: ['retail_media', 'google_ads', 'meta_ads', 'analytics'],
      },
      usage: {
        users: 5,
        campaigns: 23,
        apiCalls: 1523,
        storage: 2.5,
      },
    },
    settings: {
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD',
      language: 'en',
      features: {
        sso: true,
        apiAccess: true,
        whiteLabel: false,
        customIntegrations: true,
        advancedAnalytics: true,
        prioritySupport: true,
      },
      security: {
        enforceSSO: false,
        enforce2FA: false,
        sessionTimeout: 30,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
        },
      },
    },
    dataPlane: {
      type: 'shared',
      database: 'rmap_shared',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    status: 'active',
  };

  await tenantsCollection.insertOne(demoTenant);
  logger.info('Created demo tenant');

  // Create demo user
  const usersCollection = controlDB.collection('users');
  const existingUser = await usersCollection.findOne({ email: 'demo@demo.com' });

  if (!existingUser) {
    const demoUser = {
      _id: 'demo-user-id',
      email: 'demo@demo.com',
      passwordHash: 'demo', // In production, this would be bcrypt hashed
      emailVerified: true,
      twoFactorSecret: null,
      lastLogin: null,
      createdAt: new Date(),
    };

    await usersCollection.insertOne(demoUser);

    // Create tenant-user relationship
    const tenantUsersCollection = controlDB.collection('tenant_users');
    await tenantUsersCollection.insertOne({
      userId: 'demo-user-id',
      tenantId: 'demo-tenant-id',
      role: 'admin',
      permissions: ['campaigns', 'analytics', 'users', 'settings'],
      status: 'active',
      joinedAt: new Date(),
    });

    logger.info('Created demo user (email: demo@demo.com, password: demo)');
  }
}

// Run the initialization
initializeDatabases();