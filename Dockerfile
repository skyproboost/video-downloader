FROM oven/bun:1-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run scripts/generate-admin-config.ts
RUN bun run build

# ─────────────────────────────────────────
# Production
# ─────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/.output .output

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
