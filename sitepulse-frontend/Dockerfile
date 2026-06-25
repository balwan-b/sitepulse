FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
ENV CI=true
RUN npm install --legacy-peer-deps

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV CI=true
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
