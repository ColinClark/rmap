# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RMAP (Retail Media Advertising Platform)** - A comprehensive multi-tenant SaaS marketing platform for managing retail media campaigns, audience segments, and cross-channel advertising. Built with React, TypeScript, Hono backend, and designed for enterprise-scale cloud deployment with subscription-based pricing.

## Key Principles

1. **Multi-Tenancy First**: Every feature must respect tenant boundaries and isolation
2. **Security by Default**: All data access requires authentication and tenant validation
3. **Scalability**: Design for horizontal scaling and high availability
4. **Type Safety**: Use TypeScript strictly with no `any` types
5. **Clean Architecture**: Separate concerns between UI, business logic, and data layers

## Commands

### Development
```bash
# Frontend
npm install          # Install dependencies
npm run dev          # Start frontend dev server on port 3000
npm run build        # Build for production

# Backend
cd server
npm install          # Install backend dependencies
npm run dev          # Start backend dev server on port 4000
npm run build        # Build backend for production
```

## Architecture

### Multi-Tenant Structure
The application is a multi-tenant SaaS platform with:
- Tenant isolation at API level via middleware
- Subscription-based feature access
- Usage tracking and limits enforcement
- Team management with role-based permissions

### Frontend Architecture

#### Core Contexts
- **AuthContext**: User authentication and session management
- **TenantContext**: Organization context, subscription info, usage limits

#### Key Pages
1. **Login** - Multi-tenant aware authentication
2. **Dashboard** - Workflow grid with permission-based access
3. **TenantSettings** - Organization management, billing, team, usage
4. **Workflows**:
   - RetailMediaWorkflow - Complete 8-step campaign workflow

#### Workflow Components (RetailMediaWorkflow)
1. **BrandProductSelection** - Initial brand/product selection
2. **CampaignSetup** - Campaign configuration (budget, timeline, objectives)
3. **CohortBuilder** - AI-powered natural language audience segmentation
4. **AudienceRefinement** - Demographic filtering and refinement
5. **StrategyGenerator** - AI-driven strategy generation
6. **ComparativeDashboard** - Strategy comparison and analysis
7. **CollaborationPanel** - Campaign export and activation (formerly CampaignExport)
8. **PerformanceMonitoring** - Real-time campaign tracking

#### Component Organization
```
src/
├── workflows/          # Individual workflow modules
│   └── RetailMediaWorkflow.tsx
├── pages/             # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   └── TenantSettings.tsx
├── layouts/           # Layout wrappers
│   └── DashboardLayout.tsx
├── contexts/          # React contexts
│   ├── AuthContext.tsx
│   └── TenantContext.tsx
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui Radix-based components
│   ├── CohortBuilder.tsx
│   ├── AudienceRefinement.tsx
│   └── [other workflow components]
├── services/          # API services
│   ├── api.ts       # Core API client
│   └── correlationId.ts # Request tracking
└── types/            # Centralized type definitions
    └── index.ts      # Shared types across components
```

### Backend Architecture

#### Middleware
- **tenantMiddleware**: Identifies and validates tenant for every request
- **requestContext**: Request context and correlation ID tracking
- **tenantRateLimitMiddleware**: Enforces API usage limits
- **requireTenantRole**: Role-based access control
- **requireWorkflow**: Subscription-based workflow access

#### Routes
- `/api/tenant/*` - Organization management endpoints
- `/api/cohort/*` - AI-powered cohort building with Claude integration
- `/api/audience/*` - Audience segment management (tenant-scoped)
- `/api/campaign/*` - Campaign operations (tenant-scoped)
- `/api/analytics/*` - Analytics and reporting (tenant-scoped)
- `/api/integrations/*` - External API integrations

#### MCP (Model Context Protocol) Integrations
- **SynthiePop MCP** - Access to 83M synthetic German population records
  - Host: localhost:8002
  - Tools: catalog, sql, search
- **Statista MCP** - Market data and statistics
  - URL: https://api.statista.ai/v1
  - Tools: search-statistics, get-chart-data-by-id

#### Data Models
```typescript
// Core tenant structure
Tenant {
  id, name, slug,
  subscription: { plan, status, limits, usage },
  settings: { features, security }
}

// Subscription plans
Plans: free | starter | professional | enterprise | custom

// User roles within tenant
Roles: owner | admin | manager | member | viewer
```

