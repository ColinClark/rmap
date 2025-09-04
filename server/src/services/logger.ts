import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import configLoader from './config/ConfigLoader';
import { RequestContextService } from './requestContext';

// Get logging configuration
const loggingConfig = configLoader.getConfig().logging || {
  level: 'info',
  queryLogging: {
    enabled: true,
    includeResults: false,
    includeTenant: true
  }
};

// Create the base log format based on config
const getLogFormat = (format: string = 'json') => {
  const baseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true })
  );

  switch (format) {
    case 'json':
      return winston.format.combine(
        baseFormat,
        winston.format.json()
      );
    case 'pretty':
      return winston.format.combine(
        baseFormat,
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          let log = `${timestamp} [${level.toUpperCase()}]`;
          if (context) log += ` [${context}]`;
          log += `: ${message}`;
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta, null, 2)}`;
          }
          return log;
        })
      );
    case 'text':
    default:
      return winston.format.combine(
        baseFormat,
        winston.format.simple()
      );
  }
};

// Create transports based on configuration
const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [];

  // Console transport
  if (loggingConfig.outputs?.console?.enabled) {
    const consoleFormat = loggingConfig.outputs.console.colorize
      ? winston.format.combine(
          winston.format.colorize(),
          getLogFormat(loggingConfig.outputs.console.format)
        )
      : getLogFormat(loggingConfig.outputs.console.format);

    transports.push(
      new winston.transports.Console({
        level: loggingConfig.outputs.console.level || loggingConfig.level,
        format: consoleFormat
      })
    );
  }

  // File transport
  if (loggingConfig.outputs?.file?.enabled) {
    const logsDir = path.join(process.cwd(), loggingConfig.outputs.file.directory);
    
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, loggingConfig.outputs.file.filename),
        datePattern: loggingConfig.outputs.file.datePattern,
        maxSize: loggingConfig.outputs.file.maxSize,
        maxFiles: loggingConfig.outputs.file.maxFiles,
        level: loggingConfig.outputs.file.level || loggingConfig.level,
        format: getLogFormat(loggingConfig.outputs.file.format)
      })
    );
  }

  // Error file transport
  if (loggingConfig.outputs?.errors?.enabled) {
    const logsDir = path.join(process.cwd(), loggingConfig.outputs.errors.directory);
    
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, loggingConfig.outputs.errors.filename),
        datePattern: loggingConfig.outputs.errors.datePattern,
        maxSize: loggingConfig.outputs.errors.maxSize,
        maxFiles: loggingConfig.outputs.errors.maxFiles,
        level: 'error',
        format: getLogFormat(loggingConfig.outputs.errors.format)
      })
    );
  }

  return transports;
};

// Create context-specific transports
const createContextTransport = (_contextName: string, contextConfig: any): winston.transport | null => {
  if (!contextConfig.filename) return null;
  
  const logsDir = path.join(process.cwd(), loggingConfig.outputs?.file?.directory || './logs');
  
  return new DailyRotateFile({
    filename: path.join(logsDir, contextConfig.filename),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: contextConfig.maxFiles || '14d',
    level: contextConfig.level || loggingConfig.level,
    format: getLogFormat(loggingConfig.format)
  });
};

// Main logger instance
const logger = winston.createLogger({
  level: loggingConfig.level || 'info',
  format: getLogFormat(loggingConfig.format),
  transports: createTransports(),
  exitOnError: false
});

// Context-specific loggers
const contextLoggers: { [key: string]: winston.Logger } = {};

// Create loggers for each context defined in config
if (loggingConfig.contexts) {
  Object.entries(loggingConfig.contexts).forEach(([contextName, contextConfig]: [string, any]) => {
    const transports = [...createTransports()];
    const contextTransport = createContextTransport(contextName, contextConfig);
    
    if (contextTransport) {
      transports.push(contextTransport);
    }

    contextLoggers[contextName] = winston.createLogger({
      level: contextConfig.level || loggingConfig.level,
      format: getLogFormat(loggingConfig.format),
      transports: transports,
      defaultMeta: { context: contextName }
    });
  });
}

// Structured logging class
export class Logger {
  private context: string;
  private logger: winston.Logger;

  constructor(context: string) {
    this.context = context;
    this.logger = contextLoggers[context] || logger;
  }

  private log(level: string, message: string, meta?: any) {
    // Get request context
    const requestContext = RequestContextService.getContext();
    
    const logData: any = { 
      context: this.context,
      // Always include correlation ID and tenant ID if available
      correlationId: requestContext?.correlationId,
      tenantId: requestContext?.tenantId || meta?.tenantId,
      userId: requestContext?.userId,
      sessionId: requestContext?.sessionId
    };
    
    // Add request metadata for API context
    if (this.context === 'api' && requestContext) {
      logData.request = {
        path: requestContext.requestPath,
        method: requestContext.requestMethod,
        ip: requestContext.clientIp,
        duration: requestContext.startTime ? Date.now() - requestContext.startTime : undefined
      };
    }
    
    // Handle special context configurations
    const contextConfig = loggingConfig.contexts?.[this.context];
    if (contextConfig) {
      // Filter sensitive data if configured
      if (contextConfig.includeSensitive === false && meta) {
        meta = this.filterSensitive(meta);
      }
      
      // Add SQL query if configured
      if (contextConfig.includeSQL && meta?.query) {
        logData.query = meta.query;
      }
      
      // Include results if configured
      if (contextConfig.includeResults && meta?.results) {
        logData.results = meta.results;
      }
    }

    // Remove undefined values
    Object.keys(logData).forEach(key => {
      if (logData[key] === undefined) {
        delete logData[key];
      }
    });

    this.logger.log(level, message, { ...logData, ...meta });
  }

  private filterSensitive(data: any): any {
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
    
    if (typeof data === 'object' && data !== null) {
      const filtered = { ...data };
      
      for (const key of Object.keys(filtered)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          filtered[key] = '[REDACTED]';
        } else if (typeof filtered[key] === 'object') {
          filtered[key] = this.filterSensitive(filtered[key]);
        }
      }
      
      return filtered;
    }
    
    return data;
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  error(message: string, error?: any, meta?: any) {
    const errorMeta = {
      ...meta,
      error: error?.message || error,
      stack: error?.stack
    };
    this.log('error', message, errorMeta);
  }

  // Special method for query logging
  query(sql: string, params?: any, results?: any) {
    const queryMeta: any = {
      query: sql,
      parameters: params
    };
    
    if (loggingConfig.contexts?.query?.includeResults && results) {
      queryMeta.results = results;
      queryMeta.rowCount = Array.isArray(results) ? results.length : undefined;
    }
    
    this.log('debug', 'SQL Query Executed', queryMeta);
  }

  // Method for measuring performance
  time(label: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      this.log('debug', `${label} completed`, { duration: `${duration}ms` });
    };
  }
}

// Export default logger instance
export default new Logger('app');

// Export function to create logger with context
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Export specific context loggers for convenience
export const mcpLogger = new Logger('mcp');
export const apiLogger = new Logger('api');
export const queryLogger = new Logger('query');
export const authLogger = new Logger('auth');