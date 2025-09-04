import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  correlationId: string;
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  startTime: number;
}

// Create AsyncLocalStorage instance for request context
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export class RequestContextService {
  /**
   * Run a function with request context
   */
  static run<T>(context: RequestContext, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  }

  /**
   * Get current request context
   */
  static getContext(): RequestContext | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Get correlation ID from current context
   */
  static getCorrelationId(): string | undefined {
    return asyncLocalStorage.getStore()?.correlationId;
  }

  /**
   * Get tenant ID from current context
   */
  static getTenantId(): string | undefined {
    return asyncLocalStorage.getStore()?.tenantId;
  }

  /**
   * Get user ID from current context
   */
  static getUserId(): string | undefined {
    return asyncLocalStorage.getStore()?.userId;
  }

  /**
   * Update context with additional data
   */
  static updateContext(updates: Partial<RequestContext>): void {
    const currentContext = asyncLocalStorage.getStore();
    if (currentContext) {
      Object.assign(currentContext, updates);
    }
  }

  /**
   * Generate a new correlation ID
   */
  static generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Parse correlation ID from Hono request
   */
  static parseCorrelationId(req: any): string {
    // Check multiple possible header names using Hono's header method
    const correlationId = req.header?.('x-correlation-id') || 
                         req.header?.('x-request-id') || 
                         req.header?.('correlation-id') ||
                         req.header?.('request-id');
    
    return correlationId || this.generateCorrelationId();
  }

  /**
   * Create context from Hono request
   */
  static createFromRequest(req: any): RequestContext {
    // For Hono, req.header() is used to get headers
    const path = req.path || req.url || '/';
    const method = req.method || 'GET';
    
    return {
      correlationId: this.parseCorrelationId(req),
      tenantId: req.header?.('x-tenant-id'),
      userId: undefined, // Will be set by middleware
      sessionId: req.header?.('x-session-id'),
      clientIp: req.header?.('x-forwarded-for') || req.header?.('x-real-ip'),
      userAgent: req.header?.('user-agent'),
      requestPath: typeof path === 'function' ? path() : path,
      requestMethod: typeof method === 'function' ? method() : method,
      startTime: Date.now()
    };
  }
}