# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (copy and edit .env.example)
cp .env.example .env

# 3. Start backend FIRST (required)
cd server && npm run dev

# 4. Start frontend (in new terminal from root)
npm run dev:web        # or npm run dev:admin

# Login credentials
# Web app:   demo@example.com / Demo123
# Admin:     admin@rmap.com / Admin123
```

## Project Overview

**RMAP (Retail Media Advertising Platform)** - A comprehensive multi-tenant SaaS marketing platform for managing retail media campaigns, audience segments, and cross-channel advertising. Built with React, TypeScript, Hono backend, and designed for enterprise-scale cloud deployment with subscription-based pricing.

**Key Technologies:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- Backend: Hono + MongoDB Atlas + JWT auth
- AI/Data: Anthropic Claude + MCP (SynthiePop 83M records)
- Architecture: Turborepo monorepo with workspace packages

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

# REQUIRED: Start backend FIRST (in separate terminal)
cd server
npm run dev                # Backend on http://localhost:4000

# Then start frontend apps (in another terminal from root)
npm run dev                # All apps via Turborepo
npm run dev:web            # Web app only on http://localhost:3000
npm run dev:admin          # Admin app only on http://localhost:3001
npm run dev:apps           # Both web and admin apps only
npm run dev:frontend       # Alias for dev:apps

# Build commands
npm run build              # Build everything with Turborepo caching
npm run build:web          # Build web app only
npm run build:admin        # Build admin app only

# Type checking and linting
cd server && npm run typecheck  # Backend type check
cd apps/web && npm run type-check && npm run lint     # Web app
cd apps/admin && npm run type-check && npm run lint   # Admin app

# Preview production builds
cd apps/web && npm run preview    # Preview web build
cd apps/admin && npm run preview  # Preview admin build
```

**Critical Notes:**
- Backend server MUST be running before starting frontend apps. All authentication and API calls will fail otherwise.
- The backend runs on port 4000, web app on port 3000, and admin portal on port 3001.
- `npm run dev` from root runs Turborepo for **frontend apps only** - it does NOT start the backend server.
- If using SynthiePop MCP features, ensure the SynthiePop MCP server is running on localhost:8002 separately.

## Architecture

### Monorepo Structure
```
rmap/
├── apps/
│   ├── web/              # Main web application (port 3000)
│   └── admin/            # Admin portal (port 3001)
├── packages/
│   ├── types/            # Shared TypeScript types (@rmap/types)
│   └── ui/               # Shared UI components (@rmap/ui)
├── server/               # Backend API (port 4000)
│   ├── src/
│   │   ├── middleware/   # Auth, tenant, logging middleware
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic (EmailService, etc.)
│   │   └── index.ts      # Server entry point
│   └── .env.example      # Backend environment template
├── turbo.json           # Turborepo configuration
└── package.json         # Root workspace configuration
```

### Multi-Tenant Structure
The application is a multi-tenant SaaS platform with:
- Tenant isolation at API level via middleware
- Subscription-based feature access
- Usage tracking and limits enforcement
- Team management with role-based permissions
- MongoDB Atlas for data persistence (configured via MONGODB_URI in .env)
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
The workflow is an 8-step process managed by state in `RetailMediaWorkflow.tsx`:

1. **BrandProductSelection** - Initial brand/product selection
2. **CampaignSetup** - Campaign configuration (budget, timeline, objectives)
3. **CohortBuilder** - AI-powered natural language audience segmentation using Claude
4. **AudienceRefinement** - Demographic filtering with SynthiePop data (limited to 100 records for performance)
5. **StrategyGenerator** - AI-driven strategy generation with multiple options
6. **ComparativeDashboard** - Strategy comparison and ROI analysis
7. **CollaborationPanel** - Campaign export and activation to channels
8. **PerformanceMonitoring** - Real-time campaign tracking with AI insights (only available after activation)

**Key workflow data structures:**
- `CampaignData` - Main state object containing all workflow data
- `SynthiePopData` - Demographic data from 83M synthetic German population
- `ProxyCohort` - AI-mapped audience segments
- `Strategy` - Generated campaign strategies with channels and budget allocation
- `ChannelPerformance` - Real-time performance metrics per channel
- `CampaignActivation` - Activation status and channel connections

#### Component Organization
```
apps/web/src/
├── workflows/          # Individual workflow modules
│   └── RetailMediaWorkflow.tsx
├── pages/             # Page components
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── TenantSettings.tsx
│   └── admin/        # Admin-specific pages
├── layouts/           # Layout wrappers
│   └── DashboardLayout.tsx
├── contexts/          # React contexts
│   ├── AuthContext.tsx
│   └── TenantContext.tsx
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui Radix-based components
│   └── [workflow components]
├── services/          # API services
│   ├── api.ts       # Core API client
│   └── correlationId.ts # Request tracking
└── types/            # Frontend type definitions
    └── index.ts
```

### Backend Architecture

