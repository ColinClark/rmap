import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

// Import routes
import { audienceRoutes } from './routes/audience'
import { campaignRoutes } from './routes/campaign'
import { analyticsRoutes } from './routes/analytics'
import { integrationRoutes } from './routes/integrations'
import { tenantRoutes } from './routes/tenant'

// Import middleware
import { tenantMiddleware, tenantRateLimitMiddleware } from './middleware/tenant'

const app = new Hono()

// Global Middleware
app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://*.yourdomain.com'],
  credentials: true,
}))

// Health check (public)
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Public auth routes (no tenant required)
app.post('/auth/register', async (c) => {
  // Handle tenant registration
  return c.json({ message: 'Registration endpoint' })
})

app.post('/auth/login', async (c) => {
  // Handle login
  return c.json({ message: 'Login endpoint' })
})

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

// Error handling
app.onError((err, c) => {
  console.error(`Error: ${err}`)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404)
})

const port = process.env.PORT || 4000
console.log(`🚀 Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port: Number(port),
})