import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { type AnalyticsData } from '../types'

export const analyticsRoutes = new Hono()

// Get analytics for a campaign
analyticsRoutes.get('/campaign/:id', 
  zValidator('query', z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
  })),
  (c) => {
    const campaignId = c.req.param('id')
    const { startDate, endDate, granularity } = c.req.valid('query')
    
    // Generate mock analytics data
    const data: AnalyticsData[] = []
    const days = 7 // Generate 7 days of data
    
    for (let i = 0; i < days; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      data.push({
        campaignId,
        date: date.toISOString(),
        metrics: {
          impressions: Math.floor(Math.random() * 10000) + 5000,
          clicks: Math.floor(Math.random() * 500) + 100,
          ctr: Math.random() * 5 + 1,
          conversions: Math.floor(Math.random() * 50) + 10,
          conversionRate: Math.random() * 10 + 2,
          spend: Math.random() * 1000 + 500,
          revenue: Math.random() * 3000 + 1500,
          roas: Math.random() * 3 + 1.5,
        },
        breakdown: {
          byChannel: {
            display: { impressions: 3000, clicks: 150, spend: 300 },
            email: { impressions: 2000, clicks: 200, spend: 200 },
            social: { impressions: 5000, clicks: 150, spend: 500 },
          },
        },
      })
    }
    
    return c.json({
      campaignId,
      period: { startDate, endDate },
      granularity,
      data,
      summary: {
        totalImpressions: data.reduce((sum, d) => sum + d.metrics.impressions, 0),
        totalClicks: data.reduce((sum, d) => sum + d.metrics.clicks, 0),
        totalSpend: data.reduce((sum, d) => sum + d.metrics.spend, 0),
        avgROAS: data.reduce((sum, d) => sum + d.metrics.roas, 0) / data.length,
      }
    })
  }
)

// Get comparative analytics
analyticsRoutes.post('/compare',
  zValidator('json', z.object({
    campaignIds: z.array(z.string()).min(2).max(5),
    metric: z.enum(['impressions', 'clicks', 'conversions', 'spend', 'roas']),
    period: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }),
  })),
  (c) => {
    const { campaignIds, metric, period } = c.req.valid('json')
    
    // Generate comparison data
    const comparison = {
      metric,
      period,
      data: campaignIds.map(id => ({
        campaignId: id,
        values: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          value: Math.random() * 1000 + 500,
        })),
        total: Math.random() * 7000 + 3500,
        average: Math.random() * 1000 + 500,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        trendPercentage: Math.random() * 20 - 10,
      })),
      winner: campaignIds[Math.floor(Math.random() * campaignIds.length)],
      insights: [
        'Campaign A shows better performance during weekends',
        'Consider reallocating budget from Campaign B to Campaign A',
        'Campaign C has the highest conversion rate',
      ]
    }
    
    return c.json(comparison)
  }
)

// Get real-time metrics
analyticsRoutes.get('/realtime/:campaignId', (c) => {
  const campaignId = c.req.param('campaignId')
  
  // Generate real-time metrics
  const realtime = {
    campaignId,
    timestamp: new Date().toISOString(),
    activeUsers: Math.floor(Math.random() * 1000) + 100,
    currentSpend: Math.random() * 500 + 100,
    impressionsLastHour: Math.floor(Math.random() * 5000) + 1000,
    clicksLastHour: Math.floor(Math.random() * 200) + 50,
    conversionsLastHour: Math.floor(Math.random() * 20) + 5,
    alerts: [
      { level: 'info', message: 'Campaign performing above average' },
      { level: 'warning', message: 'Budget utilization at 75%' },
    ]
  }
  
  return c.json(realtime)
})

// Export analytics report
analyticsRoutes.post('/export',
  zValidator('json', z.object({
    campaignIds: z.array(z.string()),
    format: z.enum(['csv', 'xlsx', 'pdf', 'json']),
    period: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }),
    includeBreakdown: z.boolean().optional(),
  })),
  (c) => {
    const { campaignIds, format } = c.req.valid('json')
    
    // Mock export response
    const exportJob = {
      jobId: `export_${Date.now()}`,
      status: 'processing',
      format,
      campaignCount: campaignIds.length,
      estimatedTime: 30,
      downloadUrl: null,
    }
    
    return c.json(exportJob, 202)
  }
)