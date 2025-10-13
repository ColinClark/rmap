import { Logger } from '../logger';
import configLoader, { StatistaMCPConfig } from '../config/ConfigLoader';
import { SSEParser } from './SSEParser';

const logger = new Logger('statista-mcp');

export class StatistaMCPClient {
  private static instances: Map<string, StatistaMCPClient> = new Map();
  private baseUrl: string;
  private tenantId: string;
  private config: StatistaMCPConfig;
  private apiKey: string;
  private initialized: boolean = false;
  private sessionId: string | undefined;

  private constructor(tenantId: string, config: StatistaMCPConfig) {
    this.config = config;
    this.tenantId = tenantId;
    this.baseUrl = config.baseUrl;
    // Don't create session ID here - server will provide it
    
    const apiKey = config.security?.apiKey?.startsWith('${') 
      ? process.env.STATISTA_API_KEY 
      : config.security?.apiKey;

    if (!apiKey) {
      throw new Error('Statista API key not configured');
    }
    
    this.apiKey = apiKey;
    
    if (!this.config.enabled) {
      throw new Error('Statista MCP connection is disabled in configuration');
    }
    
    logger.info('StatistaMCPClient created', { baseUrl: this.baseUrl, tenantId });
  }

  static async forTenant(tenantId: string): Promise<StatistaMCPClient> {
    if (!StatistaMCPClient.instances.has(tenantId)) {
      const config = configLoader.getStatistaMCPConfig();
      if (!config || !config.enabled) {
        throw new Error('Statista MCP is not configured or disabled');
      }
      const client = new StatistaMCPClient(tenantId, config);
      // Initialize on first use
      await client.initialize();
      StatistaMCPClient.instances.set(tenantId, client);
    }
    return StatistaMCPClient.instances.get(tenantId)!;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Tenant-ID': this.tenantId,
        'x-api-key': this.apiKey
        // Don't send session ID on initialization - server creates it
      };

