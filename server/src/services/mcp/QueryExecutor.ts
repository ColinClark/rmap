import { MCPClient } from './MCPClient';
// import { Tenant } from '../../types/tenant'; // Not used
// import configLoader from '../config/ConfigLoader'; // TODO: Use for config
import { queryLogger } from '../logger';

interface QueryResult {
  success: boolean;
  data?: any[];
  metadata?: {
    rowCount?: number;
    executionTime?: number;
    database?: string;
    columns?: string[];
  };
  error?: string;
}

export class QueryExecutor {
  private mcpClient: MCPClient;
  // private queryConfig: any; // TODO: Use for query configuration
  // private tenantId: string; // TODO: Use for tenant isolation

  constructor(tenantId: string) {
    // this.tenantId = tenantId; // TODO: Store for tenant isolation
    this.mcpClient = new MCPClient(tenantId);
    // this.queryConfig = configLoader.getConfig().query; // TODO: Use for limits
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
      queryLogger.error('Error getting databases', error);
      throw error;
    }
  }

  async getSchema(database?: string): Promise<any> {
    try {
      return await this.mcpClient.getSchema(database);
    } catch (error: any) {
      queryLogger.error('Error getting schema', error);
      throw error;
    }
  }

  async executeSQL(query: string, database?: string): Promise<QueryResult> {
    try {
      const result = await this.mcpClient.executeQuery(query, database);
      
      queryLogger.debug('MCP SQL Result', {
        query: query.substring(0, 100),
        hasResults: !!result.results,
        resultsLength: result.results?.length,
        database
      });
      
      // Check if the result is an error
      if (result.error || result.success === false) {
        return {
          success: false,
          error: result.error || 'Query execution failed'
        };
      }
      
      // Handle the response format from MCP server
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
      queryLogger.error('SQL execution error', error);
      return {
        success: false,
        error: error.message || 'SQL execution failed'
      };
    }
  }

  async executeNaturalLanguageQuery(query: string, database?: string): Promise<QueryResult> {
    try {
      // The MCP server actually expects SQL, not natural language (for now)
      const result = await this.mcpClient.executeQuery(query, database);
      
      queryLogger.debug('MCP Result structure', {
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
      queryLogger.error('Query execution error', error);
      return {
        success: false,
        error: error.message || 'Query execution failed'
      };
    }
  }
}