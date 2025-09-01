import { Hono } from 'hono';
import { z } from 'zod';
import { QueryExecutor } from '../services/mcp/QueryExecutor';
import { tenantMiddleware } from '../middleware/tenant';

const app = new Hono();

// Natural language query schema
const querySchema = z.object({
  query: z.string().min(1).max(10000),
  database: z.string().optional()
});

// Health check for MCP connection
app.get('/health', tenantMiddleware, async (c) => {
  try {
    const tenant = c.get('tenant');
    const executor = QueryExecutor.forTenant(tenant.id);
    const isHealthy = await executor.checkConnection();
    
    return c.json({
      success: true,
      healthy: isHealthy,
      message: isHealthy ? 'MCP server is connected' : 'MCP server is not responding'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      healthy: false,
      error: error.message
    }, 500);
  }
});

// List available databases
app.get('/databases', tenantMiddleware, async (c) => {
  try {
    const tenant = c.get('tenant');
    const executor = QueryExecutor.forTenant(tenant.id);
    const databases = await executor.getDatabases();
    
    return c.json({
      success: true,
      databases
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Get schema information
app.get('/schema', tenantMiddleware, async (c) => {
  try {
    const tenant = c.get('tenant');
    const database = c.req.query('database');
    
    const executor = QueryExecutor.forTenant(tenant.id);
    const schema = await executor.getSchema(database);
    
    return c.json({
      success: true,
      schema,
      database
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// Execute natural language query with streaming support
app.post('/execute', tenantMiddleware, async (c) => {
  try {
    const tenant = c.get('tenant');
    const body = await c.req.json();
    
    // Validate input
    const { query, database } = querySchema.parse(body);
    
    const executor = QueryExecutor.forTenant(tenant.id);
    const result = await executor.executeNaturalLanguageQuery(query, database);
    
    if (!result.success) {
      return c.json(result, 400);
    }
    
    // Check if we should stream the response (large results)
    const rowCount = result.metadata?.rowCount || 0;
    const STREAMING_THRESHOLD = 1000; // Stream if more than 1000 rows
    
    if (rowCount > STREAMING_THRESHOLD && result.data && Array.isArray(result.data)) {
      // Stream as JSONL for large results
      c.header('Content-Type', 'application/x-ndjson');
      c.header('Transfer-Encoding', 'chunked');
      
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send metadata first
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'metadata',
            success: true,
            rowCount,
            columns: result.metadata?.columns,
            executionTime: result.metadata?.executionTime
          }) + '\n'));
          
          // Stream each row
          for (const row of result.data!) {
            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'row',
              data: row
            }) + '\n'));
          }
          
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        }
      });
    }
    
    // Return regular JSON for small results
    return c.json(result);
  } catch (error: any) {
    console.error('Query endpoint error:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid request',
        details: error.errors
      }, 400);
    }
    
    return c.json({
      success: false,
      error: error.message || 'Query execution failed'
    }, 500);
  }
});

export default app;