#### Middleware (server/src/middleware/)
- **tenant.ts**: Complete tenant isolation and validation
- **auth.ts**: JWT authentication and session management
- **admin.ts**: Platform admin authentication (separate from tenant auth)
- **logging.ts**: Request/response logging with correlation IDs
- **activityLogger.ts**: User activity tracking
- **requestContext.ts**: Request context and correlation ID tracking

#### Routes (server/src/routes/)
- **admin.ts** - Platform administration endpoints (tenant/app/admin management)
- **tenant-admin.ts** - Tenant-level admin operations
- **tenant.ts** - Organization management endpoints
- **auth.ts** - Authentication (login, register, refresh)
- **user.ts** - User profile and settings
- **invitation.ts** - Team invitation management
- **cohort.ts** - AI-powered cohort building with Claude integration
- **audience.ts** - Audience segment management (tenant-scoped)
- **campaign.ts** - Campaign operations (tenant-scoped)
- **analytics.ts** - Analytics and reporting (tenant-scoped)
- **integrations.ts** - External API integrations
- **query.ts** - Natural language data querying
- **test-mcp.ts** - MCP integration testing
- **test-email.ts** - Email service testing
- **debug.ts** - Debug utilities

#### MCP (Model Context Protocol) Integrations
Located at `server/src/services/mcp/`:

- **SynthiePop MCP** (`synthiepop.ts`) - Access to 83M synthetic German population records
  - **Requires separate MCP server** running on localhost:8002
  - This is an external service that must be started independently
  - Tools: catalog, sql, search
  - Used for demographic data queries and audience segmentation (AudienceRefinement workflow step)

Configuration loaded from `server/src/services/config/ConfigLoader.ts`

**Important:** If SynthiePop MCP server is not running, audience refinement features will fail. The server is a separate process and not part of this monorepo.

#### Email Service
- **EmailService** - Handles all email operations
  - Development: Uses Ethereal (test email service) - check server logs for credentials
  - Production: Uses SMTP settings from environment variables
  - Located at: `server/src/services/EmailService.ts`
  - Automatically initialized on server startup
  - In dev mode, view test emails at https://ethereal.email/messages

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

## Environment Variables

### Root (.env at project root)
```env
# API Keys - Required for AI and data integrations
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# MongoDB Atlas - Required for data persistence
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=RMAP
MONGODB_CLIENT_ID=mdb_sa_id_your_client_id
MONGODB_CLIENT_SECRET=mdb_sa_sk_your_client_secret
MONGODB_PROJECT_ID=your_project_id

# Server Configuration
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Email Configuration (Development uses Ethereal)
# In dev: Check server logs for Ethereal credentials
# In prod: Set SMTP variables
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### Backend (server/.env) - Optional overrides
Backend can load additional configuration from `server/.env` which takes precedence over root `.env`:
```env
# Override API keys or add server-specific config
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Frontend (apps/web/.env and apps/admin/.env)
```env
VITE_API_URL=http://localhost:4000
```

**Note:** Use `.env.example` as template. The `.env` files are git-ignored for security.

## Deployment Considerations

### Multi-tenant Database
- MongoDB Atlas with tenant isolation via document-level filtering
- All queries include `tenantId` filter for data isolation
- Connection pooling handled by MongoDB Atlas

### Scaling Strategy
1. Frontend: CDN with geo-distribution
2. Backend: Horizontal scaling with load balancer
3. Database: MongoDB Atlas auto-scaling, read replicas
4. Cache: In-memory caching with tenant-prefixed keys
5. Storage: MongoDB GridFS with tenant-prefixed paths

## Security Considerations

### Tenant Isolation
- Never expose other tenants' data
- Validate tenant context on every request
- Use MongoDB queries with tenant filter in all operations
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

**Note:** Test infrastructure is not yet implemented in this codebase.

### Recommended Testing Approach
When implementing tests, follow these patterns:

```typescript
// Multi-tenant isolation testing
describe('Campaign API', () => {
  it('should isolate data between tenants', async () => {
    const tenant1Data = await api.get('/campaigns', { tenant: 'tenant1' });
    const tenant2Data = await api.get('/campaigns', { tenant: 'tenant2' });
    expect(tenant1Data).not.toContain(tenant2Data);
  });
});
```

### Available Test Endpoints
- `/test-mcp` - Test MCP integrations (SynthiePop)
- `/test-email` - Test email service (development only)
- `/debug` - Debug utilities and diagnostics

## Debugging & Request Tracking

### Correlation IDs
The platform uses correlation IDs to track requests across the entire stack:

- **Automatic Generation**: Every request gets a unique correlation ID via `requestContext.ts` middleware
- **Header**: `X-Correlation-ID` - automatically added to all requests
- **Frontend**: Generated in `services/correlationId.ts` and attached to API calls via `services/api.ts`
- **Backend**: Logged in all middleware and can be used to trace a request through logs
- **Logging**: All structured logs include the correlation ID for easy filtering

**Usage for debugging:**
```typescript
// Backend - correlation ID automatically available in context
Logger.info('Processing campaign', { correlationId, campaignId });

// Frontend - included automatically in all API calls
const response = await api.get('/campaigns'); // Correlation ID auto-attached
```

