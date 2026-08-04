FROM node:20-alpine AS base
RUN apk add --no-cache tini curl
RUN addgroup --system --gid 1001 acep && \
    adduser --system --uid 1001 acep acep
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund --only=production && \
    cp -R node_modules /prod_modules
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM deps AS builder
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=builder /app/dist ./dist
COPY --from=deps /prod_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
USER acep
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
