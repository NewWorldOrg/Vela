FROM node:24.22.1-slim AS base

FROM python:3.15.2-slim-bookworm AS marks

WORKDIR /marks

COPY scripts/denpa-marks/requirements.txt ./
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

COPY scripts/denpa-marks.sh scripts/
COPY public/fonts/denpa-font.woff2 public/fonts/
RUN sh scripts/denpa-marks.sh public/fonts/denpa-font.woff2 /out/denpa-marks.woff2

FROM base AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
COPY --from=marks /out/denpa-marks.woff2 public/fonts/denpa-marks.woff2
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
