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

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **Radix UI** components via shadcn/ui
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend
- **Hono** framework (TypeScript)
- **Multi-tenant middleware** for isolation
- **Zod** for validation
- **JWT** authentication
- **PostgreSQL** ready (with RLS)
- **Redis** ready for caching

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (optional for development)
- Redis (optional for development)

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/marketing-platform.git
cd marketing-platform
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

3. **Start development servers**
```bash
# Terminal 1 - Frontend (http://localhost:3000)
npm run dev

# Terminal 2 - Backend (http://localhost:4000)
cd server
npm run dev
```

4. **Access the application**
- Navigate to http://localhost:3000
- Click "Use demo account" or login with any email/password
- Explore the platform!

## 🏗 Project Structure

```
├── src/                    # Frontend source
│   ├── workflows/          # Workflow modules (retail media, etc.)
│   ├── pages/             # Page components
│   ├── layouts/           # Layout wrappers
│   ├── contexts/          # React contexts (Auth, Tenant)
│   ├── components/        # Reusable UI components
│   └── services/          # API services
│
├── server/                # Backend source
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── middleware/    # Tenant isolation, auth
│   │   ├── types/         # TypeScript definitions
│   │   └── index.ts       # Server entry point
│   └── package.json
│
└── package.json           # Frontend package
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
- Database queries use Row Level Security (RLS)
- File storage is partitioned by tenant
- Cache keys are prefixed with tenant ID

## 🚢 Deployment

### AWS Deployment (Recommended)

1. **Frontend**: Deploy to S3 + CloudFront
2. **Backend**: Deploy to ECS Fargate or Lambda
3. **Database**: RDS PostgreSQL with Multi-AZ
4. **Cache**: ElastiCache Redis
5. **Storage**: S3 for file uploads

### Environment Variables

Create `.env` files for configuration:

```env
# Frontend (.env)
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...

# Backend (server/.env)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
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