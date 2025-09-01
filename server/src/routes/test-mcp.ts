import { Hono } from 'hono';

const app = new Hono();

// Direct MCP test without tenant middleware
app.get('/test', async (c) => {
  try {
    // Test basic connectivity to MCP server
    const response = await fetch('http://localhost:8002/health', {
      method: 'GET',
    });
    
    const isHealthy = response.ok;
    const responseText = await response.text();
    
    return c.json({
      success: true,
      mcp_healthy: isHealthy,
      mcp_response: responseText,
      message: isHealthy ? 'MCP server is reachable' : 'MCP server is not responding'
    });
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message,
      message: 'Failed to connect to MCP server'
    }, 500);
  }
});

// Test SQL execution directly
app.post('/test-sql', async (c) => {
  try {
    const { sql } = await c.req.json();
    
    // Use JSON-RPC format
    const response = await fetch('http://localhost:8002/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'sql',  // Correct tool name
          arguments: {
            sql: sql,  // Note: parameter is 'sql' not 'query'
            max_results: 1000
          }
        },
        id: Date.now()
      })
    });
    
    const responseText = await response.text();
    console.log('MCP Response:', responseText);
    
    if (!response.ok) {
      return c.json({
        success: false,
        error: `MCP returned ${response.status}: ${responseText}`
      }, 500);
    }
    
    // Parse SSE format response
    if (responseText.includes('event:')) {
      const lines = responseText.split('\n');
      let resultData = null;
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.id && parsed.result) {
              resultData = parsed;
            }
          } catch (e) {
            // Continue to next line
          }
        }
      }
      
      if (resultData && resultData.result) {
        // Extract the SQL result from the content
        const content = resultData.result.content;
        if (content && content[0] && content[0].text) {
          try {
            const sqlResult = JSON.parse(content[0].text);
            return c.json({
              success: true,
              data: sqlResult
            });
          } catch (e) {
            return c.json({
              success: true,
              data: content[0].text
            });
          }
        }
      }
      
      return c.json({
        success: false,
        error: 'Could not parse MCP response',
        raw_response: responseText
      }, 500);
    }
    
    // Try regular JSON parsing
    try {
      const data = JSON.parse(responseText);
      if (data.error) {
        return c.json({
          success: false,
          error: data.error.message || 'MCP error'
        }, 500);
      }
      return c.json({
        success: true,
        data: data.result || data
      });
    } catch (e) {
      return c.json({
        success: false,
        error: 'Invalid JSON from MCP',
        raw_response: responseText
      }, 500);
    }
  } catch (error: any) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

export default app;