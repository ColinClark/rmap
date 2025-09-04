import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";

import { createHttpHeader } from "./common.js";
import { logger } from "../logger.js";
import { ServerConfig } from "../types.js";

export function registerTool(
  server: McpServer,
  transport: Transport,
  config: ServerConfig,
  apiKey: string,
  apiKeyId: string | undefined,
) {
  server.registerTool(
    "get-chart-data-by-id",
    {
      title: "Get Data by ID",
      description: `Retrieves detailed statistical information for a specific Statista chart or dataset using
        its unique identifier. This tool provides comprehensive data including full numerical values,
        methodological information, source details, and contextual metadata. It's designed to work
        seamlessly with results from the 'search-statistics' tool - simply pass an ID from your search
        results to access in-depth analysis. Use this tool to dive deeper into statistics of interest
        after identifying them through search. Always cite the source of the data in your response.`,
      inputSchema: {
        statistic_id: z.number(),
      },
    },
    async ({ statistic_id }) => {
      const sessionId = transport.sessionId || "temp session";
      logger.info(
        { api_key: apiKeyId },
        "Fetching statistic id: %s, session: %s",
        statistic_id,
        sessionId,
      );
      try {
        const statistics = await loadStatisticDataById(
          config.dataEndpointURL,
          statistic_id,
          apiKey,
          apiKeyId,
          sessionId,
        );
        logger.info(
          { api_key: apiKeyId },
          "Statistics data loaded: %s, session: %s",
          statistic_id,
          sessionId,
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(statistics.chart) },
            { type: "text", text: JSON.stringify(statistics.sources) },
            {
              type: "text",
              text: JSON.stringify(statistics.description),
            },
          ],
        };
      } catch (error) {
        logger.error(
          {
            api_key: apiKeyId,
            statistic_id,
            sessionID: sessionId,
            error,
          },
          "Get chart data tool failed",
        );
        throw error;
      }
    },
  );
}

interface DataResponse {
  identifier: number;
  title: string;
  subject: string;
  is_premium: boolean;
  description: string;
  link: string;
  date: string;
  sources: Array<{
    is_active: boolean;
    subtitle: string;
    title: string;
  }>;
  chargers: Array<{
    is_active: boolean;
    subtitle: string;
    title: string;
  }>;
  publishers: Array<{
    is_active: boolean;
    subtitle: string;
    title: string;
  }>;
  geolocations: Array<{
    name: string;
    code: string;
  }>;
  platform: string;
  teaser_image_urls: Array<{
    width: number;
    src: string;
  }>;
  image_url: string;
  chart: {
    unit: string | null;
    graphType: string;
    data: {
      categories: string[];
      series: Array<{
        name: string;
        data: number[];
      }>;
    };
  };
}

/**
 * Fetches data for a specific item by its ID
 * @param statistic_id The identifier of the data item to retrieve
 * @returns Promise resolving to DataResponse
 */
async function loadStatisticDataById(
  apiUrl: string,
  statisticId: number,
  apiKey: string,
  apiKeyId: string | undefined,
  sessionId: string | undefined,
): Promise<DataResponse> {
  if (!apiUrl) {
    throw new Error("apiUrl not provided");
  }

  try {
    const url = new URL(apiUrl);
    url.searchParams.append("id", statisticId.toString());
    url.searchParams.append("format", "advanced");

    logger.info(
      { api_key: apiKeyId },
      "Statistics data request: %s, session: %s",
      url.toString(),
      sessionId,
    );

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: createHttpHeader(apiKey),
    });

    if (!response.ok) {
      const msg = `Data API error: ${url}, ${response.status} ${response.statusText}`;
      logger.error(
        {
          api_key: apiKeyId,
          session_id: sessionId,
        },
        msg,
      );
      throw new Error(msg);
    }

    const data: DataResponse = await response.json();
    return data;
  } catch (error) {
    logger.error(
      {
        api_key: apiKeyId,
        session_id: sessionId,
        statistic_id: statisticId,
        error,
      },
      "Data request failed",
    );
    throw error;
  }
}
