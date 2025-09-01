import { Tenant } from '../../types/tenant';
import configLoader, { MCPConfig } from '../config/ConfigLoader';
import { SSEParser } from './SSEParser';

interface MCPResponse {
  success?: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class MCPClient {
  private baseUrl: string;
  private tenantId: string;
  private config: MCPConfig;

  constructor(tenantId: string) {
    this.config = configLoader.getMCPConfig();
    this.baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
    this.tenantId = tenantId;
    
    if (!this.config.enabled) {
      throw new Error('MCP Synthiepop connection is disabled in configuration');
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}${this.config.endpoints.health}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('MCP server health check failed:', error);
      return false;
    }
  }

  async getSchema(database?: string): Promise<any> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Tenant-ID': this.tenantId
      };

      if (this.config.security?.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.security.apiKey}`;
      }

      // Use catalog tool to get schema
      const body = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'catalog',
          arguments: {
            database: database,
            include_sample_data: false,
            sample_rows: 5
          }
        },
        id: Date.now()
      };

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.schema}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`MCP schema request failed: ${response.statusText}`);
      }

      // Parse SSE format response
      if (responseText.includes('event:') || responseText.includes('\r\ndata:')) {
        const sseResult = SSEParser.parseSSEResponse(responseText);
        if (sseResult) {
          return SSEParser.extractSQLResult(sseResult);
        }
      }

      // Fallback to JSON parsing
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Error fetching MCP schema:', error);
      throw error;
    }
  }

  async listDatabases(): Promise<any> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId
      };

      if (this.config.security?.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.security.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.databases}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      if (!response.ok) {
        throw new Error(`MCP list databases request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error listing databases:', error);
      throw error;
    }
  }

  async executeQuery(query: string, database?: string): Promise<any> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Tenant-ID': this.tenantId
      };

      if (this.config.security?.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.security.apiKey}`;
      }

      // Use JSON-RPC format for MCP with correct tool name
      const body = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'sql',  // Correct tool name from the documentation
          arguments: {
            sql: query,  // Note: parameter is 'sql' not 'query'
            ...(database && { database }),  // Only include if provided
            max_results: 1000
          }
        },
        id: Date.now()
      };

      console.log('MCP Request:', {
        url: `${this.baseUrl}${this.config.endpoints.execute}`,
        body
      });

      const response = await fetch(`${this.baseUrl}${this.config.endpoints.execute}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.connection.timeout)
      });

      const responseText = await response.text();
      console.log('MCP Raw Response length:', responseText.length, 'bytes');

      if (!response.ok) {
        throw new Error(`MCP query failed: ${response.statusText} - ${responseText}`);
      }

      // Parse SSE format response
      if (responseText.includes('event:') || responseText.includes('\r\ndata:')) {
        console.log('MCPClient: Detected SSE format response');
        
        const sseResult = SSEParser.parseSSEResponse(responseText);
        if (sseResult) {
          const sqlResult = SSEParser.extractSQLResult(sseResult);
          
          console.log('MCPClient: Extracted SQL result:', {
            hasResults: !!sqlResult?.results,
            resultsLength: sqlResult?.results?.length,
            rowCount: sqlResult?.row_count,
            columns: sqlResult?.columns?.length
          });
          
          return sqlResult;
        } else {
          console.error('MCPClient: Could not parse SSE response');
          throw new Error('Failed to parse SSE response from MCP server');
        }
      }

      // Try parsing as regular JSON (fallback)
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error) {
          throw new Error(jsonResponse.error.message || 'MCP error');
        }
        return jsonResponse.result || jsonResponse;
      } catch (parseError) {
        console.error('Failed to parse MCP response as JSON');
        throw new Error('Invalid response from MCP server');
      }
    } catch (error) {
      console.error('Error executing query via MCP:', error);
      throw error;
    }
  }
}