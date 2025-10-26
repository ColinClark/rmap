import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../services/logger';

const logger = new Logger('test-web-search');
const app = new Hono();

app.use('/*', cors());

// Test endpoint to debug web search streaming events
app.get('/stream', async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  const anthropic = new Anthropic({ apiKey });

  return streamSSE(c, async (stream) => {
    try {
      logger.info('Starting web search test stream');

      // Simple prompt that should trigger web search
      const testStream = anthropic.beta.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: 'Search the web for the latest news about artificial intelligence breakthroughs in 2025'
        }],
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5
        }],
        betas: ['context-management-2025-06-27']
      });

      // Track all events for debugging
      let eventCount = 0;

      // Listen to all possible event types
      testStream.on('message_start', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'message_start',
          data: event
        };
        logger.info('Event: message_start', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('content_block_start', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'content_block_start',
          data: event
        };
        logger.info('Event: content_block_start', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('content_block_delta', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'content_block_delta',
          delta: event.delta,
          index: event.index
        };
        logger.info('Event: content_block_delta', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('content_block_stop', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'content_block_stop',
          data: event
        };
        logger.info('Event: content_block_stop', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('message_delta', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'message_delta',
          data: event
        };
        logger.info('Event: message_delta', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('message_stop', async (event) => {
        eventCount++;
        const eventData = {
          eventNumber: eventCount,
          eventType: 'message_stop',
          data: event
        };
        logger.info('Event: message_stop', eventData);
        await stream.writeSSE({
          data: JSON.stringify(eventData)
        });
      });

      testStream.on('error', async (error) => {
        eventCount++;
        const errorData = {
          eventNumber: eventCount,
          eventType: 'error',
          error: error.message || 'Unknown error'
        };
        logger.error('Event: error', error, errorData);
        await stream.writeSSE({
          data: JSON.stringify(errorData)
        });
      });

      // Wait for final message
      const finalMessage = await testStream.finalMessage();

      // Log final message structure
      const finalData = {
        eventType: 'final_message',
        totalEvents: eventCount,
        content: finalMessage.content,
        stopReason: finalMessage.stop_reason,
        usage: finalMessage.usage
      };

      logger.info('Final message received', finalData);

      await stream.writeSSE({
        data: JSON.stringify(finalData)
      });

      await stream.writeSSE({
        data: JSON.stringify({
          eventType: 'test_complete',
          totalEvents: eventCount,
          message: 'Test complete - check server logs for detailed event data'
        })
      });

    } catch (error) {
      logger.error('Test stream error', error);
      await stream.writeSSE({
        data: JSON.stringify({
          eventType: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      });
    } finally {
      await stream.close();
    }
  });
});

// Non-streaming version for comparison
app.get('/non-stream', async (c) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    logger.info('Starting web search test (non-streaming)');

    const response = await anthropic.beta.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: 'Search the web for the latest news about artificial intelligence breakthroughs in 2025'
      }],
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 5
      }],
      betas: ['context-management-2025-06-27']
    });

    logger.info('Web search response received', {
      contentBlocks: response.content.length,
      blockTypes: response.content.map((b: any) => b.type),
      stopReason: response.stop_reason,
      usage: response.usage
    });

    return c.json({
      success: true,
      content: response.content,
      stop_reason: response.stop_reason,
      usage: response.usage
    });

  } catch (error) {
    logger.error('Test error', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export { app as testWebSearch };
