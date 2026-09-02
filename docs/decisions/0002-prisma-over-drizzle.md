# ADR 0002: Prisma over Drizzle

## Status

Accepted

## Decision

Use Prisma with PostgreSQL behind repositories in `packages/db`.

## Rationale

Prisma provides declarative migrations, generated types and readable relational models. Domain modules will not expose Prisma models directly, preserving the option to change persistence details later.
