import { readFileSync } from 'fs';
import { parse } from 'yaml';
import * as path from 'path';

interface MCPConfig {
  enabled: boolean;
  host: string;
  port: number;
  protocol: string;
  endpoints: {
    catalog: string;
    query: string;
    stream: string;
  };
  connection: {
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  streaming: {
    enabled: boolean;
    format: string;
  };
  security?: {
    apiKey?: string;
  };
}

interface ServerConfig {
  server: {
    port: number;
    environment: string;
  };
  mcp: {
    synthiepop: MCPConfig;
  };
  database: {
    url: string;
    maxConnections: number;
  };
  tenant: {
    isolation: {
      enabled: boolean;
      strategy: string;
    };
    defaults: {
      queryLimit: number;
      cacheEnabled: boolean;
      cacheTTL: number;
    };
  };
  query: {
    maxExecutionTime: number;
    maxRowsReturned: number;
    dangerousKeywords: string[];
    validation: {
      enabled: boolean;
      strict: boolean;
    };
  };
  logging: {
    level: string;
    queryLogging: {
      enabled: boolean;
      includeResults: boolean;
      includeTenant: boolean;
    };
  };
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: ServerConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  loadConfig(): ServerConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const configPath = path.join(process.cwd(), 'config.yaml');
      const fileContent = readFileSync(configPath, 'utf8');
      let configText = fileContent;

      // Replace environment variables
      const envPattern = /\$\{([^}]+)\}/g;
      configText = configText.replace(envPattern, (match, envVar) => {
        return process.env[envVar] || match;
      });

      this.config = parse(configText) as ServerConfig;
      
      console.log('Configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('Error loading configuration:', error);
      // Return default configuration if file not found
      return this.getDefaultConfig();
    }
  }

  getConfig(): ServerConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  getMCPConfig(): MCPConfig {
    const config = this.getConfig();
    return config.mcp.synthiepop;
  }

  private getDefaultConfig(): ServerConfig {
    return {
      server: {
        port: 4000,
        environment: 'development'
      },
      mcp: {
        synthiepop: {
          enabled: true,
          host: 'localhost',
          port: 8002,
          protocol: 'http',
          endpoints: {
            catalog: '/catalog',
            query: '/query',
            stream: '/query/stream'
          },
          connection: {
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000
          },
          streaming: {
            enabled: true,
            format: 'sse'
          }
        }
      },
      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost/rmap',
        maxConnections: 20
      },
      tenant: {
        isolation: {
          enabled: true,
          strategy: 'row-level'
        },
        defaults: {
          queryLimit: 1000,
          cacheEnabled: true,
          cacheTTL: 300
        }
      },
      query: {
        maxExecutionTime: 60000,
        maxRowsReturned: 10000,
        dangerousKeywords: ['drop', 'delete', 'truncate', 'alter', 'create'],
        validation: {
          enabled: true,
          strict: false
        }
      },
      logging: {
        level: 'info',
        queryLogging: {
          enabled: true,
          includeResults: false,
          includeTenant: true
        }
      }
    };
  }
}

export default ConfigLoader.getInstance();
export { MCPConfig, ServerConfig };