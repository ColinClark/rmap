# RMAP - Retail Media Advertising Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61dafb.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.0+-green.svg)](https://nodejs.org/)

A comprehensive multi-tenant SaaS marketing platform for managing retail media campaigns, audience segments, and cross-channel advertising with enterprise-grade security and scalability.

## 🚀 Features

### Platform Capabilities
- **Multi-Channel Campaign Management**: Unified interface for all advertising platforms
- **Retail Media Audience Planning**: Advanced audience segmentation and targeting
- **Cross-Platform Analytics**: Consolidated reporting and performance tracking
- **Team Collaboration**: Role-based access control and workflow management
- **API Integrations**: Connect with external data sources and platforms

### Multi-Tenant Architecture
- **Complete Tenant Isolation**: Secure data separation at all levels
- **Subscription Management**: Tiered pricing with usage-based limits
- **Team Management**: Invite users, manage roles and permissions
- **Usage Tracking**: Real-time monitoring of API calls, storage, and campaigns
- **Custom Domains**: Support for vanity domains per tenant
- **White-Label Options**: Enterprise customization capabilities

## 💰 Subscription Plans

| Feature | Free | Starter ($99/mo) | Professional ($299/mo) | Enterprise (Custom) |
|---------|------|------------------|------------------------|-------------------|
| Users | 3 | 10 | 50 | Unlimited |
| Campaigns | 5 | 50 | 500 | Unlimited |
| API Calls | 1,000 | 10,000 | 100,000 | Unlimited |
| Storage | 1 GB | 10 GB | 100 GB | Custom |
| Workflows | Basic | Core Channels | All Channels | All + Custom |
| SSO | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ |
| White Label | ❌ | ❌ | ❌ | ✅ |

## 🛠 Tech Stack

### Monorepo Architecture
- **Turborepo** for efficient builds and caching
- **npm workspaces** for package management

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Radix UI** components via shadcn/ui
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Hono** framework (TypeScript)
- **MongoDB Atlas** for data persistence (configured via MONGODB_URI)
- **Multi-tenant middleware** for data isolation
- **Zod** for validation
- **JWT** authentication with refresh tokens
- **MCP** (Model Context Protocol) for AI integrations

## 📦 Installation

### Prerequisites
- Node.js 20+ and npm 10+
- MongoDB Atlas account (free tier works)
- Git
- API keys for integrations (Anthropic)

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd rmap
```

2. **Install dependencies**
```bash
# Install all monorepo dependencies from root
npm install
```

3. **Configure environment**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with required configuration:
# - MONGODB_URI: Your MongoDB Atlas connection string
# - JWT_SECRET: Secret for JWT token signing
# - ANTHROPIC_API_KEY: For AI-powered cohort building
```

4. **Start development servers**
```bash
# Start all services (backend + web + admin)
npm run dev

# Or start individually:
npm run dev:server  # Backend at http://localhost:4000
npm run dev:web     # Web app at http://localhost:3000
npm run dev:admin   # Admin at http://localhost:3001
```

5. **Access the applications**
- **Main App**: http://localhost:3000
  - Demo: `demo@example.com` / `Demo123`
- **Admin Portal**: http://localhost:3001
  - Admin: `admin@rmap.com` / `Admin123`

## 🏗 Project Structure

This is a monorepo managed by Turborepo:

```
rmap/
├── apps/
│   ├── web/                 # Main customer application (port 3000)
│   └── admin/              # Platform admin portal (port 3001)
├── packages/
│   ├── types/              # Shared TypeScript types (@rmap/types)
│   └── ui/                 # Shared UI components (@rmap/ui)
├── server/                 # Backend API server (port 4000)
├── docs/                   # Comprehensive documentation
├── turbo.json             # Turborepo configuration
└── package.json           # Root workspace configuration
```

## 🔐 Multi-Tenant Implementation

### Tenant Identification
The platform identifies tenants through multiple methods:
1. **Subdomain**: `acme.platform.com`
2. **Custom Domain**: `platform.acme.com`
3. **API Header**: `X-Tenant-ID`
4. **JWT Claims**: Embedded in auth tokens
5. **Session/Cookie**: For web sessions

### Data Isolation
- All API requests are filtered by tenant ID
- MongoDB Atlas documents include tenantId field for isolation
- File storage is partitioned by tenant
- Cache keys are prefixed with tenant ID
- Complete tenant boundary enforcement at middleware level

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[Overview](./docs/OVERVIEW.md)** - High-level platform introduction
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical architecture deep-dive
- **[API Reference](./docs/API_REFERENCE.md)** - Complete API documentation
- **[Developer Guide](./docs/DEVELOPER.md)** - Setup and development workflows
- **[Admin Guide](./docs/ADMIN.md)** - Platform administration manual
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

## 🚢 Deployment

### AWS Deployment (Recommended)

1. **Frontend**: Deploy to S3 + CloudFront
2. **Backend**: Deploy to ECS Fargate or Lambda
3. **Database**: MongoDB Atlas (cloud-hosted)
4. **Storage**: S3 for file uploads
5. **CDN**: CloudFront for global distribution

### Environment Variables

Create `.env` files for configuration:

```env
# Frontend (.env)
VITE_API_URL=https://api.yourdomain.com

# Backend (server/.env)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=AppName
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-api03-...
NODE_ENV=production
PORT=4000
```

## 🧪 Testing

```bash
# Run frontend tests
npm test

# Run backend tests
cd server
npm test
```

## 📊 Usage Tracking

The platform automatically tracks:
- API calls per tenant
- Storage usage
- Active campaigns
- User seats
- Workflow executions

Limits are enforced based on subscription plan.

## 🔄 Upgrading Plans

Tenants can upgrade their subscription through:
1. Organization Settings → Subscription tab
2. API call to `/api/tenant/billing/subscription`
3. Contact sales for Enterprise plans

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- Documentation: [docs.platform.com](https://docs.platform.com)
- Email: support@platform.com
- Enterprise: sales@platform.com

## 🎯 Roadmap

### Q1 2024
- [ ] Stripe billing integration
- [ ] SSO implementation (SAML, OAuth)
- [ ] Advanced analytics dashboard
- [ ] Custom workflow builder

### Q2 2024
- [ ] Mobile app (React Native)
- [ ] Webhook system
- [ ] Advanced API rate limiting
- [ ] Multi-language support

### Q3 2024
- [ ] AI-powered optimization
- [ ] Predictive analytics
- [ ] Custom reporting
- [ ] Marketplace for integrations

## 🏆 Key Differentiators

1. **True Multi-Tenancy**: Not just user separation, complete organizational isolation
2. **Flexible Workflows**: Modular system for adding new channels
3. **Usage-Based Pricing**: Pay for what you use
4. **Enterprise Ready**: SSO, audit logs, compliance features
5. **Developer Friendly**: REST API, webhooks, SDKs

---

Built with ❤️ for modern marketing teams