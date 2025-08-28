import { z } from 'zod'

// Subscription Plans
export const SubscriptionPlanSchema = z.enum([
  'free',
  'starter',
  'professional',
  'enterprise',
  'custom'
])

export const BillingCycleSchema = z.enum(['monthly', 'annual'])

// Tenant/Organization Schema
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/), // URL-safe slug
  domain: z.string().optional(), // Custom domain
  logo: z.string().url().optional(),
  
  // Contact Info
  contactEmail: z.string().email(),
  contactName: z.string(),
  contactPhone: z.string().optional(),
  
  // Address
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string(),
    postalCode: z.string().optional(),
  }).optional(),
  
  // Subscription
  subscription: z.object({
    plan: SubscriptionPlanSchema,
    status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'suspended']),
    billingCycle: BillingCycleSchema,
    currentPeriodStart: z.string().datetime(),
    currentPeriodEnd: z.string().datetime(),
    trialEndsAt: z.string().datetime().optional(),
    canceledAt: z.string().datetime().optional(),
    
    // Stripe/Payment Provider IDs
    customerId: z.string().optional(),
    subscriptionId: z.string().optional(),
    
    // Usage Limits
    limits: z.object({
      users: z.number(),
      campaigns: z.number(),
      apiCalls: z.number(),
      storage: z.number(), // in GB
      workflows: z.array(z.string()), // Available workflow IDs
    }),
    
    // Current Usage
    usage: z.object({
      users: z.number(),
      campaigns: z.number(),
      apiCalls: z.number(),
      storage: z.number(),
    }),
  }),
  
  // Settings
  settings: z.object({
    timezone: z.string().default('UTC'),
    dateFormat: z.string().default('MM/DD/YYYY'),
    currency: z.string().default('USD'),
    language: z.string().default('en'),
    
    // Features
    features: z.object({
      sso: z.boolean().default(false),
      apiAccess: z.boolean().default(false),
      whiteLabel: z.boolean().default(false),
      customIntegrations: z.boolean().default(false),
      advancedAnalytics: z.boolean().default(false),
      prioritySupport: z.boolean().default(false),
    }),
    
    // Security
    security: z.object({
      enforceSSO: z.boolean().default(false),
      enforce2FA: z.boolean().default(false),
      ipWhitelist: z.array(z.string()).optional(),
      sessionTimeout: z.number().default(30), // minutes
      passwordPolicy: z.object({
        minLength: z.number().default(8),
        requireUppercase: z.boolean().default(true),
        requireNumbers: z.boolean().default(true),
        requireSpecialChars: z.boolean().default(false),
        expirationDays: z.number().optional(),
      }),
    }),
  }),
  
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  
  // Status
  status: z.enum(['pending', 'active', 'suspended', 'deleted']),
  suspendedAt: z.string().datetime().optional(),
  suspendedReason: z.string().optional(),
})

// User with Tenant Association
export const TenantUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().url().optional(),
  
  // Tenant Association
  tenantId: z.string().uuid(),
  tenantRole: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']),
  
  // Permissions within tenant
  permissions: z.array(z.string()),
  departmentId: z.string().uuid().optional(),
  
  // Auth
  passwordHash: z.string().optional(),
  emailVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  
  // Status
  status: z.enum(['invited', 'active', 'suspended', 'deleted']),
  invitedAt: z.string().datetime().optional(),
  invitedBy: z.string().uuid().optional(),
  lastLoginAt: z.string().datetime().optional(),
  
  // Metadata
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Invitation Schema
export const TenantInvitationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'member', 'viewer']),
  permissions: z.array(z.string()).optional(),
  invitedBy: z.string().uuid(),
  invitedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  token: z.string(),
})

// API Key for Tenant
export const TenantAPIKeySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  lastUsedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  status: z.enum(['active', 'revoked', 'expired']),
})

