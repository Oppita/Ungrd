# ====================== BUILD STAGE ======================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias primero (mejor caching)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copiar todo el código
COPY . .

# Build del frontend (Vite)
RUN npm run build

# ====================== PRODUCTION STAGE ======================
FROM node:20-alpine AS runner

WORKDIR /app

# Crear usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressuser

# Copiar package.json y node_modules
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY server.ts ./

# Instalar tsx para ejecutar TypeScript
RUN npm install tsx

# Crear carpeta uploads
RUN mkdir -p uploads && chown -R expressuser:nodejs /app

USER expressuser

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["npx", "tsx", "server.ts"]
