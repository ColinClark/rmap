import { MCPClient } from './MCPClient';
import { Tenant } from '../../types/tenant';
import configLoader from '../config/ConfigLoader';

interface QueryResult {
  success: boolean;
  data?: any[];
  metadata?: {
    rowCount?: number;
    executionTime?: number;
    database?: string;
  };
  error?: string;
}

export class QueryExecutor {
  private mcpClient: MCPClient;
  private queryConfig: any;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.mcpClient = new MCPClient(tenantId);
    this.queryConfig = configLoader.getConfig().query;
  }

  static forTenant(tenantId: string): QueryExecutor {
    return new QueryExecutor(tenantId);
  }

  async checkConnection(): Promise<boolean> {
    return await this.mcpClient.checkHealth();
  }

  async getDatabases(): Promise<any> {
    try {
      return await this.mcpClient.listDatabases();
    } catch (error: any) {
      console.error('Error getting databases:', error);
      throw error;
    }
  }

  async getSchema(database?: string): Promise<any> {
    try {
      return await this.mcpClient.getSchema(database);
    } catch (error: any) {
      console.error('Error getting schema:', error);
      throw error;
    }
  }

  async executeNaturalLanguageQuery(query: string, database?: string): Promise<QueryResult> {
    try {
      // The MCP server actually expects SQL, not natural language (for now)
      const result = await this.mcpClient.executeQuery(query, database);
      
      console.log('MCP Result structure:', {
        hasResults: !!result.results,
        resultsLength: result.results?.length,
        hasData: !!result.data,
        hasRows: !!result.rows,
        hasError: !!result.error,
        keys: Object.keys(result).slice(0, 10)
      });
      
      // Check if the result is an error
      if (result.error || result.success === false) {
        return {
          success: false,
          error: result.error || 'Query execution failed'
        };
      }
      
      // Handle the response format from MCP server
      // The response has: sql, results, row_count, execution_time_ms, columns
      return {
        success: true,
        data: result.results || result.data || result.rows || [],
        metadata: {
          rowCount: result.row_count || result.rowCount || result.results?.length || 0,
          executionTime: result.execution_time_ms || result.executionTime,
          database: database || result.database,
          columns: result.columns
        }
      };
    } catch (error: any) {
      console.error('Query execution error:', error);
      return {
        success: false,
        error: error.message || 'Query execution failed'
      };
    }
  }
}