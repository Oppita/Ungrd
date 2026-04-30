# ====================== BUILD STAGE ======================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero
COPY package*.json ./

# Usar --legacy-peer-deps para resolver conflicto React 19 vs react-simple-maps
RUN npm ci --legacy-peer-deps

# Copiar todo el código fuente
COPY . .

# Build del frontend
RUN npm run build

# ====================== PRODUCTION STAGE ======================
FROM node:20-alpine AS runner

WORKDIR /app

# Usuario no-root por seguridad
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

EXPOSE 10000

CMD ["npx", "tsx", "server.ts"]
