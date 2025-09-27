# RMAP API Reference

## Base URLs

- **Development**: `http://localhost:4000`
- **Production**: `https://api.rmap.com`

## Authentication

The RMAP platform uses JWT-based authentication with separate systems for tenant users and platform admins.

### Tenant User Authentication

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "tenant_123" // Optional - can be auto-detected
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true
  },
  "tenant": {
    "id": "tenant_123",
    "name": "Acme Corp",
    "slug": "acme",
    "subscription": {
      "plan": "professional",
      "status": "active"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_here"
  },
  "session": {
    "sessionToken": "session_token_here",
    "expiresAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Register
```http
POST /auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "name": "Jane Smith",
  "tenantName": "New Company" // Optional - creates new tenant
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

#### Password Reset Request
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Password Reset
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_from_email",
  "newPassword": "NewSecurePassword123"
}
```

#### Email Verification
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification_token_from_email"
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <access_token>
```

### Platform Admin Authentication

#### Admin Login
```http
POST /admin/auth/login
Content-Type: application/json

{
  "email": "admin@rmap.com",
  "password": "Admin123"
}
```

**Response:**
```json
{
  "success": true,
  "admin": {
    "id": "admin_001",
    "email": "admin@rmap.com",
    "name": "Platform Admin",
    "role": "super_admin",
    "permissions": ["manage_tenants", "manage_apps", "manage_admins"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Tenant Context

All `/api/*` endpoints require tenant context. Provide it via:

1. **JWT Token** (preferred): Tenant ID embedded in token claims
2. **HTTP Header**: `X-Tenant-ID: tenant_123` or `X-Tenant-Slug: acme`
3. **Subdomain**: `acme.rmap.com` (production only)

## API Endpoints

### Tenant Management

#### Get Tenant Info
```http
GET /api/tenant
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Update Tenant
```http
PUT /api/tenant
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "name": "Updated Company Name",
  "contactEmail": "contact@company.com"
}
```

#### Get Tenant Users
```http
GET /api/tenant/users
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Update User Role
```http
PUT /api/tenant/users/:userId/role
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "role": "admin",
  "permissions": ["manage_campaigns", "view_analytics"]
}
```

#### Remove User from Tenant
```http
DELETE /api/tenant/users/:userId
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

### Invitations

#### Send Invitation
```http
POST /api/invitations
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "tenantId": "tenant_123",
  "role": "member",
  "permissions": ["view_campaigns"]
}
```

#### Get Invitations
```http
GET /api/invitations?status=pending
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Accept Invitation
```http
POST /api/invitations/accept
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "token": "invitation_token"
}
```

#### Revoke Invitation
```http
DELETE /api/invitations/:id
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Resend Invitation
```http
POST /api/invitations/:id/resend
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

### Campaigns

#### Get Campaigns
```http
GET /api/campaign
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Create Campaign
```http
POST /api/campaign
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "name": "Summer Sale 2024",
  "type": "retail_media",
  "budget": 10000,
  "startDate": "2024-06-01",
  "endDate": "2024-08-31",
  "objectives": ["awareness", "conversion"]
}
```

#### Get Campaign by ID
```http
GET /api/campaign/:id
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Update Campaign
```http
PUT /api/campaign/:id
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "status": "active",
  "budget": 15000
}
```

#### Delete Campaign
```http
DELETE /api/campaign/:id
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

### Audiences

#### Get Audiences
```http
GET /api/audience
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Create Audience
```http
POST /api/audience
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "name": "High Value Customers",
  "description": "Customers with >$1000 lifetime value",
  "criteria": {
    "minPurchaseValue": 1000,
    "locations": ["US", "CA"]
  }
}
```

### Cohorts (AI-Powered)

#### Build Cohort
```http
POST /api/cohort/build
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "naturalQuery": "Find all customers in Germany aged 25-40 who bought electronics",
  "sessionId": "session_123"
}
```

**Response (Server-Sent Events):**
```
event: message
data: {"type": "thinking", "content": "Analyzing query..."}

event: message
data: {"type": "sql", "content": "SELECT * FROM customers WHERE..."}

event: message
data: {"type": "result", "data": [...], "totalCount": 1500}

event: done
data: {"success": true, "cohortId": "cohort_123"}
```

#### Execute Query
```http
POST /api/cohort/execute-query
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "query": "SELECT * FROM synthiepop WHERE age BETWEEN 25 AND 40"
}
```

#### Save Cohort
```http
POST /api/cohort/save
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "name": "Tech Millennials Germany",
  "description": "25-40 year olds who bought electronics",
  "query": "SELECT * FROM...",
  "data": [...],
  "totalCount": 1500
}
```

### Analytics

#### Get Dashboard Metrics
```http
GET /api/analytics/dashboard
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Get Campaign Analytics
```http
GET /api/analytics/campaigns/:campaignId
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

### Data Query

#### Execute Query
```http
POST /api/query/execute
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "sql": "SELECT * FROM customers LIMIT 100",
  "dataSource": "synthiepop"
}
```

#### Get Query History
```http
GET /api/query/history
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Save Query
```http
POST /api/query/save
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "name": "Top Customers Query",
  "sql": "SELECT * FROM customers ORDER BY value DESC LIMIT 100",
  "description": "Get top 100 customers by value"
}
```

### Integrations

#### Get Available Integrations
```http
GET /api/integrations
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
```

#### Connect Integration
```http
POST /api/integrations/:provider/connect
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "apiKey": "provider_api_key",
  "config": {
    "accountId": "12345"
  }
}
```

## Platform Admin Endpoints

All admin endpoints require admin authentication token.

### Tenant Management

#### Get All Tenants
```http
GET /admin/tenants
Authorization: Bearer <admin_token>
```

#### Create Tenant
```http
POST /admin/tenants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Company",
  "slug": "newco",
  "contactEmail": "admin@newco.com",
  "plan": "professional"
}
```

#### Update Tenant Subscription
```http
PUT /admin/tenants/:tenantId/subscription
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "plan": "enterprise",
  "status": "active"
}
```

### App Management

#### Get All Apps
```http
GET /admin/apps
Authorization: Bearer <admin_token>
```

#### Create/Update App
```http
PUT /admin/apps/:appId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New Analytics Tool",
  "description": "Advanced analytics",
  "category": "analytics",
  "status": "active",
  "availableForPlans": ["professional", "enterprise"]
}
```

#### Grant App to Tenant
```http
POST /admin/tenants/:tenantId/apps/:appId/grant
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "config": {
    "maxUsers": 100
  }
}
```

#### Revoke App from Tenant
```http
POST /admin/tenants/:tenantId/apps/:appId/revoke
Authorization: Bearer <admin_token>
```

### Platform Admin Management

#### Get All Admins
```http
GET /admin/admins
Authorization: Bearer <admin_token>
```

#### Create Admin
```http
POST /admin/admins
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "email": "newadmin@rmap.com",
  "name": "New Admin",
  "role": "admin",
  "permissions": ["view_tenants", "manage_apps"]
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

## Rate Limits

Rate limits are enforced per tenant based on subscription:

| Plan | Requests per Minute | Requests per Hour |
|------|-------------------|-------------------|
| Free | 60 | 1,000 |
| Starter | 120 | 5,000 |
| Professional | 300 | 20,000 |
| Enterprise | 1,000 | 100,000 |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

## Webhooks

Configure webhooks to receive real-time notifications:

```http
POST /api/webhooks
Authorization: Bearer <access_token>
X-Tenant-ID: <tenant_id>
Content-Type: application/json

{
  "url": "https://yourapp.com/webhook",
  "events": ["campaign.created", "campaign.completed"],
  "secret": "webhook_secret"
}
```

### Webhook Events

- `tenant.created`
- `tenant.subscription.updated`
- `user.invited`
- `user.joined`
- `campaign.created`
- `campaign.updated`
- `campaign.completed`
- `audience.created`
- `cohort.generated`

## SDKs

Official SDKs are available for:
- JavaScript/TypeScript
- Python
- Java
- Go

See [SDK Documentation](./SDK.md) for detailed usage.