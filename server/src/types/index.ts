import { z } from 'zod'

// Shared types between frontend and backend
export const AudienceSegmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  size: z.number(),
  criteria: z.object({
    demographics: z.object({
      ageRange: z.tuple([z.number(), z.number()]).optional(),
      gender: z.enum(['male', 'female', 'all']).optional(),
      location: z.array(z.string()).optional(),
    }).optional(),
    behaviors: z.object({
      purchaseHistory: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
    }).optional(),
    interests: z.array(z.string()).optional(),
  }),
  created: z.string().datetime(),
  updated: z.string().datetime(),
})

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  objective: z.enum(['awareness', 'consideration', 'conversion', 'retention']),
  budget: z.number(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  audienceSegments: z.array(z.string()), // Array of segment IDs
  channels: z.array(z.enum(['display', 'email', 'social', 'search', 'video'])),
  performance: z.object({
    impressions: z.number(),
    clicks: z.number(),
    conversions: z.number(),
    spend: z.number(),
    roas: z.number(),
  }).optional(),
})

export const AnalyticsDataSchema = z.object({
  campaignId: z.string(),
  date: z.string().datetime(),
  metrics: z.object({
    impressions: z.number(),
    clicks: z.number(),
    ctr: z.number(),
    conversions: z.number(),
    conversionRate: z.number(),
    spend: z.number(),
    revenue: z.number(),
    roas: z.number(),
  }),
  breakdown: z.object({
    byChannel: z.record(z.string(), z.any()).optional(),
    bySegment: z.record(z.string(), z.any()).optional(),
    byProduct: z.record(z.string(), z.any()).optional(),
  }).optional(),
})

// API integration schemas
export const IntegrationConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['openapi', 'mcp', 'database', 'webhook']),
  name: z.string(),
  endpoint: z.string().url().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    bearer: z.string().optional(),
  }).optional(),
  config: z.record(z.string(), z.any()).optional(),
  active: z.boolean(),
})

export type AudienceSegment = z.infer<typeof AudienceSegmentSchema>
export type Campaign = z.infer<typeof CampaignSchema>
export type AnalyticsData = z.infer<typeof AnalyticsDataSchema>
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>