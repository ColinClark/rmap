# RMAP Platform - Overview

## Introduction

RMAP (Retail Media Advertising Platform) is a comprehensive multi-tenant SaaS marketing platform designed for managing retail media campaigns, audience segments, and cross-channel advertising at enterprise scale. Built with modern web technologies and cloud-first architecture, RMAP provides a complete solution for retail media planning, execution, and analysis.

## Key Business Goals

1. **Multi-Tenancy First**: Complete data isolation and tenant-specific configurations
2. **Security by Default**: JWT authentication, role-based access control, and encrypted data
3. **Scalability**: Designed for horizontal scaling and high availability
4. **Type Safety**: Full TypeScript implementation with no `any` types
5. **Clean Architecture**: Clear separation between UI, business logic, and data layers

## Core Features

### Multi-Tenant Architecture
- Complete tenant isolation at the API level via middleware
- Subscription-based feature access (Free, Starter, Professional, Enterprise, Custom)
- Usage tracking and limits enforcement per tenant
- Custom domain support for enterprise clients

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Email verification for new users
- Password reset via secure email tokens
- Team invitation system with role assignment
- Role-based access control (Owner, Admin, Manager, Member, Viewer)
- Two-factor authentication support (ready for implementation)

### Platform Administration
- Dedicated admin portal for platform management
- App entitlement system (like an app store for granting apps to tenants)
- Tenant management with subscription control
- Platform admin user management
- Activity logging and audit trails

### User Management
- User registration with email verification
- Team member invitations
- Role and permission management
- Session persistence across page refreshes
- Automatic logout on token expiry

### Application Ecosystem
- **Retail Media Audience Planner**: AI-powered audience segmentation for retail media campaigns
- **Data Query Tool**: Advanced data exploration with SQL and visual query builder
- Extensible app framework for adding new applications

## Technology Stack

### Infrastructure
- **Monorepo**: Turborepo for efficient builds and dependency management
- **Package Management**: npm workspaces for shared packages
- **Cloud Database**: MongoDB Atlas with automatic scaling

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS v3 with custom design system
- **UI Components**: Radix UI (via shadcn/ui) for accessible components
- **State Management**: TanStack Query for server state
- **Routing**: React Router v6 with protected routes

### Backend Stack
- **Framework**: Hono (lightweight, fast Node.js framework)
- **Database**: MongoDB Atlas with tenant isolation
- **Authentication**: JWT with refresh tokens
- **Email**: Nodemailer with Ethereal (dev) and SMTP (production)
- **Validation**: Zod for runtime type checking

### Integrations
- **MCP (Model Context Protocol)**: AI integrations for advanced features
  - SynthiePop: 83M synthetic German population records
  - Statista: Market data and statistics
- **Retail Media Platforms**: Ready for integration with Amazon DSP, Walmart Connect, etc.

## Project Status

### Completed Phases
- ✅ **Phase 3 - User Management**: Full authentication system, invitations, RBAC
- ✅ **Phase 4 - Tenant Management**: CRUD operations, subscription management, usage tracking
- ✅ **Phase 6 - Admin Portal**: Platform administration, app entitlements

### Current Capabilities
- Production-ready multi-tenant architecture
- Complete authentication and authorization system
- Working admin portal with app management
- Two flagship applications (Retail Media Planner, Data Query)
- Email system with verification and password reset

### Roadmap
- Phase 5: Billing & Subscription Management (Stripe integration)
- Phase 7: Performance & Monitoring (APM, metrics, alerting)
- Phase 8: Advanced Features (SSO, white-labeling, advanced analytics)

## Documentation Guide

This documentation is organized to serve different audiences:

- **[Architecture Guide](./ARCHITECTURE.md)**: Technical deep-dive for developers
- **[API Documentation](./API.md)**: Complete API reference
- **[Developer Guide](./DEVELOPER.md)**: Setup, development workflows, and best practices
- **[Admin Guide](./ADMIN.md)**: Platform administration manual
- **[Deployment Guide](./DEPLOYMENT.md)**: Production deployment and operations

## Quick Links

- **Main Application**: http://localhost:3000
- **Admin Portal**: http://localhost:3001
- **API Server**: http://localhost:4000
- **Database**: MongoDB Atlas (see `.env` for connection string)

## Default Credentials

### Admin Portal
- Email: `admin@rmap.com`
- Password: `Admin123`

### Demo User (Main App)
- Email: `demo@example.com`
- Password: `Demo123`

## Support

For questions, issues, or contributions:
- Review the [Developer Guide](./DEVELOPER.md) for contribution guidelines
- Check the [Troubleshooting Section](./DEVELOPER.md#troubleshooting) for common issues
- Submit issues via GitHub Issues
- Contact the development team at dev@rmap.com