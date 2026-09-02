# ADR 0004: Tenant Isolation

## Status

Accepted

## Decision

Enforce tenant isolation in the application context and add PostgreSQL row-level security before releasing financial endpoints.

## Rationale

Membership authorization prevents unauthorized tenant selection at the API boundary. RLS provides defense in depth if a repository query is accidentally under-scoped.
