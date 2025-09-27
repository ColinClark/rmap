#!/usr/bin/env tsx
/**
 * Check apps in database
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { mongoService } from '../src/services/mongodb'
import { appEntitlementService } from '../src/services/AppEntitlementService'
import { Logger } from '../src/utils/logger'

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const logger = new Logger('CheckApps')

async function main() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...')
    await mongoService.connect()
    logger.info('Connected to MongoDB')

    // Get all apps
    logger.info('Fetching all apps...')
    const apps = await appEntitlementService.getAllApps()

    if (apps.length === 0) {
      logger.warn('No apps found in database')

      // Initialize default apps
      logger.info('Initializing default apps...')
      await appEntitlementService.initializeDefaultApps()

      // Fetch again
      const appsAfterInit = await appEntitlementService.getAllApps()
      logger.info(`Initialized ${appsAfterInit.length} apps`)

      for (const app of appsAfterInit) {
        logger.info(`- ${app.name} (${app.id}): ${app.status}`)
      }
    } else {
      logger.info(`Found ${apps.length} apps:`)
      for (const app of apps) {
        logger.info(`- ${app.name} (${app.id}): ${app.status}`)
      }
    }

    process.exit(0)
  } catch (error) {
    logger.error('Error:', error)
    process.exit(1)
  }
}

main()