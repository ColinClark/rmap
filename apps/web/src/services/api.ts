import { generateCorrelationId, storeServerCorrelationId } from './correlationId';

// API client for backend communication
const API_BASE = 'http://localhost:4000/api'
const AUTH_BASE = 'http://localhost:4000/auth'

// Helper function for API calls with correlation ID
async function apiCall(endpoint: string, options: RequestInit = {}, useAuthBase = false) {
  // Generate correlation ID for this request
  const correlationId = generateCorrelationId();

  // Get tenant context if available
  const tenantId = localStorage.getItem('tenantId');
  const sessionId = sessionStorage.getItem('sessionId');
  const accessToken = localStorage.getItem('accessToken');

  const baseUrl = useAuthBase ? AUTH_BASE : API_BASE;
  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      ...(tenantId && { 'X-Tenant-ID': tenantId }),
      ...(sessionId && { 'X-Session-ID': sessionId }),
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    },
    credentials: 'include',
  })
  
  // Store server's correlation ID if provided
  const serverCorrelationId = response.headers.get('X-Correlation-ID');
  if (serverCorrelationId) {
    storeServerCorrelationId(serverCorrelationId);
    
    // Log correlation for debugging
    console.debug(`Request ${correlationId} -> Server ${serverCorrelationId}`);
  }
  
  // Handle 401 Unauthorized - attempt to refresh token
  // Skip auto-refresh only for the /refresh endpoint itself to avoid infinite loops
  if (response.status === 401 && endpoint !== '/refresh') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        // Attempt to refresh the access token
        const refreshResponse = await authAPI.refresh();

        // Retry the original request with the new token
        const newAccessToken = localStorage.getItem('accessToken');
        const retryResponse = await fetch(`${baseUrl}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': correlationId,
            ...(tenantId && { 'X-Tenant-ID': tenantId }),
            ...(sessionId && { 'X-Session-ID': sessionId }),
            ...(newAccessToken && { 'Authorization': `Bearer ${newAccessToken}` }),
            ...options.headers,
          },
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`API Error after refresh [${correlationId}]:`, error);
          throw new Error(error.error || `API Error: ${retryResponse.status}`);
        }

        return retryResponse.json();
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Token refresh failed:', refreshError);
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    } else {
      // No refresh token available, clear and redirect to login
      console.log('No refresh token available for 401 response');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    console.error(`API Error [${correlationId}]:`, error);
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

// Tenant API
export const tenantAPI = {
  getCurrent: () => apiCall('/tenant/current'),
  updateSettings: (data: any) => apiCall('/tenant/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  getUsers: () => apiCall('/tenant/users'),
  inviteUser: (data: { email: string; role: string; permissions?: string[] }) =>
    apiCall('/tenant/users/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeUser: (userId: string) => apiCall(`/tenant/users/${userId}`, {
    method: 'DELETE',
  }),
  getUsage: () => apiCall('/tenant/usage'),
  getBilling: () => apiCall('/tenant/billing'),
  updateSubscription: (data: { plan: string; billingCycle: string }) =>
    apiCall('/tenant/billing/subscription', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Auth API
// User Profile API (user routes don't require tenant context)
const USER_BASE = 'http://localhost:4000/user'

export const userAPI = {
  getProfile: async () => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  updateProfile: async (data: any) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  changePassword: async (data: any) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
    return response.json();
  },

  enable2FA: async () => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/enable-2fa`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) throw new Error('Failed to enable 2FA');
    return response.json();
  },

  verify2FA: async (token: string) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/verify-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) throw new Error('Failed to verify 2FA');
    return response.json();
  },

  disable2FA: async (password: string) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/disable-2fa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) throw new Error('Failed to disable 2FA');
    return response.json();
  },

  deleteAccount: async (password: string, confirmation: string) => {
    const accessToken = localStorage.getItem('accessToken');
    const response = await fetch(`${USER_BASE}/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password, confirmation }),
    });
    if (!response.ok) throw new Error('Failed to delete account');
    return response.json();
  },
}

export const authAPI = {
  login: async (email: string, password: string, tenantId?: string) => {
    const response = await apiCall('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, tenantId }),
    }, true) // Use AUTH_BASE

    // Store tokens and tenant info
    if (response.tokens?.accessToken) {
      localStorage.setItem('accessToken', response.tokens.accessToken)
      localStorage.setItem('refreshToken', response.tokens.refreshToken)
    }
    if (response.session?.sessionToken) {
      sessionStorage.setItem('sessionToken', response.session.sessionToken)
    }
    if (response.user) {
      localStorage.setItem('userId', response.user.id)
      localStorage.setItem('userEmail', response.user.email)
    }

    return response
  },

  register: async (email: string, password: string, name: string, tenantName?: string) => {
    const response = await apiCall('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, tenantName }),
    }, true) // Use AUTH_BASE

    // Store tokens and tenant info
    if (response.tokens?.accessToken) {
      localStorage.setItem('accessToken', response.tokens.accessToken)
      localStorage.setItem('refreshToken', response.tokens.refreshToken)
    }
    if (response.session?.sessionToken) {
      sessionStorage.setItem('sessionToken', response.session.sessionToken)
    }
    if (response.user) {
      localStorage.setItem('userId', response.user.id)
      localStorage.setItem('userEmail', response.user.email)
    }

    return response
  },

  logout: async () => {
    try {
      await apiCall('/logout', {
        method: 'POST',
      }, true) // Use AUTH_BASE
    } finally {
      // Clear all stored auth data
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userId')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('tenantId')
      sessionStorage.removeItem('sessionToken')
    }
  },

  refresh: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiCall('/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, true) // Use AUTH_BASE

    // Store new access token
    if (response.accessToken) {
      localStorage.setItem('accessToken', response.accessToken)
    }

    return response
  },

  me: async () => {
    return apiCall('/me', {}, true) // Use AUTH_BASE
  },

  forgotPassword: async (email: string) => {
    return apiCall('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, true) // Use AUTH_BASE
  },

  resetPassword: async (token: string, newPassword: string) => {
    return apiCall('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }, true) // Use AUTH_BASE
  },

  verifyEmail: async (token: string) => {
    return apiCall('/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }, true) // Use AUTH_BASE
  },
}