/**
 * Correlation ID management for request tracing
 */

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get or create a session correlation ID
 */
export function getSessionCorrelationId(): string {
  const key = 'session-correlation-id';
  let id = sessionStorage.getItem(key);
  
  if (!id) {
    id = generateCorrelationId();
    sessionStorage.setItem(key, id);
  }
  
  return id;
}

/**
 * Store correlation ID from server response
 */
export function storeServerCorrelationId(correlationId: string): void {
  if (correlationId) {
    sessionStorage.setItem('last-server-correlation-id', correlationId);
  }
}

/**
 * Get the last server correlation ID
 */
export function getLastServerCorrelationId(): string | null {
  return sessionStorage.getItem('last-server-correlation-id');
}