# RMAP Admin Portal Guide

## Overview

The RMAP Admin Portal is the central control panel for platform administrators to manage tenants, applications, users, and system settings. This guide covers all administrative functions and best practices.

## Access Credentials

### Default Super Admin
- **URL**: http://localhost:3001 (development)
- **Email**: `admin@rmap.com`
- **Password**: `Admin123`

> **Security Note**: Change the default password immediately in production environments.

## Dashboard Overview

The admin dashboard provides a real-time view of platform health and activity:

### Key Metrics
- **Active Tenants**: Total number of active tenant accounts
- **Total Users**: Aggregate user count across all tenants
- **Revenue**: Monthly recurring revenue (MRR)
- **API Usage**: Platform-wide API call statistics
- **System Health**: Server status and resource utilization

### Quick Actions
- Create new tenant
- View recent activity
- Access system logs
- Review pending support tickets

## Tenant Management

### Viewing Tenants

Navigate to **Tenants** in the sidebar to see all tenant organizations.

#### Tenant List View
- **Name**: Organization name
- **Slug**: URL-friendly identifier
- **Plan**: Subscription tier (Free, Starter, Professional, Enterprise)
- **Status**: Active, Trial, Suspended, Cancelled
- **Users**: Number of users in the tenant
- **Created**: Registration date
- **Actions**: Edit, View Details, Manage Apps

#### Filtering and Search
- Filter by subscription plan
- Filter by status
- Search by name or email
- Sort by creation date, user count, or revenue

### Creating a New Tenant

1. Click **"+ New Tenant"** button
2. Fill in required information:
   - **Organization Name**: Company or organization name
   - **Slug**: Unique URL identifier (auto-generated or custom)
   - **Contact Email**: Primary contact email
   - **Contact Name**: Primary contact person
   - **Subscription Plan**: Select appropriate tier

3. Configure initial settings:
   - **Trial Period**: Enable/disable trial
   - **Trial Duration**: Number of days (default: 14)
   - **Initial Users**: Number of allowed users
   - **API Limits**: Custom rate limits

4. Click **"Create Tenant"**

### Managing Tenant Subscriptions

#### Upgrading/Downgrading Plans

1. Navigate to tenant details
2. Click **"Manage Subscription"**
3. Select new plan
4. Configure plan-specific settings:
   - User limits
   - API call limits
   - Storage quotas
   - Feature flags

5. Set effective date
6. Click **"Update Subscription"**

#### Subscription Plans

| Plan | Users | API Calls/Month | Storage | Features |
|------|-------|-----------------|---------|-----------|
| Free | 5 | 10,000 | 1 GB | Basic features |
| Starter | 25 | 100,000 | 10 GB | + Email support |
| Professional | 100 | 1,000,000 | 100 GB | + Advanced analytics |
| Enterprise | Unlimited | Unlimited | Custom | All features + SLA |

#### Managing Trial Periods

- Extend trial duration
- Convert trial to paid immediately
- Cancel trial with reason tracking

### Tenant Settings

#### Security Settings
- **SSO Configuration**: Setup SAML/OAuth
- **IP Whitelisting**: Restrict access by IP
- **2FA Requirement**: Enforce two-factor authentication
- **Session Timeout**: Configure auto-logout

#### Usage Limits
- **User Limit**: Maximum users allowed
- **Campaign Limit**: Maximum active campaigns
- **Storage Quota**: Data storage limit
- **API Rate Limit**: Requests per minute/hour

#### Custom Configuration
- **Custom Domain**: Configure vanity domain
- **Branding**: Upload logo and set colors
- **Email Templates**: Customize system emails
- **Feature Flags**: Enable/disable specific features

## App Entitlement Management

### Understanding App Entitlements

Apps are features or modules that can be granted to specific tenants, similar to an app store model.

### Available Apps

#### Retail Media Audience Planner
- **Description**: AI-powered audience segmentation for retail media campaigns
- **Category**: Marketing
- **Default Plans**: Starter, Professional, Enterprise

#### Data Query Tool
- **Description**: Advanced data exploration with SQL and visual query builder
- **Category**: Data & Analytics
- **Default Plans**: Professional, Enterprise

### Granting Apps to Tenants

