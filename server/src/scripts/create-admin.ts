#!/usr/bin/env node
/**
 * Create a platform admin user
 * Run: npx tsx src/scripts/create-admin.ts
 */

import * as readline from 'readline';
import * as crypto from 'crypto';
import { mongoService } from '../services/mongodb';
import { Logger } from '../utils/logger';
import { appConfig } from '../config';

const logger = new Logger('CreateAdmin');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

function hashPassword(password: string): string {
  // In production, use bcrypt instead
  // This is a simple hash for demo purposes
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createPlatformAdmin() {
  try {
    logger.info('Platform Admin Creation');
    logger.info('========================');

    // Get admin details
    const email = await question('Admin email: ');
    const password = await question('Admin password: ');
    const name = await question('Admin name: ');

    // Validate email
    if (!email.includes('@')) {
      throw new Error('Invalid email address');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    logger.info('Connecting to MongoDB...');
    await mongoService.connect();

    const controlDB = mongoService.getControlDB();
    const adminsCollection = controlDB.collection('platform_admins');

    // Check if admin already exists
    const existing = await adminsCollection.findOne({ email });
    if (existing) {
      throw new Error('Admin with this email already exists');
    }

    // Create admin
    const admin = {
      _id: crypto.randomBytes(16).toString('hex'),
      email,
      passwordHash: hashPassword(password),
      name,
      permissions: ['*'],
      mfaRequired: false,
      ipWhitelist: [],
      createdAt: new Date(),
      lastLogin: null,
      status: 'active'
    };

    await adminsCollection.insertOne(admin);

    logger.info('✅ Platform admin created successfully!');
    logger.info('');
    logger.info('Admin Details:');
    logger.info(`Email: ${email}`);
    logger.info(`Name: ${name}`);
    logger.info('');
    logger.info('You can now log in to the platform admin panel at:');
    logger.info('http://localhost:3000/platform-admin');

    rl.close();
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create admin', error);
    rl.close();
    process.exit(1);
  }
}

// Run the script
createPlatformAdmin();