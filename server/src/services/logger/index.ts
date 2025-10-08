/**
 * Comprehensive Logging System for RMAP
 * Supports multiple transports, structured logging, and audit trails
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { appConfig, PROJECT_ROOT } from '../../config';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists (relative to server root)
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Re-export log levels from config
import { appConfig } from '../../config';
const LogLevel = appConfig.logging.levels;

// Log metadata interface
export interface LogMetadata {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  action?: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  statusCode?: number;
  method?: string;
  path?: string;
  query?: any;
  body?: any;
  error?: any;
  stack?: string;
}

// Custom format for logs
const customFormat = winston.format.printf(({ timestamp, level, message, service, ...metadata }) => {
  let log = `${timestamp} [${service}] ${level}: ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    // Filter out sensitive data
    const sanitized = sanitizeMetadata(metadata);
    if (Object.keys(sanitized).length > 0) {
      log += ` ${JSON.stringify(sanitized)}`;
    }
  }

  return log;
});

// Sanitize sensitive data from logs
function sanitizeMetadata(metadata: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization', 'cookie'];
  const sanitized = { ...metadata };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeMetadata(sanitized[key]);
    }
  }

  return sanitized;
}

// Create the main logger instance
class LoggerService {
  private logger: winston.Logger;
  private service: string = 'RMAP';

  constructor() {
    const transports: winston.transport[] = [];

    // Console transport (development)
    if (appConfig.server.env !== 'production') {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    // File transport for all logs
    transports.push(new DailyRotateFile({
      filename: path.join(appConfig.logging.dir, 'application-%DATE%.log'),
      datePattern: appConfig.logging.rotation.datePattern,
      zippedArchive: appConfig.logging.rotation.zippedArchive,
      maxSize: appConfig.logging.rotation.maxSize,
      maxFiles: appConfig.logging.rotation.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));

    // Separate file for errors
    transports.push(new DailyRotateFile({
      filename: path.join(appConfig.logging.dir, 'error-%DATE%.log'),
      datePattern: appConfig.logging.rotation.datePattern,
      zippedArchive: appConfig.logging.rotation.zippedArchive,
      maxSize: appConfig.logging.rotation.maxSize,
      maxFiles: appConfig.logging.errorLog.maxFiles,
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }));

    // Audit log for important events
    transports.push(new DailyRotateFile({
      filename: path.join(appConfig.logging.dir, 'audit-%DATE%.log'),
      datePattern: appConfig.logging.rotation.datePattern,
      zippedArchive: appConfig.logging.rotation.zippedArchive,
      maxSize: appConfig.logging.rotation.maxSize,
      maxFiles: appConfig.logging.auditLog.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      filter: (info) => info.audit === true
    }));

    // Production console transport with JSON format
    if (appConfig.server.env === 'production') {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      }));
    }

    this.logger = winston.createLogger({
      level: appConfig.logging.level || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        customFormat
      ),
      defaultMeta: { service: this.service },
      transports,
      exitOnError: false
    });
  }

  // Set service name for contextualized logging
  public setService(service: string): void {
    this.service = service;
  }

  // Main logging methods
  public error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    this.logger.error(message, {
      service: this.service,
      ...metadata,
      error: error?.message,
      stack: error?.stack
    });
  }

  public warn(message: string, metadata?: LogMetadata): void {
    this.logger.warn(message, {
      service: this.service,
      ...metadata
    });
  }

  public info(message: string, metadata?: LogMetadata): void {
    this.logger.info(message, {
      service: this.service,
      ...metadata
    });
  }

  public http(message: string, metadata?: LogMetadata): void {
    this.logger.http(message, {
      service: this.service,
      ...metadata
    });
  }

  public debug(message: string, metadata?: LogMetadata): void {
    this.logger.debug(message, {
      service: this.service,
      ...metadata
    });
  }

  // Audit logging for compliance and security
  public audit(action: string, metadata: LogMetadata & { audit?: boolean }): void {
    this.logger.info(`AUDIT: ${action}`, {
      service: this.service,
      audit: true,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  // Performance logging
  public performance(operation: string, duration: number, metadata?: LogMetadata): void {
    const level = duration > 1000 ? 'warn' : 'info';
    this.logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      service: this.service,
      operation,
      duration,
      ...metadata
    });
  }

  // Request logging
  public request(req: any, res: any, duration: number): void {
    const metadata: LogMetadata = {
      method: req.method,
      path: req.path || req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
      tenantId: req.tenant?.id,
      userId: req.user?.id,
      requestId: req.requestId
    };

    const level = res.statusCode >= 400 ? 'warn' : 'info';
    this.logger.log(level, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`, metadata);
  }

  // Database query logging
  public query(operation: string, collection: string, duration: number, metadata?: LogMetadata): void {
    this.logger.debug(`DB Query: ${operation} on ${collection} (${duration}ms)`, {
      service: this.service,
      operation,
      collection,
      duration,
      ...metadata
    });
  }

  // Security event logging
  public security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: LogMetadata): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    this.logger.log(level, `SECURITY: ${event} (${severity})`, {
      service: this.service,
      securityEvent: event,
      severity,
      ...metadata
    });
  }

  // Get logger instance for custom use
  public getLogger(): winston.Logger {
    return this.logger;
  }

  // Create child logger with additional context
  public child(metadata: any): LoggerService {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger.child(metadata);
    childLogger.service = this.service;
    return childLogger;
  }
}

// Export singleton instance
export const logger = new LoggerService();

// Export convenience class for service-specific loggers
export class Logger {
  private loggerInstance: LoggerService;

  constructor(service: string) {
    this.loggerInstance = new LoggerService();
    this.loggerInstance.setService(service);
  }

  error(message: string, error?: Error | any, metadata?: LogMetadata): void {
    this.loggerInstance.error(message, error, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.loggerInstance.warn(message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.loggerInstance.info(message, metadata);
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.loggerInstance.debug(message, metadata);
  }

  audit(action: string, metadata: LogMetadata): void {
    this.loggerInstance.audit(action, metadata);
  }

  performance(operation: string, duration: number, metadata?: LogMetadata): void {
    this.loggerInstance.performance(operation, duration, metadata);
  }

  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: LogMetadata): void {
    this.loggerInstance.security(event, severity, metadata);
  }
}