1. Navigate to **Apps** in the sidebar
2. Select the app to manage
3. Click **"Manage Entitlements"**
4. Search for the tenant
5. Click **"Grant Access"**
6. Configure app-specific settings:
   - Usage limits
   - Feature toggles
   - Access restrictions
7. Click **"Confirm Grant"**

### Revoking App Access

1. Go to tenant details
2. Select **"Entitled Apps"** tab
3. Find the app to revoke
4. Click **"Revoke Access"**
5. Provide reason (optional)
6. Confirm revocation

### Creating Custom Apps

1. Navigate to **Apps** → **"+ New App"**
2. Fill in app details:
   - **Name**: Display name
   - **ID**: Unique identifier
   - **Description**: Short and full descriptions
   - **Category**: Marketing, Analytics, Data, etc.
   - **Icon**: Upload or select icon
   - **Status**: Active, Beta, Coming Soon

3. Configure access:
   - **Available Plans**: Which subscription tiers can access
   - **Permissions Required**: Required user permissions
   - **Setup Required**: Whether tenant setup is needed

4. Define limits:
   - Usage quotas
   - User restrictions
   - API limits

5. Click **"Create App"**

## Platform Admin Management

### Admin Roles and Permissions

| Role | Description | Permissions |
|------|-------------|-------------|
| Super Admin | Full platform control | All permissions |
| Admin | General administration | Manage tenants, apps, view logs |
| Support | Customer support | View tenants, handle tickets |
| Billing | Financial management | View/manage billing, invoices |
| Developer | Technical operations | Manage apps, view logs, API access |

### Creating Admin Users

1. Navigate to **Admins** in the sidebar
2. Click **"+ Invite Admin"**
3. Enter admin details:
   - **Email**: Admin email address
   - **Name**: Full name
   - **Role**: Select appropriate role
   - **Custom Permissions**: Override role defaults

4. Click **"Send Invitation"**

The new admin will receive an email with setup instructions.

### Managing Admin Permissions

1. Go to **Admins** → Select admin
2. Click **"Edit Permissions"**
3. Toggle specific permissions:
   - `manage_tenants`: Create/edit/delete tenants
   - `view_tenants`: Read-only tenant access
   - `manage_billing`: Handle payments and invoices
   - `manage_apps`: Create/edit app entitlements
   - `view_analytics`: Access platform analytics
   - `manage_admins`: Create/edit other admins
   - `view_logs`: Access system logs
   - `manage_support`: Handle support tickets

4. Click **"Save Permissions"**

### Audit Log

All admin actions are logged for security and compliance:

1. Navigate to **Settings** → **Audit Log**
2. View all administrative actions:
   - Timestamp
   - Admin user
   - Action performed
   - Affected resource
   - IP address

3. Filter by:
   - Date range
   - Admin user
   - Action type
   - Resource type

4. Export logs for compliance

## System Settings

### Email Configuration

1. Navigate to **Settings** → **Email**
2. Configure SMTP settings:
   - **Host**: SMTP server address
   - **Port**: SMTP port (usually 587 or 465)
   - **Username**: SMTP username
   - **Password**: SMTP password
   - **From Address**: Default sender email
   - **From Name**: Default sender name

3. Test configuration
4. Save settings

### Security Settings

#### Password Policy
- Minimum length
- Complexity requirements
- Password expiration
- Password history

#### Session Management
- Session timeout
- Concurrent session limit
- Remember me duration

#### API Security
- Rate limiting defaults
- API key rotation
- Webhook signatures

### Backup and Recovery

1. **Automated Backups**
   - Schedule: Daily at 2 AM UTC
   - Retention: 30 days
   - Storage: Cloud storage

2. **Manual Backup**
   - Navigate to **Settings** → **Backup**
   - Click **"Create Backup Now"**
   - Download backup file

3. **Recovery**
   - Upload backup file
   - Select recovery point
   - Confirm recovery

## Analytics and Reporting

### Platform Analytics

Access comprehensive platform metrics:

1. Navigate to **Analytics**
2. View key metrics:
   - **Growth Metrics**: New tenants, user growth
   - **Usage Metrics**: API calls, storage usage
   - **Revenue Metrics**: MRR, churn rate, ARPU
   - **Performance Metrics**: Response times, error rates

### Custom Reports

1. Navigate to **Reports** → **"+ New Report"**
2. Select report type:
   - Tenant usage
   - Revenue analysis
   - User activity
   - API usage

