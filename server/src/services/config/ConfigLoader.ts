import { readFileSync } from 'fs';
import { parse } from 'yaml';
import * as path from 'path';

interface MCPConfig {
  enabled: boolean;
  host: string;
  port: number;
  protocol: string;
  endpoints: {
    health: string;
    execute: string;
    schema: string;
    databases: string;
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
  cohortBuilder: {
    llm: {
      provider: string;
      model: string;
      apiKey?: string;
      streaming: boolean;
      temperature: number;
      maxTokens: number;
      systemPrompt: string;
      maxIterations?: number;
    };
    mcp: {
      catalogTool: string;
      sqlTool: string;
      database: string;
    };
    population: {
      total: number;
      defaultConfidence: number;
    };
    features: {
      saveToWorkflow: boolean;
      exportSQL: boolean;
      suggestSimilar: boolean;
      explainability: boolean;
    };
  };
  logging: {
    level: string;
    format?: string;
    queryLogging: {
      enabled: boolean;
      includeResults: boolean;
      includeTenant: boolean;
    };
    outputs?: {
      console?: {
        enabled: boolean;
        level?: string;
        format?: string;
        colorize?: boolean;
      };
      file?: {
        enabled: boolean;
        level?: string;
        format?: string;
        directory: string;
        filename: string;
        datePattern: string;
        maxSize: string;
        maxFiles: string;
      };
      errors?: {
        enabled: boolean;
        level?: string;
        format?: string;
        directory: string;
        filename: string;
        datePattern: string;
        maxSize: string;
        maxFiles: string;
      };
    };
    contexts?: Record<string, any>;
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
            health: '/health',
            execute: '/mcp',
            schema: '/mcp',
            databases: '/mcp'
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
      cohortBuilder: {
        llm: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-5-20250929',
          apiKey: process.env.ANTHROPIC_API_KEY,
          streaming: true,
          temperature: 0.7,
          maxTokens: 4096,
          maxIterations: 20,
          systemPrompt: `You are an expert Cohort Builder assistant for the Retail Media Audience Planner, specializing in audience demographics, psychographics, and SQL analysis using DuckDB.

Your expertise includes:
- Deep understanding of demographic segmentation (age, gender, income, education, location, household composition)
- Psychographic profiling (lifestyle, values, attitudes, interests, shopping behaviors)
- Advanced SQL skills, particularly DuckDB syntax and analytics functions
- German market knowledge and consumer behavior patterns
- Retail media campaign audience optimization

You help users explore and build precise audience segments from Germany's 83M synthetic population database (SynthiePop).

You have access to powerful tools:
1. **SynthiePop Database** (catalog, sql) - Query Germany's 83M synthetic population
2. **Web Search** - For additional research when needed

INTELLIGENT TOOL SELECTION:
- Use database directly for clear demographic queries
- Use Web Search to bridge abstract concepts to concrete attributes
- Use Web Search for market validation and consumer insights

The synthiedb database has ONE TABLE called 'synthie' with 83M records containing:
- Demographics: age, gender, state_label, income, education_level, occupation, household_size, household_children
- Psychographics: innovation_score, shopping_preference, brand_affinity, lifestyle_segment
- Behaviors: shopping_frequency, shopping_location, online_shopping_propensity, category_affinity_*
- Geographic: bundesland (0=all Germany), city_size_category, urban_rural_flag

IMPORTANT: All queries should be against the 'synthie' table. Example: SELECT COUNT(*) FROM synthie WHERE ...

Your approach:
1. First, understand the user's business goal and target product/service
2. Translate insights into SQL queries using appropriate filters and aggregations
3. Execute SQL to get precise cohort counts and characteristics
4. Analyze results to provide actionable insights
5. Suggest refinements or adjacent segments to optimize reach

Query Guidelines:
- Always use the 'synthie' table for all queries
- Start with SELECT COUNT(*) FROM synthie to get cohort size
- Use GROUP BY for demographic breakdowns
- Calculate percentages of total population (83M)
- Show SQL queries for transparency

Response format:
- Lead with cohort size and % of population
- Provide key demographic/psychographic traits
- Show the SQL query used
- Offer strategic recommendations`
        },
        mcp: {
          catalogTool: 'synthiepop_catalog',
          sqlTool: 'synthiepop_sql',
          database: 'synthiedb'
        },
        population: {
          total: 83000000,
          defaultConfidence: 85
        },
        features: {
          saveToWorkflow: true,
          exportSQL: true,
          suggestSimilar: true,
          explainability: true
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