# GRADERA Innovation Hub API — production container image
#
# Build from monorepo root:
#   docker build -f apps/api/Dockerfile -t gradera-api:latest .
#
# With build metadata (CI):
#   docker build -f apps/api/Dockerfile \
#     --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
#     --build-arg APP_VERSION=0.1.0 \
#     -t gradera-api:latest .
#
# Run locally:
#   docker run --rm -p 8080:8080 --env-file apps/api/.env gradera-api:latest

FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9 --activate \
  && apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Install workspace dependencies
# -----------------------------------------------------------------------------
FROM base AS deps

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig.base.json ./

COPY apps/api/package.json apps/api/
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/

COPY packages/domain/package.json packages/domain/
COPY packages/domain/tsconfig.json packages/domain/tsconfig.build.json packages/domain/

COPY packages/contracts/package.json packages/contracts/
COPY packages/contracts/tsconfig.json packages/contracts/

RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Build domain + API (includes prisma generate via gradera-api build script)
# -----------------------------------------------------------------------------
FROM deps AS build

COPY packages/contracts packages/contracts
COPY packages/domain packages/domain
COPY apps/api apps/api

# .dockerignore excludes dist/; stale tsconfig.build.tsbuildinfo would make tsc skip emit.
RUN rm -rf packages/domain/dist packages/domain/tsconfig.build.tsbuildinfo

RUN pnpm --filter @proto-platform/domain build \
  && test -f packages/domain/dist/index.js \
  && test -f packages/domain/dist/index.d.ts

RUN pnpm --filter gradera-api build

# -----------------------------------------------------------------------------
# Production runtime bundle (pnpm workspace symlinks preserved)
# -----------------------------------------------------------------------------
FROM build AS deploy

RUN mkdir -p /deploy/apps/api /deploy/packages \
  && cp -a node_modules /deploy/node_modules \
  && cp -a packages/domain /deploy/packages/domain \
  && cp -a apps/api/dist /deploy/apps/api/dist \
  && cp -a apps/api/prisma /deploy/apps/api/prisma

# -----------------------------------------------------------------------------
# Runtime
# -----------------------------------------------------------------------------
FROM node:22-slim AS runner

ARG COMMIT_SHA=unknown
ARG APP_VERSION=0.1.0

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV COMMIT_SHA=${COMMIT_SHA}
ENV APP_VERSION=${APP_VERSION}

COPY --from=deploy --chown=node:node /deploy .

WORKDIR /app/apps/api

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
