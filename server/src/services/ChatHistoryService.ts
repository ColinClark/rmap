import { mongoService } from './mongodb';
import { Logger } from './logger';

const logger = new Logger('chat-history');

export interface ToolUse {
  toolName: string;
  toolId: string;
  input: any;
  result?: any;
  timestamp: Date;
  isServerTool?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content: string;
  timestamp: Date;
  tokens?: {
    input?: number;
    output?: number;
  };
  toolUses?: ToolUse[]; // Detailed tool use information
}

export interface ChatSession {
  sessionId: string;
  tenantId: string;
  userId: string;
  app: string; // e.g., 'cohort_builder', 'strategy_generator'
  workflow?: string; // e.g., 'retail_media'
  messages: ChatMessage[];
  metadata: {
    model: string;
    totalTokens: {
      input: number;
      output: number;
    };
    startTime: Date;
    lastActivity: Date;
    completed: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

class ChatHistoryService {
  private collection = 'chat_history';

  /**
   * Create a new chat session
   */
  async createSession(data: {
    sessionId: string;
    tenantId: string;
    userId: string;
    app: string;
    workflow?: string;
    model: string;
  }): Promise<void> {
    try {
      const db = mongoService.getControlDB();

      const session: ChatSession = {
        sessionId: data.sessionId,
        tenantId: data.tenantId,
        userId: data.userId,
        app: data.app,
        workflow: data.workflow,
        messages: [],
        metadata: {
          model: data.model,
          totalTokens: {
            input: 0,
            output: 0
          },
          startTime: new Date(),
          lastActivity: new Date(),
          completed: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection(this.collection).insertOne(session);

      logger.info('Chat session created', {
        sessionId: data.sessionId,
        tenantId: data.tenantId,
        userId: data.userId,
        app: data.app
      });
    } catch (error) {
      logger.error('Failed to create chat session', { error, sessionId: data.sessionId });
      throw error;
    }
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(
    sessionId: string,
    tenantId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      const db = mongoService.getControlDB();

      const update: any = {
        $push: { messages: message },
        $set: {
          'metadata.lastActivity': new Date(),
          updatedAt: new Date()
        }
      };

      // Update token counts if provided
      if (message.tokens) {
        if (message.tokens.input) {
          update.$inc = update.$inc || {};
          update.$inc['metadata.totalTokens.input'] = message.tokens.input;
        }
        if (message.tokens.output) {
          update.$inc = update.$inc || {};
          update.$inc['metadata.totalTokens.output'] = message.tokens.output;
        }
      }

      await db.collection(this.collection).updateOne(
        { sessionId, tenantId },
        update
      );

      logger.debug('Message added to chat session', {
        sessionId,
        tenantId,
        role: message.role,
        contentLength: message.content.length,
        tokens: message.tokens
      });
    } catch (error) {
      logger.error('Failed to add message to chat session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Mark a chat session as completed
   */
  async completeSession(sessionId: string, tenantId: string): Promise<void> {
    try {
      const db = mongoService.getControlDB();

      await db.collection(this.collection).updateOne(
        { sessionId, tenantId },
        {
          $set: {
            'metadata.completed': true,
            'metadata.lastActivity': new Date(),
            updatedAt: new Date()
          }
        }
      );

      logger.info('Chat session completed', { sessionId, tenantId });
    } catch (error) {
      logger.error('Failed to complete chat session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get chat history for a session
   */
  async getSession(sessionId: string, tenantId: string): Promise<ChatSession | null> {
    try {
      const db = mongoService.getControlDB();

      const session = await db.collection(this.collection).findOne<ChatSession>({
        sessionId,
        tenantId
      });

      return session;
    } catch (error) {
      logger.error('Failed to get chat session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get chat history for a user
   */
  async getUserSessions(
    tenantId: string,
    userId: string,
    options: {
      app?: string;
      workflow?: string;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<ChatSession[]> {
    try {
      const db = mongoService.getControlDB();

      const query: any = { tenantId, userId };
      if (options.app) query.app = options.app;
      if (options.workflow) query.workflow = options.workflow;

      const sessions = await db.collection(this.collection)
        .find<ChatSession>(query)
        .sort({ 'metadata.lastActivity': -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .toArray();

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions', { error, tenantId, userId });
      throw error;
    }
  }

  /**
   * Get chat history for a tenant (admin view)
   */
  async getTenantSessions(
    tenantId: string,
    options: {
      app?: string;
      workflow?: string;
      userId?: string;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<ChatSession[]> {
    try {
      const db = mongoService.getControlDB();

      const query: any = { tenantId };
      if (options.app) query.app = options.app;
      if (options.workflow) query.workflow = options.workflow;
      if (options.userId) query.userId = options.userId;

      const sessions = await db.collection(this.collection)
        .find<ChatSession>(query)
        .sort({ 'metadata.lastActivity': -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0)
        .toArray();

      return sessions;
    } catch (error) {
      logger.error('Failed to get tenant sessions', { error, tenantId });
      throw error;
    }
  }

  /**
   * Get usage statistics for a tenant
   */
  async getTenantUsageStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalTokens: { input: number; output: number };
    byApp: Record<string, number>;
  }> {
    try {
      const db = mongoService.getControlDB();

      const query: any = { tenantId };
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const sessions = await db.collection(this.collection)
        .find<ChatSession>(query)
        .toArray();

      const stats = {
        totalSessions: sessions.length,
        totalMessages: 0,
        totalTokens: { input: 0, output: 0 },
        byApp: {} as Record<string, number>
      };

      sessions.forEach(session => {
        stats.totalMessages += session.messages.length;
        stats.totalTokens.input += session.metadata.totalTokens.input;
        stats.totalTokens.output += session.metadata.totalTokens.output;
        stats.byApp[session.app] = (stats.byApp[session.app] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to get tenant usage stats', { error, tenantId });
      throw error;
    }
  }

  /**
   * Create indexes for the collection
   */
  async createIndexes(): Promise<void> {
    try {
      const db = mongoService.getControlDB();

      await db.collection(this.collection).createIndexes([
        { key: { sessionId: 1, tenantId: 1 }, unique: true },
        { key: { tenantId: 1, userId: 1, 'metadata.lastActivity': -1 } },
        { key: { tenantId: 1, app: 1 } },
        { key: { tenantId: 1, workflow: 1 } },
        { key: { createdAt: 1 } },
        { key: { 'metadata.lastActivity': 1 } }
      ]);

      logger.info('Chat history indexes created');
    } catch (error) {
      logger.error('Failed to create chat history indexes', { error });
      throw error;
    }
  }
}

export default new ChatHistoryService();
