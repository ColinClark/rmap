import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { betaMemoryTool } from '@anthropic-ai/sdk/helpers/beta/memory';
import { Logger } from '../services/logger';
import { tenantMiddleware } from '../middleware/tenant';
import configLoader from '../services/config/ConfigLoader';
import { QueryExecutor } from '../services/mcp/QueryExecutor';
import { MemoryService } from '../services/memory/MemoryService';
import ChatHistoryService from '../services/ChatHistoryService';
// SQL validation disabled - MCP server handles validation
// import sqlValidator from '../services/validation/SQLValidator';
import cohortEvaluator from '../services/evaluation/CohortEvaluator';
import type { CohortData, CohortRequirements } from '../services/evaluation/CohortEvaluator';

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

    const timeout = cohortConfig.llm?.timeout || 600000; // Default 10 minutes

    anthropic = new Anthropic({
      apiKey,
      timeout
    });
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
  sessionId?: string; // Optional session ID for chat history
  userId?: string; // Optional user ID for chat history
}

// Extract cohort requirements from conversation context
function extractCohortRequirements(conversationMessages: any[]): CohortRequirements {
  const requirements: CohortRequirements = {};

  // Look at recent user messages for clues about requirements
  const recentMessages = conversationMessages.slice(-5).filter(m => m.role === 'user');
  const combinedText = recentMessages.map(m => {
    if (typeof m.content === 'string') return m.content;
    if (Array.isArray(m.content)) {
      return m.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join(' ');
    }
    return '';
  }).join(' ').toLowerCase();

  // Try to extract target size from phrases like "500,000 people", "1 million users"
  const sizeMatches = combinedText.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|m|thousand|k)?\s*(?:people|users|individuals|persons)/i);
  if (sizeMatches) {
    let size = parseFloat(sizeMatches[1].replace(/,/g, ''));
    if (combinedText.includes('million') || combinedText.includes(' m ')) {
      size *= 1000000;
    } else if (combinedText.includes('thousand') || combinedText.includes(' k ')) {
      size *= 1000;
    }
    requirements.targetSize = Math.round(size);
  }

  // Store original description
  if (recentMessages.length > 0) {
    const lastUserMessage = recentMessages[recentMessages.length - 1];
    if (typeof lastUserMessage.content === 'string') {
      requirements.description = lastUserMessage.content;
    }
  }

  return requirements;
}

