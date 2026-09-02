# API Conventions

- Base path: `/api/v1`.
- Private routes require a Better Auth session and an authorized tenant context.
- Lists use `page` and `pageSize`; the default is 20 and the maximum is 100.
- Sort fields are allowlisted per endpoint.
- Errors use `{ error: { code, message, details, requestId } }`.
- Stack traces, secrets and cross-tenant information are never returned.
- All request bodies and query parameters are validated with Zod.
