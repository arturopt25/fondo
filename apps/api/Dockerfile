FROM node:24-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter @fondo/api...

FROM dependencies AS build
COPY apps/api ./apps/api
COPY packages/config ./packages/config
COPY packages/db ./packages/db
COPY packages/shared-types ./packages/shared-types
RUN pnpm --filter @fondo/shared-types build
RUN pnpm --filter @fondo/db db:generate
RUN pnpm --filter @fondo/db build
RUN pnpm --filter @fondo/api build
RUN pnpm --filter @fondo/api deploy --prod --legacy /prod/api
RUN source_client=$(find /app/node_modules/.pnpm -type d -path '*/node_modules/@prisma/client' -print -quit) \
  && target_client=$(find /prod/api/node_modules/.pnpm -type d -path '*/node_modules/@prisma/client' -print -quit) \
  && test -n "$source_client" \
  && test -n "$target_client" \
  && source_node_modules=$(dirname "$(dirname "$source_client")") \
  && target_node_modules=$(dirname "$(dirname "$target_client")") \
  && mkdir -p "$target_node_modules/.prisma" \
  && cp -R "$source_node_modules/.prisma/client" "$target_node_modules/.prisma/"

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /prod/api ./
USER node
EXPOSE 10000
CMD ["node", "dist/main.js"]
