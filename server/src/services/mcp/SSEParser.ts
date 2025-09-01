export class SSEParser {
  static parseSSEResponse(responseText: string): any {
    // Handle both \n and \r\n line endings
    const lines = responseText.split(/\r?\n/);
    const events: any[] = [];
    
    console.log(`SSEParser: Processing ${lines.length} lines`);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('event:')) {
        // This is an event type line
        const eventType = line.substring(6).trim();
        
        // Look for the corresponding data line
        if (i + 1 < lines.length && lines[i + 1].startsWith('data:')) {
          const dataLine = lines[i + 1];
          const jsonStr = dataLine.substring(5).trim();
          
          try {
            const data = JSON.parse(jsonStr);
            events.push({ type: eventType, data });
            console.log(`SSEParser: Added event type '${eventType}'`);
          } catch (e) {
            console.error('SSEParser: Failed to parse event data:', jsonStr.substring(0, 100));
          }
        }
      } else if (line.startsWith('data:')) {
        // Data line (might be preceded by an event line)
        const jsonStr = line.substring(5).trim();
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            const eventType = (i > 0 && lines[i - 1].startsWith('event:')) 
              ? lines[i - 1].substring(6).trim() 
              : 'message';
            events.push({ type: eventType, data });
            
            // Log if this looks like a result
            if (data.id && data.result) {
              console.log(`SSEParser: Found result with id ${data.id}`);
            }
          } catch (e) {
            console.error('SSEParser: Failed to parse data line:', jsonStr.substring(0, 100));
          }
        }
      }
    }
    
    console.log(`SSEParser: Parsed ${events.length} events`);
    
    // Find the result message (should be the last meaningful event)
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      if (event.data?.id && event.data?.result) {
        console.log(`SSEParser: Returning result from event ${i}`);
        return event.data;
      }
    }
    
    console.log('SSEParser: No result found in events');
    return null;
  }
  
  static extractSQLResult(sseResult: any): any {
    if (!sseResult || !sseResult.result) {
      console.log('SSEParser.extractSQLResult: No result in sseResult');
      return null;
    }
    
    const content = sseResult.result.content;
    console.log('SSEParser.extractSQLResult: Content type:', typeof content, 'isArray:', Array.isArray(content));
    
    if (content && Array.isArray(content) && content[0]?.text) {
      const textContent = content[0].text;
      console.log('SSEParser.extractSQLResult: Text content type:', typeof textContent, 'length:', textContent?.length);
      console.log('SSEParser.extractSQLResult: First 200 chars of text:', textContent?.substring(0, 200));
      
      // Check if the text content is an error message
      if (typeof textContent === 'string') {
        // Check if it's an error message
        if (textContent.startsWith('Error:') || textContent.includes('Binder Error:') || textContent.includes('SQL execution failed:')) {
          console.log('SSEParser.extractSQLResult: Detected error message');
          return {
            error: textContent,
            success: false
          };
        }
        
        // Check if it's JSONL format (has multiple JSON objects on separate lines)
        if (textContent.includes('\n') && textContent.includes('"type": "metadata"')) {
          console.log('SSEParser.extractSQLResult: Detected JSONL format');
          
          const lines = textContent.split('\n').filter(line => line.trim());
          console.log(`SSEParser.extractSQLResult: Processing ${lines.length} JSONL lines`);
          
          const result: any = {
            results: [],
            columns: [],
            row_count: 0,
            sql: ''
          };
          
          for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // Fix NaN values in JSON (replace with null)
            if (line.includes(': NaN')) {
              line = line.replace(/: NaN/g, ': null');
            }
            
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'metadata') {
                // This is the metadata line
                result.sql = parsed.sql;
                result.columns = parsed.columns;
                result.row_count = parsed.row_count;
                result.truncated = parsed.truncated;
                console.log(`SSEParser.extractSQLResult: Line ${i}: Parsed metadata - ${parsed.row_count} rows, ${parsed.columns?.length} columns`);
              } else if (parsed.type === 'completion') {
                // This is the completion metadata
                result.execution_time_ms = parsed.execution_time_ms;
                result.actual_row_count = parsed.actual_row_count;
                console.log(`SSEParser.extractSQLResult: Line ${i}: Parsed completion - ${parsed.actual_row_count} actual rows`);
              } else {
                // This is a data row (no type field means it's actual data)
                result.results.push(parsed);
                if (i < 3) {
                  console.log(`SSEParser.extractSQLResult: Line ${i}: Added data row with ${Object.keys(parsed).length} fields`);
                }
              }
            } catch (e) {
              console.log(`SSEParser.extractSQLResult: Line ${i}: Failed to parse - ${e.message}`);
              console.log(`SSEParser.extractSQLResult: Line ${i} content: ${line.substring(0, 100)}...`);
            }
          }
          
          console.log(`SSEParser.extractSQLResult: Parsed JSONL - ${result.results.length} rows`);
          return result;
        }
        
        // Try to parse as single JSON object
        try {
          const parsed = JSON.parse(textContent);
          console.log('SSEParser.extractSQLResult: Successfully parsed as single JSON');
          return parsed;
        } catch (e) {
          console.log('SSEParser.extractSQLResult: Parse error:', e.message);
          // If not JSON, return the text as is
          return textContent;
        }
      } else {
        // If it's already an object, return it
        console.log('SSEParser.extractSQLResult: Content is already an object');
        return textContent;
      }
    }
    
    console.log('SSEParser.extractSQLResult: Returning raw result');
    return sseResult.result;
  }
}