// Generate actionable error messages with specific guidance
function generateActionableError(toolName: string, error: Error, toolInput?: any): any {
  const errorMessage = error.message.toLowerCase();

  // SQL-specific errors
  if (toolName === 'sql') {
    // Table not found error
    if (errorMessage.includes('table') && errorMessage.includes('not found')) {
      return {
        error: error.message,
        type: 'TABLE_NAME_ERROR',
        suggestion: `The table name in your query doesn't exist. Use the catalog tool to see available tables and their schemas.`,
        correctExample: 'Use catalog tool first to discover available tables'
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
async function executeToolCall(
  toolName: string,
  toolInput: any,
  tenantId: string,
  memoryService?: MemoryService,
  conversationMessages?: any[]
): Promise<string> {
  try {
    logger.info('Executing tool', { toolName, tenantId, hasInput: !!toolInput });

    // Note: web_search is a server-side tool handled by Anthropic and is never executed here
    // It's filtered out in the tool execution loop before calling this function

    // Memory tool commands
    if (toolName === 'memory') {
      if (!memoryService) {
        throw new Error('Memory service not initialized');
      }

      const command = toolInput.command;
      logger.info('Executing memory command', { command, tenantId });

      switch (command) {
        case 'view':
          return await memoryService.view(toolInput);
        case 'create':
          return await memoryService.create(toolInput);
        case 'str_replace':
          return await memoryService.str_replace(toolInput);
        case 'insert':
          return await memoryService.insert(toolInput);
        case 'delete':
          return await memoryService.delete(toolInput);
        case 'rename':
          return await memoryService.rename(toolInput);
        default:
          throw new Error(`Unknown memory command: ${command}`);
      }
    }

    // SynthiePop database tools
    if (toolName === 'catalog') {
      const executor = QueryExecutor.forTenant(tenantId);
      // Don't pass database parameter - let MCP server use its default
      const schema = await executor.getSchema();
      return JSON.stringify(schema);
    } else if (toolName === 'sql') {
      const sqlQuery = toolInput.sql || toolInput.query;

      // SQL validation disabled - let MCP server handle all validation

      // Execute SQL directly
      const executor = QueryExecutor.forTenant(tenantId);
      // Don't pass database parameter - let MCP server use its default
      const result = await executor.executeSQL(sqlQuery);

      // Evaluate cohort quality if this is a COUNT query
      if (conversationMessages && (sqlQuery.toLowerCase().includes('count(*)') || sqlQuery.toLowerCase().includes('count ('))) {
        try {
          // Extract cohort size from result
          let cohortSize = 0;
          if (result.data && Array.isArray(result.data) && result.data.length > 0) {
            // Try to find count in result - could be 'count', 'COUNT(*)', 'total', etc.
            const firstRow = result.data[0];
            const countKey = Object.keys(firstRow).find(k =>
              k.toLowerCase().includes('count') || k.toLowerCase() === 'total'
            );
            if (countKey) {
              cohortSize = parseInt(firstRow[countKey]) || 0;
            }
          }

          if (cohortSize > 0) {
            // Extract requirements from conversation
            const requirements = extractCohortRequirements(conversationMessages);

            // Build cohort data
            const cohortData: CohortData = {
              size: cohortSize,
              sql: sqlQuery
              // Note: breakdown data would require additional GROUP BY queries
            };

            // Evaluate cohort quality
            const evaluation = cohortEvaluator.evaluate(cohortData, requirements);

            logger.info('Cohort evaluation complete', {
              cohortSize,
              qualityScore: evaluation.qualityScore,
              passed: evaluation.passed,
              hasRequirements: !!requirements.targetSize
            });

            // Return result with evaluation feedback
            return JSON.stringify({
              ...result,
              evaluation: {
                qualityScore: evaluation.qualityScore,
                passed: evaluation.passed,
                summary: evaluation.summary,
                issues: evaluation.issues,
                suggestions: evaluation.suggestions,
                dimensions: {
                  sizeMatch: {
                    score: evaluation.dimensions.sizeMatch.score,
                    details: evaluation.dimensions.sizeMatch.details
                  },
                  diversity: {
                    score: evaluation.dimensions.diversity.score,
                    details: evaluation.dimensions.diversity.details
                  },
                  requirementFit: {
                    score: evaluation.dimensions.requirementFit.score,
                    details: evaluation.dimensions.requirementFit.details
                  }
                }
              }
            });
          }
        } catch (evalError) {
          // Don't fail the query if evaluation fails
          logger.warn('Cohort evaluation failed', { error: evalError });
        }
      }

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
    const { messages, query, userId = 'anonymous' } = body;

    if (!messages || !query) {
      return c.json({ error: 'Invalid request' }, 400);
    }

    // Generate or get session ID for chat history
    let sessionId = body.sessionId;
    const isNewSession = !sessionId;
    if (!sessionId) {
      sessionId = `cohort_${tenant.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    logger.info('Chat request received', {
      sessionId,
      tenantId: tenant.id,
      userId,
      isNewSession,
      messagesCount: messages.length,
      hasSessionId: !!body.sessionId
    });

    // Create new chat session if no session ID was provided
    if (isNewSession) {
      try {
        await ChatHistoryService.createSession({
          sessionId,
          tenantId: tenant.id,
          userId,
          app: 'cohort_builder',
          workflow: 'retail_media',
          model: cohortConfig.llm.model
        });
        logger.info('Chat session created', { sessionId, tenantId: tenant.id, userId });
      } catch (error) {
        logger.error('Failed to create chat session', { error, sessionId });
        // Don't fail the request if chat history fails
      }
    }

    // Log the user message
    try {
      await ChatHistoryService.addMessage(sessionId, tenant.id, {
        role: 'user',
        content: query,
        timestamp: new Date()
      });
      logger.debug('User message logged', { sessionId, contentLength: query.length });
    } catch (error) {
      logger.error('Failed to log user message', { error, sessionId });
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

        // Initialize memory service and tool
        const memoryService = await MemoryService.init(tenant.id);
        const memory = betaMemoryTool(memoryService);

        let continueConversation = true;
        let iterations = 0;
        const maxIterations = cohortConfig.llm.maxIterations || 20;
        let phase: 'exploring' | 'analyzing' | 'finalizing' = 'exploring';
        let sessionToolUses: string[] = []; // Track all tool uses for this session

        while (continueConversation && iterations < maxIterations) {
          iterations++;
          logger.info('Creating stream iteration', {
            iteration: iterations,
            model: cohortConfig.llm.model
          });

          // Create streaming message using beta API for context_management support
          const anthropicStream = anthropicClient.beta.messages.stream({
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
            context_management: cohortConfig.contextManagement?.enabled ? {
              edits: [{
                type: 'clear_tool_uses_20250919',
                trigger: {
                  type: cohortConfig.contextManagement.trigger.type,
                  value: cohortConfig.contextManagement.trigger.value
                },
                keep: {
                  type: cohortConfig.contextManagement.keep.type,
                  value: cohortConfig.contextManagement.keep.value
                },
                clear_at_least: {
                  type: cohortConfig.contextManagement.clearAtLeast.type,
                  value: cohortConfig.contextManagement.clearAtLeast.value
                },
                exclude_tools: cohortConfig.contextManagement.excludeTools || []
              }]
            } : undefined,
            tools: [
              {
                type: 'web_search_20250305',
                name: 'web_search',
                max_uses: 5
              },
              {
                name: 'catalog',
                description: `Explore the database schema to discover available tables, columns, and data structure.

**What this tool returns:**
- Available tables and their names
- Available columns with their data types (demographics, psychographics, behaviors)
- Sample values to understand the data
- Value ranges and distributions
- Column descriptions and meanings

**When to use this tool:**
- ALWAYS call this FIRST in every new conversation to understand available data
- To discover what tables exist in the database
- When you don't know the exact column names
- When you need to see example values before writing SQL
- When exploring what demographic/psychographic data is available

**Example usage:**
User asks: "Show me young professionals"
→ First call catalog to find available tables
→ Find age and occupation columns
→ See sample values to understand how occupations are labeled
→ Then write SQL with correct table and column names

**Important:** Use the catalog to discover the actual table names and structure - do not assume!`,
                input_schema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'sql',
                description: `Execute SQL queries on the population database.

**What this tool does:**
- Runs DuckDB SQL queries against the database tables
- Returns query results with row count
- Provides data for cohort analysis and demographic breakdowns

**When to use this tool:**
- After calling catalog to understand available tables and columns
- To get cohort sizes with COUNT(*) queries
- To get demographic breakdowns with GROUP BY
- To analyze specific segments with filters

**Query guidelines:**
- ALWAYS use catalog tool FIRST to discover the correct table names
- Start with COUNT queries to check cohort size before detailed queries
- Use WHERE clauses for filtering (age, income, location, etc.)
- Use GROUP BY for demographic breakdowns
- Limit large result sets for performance

**Example query pattern:**

1. Get cohort size:
   SELECT COUNT(*) FROM [table_name] WHERE age BETWEEN 25 AND 34

2. Demographic breakdown:
   SELECT gender, COUNT(*) as count
   FROM [table_name]
   WHERE age BETWEEN 25 AND 34
   GROUP BY gender

3. Complex filtering:
   SELECT COUNT(*) FROM [table_name]
   WHERE age BETWEEN 25 AND 34
     AND income > 50000

**Common mistakes to avoid:**
- ❌ Guessing table names without checking catalog first
- ❌ Missing filters on large tables (can return millions of rows!)
- ✅ Always use catalog to discover table names
- ✅ Always use WHERE or LIMIT to control result size

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
                      description: 'DuckDB SQL query to execute. Use catalog tool first to discover table names. Must be valid DuckDB syntax.'
                    }
                  },
                  required: ['sql']
                }
              },
              memory
            ],
            betas: ['context-management-2025-06-27']
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
            types: finalMessage.content.map((b: any) => b.type),
            usage: finalMessage.usage
          });

          // Use finalMessage.content as the complete assistant content
          // This includes all text blocks AND tool_use blocks
          const assistantContent = finalMessage.content;
          const iterationToolUses: string[] = []; // Track tools used in this iteration (names only)
          const detailedToolUses: any[] = []; // Track detailed tool use information for chat history

          // Check for tool use and execute tools
          for (const block of finalMessage.content) {
            // Handle both regular tool_use (custom tools) and server_tool_use (web_search)
            const isToolUse = block.type === 'tool_use';
            const isServerToolUse = block.type === 'server_tool_use';
            const isWebSearchResult = block.type === 'web_search_tool_result';

            // Handle server tool results (web_search_tool_result)
            if (isWebSearchResult && 'tool_use_id' in block && 'content' in block) {
              const webSearchResults = Array.isArray(block.content) ? block.content : [];

              logger.info('Web search result detected', {
                toolUseId: block.tool_use_id,
                resultCount: webSearchResults.length
              });

              // Find the corresponding tool use and add the result
              const toolUse = detailedToolUses.find((t: any) => t.toolId === block.tool_use_id);
              if (toolUse) {
                toolUse.result = {
                  count: webSearchResults.length,
                  results: webSearchResults
                };
              }

              // Send tool result to client
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'tool_result',
                  tool: 'web_search',
                  result: {
                    results: webSearchResults,
                    count: webSearchResults.length
                  },
                  resultSummary: `Found ${webSearchResults.length} web search results`
                })
              });
              continue;
            }

            if ((isToolUse || isServerToolUse) && 'name' in block && 'input' in block && 'id' in block) {
              hasToolUse = true;
              const toolName = block.name;

              // Track tool use for chat history (names only)
              if (!iterationToolUses.includes(toolName)) {
                iterationToolUses.push(toolName);
              }
              if (!sessionToolUses.includes(toolName)) {
                sessionToolUses.push(toolName);
              }

              // Capture detailed tool use information for chat history
              const toolUseDetail = {
                toolName,
                toolId: block.id,
                input: block.input,
                timestamp: new Date(),
                isServerTool: isServerToolUse
              };
              detailedToolUses.push(toolUseDetail);

              logger.info('Tool use detected', {
                toolName,
                toolType: block.type,
                isServerSide: isServerToolUse,
                input: block.input
              });

              // Send tool_use event to client for UI display
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'tool_use',
                  tool: block.name,
                  toolId: block.id,
                  input: block.input,
                  isServerTool: isServerToolUse
                })
              });

              // Server-side tools (web_search) are handled by Anthropic
              // Don't execute them locally - results will come in web_search_tool_result blocks
              if (isServerToolUse || block.name === 'web_search') {
                logger.info('Server-side tool detected - skipping local execution', {
                  toolName: block.name
                });
                // Don't add to toolResults - results come in separate blocks
                continue;
              }

              // Execute custom tools (catalog, sql, memory)
              const toolResult = await executeToolCall(
                block.name,
                block.input,
                tenant.id,
                memoryService,
                conversationMessages
              );

              // Send tool result to client with metadata
              // Memory tool returns plain text, other tools return JSON
              let parsedResult: any;
              let resultSummary = '';

              if (block.name === 'memory') {
                // Memory tool returns plain text, not JSON
                parsedResult = toolResult;
                resultSummary = 'Memory operation completed';
              } else {
                // Other tools return JSON
                parsedResult = JSON.parse(toolResult);

                if (block.name === 'sql') {
                  resultSummary = `Executed SQL query (${parsedResult.data?.length || 0} rows)`;
                } else if (block.name === 'catalog') {
                  resultSummary = 'Retrieved database schema';
                } else {
                  resultSummary = `Retrieved ${block.name} data`;
                }
              }

              // Add result to detailed tool use for chat history
              const foundToolUse = detailedToolUses.find((t: any) => t.toolId === block.id);
              if (foundToolUse) {
                foundToolUse.result = parsedResult;
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

          // Log assistant message to chat history
          try {
            // Extract text content from assistant response for logging
            const textBlocks = assistantContent.filter((b: any) => b.type === 'text');
            const assistantText = textBlocks.map((b: any) => b.text).join('\n');

            // Log to MongoDB with detailed tool use information
            await ChatHistoryService.addMessage(sessionId, tenant.id, {
              role: 'assistant',
              content: assistantText || '[Tool use only - no text response]',
              timestamp: new Date(),
              tokens: {
                input: finalMessage.usage?.input_tokens || 0,
                output: finalMessage.usage?.output_tokens || 0
              },
              toolUses: detailedToolUses.length > 0 ? detailedToolUses : undefined
            });

            logger.debug('Assistant message logged', {
              sessionId,
              textLength: assistantText.length,
              toolsUsed: iterationToolUses,
              detailedToolCount: detailedToolUses.length,
              inputTokens: finalMessage.usage?.input_tokens,
              outputTokens: finalMessage.usage?.output_tokens
            });
          } catch (error) {
            logger.error('Failed to log assistant message', { error, sessionId });
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

              // CRITICAL: Send the actual text content to the client!
              // The streaming events already fired, so we need to send the complete text now
              for (const block of textBlocks) {
                if (block.text) {
                  await stream.writeSSE({
                    data: JSON.stringify({
                      type: 'content_delta',
                      content: block.text,
                      isExploration: false,
                      isFinalResult: true,
                      phase: 'finalizing'
                    })
                  });
                }
              }

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

        // Complete the chat session
        try {
          await ChatHistoryService.completeSession(sessionId, tenant.id);
          logger.info('Chat session completed', {
            sessionId,
            tenantId: tenant.id,
            totalIterations: iterations,
            toolsUsed: sessionToolUses
          });
        } catch (error) {
          logger.error('Failed to complete chat session', { error, sessionId });
        }

        await stream.writeSSE({
          data: JSON.stringify({
            type: 'end',
            totalIterations: iterations,
            sessionId // Include sessionId in response for client to reuse
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