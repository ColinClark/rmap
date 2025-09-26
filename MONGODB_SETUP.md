# MongoDB Atlas Setup Guide for RMAP

## Getting Your Connection String

Since we have MongoDB Atlas service account credentials, you'll need to get the connection string from the Atlas Console:

1. **Go to MongoDB Atlas Console**
   - Visit: https://cloud.mongodb.com/v2/68d2407459efd959c15a1fc7#clusters
   - Log in with your account

2. **Connect to Your Cluster**
   - Click the "Connect" button on your cluster
   - Choose "Connect your application"
   - Select "Node.js" as the driver and version 5.5 or later

3. **Copy the Connection String**
   - It should look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. **Add to .env File**
   ```env
   # Add this to your .env file
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Database Architecture

We're implementing a separated Control Plane / Data Plane architecture:

### Control Plane Database (`rmap_control`)
- **tenants** - Organization metadata, subscriptions
- **users** - Global user accounts
- **tenant_users** - User-tenant relationships
- **sessions** - Authentication sessions
- **platform_admins** - Super admin accounts
- **audit_logs** - Platform-level audit trail
- **usage_events** - Billing and usage tracking

### Data Plane Databases
- **rmap_shared** - For Free/Starter tier tenants (with tenantId field)
- **rmap_tenant_{slug}** - Dedicated databases for Professional/Enterprise

## Quick Setup Steps

1. **Add MongoDB URI to .env**
   ```bash
   echo 'MONGODB_URI=your_connection_string_here' >> .env
   ```

2. **Initialize Databases**
   ```bash
   cd server
   npx tsx src/scripts/init-databases.ts
   ```

3. **Create Initial Admin User**
   ```bash
   npx tsx src/scripts/create-admin.ts
   ```

4. **Start the Server**
   ```bash
   npm run dev
   ```

## Connection Testing

To test your MongoDB connection:

```bash
cd server
npx tsx -e "
import { mongoService } from './src/services/mongodb.js';
mongoService.connect()
  .then(() => console.log('✅ MongoDB connected successfully'))
  .then(() => mongoService.healthCheck())
  .then(health => console.log('✅ Health check:', health ? 'passed' : 'failed'))
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
"
```

## Security Checklist

- [ ] Create a database user (not using root/admin credentials)
- [ ] Whitelist your IP addresses in Network Access
- [ ] Use strong passwords
- [ ] Enable authentication
- [ ] Set up connection pooling limits
- [ ] Configure backup schedules

## Troubleshooting

### Connection Issues
- Check IP whitelist in Atlas Network Access
- Verify username/password are correct
- Ensure cluster is running (not paused)

### Authentication Issues
- Service account credentials (MONGODB_CLIENT_ID, etc.) are for Atlas Admin API
- Database connections need MONGODB_URI with database user credentials

### Performance
- Start with M10 cluster minimum for production
- Enable connection pooling in the service
- Use indexes on tenantId for shared databases