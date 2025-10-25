import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../services/logger';
import { tenantMiddleware } from '../middleware/tenant';
import configLoader from '../services/config/ConfigLoader';
import { QueryExecutor } from '../services/mcp/QueryExecutor';

const logger = new Logger('cohort');
const config = configLoader.loadConfig();
const cohortConfig = config.cohortBuilder;

if (!cohortConfig) {
  logger.error('CohortBuilder configuration not found');
  throw new Error('CohortBuilder configuration is missing from config');
}

let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const configApiKey = cohortConfig.llm?.apiKey;
    const envApiKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = (configApiKey && !configApiKey.includes('${')) ? configApiKey : envApiKey;
    
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

const cohort = new Hono();
cohort.use('/*', cors());
cohort.use('/*', tenantMiddleware);

interface CohortMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CohortRequest {
  messages: CohortMessage[];
  query: string;
}

// Generate actionable error messages with specific guidance
function generateActionableError(toolName: string, error: Error, toolInput?: any): any {
  const errorMessage = error.message.toLowerCase();

  // SQL-specific errors
  if (toolName === 'sql') {
    // Wrong table name error
    if (errorMessage.includes('synthiedb') || errorMessage.includes('table') && errorMessage.includes('not found')) {
      return {
        error: error.message,
        type: 'TABLE_NAME_ERROR',
        suggestion: `The table name should be 'synthie' (not 'synthiedb' or other variations).

Try this instead:
- ❌ Wrong: SELECT COUNT(*) FROM synthiedb WHERE ...
- ✅ Correct: SELECT COUNT(*) FROM synthie WHERE ...

The database is called 'synthiedb', but the TABLE inside it is called 'synthie'.`,
        correctExample: 'SELECT COUNT(*) FROM synthie WHERE age BETWEEN 25 AND 34'
      };
    }

    // Syntax errors
    if (errorMessage.includes('syntax') || errorMessage.includes('parse')) {
      return {
        error: error.message,
        type: 'SQL_SYNTAX_ERROR',
        suggestion: `Your SQL query has a syntax error.

Common fixes:
1. Check column names exist (use catalog tool first)
2. Ensure proper DuckDB syntax
3. Use single quotes for strings: WHERE state_label = 'Berlin'
4. Check for missing parentheses or commas

Example valid query:
SELECT COUNT(*) as total,
       gender,
       AVG(income) as avg_income
FROM synthie
WHERE age BETWEEN 25 AND 34
  AND state_label = 'Berlin'
GROUP BY gender`,
        correctExample: "SELECT COUNT(*) FROM synthie WHERE age > 25 AND income > 50000"
      };
    }

    // Column not found
    if (errorMessage.includes('column') || errorMessage.includes('field')) {
      return {
        error: error.message,
        type: 'COLUMN_NOT_FOUND',
        suggestion: `The column name in your query doesn't exist in the database.

Steps to fix:
1. Call the 'catalog' tool to see all available columns
2. Check the exact spelling and case of column names
3. Common columns include: age, gender, income, state_label, education_level, household_size

Available demographic columns:
- age, gender, state_label, income, education_level, occupation
- household_size, household_children
- bundesland, city_size_category, urban_rural_flag

Available psychographic columns:
- innovation_score, shopping_preference, brand_affinity, lifestyle_segment`,
        nextAction: 'Call the catalog tool to see all available columns and their sample values'
      };
    }

    // Timeout or performance issues
    if (errorMessage.includes('timeout') || errorMessage.includes('too long')) {
      return {
        error: error.message,
        type: 'QUERY_TIMEOUT',
        suggestion: `Your query took too long to execute (>60 seconds).

Performance tips:
1. Add LIMIT clause for large result sets: LIMIT 1000
2. Use WHERE filters before GROUP BY to reduce rows
3. Start with COUNT(*) to estimate result size
4. Avoid SELECT * without filters (83M rows!)

Example optimized query:
-- Instead of this (slow):
-- SELECT * FROM synthie WHERE age > 25

-- Do this (fast):
SELECT COUNT(*) FROM synthie WHERE age BETWEEN 25 AND 34 LIMIT 100`,
        correctExample: 'SELECT COUNT(*) FROM synthie WHERE age > 25 LIMIT 1000'
      };
    }
  }

  // Catalog tool errors
  if (toolName === 'catalog') {
    if (errorMessage.includes('database') || errorMessage.includes('connection')) {
      return {
        error: error.message,
        type: 'DATABASE_CONNECTION_ERROR',
        suggestion: `Could not connect to the SynthiePop database.

This is usually a temporary issue. Please:
1. Try again in a moment
2. If the problem persists, the MCP server may be down
3. Check that the SynthiePop MCP server is running on localhost:8002`,
        nextAction: 'Retry the catalog request, or notify the user if the problem persists'
      };
    }
  }

  // Generic error with helpful context
  return {
    error: error.message,
    type: 'TOOL_EXECUTION_ERROR',
    suggestion: `Something went wrong while executing the '${toolName}' tool.

What you can try:
1. Check the tool input parameters are correct
2. For SQL queries: verify syntax and table name ('synthie')
3. For catalog: retry the request
4. Simplify the query and try again

If you need to see what data is available, call the 'catalog' tool first.`,
    toolName,
    input: toolInput
  };
}

