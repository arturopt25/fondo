# Fondo

Personal Finance Services Platform. Fondo is a multi-tenant TypeScript monorepo for personal finance tracking and independently enabled services.

## Stack

- pnpm workspaces and Turborepo
- React, Vite, Mantine, TanStack Query and React Router
- NestJS on Fastify
- PostgreSQL and Prisma
- Better Auth
- Vitest, React Testing Library and GitHub Actions

## Requirements

- Node.js 24+
- pnpm 11+
- Docker and Docker Compose

## Local setup

```bash
pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres mailpit
pnpm --filter @fondo/db db:generate
pnpm --filter @fondo/db db:migrate
pnpm dev
```

The web app is available at `http://localhost:5173`. The API health endpoint is available at `http://localhost:3000/api/v1/health`. Postgres is exposed on host port `5433` to avoid conflicts with other local PostgreSQL instances on `5432`.

## Authentication

Auth uses Better Auth mounted under `/api/v1/auth`. On first signup the API provisions a personal tenant, an `ADMIN` membership and default user settings automatically. Sessions are cookie-based (`HttpOnly`). The web client is in `apps/web/src/modules/auth`.

Required environment variables for auth:

```bash
BETTER_AUTH_SECRET=replace-with-a-local-secret-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000/api/v1/auth
```

GitHub and Google OAuth are optional and only enabled when their client credentials are present.

## Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Architecture

Applications live under `apps/`, reusable packages under `packages/`, and domain decisions under `docs/`. API modules are organized vertically by service. A module may consume another module only through an explicit application contract or documented internal event.

## Roadmap

1. Repository foundation
2. Authentication and personal tenant context
3. Settings and internationalization
4. Service catalog and entitlements
5. Accounts and categories
6. Transactions and dashboard
7. Budgets, notifications and hardening
8. Future service contracts