**Finding requests in logs:**
```bash
# Search server logs for specific correlation ID
grep "correlation-id-here" server/logs/*.log

# All logs use structured JSON format with correlationId field
```

This makes it easy to trace a user action from frontend → API → database → response across all log files.

## Current Architecture State

### ✅ What's Working
1. **Monorepo Architecture**
   - Turborepo build pipeline with caching
   - Shared packages (@rmap/types, @rmap/ui)
   - Independent app deployment capability
   - Hot reload for all apps

2. **Backend (MongoDB + Hono)**
   - Multi-tenant MongoDB with Atlas
   - JWT authentication with refresh tokens
   - Complete tenant isolation middleware
   - Separate platform admin authentication
   - App entitlement system
   - Email service with Ethereal (dev) and SMTP (prod)

3. **Admin Portal**
   - Platform administration UI at port 3001
   - Tenant, App, Admin, and Settings management
   - App catalog with entitlement management
   - Tailwind CSS v3 styling

4. **Web App**
   - Retail Media Workflow (8 steps)
   - Data Query tool with natural language
   - MCP integrations (SynthiePop)
   - Tailwind CSS v4 styling

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

3. **Tailwind CSS Version Differences**
   - Web app: Uses Tailwind v4
   - Admin app: Uses Tailwind v3
   - Both work correctly with their respective configurations

4. **Workspace Protocol Issue (FIXED)**
   - Problem: npm doesn't support workspace:* protocol
   - Solution: Use file: protocol for local packages

### 📝 Default Login Credentials
```
# Admin Portal (port 3001)
Email: admin@rmap.com
Password: Admin123

# Web App (port 3000)
Email: demo@example.com
Password: Demo123
```

## Performance Optimizations

- **AudienceRefinement**: Limited to 100 records (prevents browser hang)
- **LLM Iterations**: Increased from 20 to 50 for complex queries
- **SSE Streaming**: Real-time response streaming for chat interface
- **Turbo Caching**: Build caching for faster development

## Troubleshooting Guide

### Common Issues & Solutions

1. **"Failed to fetch" on login**
   - Ensure backend is running: `cd server && npm run dev`
   - Check CORS settings include your port
   - Verify MongoDB connection is active

2. **CSS not loading**
   - Restart dev server after Tailwind config changes
   - Clear browser cache
   - Check correct Tailwind version (v3 for admin, v4 for web)

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

6. **Email service not working**
   - In dev mode: Check server logs for Ethereal credentials
   - View test emails at https://ethereal.email/messages
   - In prod: Verify SMTP environment variables are set

## Critical Multi-Tenant Patterns

### Always Include Tenant Context
```typescript
// ❌ NEVER do this
const campaigns = await db.collection('campaigns').find({});

// ✅ ALWAYS include tenantId
const campaigns = await db.collection('campaigns').find({ tenantId });
```

### Validate Tenant Access on Every Request
```typescript
// Backend middleware automatically handles this via tenant.ts
// Frontend: Always use authenticated API calls through services/api.ts
```

### Separate Admin vs Tenant Authentication
- Admin portal uses completely separate auth (`/api/admin/*`)
- Tenant app uses tenant-scoped auth (`/api/auth/*`)
- Never mix admin and tenant contexts

## Important Development Notes

### General
- Always use the structured logging system (`Logger` class from `server/src/utils/logger.ts`)
- Check for existing components before creating new ones
- Limit database queries to reasonable sizes for UI display (e.g., AudienceRefinement limited to 100 records)
- Use environment variables for all API keys and secrets
- Environment files (`.env`) are git-ignored - never commit secrets

### Monorepo Packages
- Shared types: Import from `@rmap/types` package
- Shared UI components: Import from `@rmap/ui` package
- Package references use `file:` protocol (e.g., `"@rmap/types": "file:../../packages/types"`)
- Build types package first if encountering type errors: `cd packages/types && npm run build`

### Backend Development
- Run backend BEFORE starting frontend apps (required for auth and all API calls)
- Server startup sequence: MongoDB connection → Email service init → Platform services → Server start
- Admin portal uses SEPARATE authentication (`/api/admin/*`) from tenant app (`/api/auth/*`)
- All tenant-scoped routes use `/api/*` prefix and require tenant middleware
- Use correlation IDs for request tracking (see "Debugging & Request Tracking" section for details)

### Frontend Development
- Web app (port 3000): Uses Tailwind CSS v4
- Admin app (port 3001): Uses Tailwind CSS v3
- Both apps use Vite with `@vitejs/plugin-react` (not `plugin-react-swc`)
- Always use authenticated API calls through `services/api.ts`
- Handle CORS by ensuring backend includes your port in allowed origins

### Testing Email Service
- Development mode uses Ethereal (auto-configured)
- Check server logs for Ethereal credentials on startup
- View test emails at https://ethereal.email/messages
- Test endpoint: `/test-email` (development only)

## 📚 Documentation Links

- **[API](./docs/API.md)** - API documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical deep-dive
- **[Deployment](./docs/DEPLOYMENT.md)** - Deployment guide
- **[Developer Setup](./docs/DEVELOPER_SETUP.md)** - Development setup
