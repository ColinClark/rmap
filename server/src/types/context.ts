import type { Tenant, TenantUser } from './tenant'

// Define the variables that will be available in the Hono context
export type Variables = {
  tenant: Tenant
  user: TenantUser
  tenantContext: {
    tenant: Tenant
    user: TenantUser
    permissions: string[]
  }
  admin?: any  // Admin user for admin routes
}