// Execute tool calls
async function executeToolCall(toolName: string, toolInput: any, tenantId: string): Promise<string> {
  try {
    logger.info('Executing tool', { toolName, tenantId, hasInput: !!toolInput });

    // Web search is handled by Anthropic server-side, not by us
    if (toolName === 'web_search') {
      // This shouldn't be called since Anthropic handles web_search automatically
      // But if it is, just return a placeholder
      return JSON.stringify({
        note: 'Web search is handled by Anthropic',
        results: []
      });
    }

    // SynthiePop database tools
    if (toolName === 'catalog') {
      const executor = QueryExecutor.forTenant(tenantId);
      const schema = await executor.getSchema(cohortConfig.mcp.database || 'synthiedb');
      return JSON.stringify(schema);
    } else if (toolName === 'sql') {
      const executor = QueryExecutor.forTenant(tenantId);
      const result = await executor.executeSQL(
        toolInput.sql || toolInput.query,  // MCP server expects 'sql' parameter
        cohortConfig.mcp.database || 'synthiedb'
      );
      return JSON.stringify(result);
    }
    throw new Error(`Unknown tool: ${toolName}`);
  } catch (error) {
    logger.error('Tool execution failed', { toolName, error });
    const actionableError = generateActionableError(
      toolName,
      error instanceof Error ? error : new Error('Tool execution failed'),
      toolInput
    );
    return JSON.stringify(actionableError);
  }
}

