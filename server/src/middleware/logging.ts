/**
 * Logging Middleware for Hono
 * Provides comprehensive request/response logging
 */

import { Context, Next } from 'hono';
import { Logger } from '../utils/logger';

const logger = new Logger('middleware');
type LogMetadata = Record<string, any>;
import { v4 as uuidv4 } from 'uuid';

/**
 * Request ID middleware
 * Adds unique request ID for tracing
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = c.req.header('X-Request-ID') || uuidv4();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
}

/**
 * Request logging middleware
 * Logs all incoming requests and responses
 */
export async function requestLoggingMiddleware(c: Context, next: Next) {
  const start = Date.now();
  const requestId = c.get('requestId') || uuidv4();

  // Get request details
  const method = c.req.method;
  const path = c.req.path;
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const userAgent = c.req.header('user-agent');

  // Log incoming request
  logger.debug(`→ ${method} ${path}`, {
    requestId,
    method,
    path,
    ip,
    userAgent,
    headers: c.req.header(),
    query: c.req.query()
  });

  try {
    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    // Get tenant and user from context if available
    const tenant = c.get('tenant');
    const user = c.get('user');

    const metadata: LogMetadata = {
      requestId,
      method,
      path,
      statusCode: status,
      duration,
      ip,
      userAgent,
      tenantId: tenant?.id,
      userId: user?.id
    };

    // Log based on status code
    if (status >= 500) {
      logger.error(`← ${method} ${path} ${status} (${duration}ms)`, undefined, metadata);
    } else if (status >= 400) {
      logger.warn(`← ${method} ${path} ${status} (${duration}ms)`, metadata);
    } else {
      logger.info(`← ${method} ${path} ${status} (${duration}ms)`, metadata);
    }

    // Log slow requests
    if (duration > 1000) {
      logger.performance(`Slow request: ${method} ${path}`, duration, metadata);
    }

  } catch (error: any) {
    const duration = Date.now() - start;

    logger.error(`← ${method} ${path} 500 (${duration}ms)`, error, {
      requestId,
      method,
      path,
      statusCode: 500,
      duration,
      ip,
      userAgent,
      error: error.message,
      stack: error.stack
    });

    throw error;
  }
}

/**
 * Audit logging middleware
 * Logs important actions for compliance
 */
export async function auditLoggingMiddleware(c: Context, next: Next) {
  await next();

  const path = c.req.path;
  const method = c.req.method;
  const tenant = c.get('tenant');
  const user = c.get('user');
  const requestId = c.get('requestId');

  // Define audit events
  const auditEvents = [
    { pattern: /\/api\/tenant\/billing/, action: 'BILLING_ACCESS' },
    { pattern: /\/api\/tenant\/users/, action: 'USER_MANAGEMENT' },
    { pattern: /\/api\/platform/, action: 'PLATFORM_ADMIN_ACCESS' },
    { pattern: /\/api\/auth\/login/, action: 'LOGIN' },
    { pattern: /\/api\/auth\/logout/, action: 'LOGOUT' },
    { pattern: /\/api\/campaigns/, action: 'CAMPAIGN_ACCESS' },
    { pattern: /\/api\/audiences/, action: 'AUDIENCE_ACCESS' }
  ];

  // Check if this is an auditable event
  for (const event of auditEvents) {
    if (event.pattern.test(path)) {
      logger.audit(`${event.action}: ${method} ${path}`, {
        requestId,
        tenantId: tenant?.id,
        userId: user?.id,
        action: event.action,
        method,
        path,
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        userAgent: c.req.header('user-agent'),
        statusCode: c.res.status
      });
      break;
    }
  }
}

/**
 * Security logging middleware
 * Logs security-related events
 */
export async function securityLoggingMiddleware(c: Context, next: Next): Promise<void> {
  const path = c.req.path;
  const method = c.req.method;
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /\.\.\//g, threat: 'Path traversal attempt' },
    { pattern: /<script>/gi, threat: 'XSS attempt' },
    { pattern: /union.*select/gi, threat: 'SQL injection attempt' },
    { pattern: /\$where/g, threat: 'NoSQL injection attempt' }
  ];

  const url = c.req.url;
  for (const suspicious of suspiciousPatterns) {
    if (suspicious.pattern.test(url)) {
      logger.security(suspicious.threat, 'high', {
        method,
        path,
        ip,
        userAgent: c.req.header('user-agent'),
        url
      });

      // Block the request
      return c.json({ error: 'Invalid request' }, 400);
    }
  }

  await next();

  // Log authentication failures
  if (c.res.status === 401) {
    logger.security('Authentication failure', 'medium', {
      method,
      path,
      ip,
      userAgent: c.req.header('user-agent')
    });
  }

  // Log authorization failures
  if (c.res.status === 403) {
    logger.security('Authorization failure', 'low', {
      method,
      path,
      ip,
      userAgent: c.req.header('user-agent'),
      tenantId: c.get('tenant')?.id,
      userId: c.get('user')?.id
    });
  }
}

/**
 * Error logging middleware
 * Catches and logs all errors
 */
export async function errorLoggingMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error: any) {
    const requestId = c.get('requestId');
    const tenant = c.get('tenant');
    const user = c.get('user');

    logger.error('Unhandled error', error, {
      requestId,
      tenantId: tenant?.id,
      userId: user?.id,
      method: c.req.method,
      path: c.req.path,
      error: error.message,
      stack: error.stack
    });

    // Re-throw to let error handler deal with response
    throw error;
  }
}

/**
 * Database query logging
 * Wraps database operations with performance logging
 */
export function logDatabaseQuery<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return fn()
    .then(result => {
      const duration = Date.now() - start;
      logger.query(operation, collection, duration);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.error(`Database query failed: ${operation} on ${collection}`, error, {
        operation,
        collection,
        duration
      });
      throw error;
    });
}