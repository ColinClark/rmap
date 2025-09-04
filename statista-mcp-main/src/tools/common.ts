const HEADER_API_KEY = "x-api-key";

const HEADER_ORIGIN = "X-Origin";
const HEADER_ORIGIN_VALUE = "mcp-server";

const HEADER_DEFAUL_CONTENT = "Content-Type";
const HEADER_DEFAUL_CONTENT_VALUE = "application/json";

export function createHttpHeader(apiKey: string): Record<string, string> {
  const headers = {
    [HEADER_API_KEY]: apiKey,
    [HEADER_ORIGIN]: HEADER_ORIGIN_VALUE,
    [HEADER_DEFAUL_CONTENT]: HEADER_DEFAUL_CONTENT_VALUE,
  };
  return headers;
}