### Tenant Identification
1. Subdomain: `{tenant}.platform.com`
2. Custom domain: `platform.{tenant}.com`
3. API header: `X-Tenant-ID` or `X-Tenant-Slug`
4. JWT claims: Embedded tenant info
5. Session/Cookie: For web app

## Key Technical Patterns

### Data Isolation
- All database queries include `tenantId` filter
- API responses filtered by tenant context
- File storage partitioned by tenant

### Usage Tracking
```typescript
// Check before operations
if (!tenant.checkLimit('campaigns')) {
  throw new Error('Campaign limit reached');
}

// Track usage
await trackUsage(tenantId, 'api_call');
```

### Permission Checks
```typescript
// Frontend
if (checkWorkflowAccess('retail_media')) {
  // Show workflow
}

// Backend
app.use('/api/workflow', requireWorkflow('retail_media'))
```

### Subscription Features
```typescript
// Feature flags
if (tenant.checkFeature('sso')) {
  // Enable SSO
}

// Plan-based limits
const canAddUser = tenant.subscription.usage.users < tenant.subscription.limits.users;
```

## Deployment Considerations

### Environment Variables
```env
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Frontend
VITE_API_URL=https://api.platform.com
VITE_STRIPE_PUBLIC_KEY=...
```

### Multi-tenant Database
- Use PostgreSQL with Row Level Security (RLS)
- Consider schema-per-tenant for large enterprise clients
- Implement connection pooling per tenant

### Scaling Strategy
1. Frontend: CDN with geo-distribution
2. Backend: Horizontal scaling with load balancer
3. Database: Read replicas, connection pooling
4. Cache: Redis with tenant-prefixed keys
5. Storage: S3 with tenant-prefixed paths

## Security Considerations

### Tenant Isolation
- Never expose other tenants' data
- Validate tenant context on every request
- Use parameterized queries with tenant filter
- Audit log all cross-tenant operations

### Authentication Flow
1. User logs in with email/password
2. Identify tenant from email domain or selection
3. Generate JWT with tenant claims
4. All subsequent requests include tenant context

### Rate Limiting
- Per-tenant API limits based on subscription
- Implement circuit breakers for tenant isolation
- Track and alert on unusual usage patterns

## Testing Strategy

### Multi-tenant Testing
```typescript
// Always test with multiple tenant contexts
describe('Campaign API', () => {
  it('should isolate data between tenants', async () => {
    const tenant1Data = await api.get('/campaigns', { tenant: 'tenant1' });
    const tenant2Data = await api.get('/campaigns', { tenant: 'tenant2' });
    expect(tenant1Data).not.toContain(tenant2Data);
  });
});
```

## Common Development Tasks

### Adding a New Workflow
1. Create workflow component in `src/workflows/`
2. Add to workflow grid in Dashboard
3. Add permission check in backend
4. Update subscription plans with workflow access

### Adding a New Subscription Feature
1. Update `TenantSchema` in `server/src/types/tenant.ts`
2. Add feature flag check in frontend
3. Update TenantSettings UI
4. Add middleware check in backend

### Onboarding a New Tenant
1. Create tenant record with chosen plan
2. Set up subdomain or custom domain
3. Create owner user account
4. Initialize default settings
5. Send welcome email with setup instructions

## Recent Updates & Known Issues

### Recent Implementations
- **Statista MCP Integration**: Full integration with market data API
- **AI Cohort Builder**: Natural language processing with Claude Sonnet 4
- **Request Context**: Correlation ID tracking across services
- **Type Centralization**: Shared types in `src/types/index.ts`
- **Auto-save Cohorts**: Automatic saving when SQL queries return results

### Performance Optimizations
- **AudienceRefinement**: Limited to 100 records (prevents browser hang)
- **LLM Iterations**: Increased from 20 to 50 for complex queries
- **SSE Streaming**: Real-time response streaming for chat interface

### Known Issues & Fixes
1. **Navigation Issues**: Fixed missing imports from '../App'
2. **Component Naming**: CollaborationPanel (not CampaignExport)
3. **Session Management**: Statista MCP session handled by server
4. **Result Counting**: Fixed Statista search result display (items array)

## Important Notes
- Always use the structured logging system (Logger class)
- Check for existing components before creating new ones
- Types should be imported from `../types` not `../App`
- Limit database queries to reasonable sizes for UI display
- Use environment variables for all API keys and secrets