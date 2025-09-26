#!/usr/bin/env node
/**
 * Test MongoDB Atlas connection
 * Run: npx tsx src/scripts/test-connection.ts
 */

import { MongoClient } from 'mongodb';
import { Logger } from '../utils/logger';
import { databaseConfig, PROJECT_ROOT } from '../config';

const logger = new Logger('TestConnection');

async function testConnection() {
  const uri = databaseConfig.uri;

  if (!uri) {
    logger.error('MONGODB_URI not found in .env file');
    logger.info(`Check the .env file at: ${PROJECT_ROOT}/.env`);
    process.exit(1);
  }

  if (uri.includes('<db_password>')) {
    logger.error('Please replace <db_password> in your .env file with your actual MongoDB password');
    logger.info(`Edit the file: ${PROJECT_ROOT}/.env`);
    logger.info('Replace <db_password> with your MongoDB Atlas database user password');
    process.exit(1);
  }

  logger.info('Testing MongoDB Atlas connection...');
  logger.info(`Cluster: VAD (vad.wyxupx.mongodb.net)`);

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    await client.connect();
    logger.info('✅ Connected successfully to MongoDB Atlas!');

    // Ping the deployment
    await client.db('admin').command({ ping: 1 });
    logger.info('✅ Ping successful');

    // List existing databases
    const adminDb = client.db().admin();
    const dbList = await adminDb.listDatabases();

    logger.info('');
    logger.info('Existing databases:');
    dbList.databases.forEach(db => {
      logger.info(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Check if our databases exist
    const hasControlPlane = dbList.databases.some(db => db.name === databaseConfig.databases.controlPlane);
    const hasSharedData = dbList.databases.some(db => db.name === databaseConfig.databases.sharedData);

    logger.info('');
    logger.info('RMAP Databases:');
    logger.info(`  - ${databaseConfig.databases.controlPlane}: ${hasControlPlane ? '✅ Exists' : '❌ Not found (will be created)'}`);
    logger.info(`  - ${databaseConfig.databases.sharedData}: ${hasSharedData ? '✅ Exists' : '❌ Not found (will be created)'}`);

    logger.info('');
    logger.info('Connection test complete!');
    logger.info('');
    logger.info('Next steps:');
    if (!hasControlPlane || !hasSharedData) {
      logger.info('1. Initialize databases: npx tsx src/scripts/init-databases.ts');
      logger.info('2. Create admin user: npx tsx src/scripts/create-admin.ts');
    } else {
      logger.info('1. Databases already exist. You can start the server: npm run dev');
    }

    await client.close();
    process.exit(0);
  } catch (error: any) {
    logger.error(`Connection failed: ${error.message}`);

    if (error.message.includes('authentication failed')) {
      logger.info('');
      logger.info('Authentication failed. Please check:');
      logger.info('1. Your password is correct in the .env file');
      logger.info('2. The database user "colinclark" exists in MongoDB Atlas');
      logger.info('3. The user has the correct permissions');
    } else if (error.message.includes('ENOTFOUND')) {
      logger.info('');
      logger.info('Could not reach MongoDB Atlas. Please check:');
      logger.info('1. Your internet connection');
      logger.info('2. The cluster name is correct (vad.wyxupx.mongodb.net)');
    } else if (error.message.includes('IP')) {
      logger.info('');
      logger.info('IP not whitelisted. Please:');
      logger.info('1. Go to MongoDB Atlas Network Access settings');
      logger.info('2. Add your current IP address or allow access from anywhere (0.0.0.0/0)');
    }

    await client.close();
    process.exit(1);
  }
}

// Run the test
testConnection();