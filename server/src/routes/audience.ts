import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { AudienceSegmentSchema, type AudienceSegment } from '../types'

export const audienceRoutes = new Hono()

// In-memory storage for demo (replace with database)
const audiences: Map<string, AudienceSegment> = new Map()

// Get all audience segments
audienceRoutes.get('/', (c) => {
  const segments = Array.from(audiences.values())
  return c.json({ segments, total: segments.length })
})

// Get specific audience segment
audienceRoutes.get('/:id', (c) => {
  const id = c.req.param('id')
  const segment = audiences.get(id)
  
  if (!segment) {
    return c.json({ error: 'Segment not found' }, 404)
  }
  
  return c.json(segment)
})

// Create new audience segment
audienceRoutes.post(
  '/',
  zValidator('json', AudienceSegmentSchema.omit({ id: true, created: true, updated: true })),
  (c) => {
    const data = c.req.valid('json')
    const id = `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    
    const segment: AudienceSegment = {
      ...data,
      id,
      created: now,
      updated: now,
    }
    
    audiences.set(id, segment)
    return c.json(segment, 201)
  }
)

// Update audience segment
audienceRoutes.put(
  '/:id',
  zValidator('json', AudienceSegmentSchema.partial().omit({ id: true, created: true })),
  (c) => {
    const id = c.req.param('id')
    const updates = c.req.valid('json')
    const existing = audiences.get(id)
    
    if (!existing) {
      return c.json({ error: 'Segment not found' }, 404)
    }
    
    const updated: AudienceSegment = {
      ...existing,
      ...updates,
      updated: new Date().toISOString(),
    }
    
    audiences.set(id, updated)
    return c.json(updated)
  }
)

// Delete audience segment
audienceRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const deleted = audiences.delete(id)
  
  if (!deleted) {
    return c.json({ error: 'Segment not found' }, 404)
  }
  
  return c.json({ success: true, deleted: id })
})

// Analyze audience overlap
audienceRoutes.post('/analyze/overlap', 
  zValidator('json', z.object({
    segmentIds: z.array(z.string()).min(2),
  })),
  (c) => {
    const { segmentIds } = c.req.valid('json')
    
    // Mock overlap analysis (implement with actual data)
    const overlap = {
      segmentIds,
      totalUnique: Math.floor(Math.random() * 100000) + 50000,
      overlapPercentage: Math.random() * 30 + 10,
      recommendations: [
        'Consider combining segments for better reach',
        'Overlap indicates similar audience interests',
      ]
    }
    
    return c.json(overlap)
  }
)