/**
 * Database Configuration
 * Centralized configuration for MongoDB connections
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Environment variables will be loaded by index.ts config
// No need to load here as it's already handled

export interface DatabaseConfig {
  uri: string;
  options: {
    maxPoolSize: number;
    minPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
  };
  databases: {
    controlPlane: string;
    sharedData: string;
    tenantPrefix: string;
  };
  collections: {
    control: {
      tenants: string;
      users: string;
      tenantUsers: string;
      sessions: string;
      platformAdmins: string;
      auditLogs: string;
      usageEvents: string;
    };
    data: {
      campaigns: string;
      audiences: string;
      analytics: string;
      workflows: string;
    };
  };
}

// Lazy getter for database configuration - only reads env vars when accessed
let _config: DatabaseConfig | null = null;

function getConfig(): DatabaseConfig {
  if (!_config) {
    _config = {
      // MongoDB Connection URI from environment
      uri: process.env.MONGODB_URI || '',

      // Connection pool options
      options: {
        maxPoolSize: 100,
        minPoolSize: 10,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
      },

      // Database names
      databases: {
        controlPlane: 'rmap_control',
        sharedData: 'rmap_shared',
        tenantPrefix: 'rmap_tenant_', // For dedicated tenant databases
      },

      // Collection names
      collections: {
        control: {
          tenants: 'tenants',
          users: 'users',
          tenantUsers: 'tenant_users',
          sessions: 'sessions',
          platformAdmins: 'platform_admins',
          auditLogs: 'audit_logs',
          usageEvents: 'usage_events',
        },
        data: {
          campaigns: 'campaigns',
          audiences: 'audiences',
          analytics: 'analytics',
          workflows: 'workflows',
        },
      },
    };
  }
  return _config;
}

// Validate configuration
export function validateDatabaseConfig(): void {
  const config = getConfig();

  if (!config.uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (config.uri.includes('<db_password>')) {
    throw new Error('MongoDB URI contains placeholder password. Please set the actual password.');
  }

  // Check if URI is properly formatted
  if (!config.uri.startsWith('mongodb://') && !config.uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MongoDB URI format');
  }
}

// Export configuration via getter
export const databaseConfig = new Proxy({} as DatabaseConfig, {
  get(target, prop) {
    return (getConfig() as any)[prop];
  }
});

// Helper functions
export function getDedicatedDatabaseName(tenantSlug: string): string {
  return `${databaseConfig.databases.tenantPrefix}${tenantSlug}`;
}

export function isSharedTenant(plan: string): boolean {
  return plan === 'free' || plan === 'starter';
}

export function isDedicatedTenant(plan: string): boolean {
  return plan === 'professional' || plan === 'enterprise' || plan === 'custom';
}