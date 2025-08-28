# RMAP Developer Setup Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Development Environment](#development-environment)
3. [Project Setup](#project-setup)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **OS**: macOS 12+, Ubuntu 20.04+, Windows 10+ (with WSL2)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space
- **CPU**: 4 cores minimum, 8 cores recommended

### Required Software
```bash
# Check versions
node --version      # v20.0.0 or higher
npm --version       # v10.0.0 or higher
git --version       # v2.30.0 or higher
docker --version    # v24.0.0 or higher (optional but recommended)
```

### Recommended Tools
- **IDE**: VS Code with extensions
- **API Client**: Postman or Insomnia
- **Database Client**: TablePlus, DBeaver, or pgAdmin
- **Git GUI**: SourceTree, GitKraken, or GitHub Desktop

## Development Environment

### VS Code Setup

#### Required Extensions
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker",
    "wayou.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    "eamodio.gitlens",
    "github.copilot"
  ]
}
```

#### Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "tailwindCSS.includeLanguages": {
    "javascript": "javascript",
    "typescript": "typescript"
  },
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

### Environment Variables

Create `.env.local` for frontend:
```bash
# Frontend environment (.env.local)
VITE_API_URL=http://localhost:4000
VITE_APP_URL=http://localhost:3000
VITE_STRIPE_PUBLIC_KEY=pk_test_51...
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_ENABLE_MOCK_DATA=true
VITE_LOG_LEVEL=debug
```

Create `.env` for backend:
```bash
# Backend environment (server/.env)
NODE_ENV=development
PORT=4000

# Database
DATABASE_URL=postgresql://rmap_dev:password@localhost:5432/rmap_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=dev_jwt_secret_min_32_characters_long
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=30d

# Encryption
ENCRYPTION_KEY=dev_encryption_key_32_bytes_long

# External Services (use test keys)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_test...
GOOGLE_CLIENT_SECRET=your_google_client_secret
META_APP_SECRET=your_meta_app_secret

# Email (use Mailtrap or similar for dev)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASSWORD=your_mailtrap_password
EMAIL_FROM=dev@rmap.local

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

## Project Setup

### 1. Clone Repository
```bash
# Clone the repository
git clone git@github.com:PIT-Tracking-Analytics/rmap.git
cd rmap

# Or use HTTPS
git clone https://github.com/PIT-Tracking-Analytics/rmap.git
cd rmap
```

### 2. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Install git hooks
npx husky install
```

### 3. Setup Pre-commit Hooks
```bash
# Create pre-commit hook
cat > .husky/pre-commit << 'EOF'
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint:staged
npm run type-check
EOF

chmod +x .husky/pre-commit
```

### 4. Configure Git
```bash
# Set your user information
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Configure git aliases
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
```

## Database Setup

### Option 1: Docker (Recommended)
```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Verify containers are running
docker ps

# Stop services when done
docker-compose -f docker-compose.dev.yml down
```

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: rmap_dev
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rmap_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP server
      - "8025:8025"  # Web UI

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Local Installation

#### PostgreSQL Setup
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15
createuser -s rmap_dev
createdb rmap_dev -O rmap_dev

# Ubuntu
sudo apt update
sudo apt install postgresql-15 postgresql-contrib
sudo -u postgres createuser --interactive rmap_dev
sudo -u postgres createdb rmap_dev -O rmap_dev

# Windows (WSL2)
sudo apt update
sudo apt install postgresql-15
sudo service postgresql start
```

#### Redis Setup
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/WSL2
sudo apt install redis-server
sudo service redis-server start
```

### Database Migrations
```bash
cd server

# Run migrations
npm run migrate:up

# Seed development data
npm run seed:dev

# Reset database (danger!)
npm run db:reset
```

## Running the Application

### Start All Services
```bash
# Terminal 1: Start frontend
npm run dev
# Frontend runs on http://localhost:3000

# Terminal 2: Start backend
cd server
npm run dev
# API runs on http://localhost:4000

# Terminal 3: Start worker (optional)
cd server
npm run worker:dev
```

### Using PM2 (Alternative)
```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# Monitor services
pm2 monit