      const body = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'rmap-server',
            version: '1.0.0'
          }
        },
        id: Date.now()
      };

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.execute}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Statista MCP initialization failed: ${response.statusText} - ${responseText}`);
      }

      // Parse SSE format response
      if (responseText.includes('event:') || responseText.includes('data:')) {
        const sseResult = SSEParser.parseSSEResponse(responseText);
        if (sseResult && sseResult.result) {
          // Extract session ID from response headers if provided
          const sessionIdHeader = response.headers.get('mcp-session-id');
          if (sessionIdHeader) {
            this.sessionId = sessionIdHeader;
          }
          
          logger.info('Statista MCP session initialized', { 
            sessionId: this.sessionId,
            capabilities: sseResult.result.capabilities 
          });
          this.initialized = true;
        } else {
          throw new Error('Failed to initialize Statista MCP session - no valid response');
        }
      } else {
        // Try parsing as regular JSON response
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.result) {
            // Extract session ID from response if provided
            const sessionIdHeader = response.headers.get('mcp-session-id');
            if (sessionIdHeader) {
              this.sessionId = sessionIdHeader;
            }
            
            logger.info('Statista MCP session initialized', { 
              sessionId: this.sessionId,
              capabilities: jsonResponse.result.capabilities 
            });
            this.initialized = true;
          } else {
            throw new Error('Failed to initialize Statista MCP session - no valid response');
          }
        } catch {
          throw new Error('Unexpected response format from Statista MCP server');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize Statista MCP session', { error });
      throw error;
    }
  }

  async searchStatistics(query: string, limit: number = 10): Promise<any> {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Tenant-ID': this.tenantId,
        'x-api-key': this.apiKey
      };
      
      // Only add session ID if we have one
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      // Use JSON-RPC format for MCP with correct tool name
      const body = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search-statistics',
          arguments: {
            query: query  // Statista expects 'query' parameter
          }
        },
        id: Date.now()
      };

      logger.debug('Statista search request', {
        url: `${this.baseUrl}${this.config.endpoints.execute}`,
        question: query,
        sessionId: this.sessionId
      });

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.execute}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      const responseText = await response.text();
      logger.info(`Statista response length: ${responseText.length} bytes`);
      logger.info(`Statista response first 500 chars: ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        logger.error('Statista search failed', {
          status: response.status,
          statusText: response.statusText,
          response: responseText.substring(0, 500)
        });
        throw new Error(`Statista search failed: ${response.statusText} - ${responseText}`);
      }

      // Parse SSE format response
      if (responseText.includes('event:') || responseText.includes('data:')) {
        logger.info('Detected SSE format response from Statista');

        const sseResult = SSEParser.parseSSEResponse(responseText);
        logger.info(`SSE parse result: ${sseResult ? 'success' : 'null'}`);
        if (sseResult) {
          // Extract the result - Statista returns results in content[0].text format
          if (sseResult.result?.content && Array.isArray(sseResult.result.content)) {
            const textContent = sseResult.result.content[0]?.text;
            if (textContent) {
              try {
                const parsed = JSON.parse(textContent);
                logger.debug('Statista search result', {
                  hasResults: !!parsed,
                  resultsCount: parsed?.items?.length || 0
                });
                return parsed;
              } catch {
                return textContent; // Return as-is if not JSON
              }
            }
          }
          return sseResult.result || sseResult;
        } else {
          logger.error('Could not parse SSE response from Statista');
          throw new Error('Failed to parse SSE response from Statista MCP server');
        }
      }

      // Try parsing as regular JSON (fallback)
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error) {
          throw new Error(jsonResponse.error.message || 'Statista MCP error');
        }
        return jsonResponse.result || jsonResponse;
      } catch (error) {
        logger.error('Failed to parse Statista response', { error, responseText: responseText.substring(0, 200) });
        throw new Error('Failed to parse response from Statista MCP server');
      }
    } catch (error: any) {
      logger.error('Statista search error', { error: error.message, query });
      throw error;
    }
  }

  async getChartData(chartId: string): Promise<any> {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Tenant-ID': this.tenantId,
        'x-api-key': this.apiKey
      };
      
      // Only add session ID if we have one
      if (this.sessionId) {
        headers['mcp-session-id'] = this.sessionId;
      }

      const body = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get-chart-data-by-id',
          arguments: {
            id: parseInt(chartId, 10) // Convert to number as expected by the tool
          }
        },
        id: Date.now()
      };

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.execute}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      const responseText = await response.text();
      logger.info(`Chart data response length: ${responseText.length} bytes`);
      logger.info(`Chart data response first 500 chars: ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        throw new Error(`Statista chart data request failed: ${response.statusText} - ${responseText}`);
      }

      // Parse SSE format response
      if (responseText.includes('event:') || responseText.includes('data:')) {
        logger.info('Detected SSE format in chart data response');
        const sseResult = SSEParser.parseSSEResponse(responseText);
        logger.info(`Chart data SSE parse result: ${sseResult ? 'success' : 'null'}`);
        if (sseResult) {
          // Extract the result - Statista returns results in content[0].text format
          if (sseResult.result?.content && Array.isArray(sseResult.result.content)) {
            const textContent = sseResult.result.content[0]?.text;
            if (textContent) {
              try {
                return JSON.parse(textContent);
              } catch {
                return textContent;
              }
            }
          }
          return sseResult.result || sseResult;
        }
      }

      // Try parsing as regular JSON (fallback)
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error) {
          throw new Error(jsonResponse.error.message || 'Statista MCP error');
        }
        return jsonResponse.result || jsonResponse;
      } catch (error) {
        throw new Error('Failed to parse response from Statista MCP server');
      }
    } catch (error: any) {
      logger.error('Get chart data error', { error: error.message, chartId });
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${this.config.endpoints.health}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      logger.error('Statista health check failed', { error });
      return false;
    }
  }
}