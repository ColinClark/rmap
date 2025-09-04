// Test script to verify Statista MCP integration
import axios from 'axios';

async function testStatistaTool() {
  const apiKey = process.env.STATISTA_API_KEY || 'qPjlFAcu6o11uHGwOwgfp4HhF9gIu7Z9VMWpsepi';
  const baseUrl = 'http://localhost:4000/api/cohort/chat';
  
  console.log('Testing Statista tool execution...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not set');
  
  const testMessage = {
    messages: [],
    query: "What percentage of people in Germany buy organic food? Use Statista data to find out."
  };
  
  try {
    const response = await axios.post(baseUrl, testMessage, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'demo-tenant-id'
      },
      responseType: 'stream'
    });
    
    console.log('Response received, streaming data:');
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'tool_result' && data.tool === 'search_statistics') {
              console.log('✓ Statista tool was called!');
              console.log('Tool result:', data.resultSummary);
            } else if (data.type === 'content') {
              console.log('Content:', data.content.substring(0, 100));
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });
    
    response.data.on('end', () => {
      console.log('\nTest complete');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Set timeout to exit after 30 seconds
setTimeout(() => {
  console.log('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);

testStatistaTool();