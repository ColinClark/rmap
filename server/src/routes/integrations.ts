import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { IntegrationConfigSchema, type IntegrationConfig } from '../types'

export const integrationRoutes = new Hono()

// Store integration configs (in production, use a database)
const integrations: Map<string, IntegrationConfig> = new Map()

// Get all integrations
integrationRoutes.get('/', (c) => {
  const configs = Array.from(integrations.values())
  return c.json({ 
    integrations: configs,
    total: configs.length,
    active: configs.filter(i => i.active).length
  })
})

// Get specific integration
integrationRoutes.get('/:id', (c) => {
  const id = c.req.param('id')
  const integration = integrations.get(id)
  
  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404)
  }
  
  return c.json(integration)
})

// Add new integration
integrationRoutes.post(
  '/',
  zValidator('json', IntegrationConfigSchema.omit({ id: true })),
  (c) => {
    const data = c.req.valid('json')
    const id = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const integration: IntegrationConfig = {
      ...data,
      id,
    }
    
    integrations.set(id, integration)
    return c.json(integration, 201)
  }
)

// Update integration
integrationRoutes.patch(
  '/:id',
  zValidator('json', IntegrationConfigSchema.partial().omit({ id: true })),
  (c) => {
    const id = c.req.param('id')
    const updates = c.req.valid('json')
    const existing = integrations.get(id)
    
    if (!existing) {
      return c.json({ error: 'Integration not found' }, 404)
    }
    
    const updated: IntegrationConfig = {
      ...existing,
      ...updates,
    }
    
    integrations.set(id, updated)
    return c.json(updated)
  }
)

// Delete integration
integrationRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const deleted = integrations.delete(id)
  
  if (!deleted) {
    return c.json({ error: 'Integration not found' }, 404)
  }
  
  return c.json({ success: true, deleted: id })
})

// Test integration connection
integrationRoutes.post('/:id/test', async (c) => {
  const id = c.req.param('id')
  const integration = integrations.get(id)
  
  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404)
  }
  
  // Mock test results based on integration type
  const testResult = {
    integrationId: id,
    timestamp: new Date().toISOString(),
    success: Math.random() > 0.2, // 80% success rate for demo
    latency: Math.floor(Math.random() * 500) + 100,
    details: {
      connection: 'established',
      authentication: 'valid',
      permissions: ['read', 'write'],
    },
    errors: Math.random() > 0.8 ? ['Connection timeout'] : [],
  }
  
  return c.json(testResult)
})

// Execute integration action
integrationRoutes.post('/:id/execute',
  zValidator('json', z.object({
    action: z.string(),
    parameters: z.record(z.string(), z.any()).optional(),
  })),
  async (c) => {
    const id = c.req.param('id')
    const { action, parameters } = c.req.valid('json')
    const integration = integrations.get(id)
    
    if (!integration) {
      return c.json({ error: 'Integration not found' }, 404)
    }
    
    // Mock execution based on integration type
    let result: any = {}
    
    switch (integration.type) {
      case 'openapi':
        result = {
          status: 'success',
          data: {
            endpoint: action,
            response: { message: 'OpenAPI call successful' },
          }
        }
        break
        
      case 'mcp':
        result = {
          status: 'success',
          data: {
            server: integration.name,
            action,
            response: { tools: ['tool1', 'tool2'], resources: [] },
          }
        }
        break
        
      case 'database':
        result = {
          status: 'success',
          data: {
            query: action,
            rows: Math.floor(Math.random() * 100),
            executionTime: Math.random() * 100,
          }
        }
        break
        
      case 'webhook':
        result = {
          status: 'success',
          data: {
            url: integration.endpoint,
            statusCode: 200,
            response: { received: true },
          }
        }
        break
    }
    
    return c.json({
      integrationId: id,
      action,
      parameters,
      result,
      executedAt: new Date().toISOString(),
    })
  }
)

// Get integration metrics
integrationRoutes.get('/:id/metrics', (c) => {
  const id = c.req.param('id')
  const integration = integrations.get(id)
  
  if (!integration) {
    return c.json({ error: 'Integration not found' }, 404)
  }
  
  // Generate mock metrics
  const metrics = {
    integrationId: id,
    period: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    usage: {
      totalRequests: Math.floor(Math.random() * 10000) + 1000,
      successRate: Math.random() * 20 + 80,
      avgLatency: Math.random() * 200 + 50,
      errors: Math.floor(Math.random() * 100),
    },
    dailyStats: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      requests: Math.floor(Math.random() * 1500) + 100,
      errors: Math.floor(Math.random() * 10),
      avgLatency: Math.random() * 200 + 50,
    })),
  }
  
  return c.json(metrics)
})