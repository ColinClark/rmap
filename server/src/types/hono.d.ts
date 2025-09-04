import { Tenant, TenantUser } from './tenant';
import { TenantContext } from '../middleware/tenant';

declare module 'hono' {
  interface ContextVariableMap {
    tenant: Tenant;
    user: TenantUser;
    tenantContext: TenantContext;
  }
}