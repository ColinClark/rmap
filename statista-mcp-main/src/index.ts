import { ServerConfig } from "./types.js";
import { startMCPServer } from "./http-server.js";
import * as process from "process";

// fallback for missing ENV variables in local dev setup

// API endpoints defaults for local testing
const SEARCH_ENDPOINT_URL =
  "https://api.globalsearch.dev.aws.statista.com/v1/canva/statistics";
const DATA_ENDPOINT_URL =
  "https://api.globalsearch.dev.aws.statista.com/v1/data/statistic";

const config: ServerConfig = {
  name: "statista-mcp-server",
  version: "0.1",
  port: Number(process.env.PORT) || 3000,
  searchEndpointURL: process.env.SEARCH_ENDPOINT_URL || SEARCH_ENDPOINT_URL,
  dataEndpointURL: process.env.DATA_ENDPOINT_URL || DATA_ENDPOINT_URL,
};

startMCPServer(config);
