import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { CampaignSchema, type Campaign } from '../types'

export const campaignRoutes = new Hono()

// In-memory storage for demo
const campaigns: Map<string, Campaign> = new Map()

// Get all campaigns
campaignRoutes.get('/', (c) => {
  const status = c.req.query('status')
  let campaignList = Array.from(campaigns.values())
  
  if (status) {
    campaignList = campaignList.filter(camp => camp.status === status)
  }
  
  return c.json({ campaigns: campaignList, total: campaignList.length })
})

// Get specific campaign
campaignRoutes.get('/:id', (c) => {
  const id = c.req.param('id')
  const campaign = campaigns.get(id)
  
  if (!campaign) {
    return c.json({ error: 'Campaign not found' }, 404)
  }
  
  return c.json(campaign)
})

// Create new campaign
campaignRoutes.post(
  '/',
  zValidator('json', CampaignSchema.omit({ id: true, performance: true })),
  (c) => {
    const data = c.req.valid('json')
    const id = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const campaign: Campaign = {
      ...data,
      id,
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        roas: 0,
      },
    }
    
    campaigns.set(id, campaign)
    return c.json(campaign, 201)
  }
)

// Update campaign
campaignRoutes.patch(
  '/:id',
  zValidator('json', CampaignSchema.partial().omit({ id: true })),
  (c) => {
    const id = c.req.param('id')
    const updates = c.req.valid('json')
    const existing = campaigns.get(id)
    
    if (!existing) {
      return c.json({ error: 'Campaign not found' }, 404)
    }
    
    const updated: Campaign = {
      ...existing,
      ...updates,
    }
    
    campaigns.set(id, updated)
    return c.json(updated)
  }
)

// Delete campaign
campaignRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const deleted = campaigns.delete(id)
  
  if (!deleted) {
    return c.json({ error: 'Campaign not found' }, 404)
  }
  
  return c.json({ success: true, deleted: id })
})

// Simulate campaign performance
campaignRoutes.post('/:id/simulate',
  zValidator('json', z.object({
    days: z.number().min(1).max(365),
    dailyBudget: z.number().positive(),
  })),
  (c) => {
    const id = c.req.param('id')
    const { days, dailyBudget } = c.req.valid('json')
    const campaign = campaigns.get(id)
    
    if (!campaign) {
      return c.json({ error: 'Campaign not found' }, 404)
    }
    
    // Mock simulation results
    const simulation = {
      campaignId: id,
      projectedMetrics: {
        impressions: Math.floor(dailyBudget * days * 1000),
        clicks: Math.floor(dailyBudget * days * 30),
        conversions: Math.floor(dailyBudget * days * 2),
        spend: dailyBudget * days,
        estimatedROAS: 2.5 + Math.random() * 2,
      },
      confidenceInterval: {
        lower: 0.8,
        upper: 1.2,
      },
      recommendations: [
        'Increase budget for better reach',
        'Consider A/B testing ad creatives',
        'Optimize for conversion events',
      ]
    }
    
    return c.json(simulation)
  }
)