import { pino } from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: () => `,"timestamp":"${new Date(Date.now()).toISOString()}"`,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    env: process.env.DD_ENV,
  },
  messageKey: "message",
});
