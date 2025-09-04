FROM node:24-bookworm-slim

# Set working directory
WORKDIR /app

RUN apt-get -y update && apt-get install -y curl && apt-get install -y --no-install-recommends dumb-init

# Copy package files
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=node:node src/ ./src/
COPY --chown=node:node public/ ./public/

# Build the application
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]
