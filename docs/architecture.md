# Architecture

Fondo is a pnpm and Turborepo monorepo with a React/Vite web application, a NestJS/Fastify API, and shared TypeScript packages.

## Boundaries

- `apps/web` owns presentation, routing, client state and translations.
- `apps/api` owns HTTP transport, authentication, authorization and domain orchestration.
- `packages/db` owns Prisma schema, migrations and the database client.
- `packages/shared-types` owns public API schemas and transport types.
- `packages/ui` owns reusable Mantine-based components.
- `packages/i18n` owns shared locale types and formatting constants.

API modules are vertical slices. A module exposes application contracts, not infrastructure repositories. Cross-module communication uses explicit ports or documented internal events.

## Tenant isolation

Private requests resolve a user session and an authorized membership before a module receives a tenant context. Business tables contain `tenantId`, application repositories require that context, and PostgreSQL row-level security is planned as defense in depth before financial endpoints are released.

## Sessions

Sessions are stored in PostgreSQL and survive API restarts. Better Auth is configured with a 7-day idle expiration refreshed after 24 hours of activity, and the API rejects any session older than 30 days regardless of activity. The web client revalidates the session when the tab regains focus or visibility, and a `401` from any private request clears the local session so the protected routes redirect to `/login`.

## Money

The MVP uses USD as its canonical ledger currency and stores integer minor units. The web application supports USD and EUR as display currencies through an exchange-rate provider. Historical reports use the rate effective for the report period; current balances use the latest valid rate. Stored transactions are never rewritten during conversion.