cohort.post('/chat', async (c) => {
  try {
    const tenant = c.get('tenant');
    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 500);
    }
    
    const body = await c.req.json() as CohortRequest;
    const { messages, query } = body;
    
    if (!messages || !query) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    const anthropicClient = getAnthropicClient();

    return streamSSE(c, async (stream) => {
      try {
        // Build messages for Anthropic
        const conversationMessages: any[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        conversationMessages.push({ role: 'user', content: query });

        let continueConversation = true;
        let iterations = 0;
        const maxIterations = cohortConfig.llm.maxIterations || 20;
        let phase: 'exploring' | 'analyzing' | 'finalizing' = 'exploring';
        
        while (continueConversation && iterations < maxIterations) {
          iterations++;
          logger.info('Creating stream iteration', {
            iteration: iterations,
            model: cohortConfig.llm.model
          });

          // Create streaming message
          const anthropicStream = anthropicClient.messages.stream({
            model: cohortConfig.llm.model,
            max_tokens: cohortConfig.llm.maxTokens,
            temperature: cohortConfig.llm.temperature,
            system: [
              {
                type: 'text',
                text: cohortConfig.llm.systemPrompt,
                cache_control: { type: 'ephemeral' }
              }
            ],
            messages: conversationMessages,
            tools: [
              {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 5
              },
              {
                name: 'catalog',
                description: `Explore the schema of the synthie database containing 83M German population records.

**What this tool returns:**
- Available columns with their data types (demographics, psychographics, behaviors)
- Sample values to understand the data
- Value ranges and distributions
- Column descriptions and meanings

**When to use this tool:**
- ALWAYS call this FIRST in every new conversation to understand available data
- When you don't know the exact column names
- When you need to see example values before writing SQL
- When exploring what demographic/psychographic data is available

**Example usage:**
User asks: "Show me young professionals"
→ First call catalog to find age and occupation columns
→ See sample values to understand how occupations are labeled
→ Then write SQL with correct column names

**Important:** The database has ONE table called 'synthie' with 83M records. All queries use this table name.

**Available data categories:**
- Demographics: age, gender, state_label, income, education_level, occupation, household_size, household_children
- Psychographics: innovation_score, shopping_preference, brand_affinity, lifestyle_segment
- Behaviors: shopping_frequency, shopping_location, online_shopping_propensity, category_affinity_*
- Geographic: bundesland, city_size_category, urban_rural_flag`,
                input_schema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'sql',
                description: `Execute SQL queries on the synthie database (83M German population records).

**What this tool does:**
- Runs DuckDB SQL queries against the 'synthie' table
- Returns query results with row count
- Provides data for cohort analysis and demographic breakdowns

**When to use this tool:**
- After calling catalog to understand available columns
- To get cohort sizes: SELECT COUNT(*) FROM synthie WHERE ...
- To get demographic breakdowns: SELECT column, COUNT(*) FROM synthie GROUP BY column
- To analyze specific segments with filters

**Query guidelines:**
- Table name is ALWAYS 'synthie' (not 'synthiedb' or other variations)
- Start with COUNT queries to check cohort size before detailed queries
- Use WHERE clauses for filtering (age, income, location, etc.)
- Use GROUP BY for demographic breakdowns
- Calculate percentages: (COUNT(*) * 100.0 / 83000000) AS percentage
- Limit large result sets for performance

**Example queries:**

1. Get cohort size:
   SELECT COUNT(*) FROM synthie WHERE age BETWEEN 25 AND 34

2. Demographic breakdown:
   SELECT gender, COUNT(*) as count
   FROM synthie
   WHERE age BETWEEN 25 AND 34
   GROUP BY gender

3. Complex filtering:
   SELECT COUNT(*) FROM synthie
   WHERE age BETWEEN 25 AND 34
     AND income > 50000
     AND state_label = 'Berlin'

**Common mistakes to avoid:**
- ❌ Wrong table name: SELECT * FROM synthiedb (incorrect)
- ✅ Correct table name: SELECT * FROM synthie
- ❌ Missing filters: SELECT * FROM synthie (returns 83M rows!)
- ✅ Always filter: SELECT * FROM synthie WHERE age > 25 LIMIT 100

**Performance tips:**
- Use LIMIT for large result sets
- Filter rows with WHERE before GROUP BY
- Start with COUNT(*) to estimate result size
- Avoid SELECT * without filters`,
                input_schema: {
                  type: 'object',
                  properties: {
                    sql: {
                      type: 'string',
                      description: 'DuckDB SQL query to execute against the synthie table. Must be valid DuckDB syntax.'
                    }
                  },
                  required: ['sql']
                }
              }
            ]
          });

          // Process streaming response
          let hasToolUse = false;
          let toolResults: any[] = [];
          let currentTextBlock = '';

          // Handle stream events (for real-time client updates only)
          anthropicStream.on('content_block_delta', async (event) => {
            if (event.delta.type === 'text_delta') {
              currentTextBlock += event.delta.text;

              // Stream text to client in real-time
              const lowerText = currentTextBlock.toLowerCase();
              const isExploration = lowerText.includes('let me') ||
                                   lowerText.includes('checking') ||
                                   lowerText.includes('exploring') ||
                                   lowerText.includes('i need to') ||
                                   lowerText.includes('i\'ll check');

              const isFinalResult = currentTextBlock.includes('##') ||
                                   currentTextBlock.includes('**Cohort') ||
                                   currentTextBlock.includes('### ') ||
                                   lowerText.includes('here\'s your cohort') ||
                                   lowerText.includes('cohort overview');

              // Update phase based on content
              if (isFinalResult) {
                phase = 'finalizing';
              } else if (iterations > 3 && !isExploration) {
                phase = 'analyzing';
              }

              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'content_delta',
                  content: event.delta.text,
                  isExploration,
                  isFinalResult,
                  phase
                })
              });
            }
          });

          anthropicStream.on('content_block_stop', async () => {
            currentTextBlock = '';
          });

          // Wait for final message - this contains ALL content blocks
          const finalMessage = await anthropicStream.finalMessage();

          logger.info('Response content blocks', {
            blockCount: finalMessage.content.length,
            types: finalMessage.content.map((b: any) => b.type)
          });

          // Use finalMessage.content as the complete assistant content
          // This includes all text blocks AND tool_use blocks
          const assistantContent = finalMessage.content;

          // Check for tool use and execute tools
          for (const block of finalMessage.content) {
            if (block.type === 'tool_use' && 'name' in block && 'input' in block && 'id' in block) {
              hasToolUse = true;
              logger.info('Tool use detected', { toolName: block.name });

              // Execute tool
              const toolResult = await executeToolCall(
                block.name,
                block.input,
                tenant.id
              );

              // Send tool result to client with metadata
              const parsedResult = JSON.parse(toolResult);
              let resultSummary = '';

              if (block.name === 'sql') {
                resultSummary = `Executed SQL query (${parsedResult.data?.length || 0} rows)`;
              } else if (block.name === 'catalog') {
                resultSummary = 'Retrieved database schema';
              } else if (block.name === 'web_search') {
                resultSummary = 'Web search completed';
              } else {
                resultSummary = `Retrieved ${block.name} data`;
              }

              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'tool_result',
                  tool: block.name,
                  result: parsedResult,
                  resultSummary
                })
              });

              // Collect tool result for later
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: toolResult
              });
            }
          }

          // After processing all blocks, add messages to conversation
          if (hasToolUse) {
            // Add ONE assistant message with all content blocks
            conversationMessages.push({
              role: 'assistant',
              content: assistantContent
            });

            // Add ONE user message with all tool results
            conversationMessages.push({
              role: 'user',
              content: toolResults
            });

            logger.info('Tool was used, continuing conversation', {
              iteration: iterations,
              messageCount: conversationMessages.length
            });
          } else {
            // No tools used - this is the final response
            const textBlocks = assistantContent.filter(b => b.type === 'text');
            logger.info('No tool use detected, ending conversation', {
              iteration: iterations,
              textBlockCount: textBlocks.length,
              hasContent: assistantContent.length > 0,
              textPreview: textBlocks.length > 0 ? textBlocks[0].text?.substring(0, 100) : 'none'
            });

            // IMPORTANT: Add the final text response to conversation history
            if (assistantContent.length > 0) {
              conversationMessages.push({
                role: 'assistant',
                content: assistantContent
              });

              logger.info('Added final assistant response to conversation', {
                contentBlocks: assistantContent.length,
                textBlockCount: textBlocks.length
              });

              // Send explicit final_response event to client
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'final_response',
                  iteration: iterations,
                  textBlockCount: textBlocks.length,
                  message: 'Analysis complete - final response delivered'
                })
              });
            }

            continueConversation = false;
          }
        }

        await stream.writeSSE({
          data: JSON.stringify({
            type: 'end',
            totalIterations: iterations
          })
        });
        
      } catch (error) {
        logger.error('Cohort chat error', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        await stream.writeSSE({ 
          data: JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'An error occurred' 
          })
        });
      } finally {
        await stream.close();
      }
    });
  } catch (error) {
    logger.error('Unexpected error', { error });
    return c.json({ error: 'An unexpected error occurred' }, 500);
  }
});

