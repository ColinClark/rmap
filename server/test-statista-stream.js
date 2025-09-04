// Test Statista MCP with streaming connection
import https from 'https';

const apiKey = process.env.STATISTA_API_KEY || 'qPjlFAcu6o11uHGwOwgfp4HhF9gIu7Z9VMWpsepi';
const sessionId = `test-session-${Date.now()}`;

console.log('Testing Statista MCP with streaming...\n');

// First, send initialization
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Then send tool call
const toolRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'search-statistics',
    arguments: {
      question: 'mobile phone sales'
    }
  }
};

function makeRequest(requestData, useSessionId = false) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(requestData);
    
    const options = {
      hostname: 'api.statista.ai',
      port: 443,
      path: '/v1/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'x-api-key': apiKey,
        'Content-Length': data.length
      }
    };
    
    if (useSessionId) {
      options.headers['mcp-session-id'] = sessionId;
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log('Response:', responseData.substring(0, 500));
        resolve(responseData);
      });
    });
    
    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });
    
    req.write(data);
    req.end();
  });
}

async function test() {
  try {
    // Try initialization first WITH session ID
    console.log('1. Sending initialization with session ID...');
    const initResponse = await makeRequest(initRequest, true);
    
    // Then try tool call with same session ID
    console.log('\n2. Sending tool call with session ID...');
    const toolResponse = await makeRequest(toolRequest, true);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

test();