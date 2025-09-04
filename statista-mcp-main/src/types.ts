import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// Session information including transport and authentication
export interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  authenticatedAt: Date;
}

// Map to store session information by session ID
export type TransportMap = { [sessionId: string]: SessionInfo };

// Health check response type
export interface HealthCheckResponse {
  status: string;
  server: string;
  activeSessions: number;
  timestamp: string;
}

// JSON-RPC error response type
export interface JsonRpcError {
  jsonrpc: string;
  error: {
    code: number;
    message: string;
  };
  id: null;
}

// Server configuration
export interface ServerConfig {
  readonly name: string;
  readonly version: string;
  readonly port: number;
  readonly searchEndpointURL: string;
  readonly dataEndpointURL: string;
}