# Stop all services
pm2 stop all
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'rmap-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'rmap-api',
      script: 'npm',
      args: 'run dev',
      cwd: './server',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      }
    },
    {
      name: 'rmap-worker',
      script: 'npm',
      args: 'run worker:dev',
      cwd: './server',
      instances: 1,
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
```

## Development Workflow

### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/RMAP-123-add-user-dashboard

# Create bugfix branch
git checkout -b bugfix/RMAP-456-fix-login-issue

# Create hotfix branch
git checkout -b hotfix/RMAP-789-critical-security-patch
```

### Commit Guidelines
```bash
# Commit format: type(scope): description

# Examples:
git commit -m "feat(auth): add SSO support"
git commit -m "fix(campaigns): resolve budget calculation error"
git commit -m "docs(api): update endpoint documentation"
git commit -m "refactor(utils): simplify date formatting"
git commit -m "test(user): add integration tests"
git commit -m "chore(deps): update dependencies"
```

### Code Style
```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

### Creating Components

#### React Component Template
```typescript
// src/components/MyComponent.tsx
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MyComponentProps {
  className?: string;
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  className,
  title,
  onAction
}) => {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Component logic
  }, []);

  return (
    <div className={cn('p-4 rounded-lg', className)}>
      <h2 className="text-xl font-bold">{title}</h2>
      <button onClick={onAction} className="btn-primary">
        Action
      </button>
    </div>
  );
};

// Export with default as well for lazy loading
export default MyComponent;
```

#### API Route Template
```typescript
// server/src/routes/myroute.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { validateRequest } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { MyService } from '../services/MyService';

const router = new Hono();
const service = new MyService();

// Schema validation
const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

// GET /api/myresource
router.get('/', requireAuth, async (c) => {
  const tenantId = c.get('tenantId');
  const resources = await service.list(tenantId);
  return c.json(resources);
});

// POST /api/myresource
router.post('/', 
  requireAuth,
  validateRequest(CreateSchema),
  async (c) => {
    const tenantId = c.get('tenantId');
    const data = c.get('validatedData');
    const resource = await service.create(tenantId, data);
    return c.json(resource, 201);
  }
);

export default router;
```

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- MyComponent.test.tsx
```

#### Writing Tests
```typescript
// src/components/__tests__/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onAction when button clicked', () => {
    const mockAction = jest.fn();
    render(<MyComponent title="Test" onAction={mockAction} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests
```bash
# Backend integration tests
cd server
npm run test:integration

# E2E tests with Playwright
npm run test:e2e
```

```typescript
// server/src/routes/__tests__/campaigns.test.ts
import request from 'supertest';
import { app } from '../../app';
import { setupTestDatabase, teardownTestDatabase } from '../../test/helpers';

describe('Campaign API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('POST /api/campaigns', () => {
    it('creates a new campaign', async () => {
      const response = await request(app)
        .post('/api/campaigns')
        .set('Authorization', 'Bearer test_token')
        .send({
          name: 'Test Campaign',
          budget: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Campaign');
    });
  });
});
```

### E2E Tests
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

## Debugging

### Frontend Debugging

#### Browser DevTools
```javascript
// Add debugger statements
function MyComponent() {
  const handleClick = () => {
    debugger; // Execution will pause here
    console.log('Button clicked');
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

#### React DevTools
1. Install React DevTools extension
2. Open Chrome DevTools → Components tab
3. Inspect component props and state
4. Profile component performance

### Backend Debugging

#### VS Code Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/server",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*"
      }
    }
  ]
}
```

#### Console Debugging
```typescript
// Add debug logging
import debug from 'debug';

const log = debug('rmap:campaigns');

export class CampaignService {
  async create(data: any) {
    log('Creating campaign with data:', data);
    
    try {
      const campaign = await this.repo.create(data);
      log('Campaign created:', campaign.id);
      return campaign;
    } catch (error) {
      log('Error creating campaign:', error);
      throw error;
    }
  }
}

// Enable debug output
// DEBUG=rmap:* npm run dev
```

### Database Debugging

```bash
# Connect to database
psql $DATABASE_URL

# Check active queries
SELECT pid, age(clock_timestamp(), query_start), usename, query 
FROM pg_stat_activity 
WHERE query NOT LIKE '%pg_stat_activity%' 
ORDER BY query_start DESC;

# Check table sizes
SELECT 
  schemaname AS table_schema,
  tablename AS table_name,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

## Common Tasks

### Adding a New Feature

