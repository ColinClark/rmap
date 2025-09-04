// Test Statista MCP tools for mobile phone sales data
import axios from 'axios';

async function testStatistaPhoneSales() {
  const baseUrl = 'http://localhost:4000/api/cohort/chat';
  
  console.log('Testing Statista for mobile phone sales data...\n');
  
  const testMessage = {
    messages: [],
    query: "Search Statista for mobile phone sales data in Germany. How many smartphones are sold annually? What are the market shares of different brands?"
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
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'tool_result') {
              console.log(`\n✓ Tool called: ${data.tool}`);
              console.log(`  Result: ${data.resultSummary}`);
              
              if (data.tool === 'search_statistics' || data.tool === 'search-statistics') {
                toolCalls.push(data);
                if (data.result) {
                  console.log(`  Data found:`, JSON.stringify(data.result, null, 2).substring(0, 500));
                }
              }
            } else if (data.type === 'content') {
              // Only show non-exploration content
              if (!data.isExploration || data.isFinalResult) {
                process.stdout.write('.');
                finalContent += data.content;
              }
            } else if (data.type === 'end') {
              console.log('\n\n=== FINAL ANALYSIS ===');
              console.log(finalContent);
              console.log('\n=== TOOL CALLS SUMMARY ===');
              console.log(`Total Statista searches: ${toolCalls.length}`);
              toolCalls.forEach((call, i) => {
                console.log(`${i+1}. ${call.resultSummary}`);
              });
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

// Set timeout to exit after 45 seconds
setTimeout(() => {
  console.log('\nTest timed out after 45 seconds');
  process.exit(0);
}, 45000);

testStatistaPhoneSales();