# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ---- runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Fixed numeric UID/GID (not just a named user): Kubernetes' runAsNonRoot
# check can only verify a container runs as non-root by UID number — a
# named user like "appuser" with no explicit UID cannot be verified without
# actually starting the container, which the kubelet refuses to do.
RUN addgroup -g 10001 -S appgroup && adduser -u 10001 -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

USER 10001:10001

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/api/health/live', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["node", "src/server.js"]
