# --- dependencies + frontend build ---
FROM node:20-bookworm AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY postcss.config.js tailwind.config.js ./
COPY server ./server
RUN npm run build

RUN npm prune --omit=dev

# --- production image ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY server ./server

EXPOSE 3001
CMD ["node", "server/index.js"]