#### 1. Create Feature Flag
```typescript
// server/src/config/features.ts
export const FEATURES = {
  NEW_DASHBOARD: process.env.ENABLE_NEW_DASHBOARD === 'true',
  ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS === 'true'
};

// Usage
if (FEATURES.NEW_DASHBOARD) {
  // New feature code
}
```

#### 2. Create Database Migration
```bash
# Create migration file
npm run migrate:create add_new_feature_table

# Edit the migration file
# migrations/20240115_add_new_feature_table.sql
```

```sql
-- Up Migration
CREATE TABLE new_feature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_new_feature_tenant ON new_feature(tenant_id);

-- Down Migration
DROP TABLE IF EXISTS new_feature;
```

#### 3. Add API Endpoint
```typescript
// server/src/routes/newfeature.ts
import { Hono } from 'hono';

const router = new Hono();

router.get('/', async (c) => {
  // Implementation
  return c.json({ message: 'New feature endpoint' });
});

export default router;

// Register in main app
// server/src/index.ts
import newFeatureRoutes from './routes/newfeature';
app.route('/api/newfeature', newFeatureRoutes);
```

#### 4. Create React Component
```typescript
// src/features/NewFeature/NewFeature.tsx
export const NewFeature = () => {
  // Component implementation
  return <div>New Feature</div>;
};
```

### Updating Dependencies

```bash
# Check outdated packages
npm outdated
cd server && npm outdated

# Update dependencies
npm update
npm audit fix

# Update to latest major versions (careful!)
npx npm-check-updates -u
npm install
```

### Performance Profiling

#### Frontend Performance
```javascript
// React Profiler
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="Navigation" onRender={onRenderCallback}>
  <Navigation />
</Profiler>
```

#### Backend Performance
```typescript
// Performance timing
import { performance } from 'perf_hooks';

export class PerformanceMonitor {
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`${name} took ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`${name} failed after ${duration.toFixed(2)}ms`);
      throw error;
    }
  }
}

// Usage
const result = await PerformanceMonitor.measure(
  'Database Query',
  async () => await db.query('SELECT * FROM campaigns')
);
```

### Generating Documentation

```bash
# Generate API documentation
npm run docs:api

# Generate TypeScript documentation
npm run docs:code

# Generate component storybook
npm run storybook
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Database Connection Error
```bash
# Check PostgreSQL status
pg_isready
psql -U rmap_dev -d rmap_dev -c "SELECT 1"

# Check connection string
echo $DATABASE_URL

# Reset database
cd server
npm run db:reset
npm run migrate:up
npm run seed:dev
```

#### TypeScript Errors
```bash
# Rebuild TypeScript
npm run build:clean
npm run type-check

# Clear TypeScript cache
rm -rf node_modules/.cache/typescript
```

#### Git Issues
```bash
# Reset to clean state
git stash
git checkout main
git pull origin main

# Fix line endings
git config core.autocrlf input  # macOS/Linux
git config core.autocrlf true   # Windows
```

### Debug Mode

Enable verbose logging:
```bash
# Frontend
VITE_LOG_LEVEL=debug npm run dev

# Backend
DEBUG=* LOG_LEVEL=debug npm run dev

# Database queries
DEBUG=knex:query npm run dev
```

### Getting Help

#### Resources
- Project Documentation: `/docs`
- API Documentation: `http://localhost:4000/docs`
- Team Wiki: `https://wiki.rmap.io`
- Slack Channel: `#rmap-dev`

#### Contacts
- Tech Lead: tech-lead@rmap.io
- DevOps: devops@rmap.io
- Security: security@rmap.io

## Best Practices

### Code Quality
1. Write tests for new features
2. Keep functions small and focused
3. Use meaningful variable names
4. Add JSDoc comments for public APIs
5. Handle errors properly
6. Avoid any TypeScript types

### Security
1. Never commit secrets
2. Validate all inputs
3. Use parameterized queries
4. Implement rate limiting
5. Keep dependencies updated
6. Follow OWASP guidelines

### Performance
1. Use React.memo for expensive components
2. Implement pagination for lists
3. Cache API responses
4. Optimize database queries
5. Lazy load components
6. Compress assets

### Collaboration
1. Create draft PRs early
2. Request reviews from team
3. Update documentation
4. Write clear commit messages
5. Respond to feedback promptly
6. Help review others' code

---

Happy coding! 🚀

Last Updated: 2025-08-28
Version: 1.0.0