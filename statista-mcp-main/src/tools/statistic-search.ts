import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";

import { ServerConfig } from "../types.js";
import { logger } from "../logger.js";
import { createHttpHeader } from "./common.js";

export function registerTool(
  server: McpServer,
  transport: Transport,
  config: ServerConfig,
  apiKey: string,
  apiKeyId: string | undefined,
) {
  server.registerTool(
    "search-statistics",
    {
      title: "Search Statistics",
      description: `Searches the comprehensive Statista data catalogue to discover relevant statistical
        content. This tool enables exploration of Statista's extensive library of charts, reports,
        and forecasts across various industries and topics. It returns an array of matching
        statistics with basic metadata, allowing users to browse available options before
        selecting specific data for deeper analysis. Use this tool to begin your research journey and
        identify relevant statistical resources. Always cite the source of the data in your response.`,
      inputSchema: {
        question: z.string(),
      },
    },
    async ({ question }) => {
      const sessionId = transport.sessionId || "temp session";
      logger.info(
        { api_key: apiKeyId },
        "Search statistics: %s, session: %s",
        question,
        sessionId,
      );
      try {
        const statistics = await searchStatistics(
          config.searchEndpointURL,
          question,
          apiKey,
          apiKeyId,
          sessionId,
        );
        logger.info(
          { api_key: apiKeyId },
          "Search statistics completed successfully, session: %s",
          sessionId,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(statistics) }],
        };
      } catch (error) {
        logger.error(
          { api_key: apiKeyId, question, sessionId, error },
          "Search statistics tool failed",
        );
        throw error;
      }
    },
  );
}

interface SearchResponse {
  total_count: number;
  took: {
    search: string;
    load: string;
    conv: string;
  };
  items: Array<{
    identifier: number;
    title: string;
    subject: string;
    is_premium: boolean;
    description: string;
    link: string;
    date: string;
    platform: string;
    teaser_image_urls: Array<{
      width: number;
      src: string;
    }>;
  }>;
}

/**
 * Performs a search query using the search API
 * @param query The search text
 * @returns Promise resolving to SearchResponse
 */
async function searchStatistics(
  apiUrl: string,
  query: string,
  apiKey: string,
  apiKeyId: string | undefined,
  sessionId: string | undefined,
): Promise<SearchResponse> {
  if (!apiUrl) {
    throw new Error("apiUrl not provided");
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.append("q", query);
    url.searchParams.append("limit", "5");

    logger.info(
      { api_key: apiKeyId },
      "Search statistics request: %s, session: %s",
      url.toString(),
      sessionId,
    );

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: createHttpHeader(apiKey),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      throw new Error(
        `Search API error: ${response.status} ${response.statusText}`,
      );
    }

    const data: SearchResponse = await response.json();
    return data;
  } catch (error) {
    logger.error(
      {
        api_key: apiKeyId,
        error: error,
      },
      "Search request failed, session: %s",
      sessionId,
    );
    throw error;
  }
}
