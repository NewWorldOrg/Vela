FROM node:24.21-slim AS base

FROM base AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM builder AS notices
RUN VELA_BROWSER_SOURCE_MAPS=1 yarn build \
    && node scripts/third-party-notices.mjs /out/notices

FROM base AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=notices /out/notices/ /usr/share/doc/vela/

USER nodejs

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
