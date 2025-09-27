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

### Development (Monorepo)
```bash
# Install all dependencies (from root)
npm install

# Run both frontend apps with hot reload
npm run dev                 # Run everything (packages + apps)
npm run dev:frontend        # Run only web and admin apps
npm run dev:apps           # Alternative for running all apps

# Run individual apps
npm run dev:web            # Web app only (port 3000)
npm run dev:admin          # Admin app only (port 3001)

# Build commands
npm run build              # Build everything
npm run build:web          # Build web app only
npm run build:admin        # Build admin app only

# Backend (separate terminal)
cd server
npm install
npm run dev                # Start backend on port 4000
npm run test              # Run all backend tests
npm run setup:demo-tenant  # Create demo tenant and user
```

## Architecture

### Monorepo Structure (NEW!)
The project now uses a monorepo architecture with Turborepo:
```
rmap/
├── apps/
│   ├── web/              # Main web application (port 3000)
│   └── admin/            # Admin portal (port 3001)
├── packages/
│   ├── types/            # Shared TypeScript types (@rmap/types)
│   └── ui/               # Shared UI components (@rmap/ui)
├── server/               # Backend API (port 4000)
├── turbo.json           # Turborepo configuration
└── package.json         # Root workspace configuration
```

### Multi-Tenant Structure
The application is a multi-tenant SaaS platform with:
- Tenant isolation at API level via middleware
- Subscription-based feature access
- Usage tracking and limits enforcement
- Team management with role-based permissions
- MongoDB Atlas for data persistence
- Platform admin portal for tenant management

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

## Current Status (Session Date: 2025-09-26)

### ✅ What's Working
1. **Monorepo Architecture**
   - Turborepo build pipeline with caching
   - Shared packages (@rmap/types, @rmap/ui)
   - Independent app deployment capability
   - Hot reload for all apps

2. **Backend (MongoDB + Hono)**
   - Multi-tenant MongoDB with Atlas
   - JWT authentication working
   - Tenant isolation middleware
   - Platform admin authentication
   - App entitlement system
   - All tests passing (Phase 1, 2, 4, 6)

3. **Admin Portal (NEW!)**
   - Full admin UI at port 3001
   - Login: admin@rmap.com / Admin123
   - Dashboard, Tenants, Apps, Admins, Settings pages
   - App catalog with entitlement management
   - Tailwind CSS v3 styling

4. **Web App**
   - Login: test@example.com / password123
   - Retail Media Workflow (8 steps)
   - Data Query tool
   - MCP integrations (SynthiePop, Statista)

### ⚠️ Known Issues & Fixes Applied

1. **CORS Issue (FIXED)**
   - Problem: Admin app couldn't reach backend
   - Solution: Added port 3001 to CORS allowed origins
   ```typescript
   cors({ origin: ['http://localhost:3000', 'http://localhost:3001', ...] })
   ```

2. **SWC Native Binding Error (FIXED)**
   - Problem: @vitejs/plugin-react-swc failed to load
   - Solution: Switched to @vitejs/plugin-react for both apps

3. **Tailwind CSS Issues (FIXED)**
   - Problem: CSS not loading, border-border utility not found
   - Solution: Downgraded to Tailwind v3, added proper color config
   - Fixed admin layout positioning with flexbox

4. **Workspace Protocol Issue (FIXED)**
   - Problem: npm doesn't support workspace:* protocol
   - Solution: Use file: protocol for local packages

### 📝 Login Credentials
```
# Admin Portal (port 3001)
Email: admin@rmap.com
Password: Admin123

# Web App (port 3000)
Email: demo@example.com
Password: Demo123

# Backend runs on port 4000
```

### ✅ Completed Work (This Session)
- ✅ Phase 3 (User Management) - ALL COMPLETE
  - Registration with email verification
  - Password reset flow with email tokens
  - RBAC implementation with permissions
  - Session persistence on refresh
  - Auto-logout on token expiry
  - User invitation system
- ✅ Phase 4 (Tenant Management) - COMPLETE
- ✅ Phase 6 (Admin Portal) - COMPLETE
- ✅ Comprehensive Documentation

## Recent Updates & Known Issues

### Session Achievements (Sep 27, 2025)
- **Phase 3 Complete**: Full user management system
- **Phase 4 Complete**: Tenant management with subscriptions
- **Phase 6 Complete**: Admin portal with app entitlements
- **Monorepo Migration**: Successfully migrated to Turborepo
- **Documentation Created**: Complete docs in /docs folder
- **App Entitlements Working**: 2 default apps in database

### Performance Optimizations
- **AudienceRefinement**: Limited to 100 records (prevents browser hang)
- **LLM Iterations**: Increased from 20 to 50 for complex queries
- **SSE Streaming**: Real-time response streaming for chat interface
- **Turbo Caching**: Build caching for faster development

### Historical Fixes
1. **Navigation Issues**: Fixed missing imports from '../App'
2. **Component Naming**: CollaborationPanel (not CampaignExport)
3. **Session Management**: Statista MCP session handled by server
4. **Result Counting**: Fixed Statista search result display (items array)

## Troubleshooting Guide

### Common Issues & Solutions

1. **"Failed to fetch" on login**
   - Ensure backend is running: `cd server && npm run dev`
   - Check CORS settings include your port
   - Verify MongoDB connection is active

2. **CSS not loading in admin app**
   - Restart dev server after Tailwind config changes
   - Clear browser cache
   - Ensure using Tailwind v3 (not v4)

3. **Module not found errors**
   - Run `npm install` from root directory
   - Check package.json for correct file: paths
   - Rebuild packages: `npm run build`

4. **SWC errors during build**
   - Use @vitejs/plugin-react instead of plugin-react-swc
   - Run `npm rebuild` to rebuild native modules

5. **Type errors in shared packages**
   - Build types package first: `cd packages/types && npm run build`
   - Check tsconfig extends paths are correct

## Important Notes
- Always use the structured logging system (Logger class)
- Check for existing components before creating new ones
- Types should be imported from `@rmap/types` in monorepo
- Limit database queries to reasonable sizes for UI display
- Use environment variables for all API keys and secrets
- Run backend BEFORE starting frontend apps
- Both apps need backend running for auth to work
- Admin portal has SEPARATE auth from main app
- Apps must be initialized in database (run server once)

## 📚 Documentation Links

- **[Overview](./docs/OVERVIEW.md)** - Start here
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical deep-dive
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API docs
- **[Developer Guide](./docs/DEVELOPER.md)** - Setup & development
- **[Admin Guide](./docs/ADMIN.md)** - Platform administration