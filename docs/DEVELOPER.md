# RMAP Developer Guide

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- MongoDB Atlas account (free tier works for development)
- Git
- VS Code or preferred IDE

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd rmap
   ```

2. **Install Dependencies**
   ```bash
   # From the root directory - installs all monorepo dependencies
   npm install
   ```

3. **Configure Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env with your configuration:
   # - DATABASE_URL: MongoDB connection string
   # - JWT_SECRET: Random secure string
   # - SMTP settings (optional, uses Ethereal in dev)
   ```

4. **Start Development Servers**
   ```bash
   # Start everything (backend + web + admin)
   npm run dev

   # Or start individually:
   npm run dev:server  # Backend only (port 4000)
   npm run dev:web     # Web app only (port 3000)
   npm run dev:admin   # Admin portal only (port 3001)
   ```

5. **Initialize Demo Data** (Optional)
   ```bash
   cd server
   npm run setup:demo-tenant
   ```

### Accessing the Applications

- **Main App**: http://localhost:3000
  - Demo User: `demo@example.com` / `Demo123`

- **Admin Portal**: http://localhost:3001
  - Admin: `admin@rmap.com` / `Admin123`

- **API Server**: http://localhost:4000
  - Health Check: http://localhost:4000/health

## Monorepo Structure

### Working with Packages

The monorepo uses npm workspaces to share code:

```bash
# Add a dependency to a specific workspace
npm install <package> -w apps/web
npm install <package> -w server

# Add a shared dependency
npm install <package> -w packages/types

# Run scripts in specific workspaces
npm run build -w apps/web
npm run test -w server
```

### Shared Packages

#### @rmap/types
Shared TypeScript types used across all applications:

```typescript
import { User, Tenant, Campaign } from '@rmap/types'
```

#### @rmap/ui
Shared React components:

```typescript
import { Button, Card, Dialog } from '@rmap/ui'
```

## Common Development Tasks

### Adding a New API Endpoint

1. **Define the route** in `server/src/routes/`:
   ```typescript
   // server/src/routes/myfeature.ts
   import { Hono } from 'hono'
   import { zValidator } from '@hono/zod-validator'
   import { z } from 'zod'

   export const myFeatureRoutes = new Hono()

   const createSchema = z.object({
     name: z.string().min(1),
     description: z.string().optional()
   })

   myFeatureRoutes.post('/',
     zValidator('json', createSchema),
     async (c) => {
       const data = c.req.valid('json')
       const tenantId = c.get('tenantId')

       // Your logic here

       return c.json({ success: true, data })
     }
   )
   ```

2. **Mount the route** in `server/src/index.ts`:
   ```typescript
   import { myFeatureRoutes } from './routes/myfeature'
   app.route('/api/myfeature', myFeatureRoutes)
   ```

3. **Add types** to `packages/types/src/index.ts`

4. **Test the endpoint**:
   ```bash
   curl -X POST http://localhost:4000/api/myfeature \
     -H "Authorization: Bearer <token>" \
     -H "X-Tenant-ID: <tenant-id>" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test"}'
   ```

### Adding a New Frontend Page

1. **Create the component** in `apps/web/src/pages/`:
   ```tsx
   // apps/web/src/pages/MyPage.tsx
   import { useState } from 'react'
   import { useAuth } from '../contexts/AuthContext'

   export default function MyPage() {
     const { user } = useAuth()

     return (
       <div className="p-6">
         <h1>My New Page</h1>
         <p>Welcome, {user?.name}</p>
       </div>
     )
   }
   ```

2. **Add the route** in `apps/web/src/App.tsx`:
   ```tsx
   import MyPage from './pages/MyPage'

   // Inside the router
   <Route path="/my-page" element={
     <ProtectedRoute>
       <DashboardLayout>
         <MyPage />
       </DashboardLayout>
     </ProtectedRoute>
   } />
   ```

3. **Add navigation** in `apps/web/src/layouts/DashboardLayout.tsx`

### Adding a New Workflow

1. **Create workflow component** in `apps/web/src/workflows/`
2. **Add to workflow grid** in Dashboard
3. **Add permission check** in backend
4. **Update subscription plans** with workflow access

### Adding a New Subscription Feature

1. **Update TenantSchema** in `server/src/types/tenant.ts`:
   ```typescript
   features: {
     myNewFeature: boolean
   }
   ```

2. **Add feature flag check** in frontend:
   ```tsx
   if (tenant.checkFeature('myNewFeature')) {
     // Show feature
   }
   ```

3. **Update TenantSettings UI** to show feature status

4. **Add middleware check** in backend:
   ```typescript
   app.use('/api/myfeature', requireFeature('myNewFeature'))
   ```