// Usage Tracking
export const UsageEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum([
    'api_call',
    'campaign_created',
    'workflow_executed',
    'export_generated',
    'integration_synced',
    'user_added',
  ]),
  metadata: z.record(z.any()).optional(),
  billingRelevant: z.boolean().default(false),
  cost: z.number().optional(), // For usage-based billing
  timestamp: z.string().datetime(),
})

// Billing History
export const BillingEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  type: z.enum(['subscription', 'usage', 'addon', 'credit', 'refund']),
  amount: z.number(),
  currency: z.string().default('USD'),
  description: z.string(),
  invoiceId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  status: z.enum(['pending', 'processing', 'succeeded', 'failed']),
  createdAt: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
})

// Subscription Plans Configuration
export const PlanConfigSchema = z.object({
  id: SubscriptionPlanSchema,
  name: z.string(),
  description: z.string(),
  prices: z.object({
    monthly: z.number(),
    annual: z.number(),
  }),
  limits: z.object({
    users: z.number(),
    campaigns: z.number(),
    apiCalls: z.number(),
    storage: z.number(),
    workflows: z.array(z.string()),
  }),
  features: z.object({
    sso: z.boolean(),
    apiAccess: z.boolean(),
    whiteLabel: z.boolean(),
    customIntegrations: z.boolean(),
    advancedAnalytics: z.boolean(),
    prioritySupport: z.boolean(),
  }),
})

// Types
export type SubscriptionPlan = z.infer<typeof SubscriptionPlanSchema>
export type BillingCycle = z.infer<typeof BillingCycleSchema>
export type Tenant = z.infer<typeof TenantSchema>
export type TenantUser = z.infer<typeof TenantUserSchema>
export type TenantInvitation = z.infer<typeof TenantInvitationSchema>
export type TenantAPIKey = z.infer<typeof TenantAPIKeySchema>
export type UsageEvent = z.infer<typeof UsageEventSchema>
export type BillingEvent = z.infer<typeof BillingEventSchema>
export type PlanConfig = z.infer<typeof PlanConfigSchema>

// Subscription Plans
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    prices: { monthly: 0, annual: 0 },
    limits: {
      users: 3,
      campaigns: 5,
      apiCalls: 1000,
      storage: 1,
      workflows: ['retail_media', 'analytics'],
    },
    features: {
      sso: false,
      apiAccess: false,
      whiteLabel: false,
      customIntegrations: false,
      advancedAnalytics: false,
      prioritySupport: false,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams getting started',
    prices: { monthly: 99, annual: 990 },
    limits: {
      users: 10,
      campaigns: 50,
      apiCalls: 10000,
      storage: 10,
      workflows: ['retail_media', 'google_ads', 'meta_ads', 'analytics', 'budget'],
    },
    features: {
      sso: false,
      apiAccess: true,
      whiteLabel: false,
      customIntegrations: false,
      advancedAnalytics: true,
      prioritySupport: false,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing marketing teams',
    prices: { monthly: 299, annual: 2990 },
    limits: {
      users: 50,
      campaigns: 500,
      apiCalls: 100000,
      storage: 100,
      workflows: ['retail_media', 'google_ads', 'meta_ads', 'linkedin_ads', 'dsp', 'analytics', 'budget', 'calendar', 'data'],
    },
    features: {
      sso: true,
      apiAccess: true,
      whiteLabel: false,
      customIntegrations: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    prices: { monthly: 999, annual: 9990 },
    limits: {
      users: -1, // Unlimited
      campaigns: -1,
      apiCalls: -1,
      storage: 1000,
      workflows: ['*'], // All workflows
    },
    features: {
      sso: true,
      apiAccess: true,
      whiteLabel: true,
      customIntegrations: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Tailored to your needs',
    prices: { monthly: -1, annual: -1 }, // Contact sales
    limits: {
      users: -1,
      campaigns: -1,
      apiCalls: -1,
      storage: -1,
      workflows: ['*'],
    },
    features: {
      sso: true,
      apiAccess: true,
      whiteLabel: true,
      customIntegrations: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
  },
}