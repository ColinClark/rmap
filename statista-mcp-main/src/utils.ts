import { IncomingMessage, ServerResponse } from "http";
import { logger } from "./logger.js";

// CORS headers configuration
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id",
};

// Helper function to parse JSON from request body
export async function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        logger.debug(
          {
            bodyLength: body.length,
            hasContent: !!body,
          },
          "Parsed request body",
        );
        resolve(parsed);
      } catch (error) {
        logger.error({ body, error }, "Failed to parse request body");
        reject(error);
      }
    });
    req.on("error", (error) => {
      logger.error(error, "Request body parsing error");
      reject(error);
    });
  });
}

export function abbreviateApiKey(apiKey: string): string {
  return `${apiKey.substring(0, 7)}*******`;
}

// Helper function to send JSON response
export function sendJsonResponse(
  res: ServerResponse,
  statusCode: number,
  data: any,
): void {
  logger.debug({ statusCode, dataType: typeof data }, "Sending JSON response");
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    ...CORS_HEADERS,
  });
  res.end(JSON.stringify(data));
}

// Helper function to send text response
export function sendTextResponse(
  res: ServerResponse,
  statusCode: number,
  text: string,
): void {
  logger.debug(
    {
      statusCode,
      textLength: text.length,
    },
    "Sending text response",
  );
  res.writeHead(statusCode, {
    "Content-Type": "text/plain",
    ...CORS_HEADERS,
  });
  res.end(text);
}

export function handleCorsPreflightRequest(res: ServerResponse): void {
  logger.debug("Handling CORS preflight request");
  res.writeHead(200, CORS_HEADERS);
  res.end();
}