// Get suggested queries
cohort.get('/suggestions', async (c) => {
  const suggestions = [
    { id: '1', query: 'Show me women aged 25-34 in Berlin with income > €50,000', category: 'demographic' },
    { id: '2', query: 'Find parents with two children who buy organic food', category: 'psychographic' },
    { id: '3', query: 'Which demographics shop at Aldi weekly?', category: 'behavioral' },
    { id: '4', query: 'Build a cohort of 500,000 people likely to buy premium skincare', category: 'campaign' },
    { id: '5', query: 'Urban millennials interested in sustainable products', category: 'lifestyle' },
    { id: '6', query: 'High-income families with children under 10', category: 'demographic' }
  ];
  return c.json({ suggestions });
});

// Save cohort
cohort.post('/save', async (c) => {
  const tenant = c.get('tenant');
  const cohortData = await c.req.json();
  logger.info('Saving cohort', { tenantId: tenant?.id, cohortSize: cohortData.size });
  return c.json({ success: true, cohortId: `cohort_${Date.now()}` });
});

// Export cohort
cohort.post('/export', async (c) => {
  const tenant = c.get('tenant');
  const { query, format = 'sql' } = await c.req.json();
  logger.info('Exporting cohort', { tenantId: tenant?.id, format });
  
  if (format === 'sql') {
    return c.text(query, 200, {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="cohort_${Date.now()}.sql"`
    });
  }
  
  return c.json({ error: 'Unsupported format' }, 400);
});

export { cohort };