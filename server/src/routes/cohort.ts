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

// Execute tool calls
async function executeToolCall(toolName: string, toolInput: any, tenantId: string): Promise<string> {
  try {
    logger.info('Executing tool', { toolName, tenantId, hasInput: !!toolInput });
    
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
    return JSON.stringify({ error: error instanceof Error ? error.message : 'Tool execution failed' });
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
          
          // Create message (not stream for simplicity)
          const response = await anthropicClient.messages.create({
            model: cohortConfig.llm.model,
            max_tokens: cohortConfig.llm.maxTokens,
            temperature: cohortConfig.llm.temperature,
            system: cohortConfig.llm.systemPrompt,
            messages: conversationMessages,
            tools: [
              {
                name: 'catalog',
                description: 'Get catalog of available fields in the synthie database',
                input_schema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'sql',
                description: 'Execute SQL query on the synthie database',
                input_schema: {
                  type: 'object',
                  properties: {
                    sql: { type: 'string', description: 'SQL query to execute' }
                  },
                  required: ['sql']
                }
              }
            ]
          });

          // Process response content
          let hasToolUse = false;
          let assistantContent: any[] = [];
          
          logger.info('Response content blocks', { 
            blockCount: response.content.length,
            types: response.content.map((b: any) => b.type)
          });
          
          for (const block of response.content) {
            if (block.type === 'text') {
              assistantContent.push(block);
              // Stream text to client - distinguish between exploration and final results
              const lowerText = block.text.toLowerCase();
              const isExploration = lowerText.includes('let me') || 
                                   lowerText.includes('checking') ||
                                   lowerText.includes('exploring') ||
                                   lowerText.includes('i need to') ||
                                   lowerText.includes('i\'ll check');
              
              const isFinalResult = block.text.includes('##') || 
                                   block.text.includes('**Cohort') ||
                                   block.text.includes('### ') ||
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
                  type: 'content', 
                  content: block.text,
                  isExploration,
                  isFinalResult,
                  phase
                })
              });
            } else if (block.type === 'tool_use' && 'name' in block && 'input' in block && 'id' in block) {
              hasToolUse = true;
              assistantContent.push(block);
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
              
              // Add assistant message with content to conversation
              conversationMessages.push({
                role: 'assistant',
                content: assistantContent
              });
              
              // Add tool result to conversation
              conversationMessages.push({
                role: 'user',
                content: [{
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: toolResult
                }]
              });
            }
          }
          
          // Reset assistant content for next iteration
          assistantContent = [];
          
          // If no tool was used, we're done
          if (!hasToolUse) {
            logger.info('No tool use detected, ending conversation', { 
              iteration: iterations,
              hadContent: assistantContent.length > 0
            });
            if (assistantContent.length > 0) {
              conversationMessages.push({
                role: 'assistant',
                content: assistantContent
              });
            }
            continueConversation = false;
          } else {
            logger.info('Tool was used, continuing conversation', { 
              iteration: iterations,
              messageCount: conversationMessages.length 
            });
          }
        }
        
        await stream.writeSSE({ 
          data: JSON.stringify({ type: 'end' })
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