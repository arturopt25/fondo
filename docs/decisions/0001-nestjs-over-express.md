# ADR 0001: NestJS over Express

## Status

Accepted

## Decision

Use NestJS with the Fastify adapter for the API.

## Rationale

The product needs explicit module boundaries, guards, dependency injection, OpenAPI and testable application services. NestJS provides these conventions without requiring a custom framework layer. Fastify is used as the HTTP adapter for its performance and lower overhead.
