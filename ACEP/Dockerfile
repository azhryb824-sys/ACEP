# ACEP Web App - Node.js production image
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NPM_CONFIG_LOGLEVEL=warn \
    NODE_ENV=production

WORKDIR /acep

# System build libs for native modules (sharp, canvas, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Full source (node_modules and .git are excluded via .dockerignore)
COPY . .

# Production workspace install (NODE_ENV=production omits dev/test deps,
# avoiding jest/chokidar optional-dep resolution issues and shrinking the image)
RUN npm install --no-audit --no-fund

EXPOSE 3000

CMD ["node", "server.js"]
