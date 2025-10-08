/**
 * Central configuration for the application
 * All paths and environment settings should be defined here
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Define project root dynamically from current working directory
export const PROJECT_ROOT = path.resolve(process.cwd(), '..');
export const SERVER_ROOT = process.cwd();

// Load environment variables - try server/.env first, then root .env
const serverEnvPath = path.join(SERVER_ROOT, '.env');
const projectEnvPath = path.join(PROJECT_ROOT, '.env');

// Load both, with server/.env taking precedence
dotenv.config({ path: projectEnvPath });
dotenv.config({ path: serverEnvPath });

// Export all configuration modules
export * from './database.config';

// Application configuration
export const appConfig = {
  projectRoot: PROJECT_ROOT,
  serverRoot: SERVER_ROOT,
  envPath: serverEnvPath,

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