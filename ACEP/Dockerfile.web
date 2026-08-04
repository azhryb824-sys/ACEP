# ACEP Web App - Node.js production image
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive \
    NPM_CONFIG_LOGLEVEL=warn

WORKDIR /acep

# System build libs for native modules (sharp, canvas, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Full source (node_modules and .git are excluded via .dockerignore)
COPY . .

# Workspace install (npm workspaces hoist deps to /acep/node_modules)
RUN npm install

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]
