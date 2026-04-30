# ====================== BUILD STAGE ======================
FROM node:20-alpine AS builder

WORKDIR /app

# Aumentar memoria para evitar crashes durante build
ENV NODE_OPTIONS=--max-old-space-size=4096

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build del frontend con más recursos
RUN npm run build

# ====================== PRODUCTION STAGE ======================
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressuser

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY server.ts ./

RUN npm install tsx

RUN mkdir -p uploads && chown -R expressuser:nodejs /app

USER expressuser

ENV NODE_ENV=production
ENV PORT=10000
ENV NODE_OPTIONS=--max-old-space-size=2048

EXPOSE 10000

CMD ["npx", "tsx", "server.ts"]
