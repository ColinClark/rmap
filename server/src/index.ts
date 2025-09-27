import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
// import { z } from 'zod'
// import { zValidator } from '@hono/zod-validator'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from parent directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// Load configuration
import configLoader from './services/config/ConfigLoader'
const config = configLoader.loadConfig()

// Import MongoDB service
import { mongoService } from './services/mongodb'
import { emailService } from './services/EmailService'
import { Logger } from './utils/logger'

const appLogger = new Logger('Server')

// Import routes
import { authRoutes } from './routes/auth'
import { adminRoutes } from './routes/admin'
import { audienceRoutes } from './routes/audience'
import { campaignRoutes } from './routes/campaign'
import { analyticsRoutes } from './routes/analytics'
import { integrationRoutes } from './routes/integrations'
import { tenantRoutes } from './routes/tenant'
import { invitationRoutes } from './routes/invitation'
import queryRoutes from './routes/query'
import testMcpRoutes from './routes/test-mcp'
import { cohort } from './routes/cohort'
import { testEmailRoutes } from './routes/test-email'

// Import middleware
import { tenantMiddleware, tenantRateLimitMiddleware } from './middleware/tenant'
import { requestContextMiddleware } from './middleware/requestContext'

const app = new Hono()

// Global Middleware
// Request context should be first to capture all logs
app.use('*', requestContextMiddleware)
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'https://*.yourdomain.com'],
  credentials: true,
}))

// Health check (public)
app.get('/health', async (c) => {
  const dbHealthy = await mongoService.healthCheck()
  return c.json({
    status: dbHealthy ? 'healthy' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Auth routes (no tenant required)
app.route('/auth', authRoutes)

// Admin portal routes (separate auth)
app.route('/admin', adminRoutes)

// Apply tenant middleware to all /api routes
app.use('/api/*', tenantMiddleware)
app.use('/api/*', tenantRateLimitMiddleware)

// Tenant management routes
app.route('/api/tenant', tenantRoutes)

// API routes (tenant-scoped)
app.route('/api/audience', audienceRoutes)
app.route('/api/campaign', campaignRoutes)
app.route('/api/analytics', analyticsRoutes)
app.route('/api/integrations', integrationRoutes)
app.route('/api/invitations', invitationRoutes)
app.route('/api/query', queryRoutes)
app.route('/api/cohort', cohort)

// Test MCP routes (no tenant required for testing)
app.route('/test-mcp', testMcpRoutes)

// Test email routes (development only)
if (process.env.NODE_ENV === 'development') {
  app.route('/test-email', testEmailRoutes)
}

// Error handling
app.onError((err, c) => {
  console.error(`Error: ${err}`)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

const port = process.env.PORT || config.server.port || 4000

// Initialize MongoDB connection before starting server
async function startServer() {
  try {
    // Connect to MongoDB
    appLogger.info('Connecting to MongoDB...')
    await mongoService.connect()
    appLogger.info('MongoDB connected successfully')

    // Initialize email service
    appLogger.info('Initializing email service...')
    await emailService.initialize()
    appLogger.info('Email service initialized')

    // Initialize platform admin and app services
    appLogger.info('Initializing platform services...')
    const { platformAdminService } = await import('./services/PlatformAdminService')
    const { appEntitlementService } = await import('./services/AppEntitlementService')
    await platformAdminService.initializeDefaultAdmin()
    await appEntitlementService.initializeDefaultApps()
    await appEntitlementService.grantDefaultAppsToDemo()
    appLogger.info('Platform services initialized')

    // Start the server
    appLogger.info(`🚀 Server is running on http://localhost:${port}`)
    appLogger.info(`📊 MCP Synthiepop enabled: ${config.mcp.synthiepop.enabled}`)
    if (config.mcp.synthiepop.enabled) {
      appLogger.info(`   Connected to: ${config.mcp.synthiepop.protocol}://${config.mcp.synthiepop.host}:${config.mcp.synthiepop.port}`)
    }

    serve({
      fetch: app.fetch,
      port: Number(port),
    })
  } catch (error) {
    appLogger.error('Failed to start server', error)
    process.exit(1)
  }
}

// Start the server
startServer()