import { logger } from "./logger.js";
import { createHttpHeader } from "./tools/common.js";

export async function validateApiKey(
  apiUrl: string,
  apiKey: string,
): Promise<boolean> {
  logger.info("Auth check request to: %s", apiUrl);
  const response = await fetch(apiUrl, {
    method: "OPTIONS",
    headers: createHttpHeader(apiKey),
  });
  if (!response.ok) {
    logger.error(
      response,
      "Auth check request failed: %s",
      response.statusText,
    );
  }

  return response.ok;
}
