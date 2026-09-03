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

## Money

The MVP uses USD as its canonical ledger currency and stores integer minor units. The web application supports USD and EUR as display currencies through an exchange-rate provider. Historical reports use the rate effective for the report period; current balances use the latest valid rate. Stored transactions are never rewritten during conversion.