## Coding Standards

### TypeScript

- **No `any` types**: Use `unknown` or proper types
- **Explicit return types**: Always define function return types
- **Interface over type**: Use interfaces for object shapes
- **Const assertions**: Use `as const` for literal types

### React

- **Functional components**: No class components
- **Custom hooks**: Extract logic into custom hooks
- **Error boundaries**: Wrap features in error boundaries
- **Lazy loading**: Use React.lazy for route-based splitting

### API Design

- **RESTful conventions**: Use proper HTTP methods
- **Consistent naming**: Plural for collections, singular for resources
- **Validation**: Use Zod schemas for all inputs
- **Error handling**: Return consistent error formats

### Database

- **Tenant isolation**: Always filter by `tenantId`
- **Indexes**: Create indexes for common queries
- **Transactions**: Use transactions for multi-document operations
- **Soft deletes**: Mark as deleted rather than removing

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific workspace
npm test -w server
npm test -w apps/web

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Writing Tests

#### Backend Tests
```typescript
// server/tests/auth.test.ts
import { describe, it, expect } from 'vitest'
import { app } from '../src/index'

describe('Auth API', () => {
  it('should login with valid credentials', async () => {
    const response = await app.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
```

#### Frontend Tests
```tsx
// apps/web/src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### Multi-tenant Testing

Always test with multiple tenant contexts:

```typescript
describe('Campaign API', () => {
  it('should isolate data between tenants', async () => {
    const tenant1Data = await getCampaigns('tenant1')
    const tenant2Data = await getCampaigns('tenant2')

    // Ensure no data leakage
    expect(tenant1Data.campaigns).not.toContainEqual(
      expect.objectContaining({ tenantId: 'tenant2' })
    )
  })
})
```

## Debugging

### Backend Debugging

1. **Enable debug logs**:
   ```bash
   DEBUG=* npm run dev:server
   ```

2. **VS Code debugging**:
   ```json
   // .vscode/launch.json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Server",
     "runtimeExecutable": "npm",
     "runtimeArgs": ["run", "dev:server"],
     "cwd": "${workspaceFolder}/server"
   }
   ```

3. **Check MongoDB queries**:
   ```typescript
   // Enable query logging
   mongoService.enableQueryLogging(true)
   ```

### Frontend Debugging

1. **React DevTools**: Install browser extension
2. **Network tab**: Check API calls and responses
3. **Console logging**: Use structured logging
   ```typescript
   console.log('[ComponentName]', 'action', { data })
   ```

## Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Failed
- Check `DATABASE_URL` in `.env`
- Verify MongoDB Atlas whitelist includes your IP
- Check network connectivity

#### JWT Token Expired
- Tokens expire after 8 hours
- Implement refresh token rotation
- Check system time sync

#### CORS Errors
- Verify allowed origins in `server/src/index.ts`
- Check `X-Tenant-ID` header is present
- Ensure credentials are included

#### Build Failures
```bash
# Clear all caches
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different ports
PORT=3001 npm run dev:web
```

#### Type Errors
```bash
# Rebuild types package
npm run build -w packages/types

# Check for type issues
npm run type-check
```

## Performance Optimization

### Backend

- **Database indexes**: Create compound indexes for common queries
- **Caching**: Implement Redis for frequently accessed data
- **Pagination**: Always paginate large result sets
- **Query optimization**: Use projections to limit fields

### Frontend

- **Code splitting**: Use dynamic imports for large components
- **Image optimization**: Use WebP format and lazy loading
- **Bundle analysis**: Run `npm run analyze` to check bundle size
- **Memoization**: Use React.memo and useMemo for expensive computations

## Deployment Preparation

### Build for Production

```bash
# Build everything
npm run build

# Build specific app
npm run build:web
npm run build:admin
npm run build:server
```

### Environment Variables

Required for production:
- `NODE_ENV=production`
- `DATABASE_URL` (production MongoDB)
- `JWT_SECRET` (strong random string)
- `SMTP_*` (email configuration)
- `FRONTEND_URL` (for email links)

### Health Checks

The server provides health endpoints:
- `/health` - Basic health check
- `/health/detailed` - Detailed system status

## Contributing

### Git Workflow

1. Create feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make changes and commit:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. Push and create PR:
   ```bash
   git push origin feature/my-feature
   ```

### Commit Message Convention

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Testing
- `chore:` Maintenance

### Code Review Checklist

- [ ] Types are properly defined
- [ ] Tenant isolation is maintained
- [ ] Error handling is comprehensive
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No sensitive data in logs
- [ ] Performance impact considered

## Resources

- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API_REFERENCE.md)
- [Admin Guide](./ADMIN.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Hono Documentation](https://hono.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)