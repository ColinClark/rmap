import {
  createServer as createHttpServer,
  IncomingMessage,
  ServerResponse,
} from "http";
import { URL } from "url";
import { randomUUID } from "crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { createMcpServer } from "./mcp.js";
import { logger } from "./logger.js";
import {
  TransportMap,
  SessionInfo,
  HealthCheckResponse,
  JsonRpcError,
  ServerConfig,
} from "./types.js";
import {
  parseRequestBody,
  sendJsonResponse,
  sendTextResponse,
  handleCorsPreflightRequest,
  abbreviateApiKey,
} from "./utils.js";
import { validateApiKey } from "./auth.js";

const HEADER_API_KEY = "x-api-key";
const HEADER_API_KEY_ID = "x-api-key-id";
const HEADER_AUTHORIZATION = "authorization";
const HEADER_MCP_SESSION = "mcp-session-id";

const createRequestListener = (config: ServerConfig) => {
  logger.info(config, "Creating HTTP listener");

  // creating a closure to encapsulate the state
  const transports: TransportMap = {};

  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      handleCorsPreflightRequest(res);
      return;
    }

    // Health check endpoint
    if (url.pathname === "/health" && req.method === "GET") {
      logger.debug(
        {
          headers: req.headers,
        },
        "Health check requested",
      );
      const healthResponse: HealthCheckResponse = {
        status: "ok",
        server: config.name,
        activeSessions: Object.keys(transports).length,
        timestamp: new Date().toISOString(),
      };
      logger.debug(
        {
          activeSessions: healthResponse.activeSessions,
        },
        "Health check response",
      );
      sendJsonResponse(res, 200, healthResponse);
      return;
    }

    logger.info(
      {
        headers: req.headers,
      },
      "Incoming request: %s - %s",
      req.method,
      url.pathname,
    );

    let apiKeyId = req.headers[HEADER_API_KEY_ID] as string | undefined;

    // MCP endpoint
    if (url.pathname === "/mcp") {
      const sessionId = req.headers[HEADER_MCP_SESSION] as string | undefined;
      logger.info(
        { api_key: apiKeyId, session_id: sessionId, method: req.method },
        "MCP endpoint access",
      );

      if (req.method === "POST") {
        try {
          logger.debug(
            { method: req.method, path: url.pathname },
            "POST request",
          );
          const body = await parseRequestBody(req);
          let sessionInfo: SessionInfo;

          if (sessionId && transports[sessionId]) {
            // Reuse existing authenticated session
            logger.info(
              { api_key: apiKeyId },
              "Reusing existing session: %s",
              sessionId,
            );
            sessionInfo = transports[sessionId];
          } else if (!sessionId && isInitializeRequest(body)) {
            // New initialization request - validate API key first
            logger.info(
              { api_key: apiKeyId },
              "New initialization request received",
            );
            let apiKey = req.headers[HEADER_API_KEY] as string | undefined;
            if (!apiKey) {
              logger.info(
                "Fallback to '%s' header as API key source",
                HEADER_AUTHORIZATION,
              );
              const authorizationWithBearer = req.headers[
                HEADER_AUTHORIZATION
              ] as string | undefined;
              apiKey = authorizationWithBearer?.split(" ")[1];
            }

            if (!apiKey) {
              logger.warn(
                { api_key: apiKeyId },
                "Initialization rejected: Missing API key",
              );
              sendTextResponse(res, 401, "Unauthorized: Missing API key");
              return;
            }
            const apiKeyAbbreviation = abbreviateApiKey(apiKey);

            logger.info(
              { api_key: apiKeyId },
              "Validating key for API Key ID: %s",
              apiKeyId,
            );
            const isValid = await validateApiKey(
              config.searchEndpointURL,
              apiKey,
            );
            if (!isValid) {
              logger.warn(
                { api_key: apiKeyId },
                "API key invalid: %s",
                apiKeyAbbreviation,
              );
              sendTextResponse(res, 401, "Unauthorized: Invalid API key");
              return;
            }

            logger.info(
              { api_key: apiKeyId },
              "API key valid: %s",
              apiKeyAbbreviation,
            );
            const transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId: string) => {
                // Store the session info with API key
                transports[sessionId] = {
                  transport,
                  authenticatedAt: new Date(),
                };
                logger.info(
                  { api_key: apiKeyId },
                  "New authenticated session: %s",
                  sessionId,
                );
              },
            });

            // Clean up transport when closed
            transport.onclose = () => {
              if (transport.sessionId) {
                delete transports[transport.sessionId];
                logger.info(
                  { api_key: apiKeyId },
                  "Session closed and cleaned up: %s",
                  transport.sessionId,
                );
              }
            };

            const mcpServer = createMcpServer(
              apiKey,
              apiKeyId,
              transport,
              config,
            );
            await mcpServer.connect(transport);

            // Create temporary session info for request
            sessionInfo = {
              transport,
              authenticatedAt: new Date(),
            };
            logger.info(
              { api_key: apiKeyId },
              "Using temp session for api key: %s",
              apiKeyAbbreviation,
            );
          } else {
            // Invalid request
            logger.warn(
              {
                api_key: apiKeyId,
                hasSessionId: !!sessionId,
                isInitialize: isInitializeRequest(body),
              },
              "Invalid MCP request: %s",
              sessionId,
            );
            const errorResponse: JsonRpcError = {
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Bad Request: No valid session ID provided",
              },
              id: null,
            };
            sendJsonResponse(res, 400, errorResponse);
            return;
          }

          // Handle the request using the transport from session info
          await sessionInfo.transport.handleRequest(req, res, body);
        } catch (error) {
          logger.error(
            {
              error: (error as Error).message,
              stack: (error as Error).stack,
            },
            "Error handling POST request",
          );
          const errorResponse: JsonRpcError = {
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          };
          sendJsonResponse(res, 500, errorResponse);
        }
      } else if (req.method === "GET") {
        // Handle GET requests for server-to-client notifications via SSE
        logger.info("Handling MCP GET request for SSE");
        if (!sessionId || !transports[sessionId]) {
          logger.warn(
            { api_key: apiKeyId },
            "Invalid session for SSE request: %s",
            sessionId,
          );
          sendTextResponse(res, 400, "Invalid or missing session ID");
          return;
        }

        const sessionInfo = transports[sessionId];
        await sessionInfo.transport.handleRequest(req, res);
      } else if (req.method === "DELETE") {
        // Handle DELETE requests for session termination
        if (!sessionId || !transports[sessionId]) {
          sendTextResponse(res, 400, "Invalid or missing session ID");
          return;
        }

        logger.info({ api_key: apiKeyId }, "Deleting session: %s", sessionId);
        const sessionInfo = transports[sessionId];
        sessionInfo.transport.close();
        delete transports[sessionId];

        sendTextResponse(res, 200, "Session terminated");
      } else {
        sendTextResponse(res, 405, "Method not allowed");
      }
    } else {
      // 404 for unknown paths
      logger.info(
        { api_key: apiKeyId },
        "Request to unknown path: %s, method: %s",
        url.pathname,
        req.method,
      );
      sendTextResponse(res, 404, `MCP-Server: path ${url.pathname} not found`);
    }
  };
};

export const startMCPServer = (config: ServerConfig) => {
  const server = createHttpServer(createRequestListener(config));
  server.listen(config.port, () => {
    logger.info(server.address(), "MCP Streamable HTTP Server listening");
    logger.info("Health check: /health");
    logger.info("MCP endpoint: /mcp");
  });
};
