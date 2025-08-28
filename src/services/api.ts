// API client for backend communication
const API_BASE = 'http://localhost:4000/api'

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `API Error: ${response.status}`)
  }
  
  return response.json()
}

// Audience API
export const audienceAPI = {
  getAll: () => apiCall('/audience'),
  getById: (id: string) => apiCall(`/audience/${id}`),
  create: (data: any) => apiCall('/audience', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/audience/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/audience/${id}`, {
    method: 'DELETE',
  }),
  analyzeOverlap: (segmentIds: string[]) => apiCall('/audience/analyze/overlap', {
    method: 'POST',
    body: JSON.stringify({ segmentIds }),
  }),
}

// Campaign API
export const campaignAPI = {
  getAll: (status?: string) => {
    const query = status ? `?status=${status}` : ''
    return apiCall(`/campaign${query}`)
  },
  getById: (id: string) => apiCall(`/campaign/${id}`),
  create: (data: any) => apiCall('/campaign', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/campaign/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/campaign/${id}`, {
    method: 'DELETE',
  }),
  simulate: (id: string, params: { days: number; dailyBudget: number }) => 
    apiCall(`/campaign/${id}/simulate`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),
}

// Analytics API
export const analyticsAPI = {
  getCampaignAnalytics: (
    campaignId: string, 
    params?: { startDate?: string; endDate?: string; granularity?: string }
  ) => {
    const query = new URLSearchParams(params as any).toString()
    return apiCall(`/analytics/campaign/${campaignId}${query ? `?${query}` : ''}`)
  },
  compare: (data: {
    campaignIds: string[]
    metric: string
    period: { startDate: string; endDate: string }
  }) => apiCall('/analytics/compare', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getRealtime: (campaignId: string) => apiCall(`/analytics/realtime/${campaignId}`),
  exportReport: (data: {
    campaignIds: string[]
    format: 'csv' | 'xlsx' | 'pdf' | 'json'
    period: { startDate: string; endDate: string }
    includeBreakdown?: boolean
  }) => apiCall('/analytics/export', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
}

// Integration API
export const integrationAPI = {
  getAll: () => apiCall('/integrations'),
  getById: (id: string) => apiCall(`/integrations/${id}`),
  create: (data: any) => apiCall('/integrations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/integrations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/integrations/${id}`, {
    method: 'DELETE',
  }),
  test: (id: string) => apiCall(`/integrations/${id}/test`, {
    method: 'POST',
  }),
  execute: (id: string, action: string, parameters?: any) => 
    apiCall(`/integrations/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ action, parameters }),
    }),
  getMetrics: (id: string) => apiCall(`/integrations/${id}/metrics`),
}

// Health check
export const healthCheck = () => apiCall('/health')