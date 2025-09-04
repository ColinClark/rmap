import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import { logger } from "./logger.js";
import { registerTool as registerSearchStatisticTool } from "./tools/statistic-search.js";
import { registerTool as registerLoadStatisticTool } from "./tools/statistic-data.js";
import { ServerConfig } from "./types.js";

export function createMcpServer(
  apiKey: string,
  apiKeyId: string | undefined,
  transport: Transport,
  config: ServerConfig,
): McpServer {
  logger.info(
    { api_key: apiKeyId },
    "New MCP server instance, session: %s",
    transport.sessionId || "temp session",
  );

  const server = new McpServer({
    ...config,
  });

  registerSearchStatisticTool(server, transport, config, apiKey, apiKeyId);
  registerLoadStatisticTool(server, transport, config, apiKey, apiKeyId);

  return server;
}
