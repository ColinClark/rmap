# RMAP Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [MCP Integrations](#mcp-integrations)
4. [Workflow Components](#workflow-components)
5. [API Documentation](#api-documentation)
6. [Configuration](#configuration)
7. [Deployment Guide](#deployment-guide)

## System Overview

RMAP (Retail Media Advertising Platform) is a comprehensive multi-tenant SaaS platform for managing retail media campaigns, audience segments, and cross-channel advertising. The platform enables marketers to build precise audience cohorts, generate campaign strategies, and monitor performance across multiple retail channels.

### Key Features
- **Multi-tenant Architecture**: Complete tenant isolation with subscription-based feature access
- **AI-Powered Cohort Builder**: Natural language audience segmentation using Claude AI
- **Market Intelligence**: Real-time market data integration via Statista MCP
- **SynthiePop Database**: Access to 83M synthetic German population records
- **Campaign Workflow**: 8-step guided workflow from brand selection to performance monitoring

## Architecture

### Technology Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Hono (Express-like framework), TypeScript, Node.js
- **AI/ML**: Anthropic Claude (Sonnet 4), MCP protocol for tool integration
- **Databases**: PostgreSQL (primary), DuckDB (analytics via MCP)
- **External APIs**: Statista MCP for market data, SynthiePop MCP for population data

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
├─────────────────────────────────────────────────────────────┤
│  Workflows          │  Components         │  Services       │
│  - RetailMedia      │  - CohortBuilder    │  - api.ts      │
│                     │  - AudienceRefine   │  - correlationId│
│                     │  - ComparativeDash  │                 │
└─────────────────┬───────────────────────┬──────────────────┘
                  │                       │
                  ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Hono/Node.js)                   │
├─────────────────────────────────────────────────────────────┤
│  Routes             │  Services           │  Middleware     │
│  - /api/cohort      │  - StatistaMCP      │  - tenant       │
│  - /api/tenant      │  - MCPClient        │  - requestCtx   │
│  - /api/analytics   │  - QueryExecutor    │  - rateLimit    │
└─────────────────┬───────────────────────┬──────────────────┘
                  │                       │
                  ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
├─────────────────────────────────────────────────────────────┤
│  Statista MCP       │  SynthiePop MCP    │  Anthropic API  │
│  - Market Data      │  - Population DB   │  - Claude AI    │
│  - Statistics       │  - Demographics     │  - NL Processing│
└─────────────────────────────────────────────────────────────┘
```

## MCP Integrations

### Model Context Protocol (MCP)
MCP enables structured communication between the platform and AI models, providing tool access for database queries, market data retrieval, and more.

### Statista MCP Client

The `StatistaMCPClient` provides access to Statista's comprehensive market statistics database.

**Key Features:**
- Session management with automatic initialization
- Search statistics by query
- Retrieve detailed chart data by ID
- SSE (Server-Sent Events) response parsing
- Automatic retry and error handling

**Configuration:**
```yaml
statista:
  enabled: true
  baseUrl: https://api.statista.ai/v1
  endpoints:
    health: /health
    execute: /mcp
  security:
    apiKey: ${STATISTA_API_KEY}
```

**Usage Example:**
```typescript
const statista = await StatistaMCPClient.forTenant(tenantId);
const results = await statista.searchStatistics("smartphone market share", 10);
const chartData = await statista.getChartData("271492");
```

### SynthiePop MCP Integration

Provides access to synthetic German population data for audience segmentation.

**Features:**
- Database catalog exploration
- SQL query execution via DuckDB
- Population filtering and aggregation
- Real-time cohort size calculation

**Available Tools:**
- `catalog`: Get database schema and sample data
- `sql`: Execute SQL queries on population database
- `search`: Web search for external information

## Workflow Components

### 1. Brand & Product Selection
Initial step for campaign setup where users select their brand and product categories.

### 2. Campaign Setup
Configure campaign basics including budget, timeline, and objectives.

### 3. Cohort Builder

The AI-powered cohort builder enables natural language audience segmentation.

**Features:**
- **Natural Language Processing**: Claude AI interprets user queries
- **Real-time SQL Generation**: Converts requests to DuckDB queries
- **Auto-save**: Automatically saves successful cohorts
- **Multi-tool Support**: Integrates database, Statista, and web search

**Implementation Details:**
```typescript
// Cohort Builder Chat Flow
1. User enters natural language query
2. Query sent to /api/cohort/chat endpoint
3. Claude AI processes with available tools:
   - catalog: Explore database schema
   - sql: Execute queries
   - search_statistics: Get market data
   - get_chart_data: Retrieve specific charts
4. Results streamed back via SSE
5. Cohort auto-saved when SQL returns results
```

### 4. Audience Refinement

Refines cohorts with additional filters and demographic analysis.

**Performance Optimization:**
- Limited to 100 records for UI display (prevents browser hang)
- Pagination support planned for future releases
- Mock data generation for demonstration

### 5. Strategy Generator
AI-driven strategy generation based on cohort characteristics and campaign goals.

### 6. Comparative Dashboard

Advanced analytics dashboard for strategy comparison.

**Features:**
- **Multi-metric Ranking**: ROAS, reach, risk, efficiency
- **Sensitivity Analysis**: Interactive parameter adjustment
- **Visual Comparisons**: Charts using Recharts library
- **Strategy Selection**: Finalize optimal strategy

### 7. Campaign Export & Activation (CollaborationPanel)

Collaboration and export functionality for campaign activation.

**Note:** Originally named CampaignExport, now implemented as CollaborationPanel.

### 8. Performance Monitoring
Real-time campaign performance tracking and optimization.

## API Documentation

### Cohort Chat Endpoint

**Endpoint:** `POST /api/cohort/chat`

**Purpose:** Process natural language queries for cohort building

**Request:**
```typescript
{
  messages: ChatMessage[];
  query: string;
}
```

**Response:** Server-Sent Events stream with:
- `content`: Assistant responses
- `tool_result`: Tool execution results
- `end`: Stream completion

**Example:**
```javascript
const response = await fetch('/api/cohort/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId
  },
  body: JSON.stringify({
    messages: [],
    query: "Find women aged 25-34 in Berlin with income > €50,000"
  })
});
```

### Tool Execution

Tools are executed server-side with results streamed to the client:

1. **Database Tools** (SynthiePop):
   - `catalog`: Schema exploration
   - `sql`: Query execution

2. **Statista Tools**:
   - `search_statistics`: Market research
   - `get_chart_data`: Detailed statistics

## Configuration

### Environment Variables

**Required:**
```bash
# API Keys
ANTHROPIC_API_KEY=your_anthropic_key
STATISTA_API_KEY=your_statista_key

# Database
DATABASE_URL=postgresql://...

# Server
PORT=4000
NODE_ENV=development
```

### Server Configuration (config.yaml)

```yaml
# Cohort Builder Settings
cohortBuilder:
  llm:
    model: claude-sonnet-4-20250514
    maxIterations: 50  # Increased for complex queries
    temperature: 0.7
    maxTokens: 4096
    
# MCP Connections
mcp:
  synthiepop:
    enabled: true
    host: localhost
    port: 8002
  statista:
    enabled: true
    baseUrl: https://api.statista.ai/v1
```

## Deployment Guide

### Development Setup

1. **Install Dependencies:**
```bash
# Frontend
npm install

# Backend
cd server
npm install
```

2. **Configure Environment:**
```bash
cp .env.example .env
# Add your API keys
```

3. **Start Services:**
```bash
# Start MCP servers (if running locally)
docker-compose up -d

# Backend (port 4000)
cd server
npm run dev

# Frontend (port 3000)
npm run dev
```

### Production Deployment

1. **Build Applications:**
```bash
# Frontend
npm run build

# Backend
cd server
npm run build
```

2. **Database Setup:**
```sql
-- Multi-tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_${tenant_id};
-- Apply migrations
npm run migrate:prod
```

3. **Scaling Considerations:**
- Use connection pooling for database
- Implement Redis for session management
- Configure CDN for static assets
- Set up load balancers for horizontal scaling

## Troubleshooting

### Common Issues

1. **Blank Screen on Navigation:**
   - Check for missing component imports
   - Verify type definitions in `/src/types/index.ts`
   - Check browser console for errors

2. **Cohort Builder Hanging:**
   - Verify population data generation is limited (100 records max)
   - Check SSE connection is established
   - Monitor server logs for tool execution errors

3. **Statista Integration Issues:**
   - Verify API key is set correctly
   - Check session initialization in logs
   - Ensure SSE parser handles response format

### Debug Logging

Enable detailed logging:
```typescript
// Server
const logger = new Logger('component-name');
logger.debug('Detailed message', { data });

// Client
console.log('Debug:', { state, props });
```

## Security Considerations

### Tenant Isolation
- All API requests include tenant context
- Database queries filtered by tenant ID
- File storage partitioned by tenant

### Authentication Flow
1. User authentication via JWT
2. Tenant context embedded in token
3. Middleware validates on each request
4. Role-based access control (RBAC)

### API Security
- Rate limiting per tenant
- API key rotation for external services
- Encrypted storage for sensitive data
- CORS configuration for production

## Performance Optimizations

### Frontend
- Lazy loading for workflow components
- Memoization for expensive calculations
- Virtual scrolling for large datasets
- Debounced search inputs

### Backend
- Connection pooling
- Query result caching
- Streaming responses for large datasets
- Background job processing

### Database
- Indexed columns for common queries
- Materialized views for analytics
- Partition large tables by tenant
- Regular VACUUM and ANALYZE

## Future Enhancements

### Planned Features
1. **Advanced Paging**: Handle large cohort datasets
2. **Export Formats**: CSV, Excel, API integration
3. **Real-time Collaboration**: WebSocket-based updates
4. **Custom MCP Tools**: Tenant-specific integrations
5. **ML Optimization**: Predictive audience modeling

### Architecture Improvements
1. **Microservices**: Split monolith into services
2. **Event-Driven**: Implement event sourcing
3. **GraphQL**: Alternative API layer
4. **Kubernetes**: Container orchestration
5. **Observability**: Enhanced monitoring stack

---

## Appendix

### Type Definitions

Key types are centralized in `/src/types/index.ts`:

```typescript
export interface CampaignData {
  // Campaign configuration
  selectedBrand?: string;
  selectedProducts?: string[];
  campaignObjective?: string;
  // ... additional fields
}

export interface SynthiePopData {
  ids: string;
  gemeindeCode: string;
  bundesland: number;
  // ... demographic fields
}
```

### MCP Protocol

The Model Context Protocol enables:
- Tool discovery and registration
- Structured tool invocation
- Response streaming
- Error handling

Example tool registration:
```typescript
server.registerTool('search-statistics', {
  description: 'Search Statista database',
  inputSchema: { query: z.string() },
  handler: async ({ query }) => {
    // Tool implementation
  }
});
```

---

*Last Updated: 2024*
*Version: 1.0.0*