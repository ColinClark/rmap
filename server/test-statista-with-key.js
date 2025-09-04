// Test Statista MCP with API key from .env
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function testStatistaWithKey() {
  const baseUrl = 'http://localhost:4000/api/cohort/chat';
  
  console.log('Testing Statista MCP tools for mobile phone sales data...');
  console.log('API Key loaded:', process.env.STATISTA_API_KEY ? 'YES' : 'NO');
  console.log('');
  
  const testMessage = {
    messages: [],
    query: "Search Statista for mobile phone sales data. What are the global smartphone sales figures and market shares of major brands like Apple, Samsung, and others?"
  };
  
  try {
    const response = await axios.post(baseUrl, testMessage, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': 'demo-tenant-id'
      },
      responseType: 'stream'
    });
    
    console.log('Response received, streaming data:\n');
    
    let toolCalls = [];
    let finalContent = '';
    let isCollectingContent = false;
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'tool_result') {
              console.log(`✓ Tool called: ${data.tool}`);
              console.log(`  Result: ${data.resultSummary}`);
              
              if (data.tool === 'search_statistics' || data.tool === 'search-statistics') {
                toolCalls.push(data);
                if (data.result) {
                  const resultStr = JSON.stringify(data.result, null, 2);
                  console.log(`  Data preview: ${resultStr.substring(0, 300)}...`);
                }
              }
            } else if (data.type === 'content') {
              // Start collecting after we see tool results
              if (toolCalls.length > 0 || data.isFinalResult) {
                isCollectingContent = true;
              }
              
              if (isCollectingContent && (!data.isExploration || data.isFinalResult)) {
                process.stdout.write('.');
                finalContent += data.content;
              }
            } else if (data.type === 'end') {
              console.log('\n\n=== FINAL ANALYSIS ===');
              console.log(finalContent || '(No final content received)');
              console.log('\n=== TOOL CALLS SUMMARY ===');
              console.log(`Total Statista searches: ${toolCalls.length}`);
              toolCalls.forEach((call, i) => {
                console.log(`${i+1}. ${call.resultSummary}`);
              });
              
              if (toolCalls.length === 0) {
                console.log('\n⚠️  No Statista tools were called. This may indicate:');
                console.log('   - The API key is not being loaded correctly');
                console.log('   - The server needs to be restarted after adding the key');
                console.log('   - There is a configuration issue');
              } else {
                console.log('\n✅ Statista tools are working correctly!');
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });
    
    response.data.on('end', () => {
      console.log('\n\nTest complete');
      process.exit(0);
    });
    
    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      process.exit(1);
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

// Set timeout to exit after 60 seconds
setTimeout(() => {
  console.log('\nTest timed out after 60 seconds');
  process.exit(0);
}, 60000);

testStatistaWithKey();