3. Configure parameters:
   - Date range
   - Filters
   - Grouping
   - Export format

4. Generate and download report

## Support Operations

### Handling Support Tickets

1. Navigate to **Support**
2. View ticket queue:
   - **Priority**: Critical, High, Medium, Low
   - **Status**: New, In Progress, Resolved
   - **Category**: Technical, Billing, General

3. Click ticket to view details
4. Actions available:
   - Respond to ticket
   - Escalate to engineering
   - Change priority
   - Resolve ticket

### Common Support Tasks

#### Resetting User Passwords
1. Find user in tenant
2. Click **"Reset Password"**
3. Choose delivery method:
   - Email reset link
   - Generate temporary password

#### Unlocking Accounts
1. Navigate to tenant users
2. Find locked account
3. Click **"Unlock Account"**
4. Review login attempts

#### Extending Trials
1. Go to tenant subscription
2. Click **"Extend Trial"**
3. Set new expiration date
4. Add internal note

## Monitoring and Alerts

### System Health Monitoring

1. Navigate to **Monitoring**
2. View real-time metrics:
   - Server CPU/Memory
   - Database performance
   - API response times
   - Error rates

### Setting Up Alerts

1. Navigate to **Settings** → **Alerts**
2. Click **"+ New Alert"**
3. Configure alert:
   - **Metric**: What to monitor
   - **Threshold**: When to trigger
   - **Recipients**: Who to notify
   - **Channel**: Email, Slack, PagerDuty

Common alerts:
- High error rate (>1%)
- API response time (>500ms)
- Database connection issues
- Storage usage (>80%)
- Unusual tenant activity

## Best Practices

### Security Best Practices

1. **Regular Password Changes**: Change admin passwords monthly
2. **Two-Factor Authentication**: Enable for all admin accounts
3. **Principle of Least Privilege**: Grant minimum required permissions
4. **Audit Regular Review**: Review audit logs weekly
5. **IP Whitelisting**: Restrict admin access to known IPs

### Operational Best Practices

1. **Document Changes**: Log all significant changes
2. **Test in Staging**: Test configuration changes first
3. **Backup Before Major Changes**: Create manual backup
4. **Monitor After Changes**: Watch metrics after updates
5. **Communicate Maintenance**: Notify tenants in advance

### Customer Success Best Practices

1. **Proactive Monitoring**: Watch for usage anomalies
2. **Regular Check-ins**: Contact high-value tenants monthly
3. **Usage Reviews**: Help tenants optimize their usage
4. **Feature Education**: Inform about new features
5. **Churn Prevention**: Act on early warning signs

## Troubleshooting

### Common Issues

#### Tenant Cannot Login
1. Check tenant status (not suspended)
2. Verify user exists in tenant
3. Check password expiration
4. Review login attempts for lockout
5. Verify SSO configuration if enabled

#### API Rate Limiting Issues
1. Check tenant's plan limits
2. Review usage patterns
3. Consider temporary limit increase
4. Investigate for potential abuse

#### Email Delivery Problems
1. Verify SMTP configuration
2. Check email logs
3. Review bounce/complaint rates
4. Test with email testing tool

#### Performance Issues
1. Check system resources
2. Review database query performance
3. Check for API abuse
4. Review error logs

## Compliance and Legal

### Data Privacy

- **GDPR Compliance**: Tools for data export and deletion
- **Data Retention**: Configure retention policies
- **Audit Trail**: Complete action logging
- **Data Encryption**: At rest and in transit

### Terms of Service

1. Navigate to **Settings** → **Legal**
2. Update terms and privacy policy
3. Force re-acceptance when updated

### Data Export

For compliance requests:
1. Navigate to tenant details
2. Click **"Export Data"**
3. Select data types
4. Generate encrypted archive
5. Provide to customer

## Getting Help

### Documentation
- [Architecture Guide](./ARCHITECTURE.md)
- [API Documentation](./API_REFERENCE.md)
- [Developer Guide](./DEVELOPER.md)

### Support Channels
- **Email**: admin-support@rmap.com
- **Slack**: #platform-admins
- **Documentation**: https://docs.rmap.com/admin

### Emergency Contacts
- **On-Call Engineer**: Via PagerDuty
- **Security Issues**: security@rmap.com
- **Critical Outages**: Call escalation tree