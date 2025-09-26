#!/usr/bin/env tsx

/**
 * Setup script to ensure demo tenant and test user exist with proper associations
 */

import { MongoClient, Db } from 'mongodb'
import bcrypt from 'bcrypt'
import { Logger } from '../utils/logger'

const logger = new Logger('SetupDemo')

async function setupDemoTenant() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb+srv://rmap-admin:IFMOoFpkb2bXSFOl@cluster0.7b2yw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

  try {
    logger.info('Connecting to MongoDB...')
    const client = await MongoClient.connect(mongoUrl)
    const db = client.db('rmap_control')

    // 1. Create or update demo tenant
    const demoTenant = {
      id: 'demo-tenant-id',
      name: 'Demo Organization',
      slug: 'demo',
      status: 'active',
      contactEmail: 'admin@demo.com',
      contactName: 'Demo Admin',
      contactPhone: '',
      logo: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postalCode: ''
      },
      subscription: {
        plan: 'professional',
        status: 'active',
        billingCycle: 'monthly',
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: null,
        canceledAt: null,
        usage: {
          users: 1,
          campaigns: 0,
          apiCalls: 0,
          storage: 0,
          workflows: []
        },
        limits: {
          users: 50,
          campaigns: 500,
          apiCalls: 100000,
          storage: 100,
          workflows: ['retail_media', 'google_ads', 'meta_ads', 'analytics']
        }
      },
      settings: {
        features: {
          sso: true,
          apiAccess: true,
          whiteLabel: false,
          customIntegrations: true,
          advancedAnalytics: true,
          prioritySupport: true
        },
        security: {
          enforceSSO: false,
          enforce2FA: false,
          ipWhitelist: [],
          sessionTimeout: 60,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireNumbers: false,
            requireSpecialChars: false,
            expirationDays: null
          }
        },
        branding: {},
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        language: 'en'
      },
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // First, delete any existing tenant with slug 'demo' that doesn't have our ID
    await db.collection('tenants').deleteMany({
      slug: 'demo',
      id: { $ne: 'demo-tenant-id' }
    })

    // Now upsert our demo tenant
    await db.collection('tenants').replaceOne(
      { id: 'demo-tenant-id' },
      demoTenant,
      { upsert: true }
    )
    logger.info('✓ Demo tenant created/updated')

    // 2. Create or update test user
    const passwordHash = await bcrypt.hash('password123', 10)
    const testUser = {
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const userResult = await db.collection('users').findOneAndUpdate(
      { email: 'test@example.com' },
      { $set: testUser },
      { upsert: true, returnDocument: 'after' }
    )
    logger.info('✓ Test user created/updated')

    const userId = userResult._id.toString()

    // 3. Add user to demo tenant as owner
    const tenantUser = {
      userId,
      tenantId: 'demo-tenant-id',
      tenantRole: 'owner',
      permissions: ['*'],
      status: 'active',
      joinedAt: new Date().toISOString(),
      invitedBy: null,
      invitedAt: null,
      updatedAt: new Date().toISOString()
    }

    await db.collection('tenant_users').updateOne(
      { userId, tenantId: 'demo-tenant-id' },
      { $set: tenantUser },
      { upsert: true }
    )
    logger.info('✓ Test user added to demo tenant as owner')

    // 4. Create a second test user for testing team features
    const passwordHash2 = await bcrypt.hash('password123', 10)
    const testUser2 = {
      email: 'member@example.com',
      name: 'Team Member',
      passwordHash: passwordHash2,
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const user2Result = await db.collection('users').findOneAndUpdate(
      { email: 'member@example.com' },
      { $set: testUser2 },
      { upsert: true, returnDocument: 'after' }
    )
    logger.info('✓ Team member user created/updated')

    const user2Id = user2Result._id.toString()

    // 5. Add second user to demo tenant as member
    const tenantUser2 = {
      userId: user2Id,
      tenantId: 'demo-tenant-id',
      tenantRole: 'member',
      permissions: ['retail_media'],
      status: 'active',
      joinedAt: new Date().toISOString(),
      invitedBy: userId,
      invitedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await db.collection('tenant_users').updateOne(
      { userId: user2Id, tenantId: 'demo-tenant-id' },
      { $set: tenantUser2 },
      { upsert: true }
    )
    logger.info('✓ Team member added to demo tenant')

    // 6. Update tenant usage to reflect 2 users
    await db.collection('tenants').updateOne(
      { id: 'demo-tenant-id' },
      { $set: { 'subscription.usage.users': 2 } }
    )
    logger.info('✓ Updated tenant user count')

    logger.info('\n========================================')
    logger.info('Demo setup completed successfully!')
    logger.info('========================================')
    logger.info('\nTest Credentials:')
    logger.info('  Owner: test@example.com / password123')
    logger.info('  Member: member@example.com / password123')
    logger.info('  Tenant: Demo Organization (demo-tenant-id)')
    logger.info('========================================\n')

    client.close()
    process.exit(0)
  } catch (error) {
    logger.error('Setup failed:', error)
    process.exit(1)
  }
}

// Run the setup
setupDemoTenant()