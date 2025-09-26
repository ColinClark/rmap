/**
 * Central configuration for the application
 * All paths and environment settings should be defined here
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Define project root as absolute path
export const PROJECT_ROOT = '/Users/colin.clark/Dev/rmap';
export const SERVER_ROOT = path.join(PROJECT_ROOT, 'server');

// Load environment variables from project root
const envPath = path.join(PROJECT_ROOT, '.env');
dotenv.config({ path: envPath });

// Export all configuration modules
export * from './database.config';

// Application configuration
export const appConfig = {
  projectRoot: PROJECT_ROOT,
  serverRoot: SERVER_ROOT,
  envPath: envPath,

  // Server settings
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    host: process.env.HOST || 'localhost',
    env: process.env.NODE_ENV || 'development',
  },

  // API settings
  api: {
    prefix: '/api',
    version: 'v1',
  },

  // Security settings
  security: {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtExpiresIn: '15m',
    refreshTokenExpiresIn: '30d',
    bcryptRounds: 10,
  },

  // External services
  services: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
    statista: {
      apiKey: process.env.STATISTA_API_KEY,
    },
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: path.join(SERVER_ROOT, 'logs'),
    levels: {
      error: 'error',
      warn: 'warn',
      info: 'info',
      http: 'http',
      verbose: 'verbose',
      debug: 'debug',
      silly: 'silly'
    },
    // File rotation settings
    rotation: {
      maxSize: '20m',
      maxFiles: '14d',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true
    },
    // Separate configurations for different log types
    errorLog: {
      maxFiles: '30d'
    },
    auditLog: {
      maxFiles: '90d'
    }
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    'MONGODB_URI',
    'ANTHROPIC_API_KEY',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Check for placeholder values
  if (process.env.MONGODB_URI?.includes('<db_password>')) {
    throw new Error('MongoDB URI contains placeholder password. Please set the actual password in .env');
  }
}