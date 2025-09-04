import { Context, Next } from 'hono';
import { RequestContextService } from '../services/requestContext';
import { apiLogger } from '../services/logger';

/**
 * Middleware to set up request context with correlation ID and tenant info
 */
export const requestContextMiddleware = async (c: Context, next: Next) => {
  // Create request context
  const context = RequestContextService.createFromRequest(c.req);
  
  // Get tenant ID from various sources
  const tenantId = c.req.header('X-Tenant-ID') || 
                   c.req.header('X-Tenant-Slug') ||
                   c.get('tenantId') ||
                   c.req.query('tenantId');
  
  if (tenantId) {
    context.tenantId = tenantId;
  }

  // Get user ID from JWT or session
  const userId = c.get('userId');
  if (userId) {
    context.userId = userId;
  }

  // Run the rest of the request within context
  return RequestContextService.run(context, async () => {
    // Log request start
    apiLogger.info(`${context.requestMethod} ${context.requestPath}`, {
      query: c.req.query(),
      headers: {
        'content-type': c.req.header('content-type'),
        'user-agent': c.req.header('user-agent')
      }
    });

    // Add correlation ID to response headers
    c.header('X-Correlation-ID', context.correlationId);
    
    try {
      // Continue with the request
      await next();
      
      // Log request completion
      const duration = Date.now() - context.startTime;
      apiLogger.info(`Request completed`, {
        status: c.res.status,
        duration: `${duration}ms`
      });
    } catch (error) {
      // Log request error
      const duration = Date.now() - context.startTime;
      apiLogger.error(`Request failed`, error, {
        status: c.res.status || 500,
        duration: `${duration}ms`
      });
      throw error;
    }
  });
};

/**
 * Helper to get current correlation ID
 */
export const getCorrelationId = (): string | undefined => {
  return RequestContextService.getCorrelationId();
};

/**
 * Helper to get current tenant ID
 */
export const getTenantId = (): string | undefined => {
  return RequestContextService.getTenantId();
};