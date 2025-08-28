import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  subscription: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'suspended';
    billingCycle: 'monthly' | 'annual';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt?: string;
    limits: {
      users: number;
      campaigns: number;
      apiCalls: number;
      storage: number;
      workflows: string[];
    };
    usage: {
      users: number;
      campaigns: number;
      apiCalls: number;
      storage: number;
    };
  };
  settings: {
    features: {
      sso: boolean;
      apiAccess: boolean;
      whiteLabel: boolean;
      customIntegrations: boolean;
      advancedAnalytics: boolean;
      prioritySupport: boolean;
    };
  };
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  switchTenant: (tenantSlug: string) => Promise<void>;
  refreshTenant: () => Promise<void>;
  checkFeature: (feature: keyof Tenant['settings']['features']) => boolean;
  checkWorkflowAccess: (workflowId: string) => boolean;
  checkLimit: (resource: keyof Tenant['subscription']['limits']) => boolean;
  getUsagePercentage: (resource: keyof Tenant['subscription']['usage']) => number;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      // Get tenant from subdomain, localStorage, or API
      const host = window.location.hostname;
      const subdomain = host.split('.')[0];
      
      // For localhost, use demo tenant
      const tenantSlug = host.includes('localhost') ? 'demo' : subdomain;
      
      // In production, fetch from API with auth token
      // For demo, use mock data
      const mockTenant: Tenant = {
        id: 'demo-tenant-id',
        name: 'Demo Company',
        slug: tenantSlug,
        logo: '/logo.png',
        subscription: {
          plan: 'professional',
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          limits: {
            users: 50,
            campaigns: 500,
            apiCalls: 100000,
            storage: 100,
            workflows: ['retail_media', 'google_ads', 'meta_ads', 'linkedin_ads', 'analytics', 'budget', 'calendar', 'data'],
          },
          usage: {
            users: 5,
            campaigns: 23,
            apiCalls: 1523,
            storage: 2.5,
          },
        },
        settings: {
          features: {
            sso: true,
            apiAccess: true,
            whiteLabel: false,
            customIntegrations: true,
            advancedAnalytics: true,
            prioritySupport: true,
          },
        },
      };
      
      setTenant(mockTenant);
      
      // Store tenant info for API calls
      localStorage.setItem('tenant', tenantSlug);
      
    } catch (error) {
      console.error('Failed to load tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = async (tenantSlug: string) => {
    setLoading(true);
    try {
      // In production, switch tenant context
      localStorage.setItem('tenant', tenantSlug);
      await loadTenant();
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshTenant = async () => {
    await loadTenant();
  };

  const checkFeature = (feature: keyof Tenant['settings']['features']): boolean => {
    if (!tenant) return false;
    return tenant.settings.features[feature];
  };

  const checkWorkflowAccess = (workflowId: string): boolean => {
    if (!tenant) return false;
    const workflows = tenant.subscription.limits.workflows;
    return workflows.includes('*') || workflows.includes(workflowId);
  };

  const checkLimit = (resource: keyof Tenant['subscription']['limits']): boolean => {
    if (!tenant) return false;
    const limit = tenant.subscription.limits[resource];
    const usage = tenant.subscription.usage[resource as keyof Tenant['subscription']['usage']];
    
    if (typeof limit === 'number' && typeof usage === 'number') {
      return limit === -1 || usage < limit;
    }
    return true;
  };

  const getUsagePercentage = (resource: keyof Tenant['subscription']['usage']): number => {
    if (!tenant) return 0;
    const limit = tenant.subscription.limits[resource as keyof Tenant['subscription']['limits']];
    const usage = tenant.subscription.usage[resource];
    
    if (typeof limit === 'number' && typeof usage === 'number') {
      if (limit === -1) return 0; // Unlimited
      return Math.round((usage / limit) * 100);
    }
    return 0;
  };

  return (
    <TenantContext.Provider
      value={{
        tenant,
        loading,
        switchTenant,
        refreshTenant,
        checkFeature,
        checkWorkflowAccess,
        checkLimit,
        getUsagePercentage,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};