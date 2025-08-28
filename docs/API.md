# RMAP API Documentation

## Overview

The RMAP API provides programmatic access to all platform functionality with RESTful endpoints, comprehensive authentication, and multi-tenant isolation.

## Base URL

```
Production: https://api.rmap.io/v1
Development: http://localhost:4000/api/v1
```

## Authentication

All API requests require authentication using JWT tokens.

### Obtaining a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_123",
    "email": "user@company.com",
    "tenantId": "ten_456",
    "role": "admin"
  },
  "tenant": {
    "id": "ten_456",
    "name": "Acme Corp",
    "subscription": "professional"
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Rate Limiting

API rate limits are based on subscription tier:

| Plan | Requests/Hour | Requests/Day | Burst Limit |
|------|--------------|--------------|-------------|
| Free | 100 | 1,000 | 10/sec |
| Starter | 1,000 | 10,000 | 20/sec |
| Professional | 10,000 | 100,000 | 50/sec |
| Enterprise | Custom | Custom | Custom |

Rate limit headers:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

Standard error response format:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Campaign not found",
    "details": {
      "campaignId": "cam_789"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
```
Authenticate user and obtain JWT token.

#### Refresh Token
```http
POST /auth/refresh
```
Refresh an expired token.

#### Logout
```http
POST /auth/logout
```
Invalidate current token.

#### Reset Password
```http
POST /auth/reset-password
```
Initiate password reset flow.

### Tenant Management

#### Get Tenant Info
```http
GET /tenant
```
Get current tenant details and subscription.

**Response:**
```json
{
  "id": "ten_456",
  "name": "Acme Corp",
  "slug": "acme",
  "subscription": {
    "plan": "professional",
    "status": "active",
    "limits": {
      "users": 50,
      "campaigns": 500,
      "apiCalls": 100000
    },
    "usage": {
      "users": 12,
      "campaigns": 47,
      "apiCalls": 8543
    }
  }
}
```

#### Update Tenant
```http
PUT /tenant
```
Update tenant settings.

#### Invite User
```http
POST /tenant/users/invite
```
Invite a new user to the tenant.

**Request:**
```json
{
  "email": "newuser@company.com",
  "role": "manager",
  "permissions": ["campaigns.read", "campaigns.write"]
}
```

### Campaigns

#### List Campaigns
```http
GET /campaigns
```
Get all campaigns for the tenant.

**Query Parameters:**
- `status` - Filter by status (draft, active, paused, completed)
- `type` - Filter by type (retail_media, google_ads, meta, linkedin)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

#### Create Campaign
```http
POST /campaigns
```
Create a new campaign.

**Request:**
```json
{
  "name": "Summer Sale 2024",
  "type": "retail_media",
  "budget": {
    "amount": 10000,
    "currency": "USD",
    "period": "monthly"
  },
  "targeting": {
    "audiences": ["aud_123", "aud_456"],
    "locations": ["US", "CA"],
    "demographics": {
      "ageRange": [25, 54],
      "gender": "all"
    }
  },
  "schedule": {
    "startDate": "2024-06-01",
    "endDate": "2024-08-31"
  }
}
```

#### Get Campaign
```http
GET /campaigns/:id
```
Get specific campaign details.

#### Update Campaign
```http
PUT /campaigns/:id
```
Update campaign settings.

#### Delete Campaign
```http
DELETE /campaigns/:id
```
Delete a campaign (soft delete).

#### Campaign Actions

##### Activate Campaign
```http
POST /campaigns/:id/activate
```

##### Pause Campaign
```http
POST /campaigns/:id/pause
```

##### Clone Campaign
```http
POST /campaigns/:id/clone
```

### Audiences

#### List Audiences
```http
GET /audiences
```
Get all audience segments.

#### Create Audience
```http
POST /audiences
```
Create a new audience segment.

**Request:**
```json
{
  "name": "High-Value Customers",
  "description": "Customers with >$1000 lifetime value",
  "rules": {
    "operator": "AND",
    "conditions": [
      {
        "field": "lifetime_value",
        "operator": "greater_than",
        "value": 1000
      },
      {
        "field": "last_purchase",
        "operator": "within_days",
        "value": 90
      }
    ]
  }
}
```

#### Get Audience
```http
GET /audiences/:id
```

#### Update Audience
```http
PUT /audiences/:id
```

#### Delete Audience
```http
DELETE /audiences/:id
```

#### Audience Insights
```http
GET /audiences/:id/insights
```
Get demographic and behavioral insights for an audience.

### Analytics

#### Campaign Performance
```http
GET /analytics/campaigns/:id
```
Get campaign performance metrics.

**Query Parameters:**
- `startDate` - Start date (YYYY-MM-DD)
- `endDate` - End date (YYYY-MM-DD)
- `granularity` - Data granularity (hour, day, week, month)
- `metrics` - Comma-separated metrics to include

**Response:**
```json
{
  "campaignId": "cam_789",
  "period": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metrics": {
    "impressions": 1234567,
    "clicks": 12345,
    "ctr": 0.01,
    "conversions": 234,
    "conversionRate": 0.019,
    "spend": 8765.43,
    "roas": 3.45
  },
  "timeSeries": [
    {
      "date": "2024-01-01",
      "impressions": 45678,
      "clicks": 456,
      "spend": 234.56
    }
  ]
}
```

#### Cross-Channel Analytics
```http
GET /analytics/overview
```
Get aggregated metrics across all channels.

#### Attribution Report
```http
GET /analytics/attribution
```
Get multi-touch attribution analysis.

### Integrations

#### List Integrations
```http
GET /integrations
```
Get all available integrations.

#### Connect Integration
```http
POST /integrations/:provider/connect
```
Connect to an external platform.

**Providers:** `google_ads`, `meta`, `linkedin`, `amazon_ads`, `walmart_connect`

#### Disconnect Integration
```http
DELETE /integrations/:provider
```

#### Sync Data
```http
POST /integrations/:provider/sync
```
Trigger data synchronization.

### Webhooks

#### List Webhooks
```http
GET /webhooks
```

#### Create Webhook
```http
POST /webhooks
```

**Request:**
```json
{
  "url": "https://your-app.com/webhook",
  "events": ["campaign.created", "campaign.completed"],
  "active": true
}
```

#### Update Webhook
```http
PUT /webhooks/:id
```

#### Delete Webhook
```http
DELETE /webhooks/:id
```

#### Test Webhook
```http
POST /webhooks/:id/test
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `campaign.created` | Campaign was created |
| `campaign.updated` | Campaign settings changed |
| `campaign.activated` | Campaign went live |
| `campaign.paused` | Campaign was paused |
| `campaign.completed` | Campaign ended |
| `audience.created` | Audience segment created |
| `audience.updated` | Audience rules changed |
| `budget.exceeded` | Campaign budget exceeded |
| `subscription.upgraded` | Tenant subscription upgraded |

## Pagination

List endpoints support pagination:

```http
GET /campaigns?page=2&limit=20
```

**Response Headers:**
```http
X-Total-Count: 145
X-Page-Count: 8
Link: <https://api.rmap.io/v1/campaigns?page=3&limit=20>; rel="next",
      <https://api.rmap.io/v1/campaigns?page=1&limit=20>; rel="prev",
      <https://api.rmap.io/v1/campaigns?page=8&limit=20>; rel="last"
```

## Filtering

Use query parameters for filtering:

```http
GET /campaigns?status=active&type=retail_media&budget[gte]=1000
```

### Operators
- `[eq]` - Equals (default)
- `[ne]` - Not equals
- `[gt]` - Greater than
- `[gte]` - Greater than or equal
- `[lt]` - Less than
- `[lte]` - Less than or equal
- `[in]` - In array
- `[like]` - Pattern matching

## Sorting

Use `sort` parameter:

```http
GET /campaigns?sort=-created_at,name
```

- Prefix with `-` for descending order
- Multiple fields separated by comma

## Field Selection

Use `fields` parameter to limit response fields:

```http
GET /campaigns?fields=id,name,status,budget
```

## Batch Operations

### Batch Create
```http
POST /campaigns/batch
```

### Batch Update
```http
PUT /campaigns/batch
```

### Batch Delete
```http
DELETE /campaigns/batch
```

**Request:**
```json
{
  "ids": ["cam_123", "cam_456", "cam_789"]
}
```

## WebSocket API

Real-time updates via WebSocket:

```javascript
const ws = new WebSocket('wss://api.rmap.io/v1/ws');

ws.send(JSON.stringify({
  type: 'auth',
  token: 'your_jwt_token'
}));

ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['campaigns', 'analytics']
}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

## SDKs

Official SDKs available:

- **JavaScript/TypeScript**: `npm install @rmap/sdk`
- **Python**: `pip install rmap-sdk`
- **Go**: `go get github.com/rmap/rmap-go`
- **Ruby**: `gem install rmap`

### JavaScript SDK Example

```javascript
import { RMAPClient } from '@rmap/sdk';

const client = new RMAPClient({
  apiKey: 'your_api_key',
  tenant: 'acme'
});

// Create campaign
const campaign = await client.campaigns.create({
  name: 'Summer Sale',
  type: 'retail_media',
  budget: { amount: 10000, currency: 'USD' }
});

// Get analytics
const analytics = await client.analytics.getCampaignMetrics(campaign.id, {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## Testing

Use the sandbox environment for testing:

```
Sandbox URL: https://sandbox.api.rmap.io/v1
Test API Key: test_key_...
```

Test credit card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient funds: `4000 0000 0000 9995`

## Changelog

### v1.2.0 (2024-01-15)
- Added batch operations
- Improved webhook reliability
- New attribution endpoints

### v1.1.0 (2023-12-01)
- WebSocket support
- Enhanced filtering options
- Performance improvements

### v1.0.0 (2023-10-15)
- Initial release

## Support

- API Status: https://status.rmap.io
- Documentation: https://docs.rmap.io
- Support: api-support@rmap.io
- Discord: https://discord.gg/rmap