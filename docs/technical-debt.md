# Technical Debt

A living inventory of planned and known technical debt for Fondo. Each phase of the roadmap has its own section, and every debt item is tracked with a stable `TD-###` identifier.

## Purpose

Track work that has been specified in earlier planning rounds but is not yet implemented, plus known gaps discovered during development. The file is updated at the end of every phase. An item is only marked `Done` when it has passing tests or equivalent verification — not because code exists.

## Status Legend

- `Pending` — specified, not started.
- `In Progress` — being worked on.
- `Blocked` — waiting on a dependency or a decision.
- `Done` — implemented and verified.
- `Deferred` — intentionally postponed.

## Current Baseline

| Phase                                       | Status      |
| ------------------------------------------- | ----------- |
| Phase 0: Repository Foundation              | Mostly done |
| Phase 1: UI Foundation                      | Mostly done |
| Phase 2: Authentication and Personal Tenant | Stabilized  |
| Phase 3: Functional Settings                | Pending     |
| Phase 4: Services and Feature Flags         | Pending     |
| Phase 5: Accounts and Categories            | Pending     |
| Phase 6: Transactions and Ledger            | Pending     |
| Phase 7: Dashboard and Reports              | Pending     |
| Phase 8: Security and Production Hardening  | Pending     |

## Phase 0: Repository Foundation

### TD-001: Reduce common Mantine/Charts bundle size

- Status: Pending
- Priority: P2
- Area: Web / Performance
- Problem: The common vendor chunk is above 500 kB after minification and emits a Vite warning.
- Planned resolution: Evaluate manual chunks, remove unused icon/component imports, or lazy-load chart modules.
- Acceptance criteria: `pnpm build` completes without the chunk-size warning.
- Verification: `pnpm --filter @fondo/web build`.

### TD-002: Formalize React Testing Library setup

- Status: Pending
- Priority: P2
- Area: Web / Quality
- Problem: RTL dependencies exist but there is no shared test setup or jsdom configuration.
- Planned resolution: Add a Vitest config with `jsdom`, a setup file, and a first render test.
- Acceptance criteria: A component test runs under jsdom.
- Verification: `pnpm --filter @fondo/web test`.

### TD-003: Add real PostgreSQL health check

- Status: Pending
- Priority: P1
- Area: API / DevOps
- Problem: `/api/v1/health` reports `ok` without checking the database.
- Planned resolution: Use `@nestjs/terminus` Prisma health indicator.
- Acceptance criteria: Health reflects database connectivity.
- Verification: Integration test against a running PostgreSQL.

### TD-004: Review Dockerfiles for non-root runtime

- Status: Pending
- Priority: P1
- Area: DevOps / Security
- Problem: Runtime images are not fully verified as non-root and minimal.
- Planned resolution: Verify `USER` directives, minimal images and no secrets in layers.
- Acceptance criteria: Containers run as non-root; no secrets in image.
- Verification: Build and inspect images.

### TD-005: Clarify local vs CI PostgreSQL ports

- Status: Pending
- Priority: P2
- Area: DevOps / Docs
- Problem: Local Postgres is on host port `5433`; CI uses `5432` inside the job.
- Planned resolution: Document the mapping and keep `.env.example` consistent.
- Acceptance criteria: Local and CI setup are unambiguous.
- Verification: README and `.env.example` review.

### TD-006: Validate environment variables on API startup

- Status: Pending
- Priority: P1
- Area: API / Security
- Problem: `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are partially validated only when auth is created.
- Planned resolution: Fail fast at bootstrap with clear errors.
- Acceptance criteria: Missing required variables prevent startup.
- Verification: Start API without env vars and observe early failure.

### TD-007: Document unused declared dependencies

- Status: Pending
- Priority: P2
- Area: Monorepo / Quality
- Problem: Several catalog dependencies are declared but not yet used, or used later in the roadmap.
- Planned resolution: Either remove them or document the phase where they are consumed.
- Acceptance criteria: Every dependency is used or documented.
- Verification: `pnpm lint` and manual review.

## Phase 1: UI Foundation

### TD-008: Replace mocks with API adapters

- Status: Pending
- Priority: P0
- Area: Web
- Problem: Dashboard, Reports and Services render typed mocks from `mock-data.ts`.
- Planned resolution: Introduce repository/query adapters with the same contracts, then connect them to TanStack Query.
- Acceptance criteria: Screens render server data; mocks live only in test fixtures.
- Verification: Component tests and API integration tests.

### TD-009: Implement real date range picker

- Status: Pending
- Priority: P2
- Area: Web / UX
- Problem: The `Custom` period option in `DateRangeSelector` has no date picker.
- Planned resolution: Use `@mantine/dates` `DatePickerInput` for custom ranges.
- Acceptance criteria: Selecting a custom range changes the query period.
- Verification: Interaction test.

### TD-010: Add real loading, empty, error and disabled states

- Status: Pending
- Priority: P0
- Area: Web / UX
- Problem: Screens mostly assume success; error and empty states are incomplete.
- Planned resolution: Standardize state components and apply to every screen.
- Acceptance criteria: Every data screen handles loading, empty, error and disabled.
- Verification: Component tests per state.

### TD-011: Add React Testing Library render tests

- Status: Pending
- Priority: P1
- Area: Web / Quality
- Problem: UI has no render tests.
- Planned resolution: Test the App Shell, auth pages, Settings sections and key components.
- Acceptance criteria: Navigation, theme, language and currency changes are covered.
- Verification: `pnpm --filter @fondo/web test`.

### TD-012: Improve internal Settings navigation

- Status: Pending
- Priority: P2
- Area: Web / UX
- Problem: Settings sections are visual; navigation does not change the view.
- Planned resolution: Use nested routes or active section state with real content per section.
- Acceptance criteria: Each section renders distinct content and active state.
- Verification: Interaction test.

### TD-013: Complete WCAG AA accessibility review

- Status: Pending
- Priority: P1
- Area: Web / Quality
- Problem: Accessibility is designed but not audited.
- Planned resolution: Audit contrast, focus states, keyboard navigation, labels and screen reader behavior.
- Acceptance criteria: No AA contrast or focus violations.
- Verification: Automated checks plus manual keyboard review.

### TD-014: Formalize exchange rate provider

- Status: Pending
- Priority: P1
- Area: Web / Money
- Problem: EUR conversion uses a constant inside `mock-data.ts`.
- Planned resolution: Create a typed `ExchangeRateProvider` abstraction.
- Acceptance criteria: UI contracts depend on the provider, not on mock constants.
- Verification: Unit tests for the provider and conversion.

### TD-015: Show exchange rate source and effective date

- Status: Pending
- Priority: P2
- Area: Web / Money
- Problem: The UI shows a rate without source or effective date.
- Planned resolution: Display `source` and `effectiveAt` from the provider.
- Acceptance criteria: Users see when and where the rate came from.
- Verification: Component test.

### TD-016: Define behavior when no valid rate exists

- Status: Pending
- Priority: P1
- Area: Web / Money
- Problem: There is no fallback when a rate is missing.
- Planned resolution: Fall back to USD with a visible warning; never invent a rate.
- Acceptance criteria: Missing rate degrades gracefully.
- Verification: Unit tests.

### TD-017: Replace visual forms with React Hook Form + Zod

- Status: Pending
- Priority: P0
- Area: Web / Quality
- Problem: Login, Register and Settings use uncontrolled inputs or local state.
- Planned resolution: Adopt `react-hook-form` with `zodResolver` everywhere.
- Acceptance criteria: Forms validate with Zod and show field-level errors.
- Verification: Component tests.

## Phase 2: Authentication and Personal Tenant

### TD-018: Reproduce signup error on a clean database

- Status: Done
- Priority: P0
- Area: API / Auth
- Problem: A signup attempt errored during the last manual run.
- Planned resolution: Reproduce on a clean test database, capture the error, fix the root cause, then re-test.
- Acceptance criteria: Signup succeeds on a clean database.
- Verification: End-to-end smoke test with a unique email.

### TD-019: Add end-to-end signup test

- Status: Pending
- Priority: P0
- Area: API / Quality
- Problem: Registration is only manually verified.
- Planned resolution: Add an integration test that registers, provisions tenant and returns a session cookie.
- Acceptance criteria: Test asserts user, tenant, membership and settings rows.
- Verification: `pnpm --filter @fondo/api test`.

### TD-020: Add end-to-end session, login and logout tests

- Status: Pending
- Priority: P0
- Area: API / Quality
- Problem: Login, `/me`, settings and logout are not covered by automated tests.
- Planned resolution: Add integration tests for the full flow.
- Acceptance criteria: Login, `/me`, settings update and logout are asserted.
- Verification: `pnpm --filter @fondo/api test`.

### TD-021: Enforce unique case-insensitive email

- Status: Done
- Priority: P0
- Area: Database / Auth
- Problem: Email uniqueness relies on a plain unique index.
- Planned resolution: Normalize email to lowercase before storing, or use a case-insensitive unique index.
- Acceptance criteria: `User@Example.com` and `user@example.com` cannot coexist.
- Verification: Integration test plus functional unique index `user_email_lower_unique`.

### TD-022: Return safe duplicate-email error

- Status: Done
- Priority: P1
- Area: API / Auth
- Problem: Duplicate registration error may leak account existence details.
- Planned resolution: Return a generic safe message and log the real reason server-side.
- Acceptance criteria: Client never learns whether the email exists.
- Verification: Manual smoke test; automated assertion pending in TD-019.

### TD-023: Validate auth configuration at startup

- Status: Done
- Priority: P0
- Area: API / Auth
- Problem: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are validated lazily.
- Planned resolution: Validate `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` during bootstrap.
- Acceptance criteria: Startup fails fast with a clear error when variables are missing.
- Verification: Unit tests in `app-config.test.ts`.

### TD-024: Review Better Auth + Fastify mounting

- Status: In Progress
- Priority: P0
- Area: API / Auth
- Problem: The auth handler is mounted through a Fastify `onRequest` hook with manual URL rewriting.
- Planned resolution: Review the integration, add tests for path handling, and document the mount contract. Origin/CSRF handling verified via `trustedOrigins`.
- Acceptance criteria: All auth routes resolve under `/api/v1/auth`; logout passes the origin check.
- Verification: Integration tests pending for path handling.

### TD-025: Remove unsafe HTTP type casts

- Status: Pending
- Priority: P1
- Area: API / Quality
- Problem: The Fastify/Node bridge uses casts between raw and typed objects.
- Planned resolution: Introduce narrow typed helpers instead of broad casts.
- Acceptance criteria: No broad casts remain in the auth bridge.
- Verification: Typecheck and code review.

### TD-026: Remove provisioning catch-all that hides errors

- Status: Done
- Priority: P0
- Area: API / Auth
- Problem: `TenantProvisioningService` swallows all errors with an empty `catch`.
- Planned resolution: Let unexpected errors surface; keep idempotency for duplicate conflicts.
- Acceptance criteria: Provisioning failures are visible and testable.
- Verification: Unit tests cover duplicate recovery and rethrow.

### TD-027: Make tenant provisioning atomic

- Status: Done
- Priority: P0
- Area: Database / Auth
- Problem: Tenant is created, then membership and settings run in a second transaction.
- Planned resolution: Create tenant, membership and settings in a single Prisma transaction.
- Acceptance criteria: A partial provisioning never persists.
- Verification: Unit tests assert atomic transaction usage.

### TD-028: Enforce single personal tenant per owner

- Status: Done
- Priority: P1
- Area: Database / Auth
- Problem: Nothing prevents two personal tenants for the same owner.
- Planned resolution: Add a unique constraint on `Tenant.ownerUserId` (or an explicit `type` discriminator).
- Acceptance criteria: A user cannot have more than one personal tenant.
- Verification: Migration `20260903120000_tenant_owner_unique`.

### TD-029: Test concurrent provisioning

- Status: Pending
- Priority: P1
- Area: API / Quality
- Problem: Idempotency under concurrent signups is unverified.
- Planned resolution: Add a concurrency test that fires simultaneous provisioning for the same user.
- Acceptance criteria: Only one tenant is created.
- Verification: Integration test.

### TD-030: Test user without membership

- Status: Pending
- Priority: P1
- Area: API / Quality
- Problem: `/me` behavior for a user without membership is untested.
- Planned resolution: Add a test asserting a safe 404.
- Acceptance criteria: No data leaks; response is safe.
- Verification: Integration test.

### TD-031: Test expired sessions

- Status: Pending
- Priority: P1
- Area: API / Quality
- Problem: Expired sessions are not covered.
- Planned resolution: Add a test with an expired session token.
- Acceptance criteria: Expired sessions get `401`.
- Verification: Integration test.

### TD-032: Test HttpOnly cookies and CORS

- Status: Pending
- Priority: P1
- Area: API / Security
- Problem: Cookie flags and CORS behavior are unverified.
- Planned resolution: Assert `HttpOnly`, `SameSite`, `Secure` in production, and CORS origin allowlist.
- Acceptance criteria: Cookies are HttpOnly; CORS only allows configured origins.
- Verification: Integration tests.

### TD-033: Add effective rate limiting for auth endpoints

- Status: Pending
- Priority: P0
- Area: API / Security
- Problem: Throttler is configured globally but not applied to auth routes specifically.
- Planned resolution: Add stricter limits for sign-up, sign-in and password change.
- Acceptance criteria: Brute-force attempts get `429`.
- Verification: Integration test.

### TD-034: Keep email verification deferred

- Status: Deferred
- Priority: P2
- Area: Auth
- Problem: Email verification is not required for the MVP.
- Planned resolution: Revisit after OAuth and reset-password flows.
- Acceptance criteria: Documented and tracked, not silently missing.

### TD-035: Isolate test fixtures from the local database

- Status: Pending
- Priority: P0
- Area: DevOps / Quality
- Problem: Smoke tests have created rows in the local database.
- Planned resolution: Use a dedicated test database and clean fixtures.
- Acceptance criteria: Local data is never touched by automated tests.
- Verification: Test run against a separate database.

## Phase 3: Functional Settings

### TD-036: Persist profile through the API

- Status: Pending
- Priority: P0
- Area: Web / Settings
- Planned resolution: Wire name and avatar updates to `PATCH /me/profile`.

### TD-037: Persist theme through the API

- Status: Pending
- Priority: P0
- Area: Web / Settings
- Planned resolution: Replace local-only theme writes with a settings mutation.

### TD-038: Persist locale for authenticated users

- Status: Pending
- Priority: P0
- Area: Web / Settings
- Planned resolution: Send locale changes to `PATCH /me/settings`.

### TD-039: Persist timezone

- Status: Pending
- Priority: P1
- Area: Web / Settings
- Planned resolution: Add timezone to the settings mutation and validate IANA identifiers.

### TD-040: Persist display currency

- Status: Pending
- Priority: P0
- Area: Web / Settings
- Planned resolution: Wire currency changes through the settings mutation.

### TD-041: Validate IANA timezones

- Status: Pending
- Priority: P1
- Area: API / Validation
- Planned resolution: Validate timezone strings against `Intl.supportedValuesOf("timeZone")`.

### TD-042: Connect password change with Better Auth

- Status: Pending
- Priority: P0
- Area: Web / Security
- Planned resolution: Use Better Auth `changePassword` with current password verification.

### TD-043: Implement active sessions management

- Status: Pending
- Priority: P1
- Area: Web / Security
- Planned resolution: List and revoke sessions using Better Auth session APIs.

### TD-044: Add mutation error and notification handling

- Status: Pending
- Priority: P0
- Area: Web / UX
- Planned resolution: Replace fire-and-forget requests with `useMutation` plus notifications.

### TD-045: Remove fire-and-forget preference requests

- Status: Pending
- Priority: P0
- Area: Web / Quality
- Planned resolution: Every preference change goes through a tracked mutation.

### TD-046: Add safe email change flow

- Status: Pending
- Priority: P2
- Area: Auth / Settings
- Planned resolution: Implement Better Auth email change with verification.

## Phase 4: Services and Feature Flags

- TD-047: Create `ServiceDefinition` catalog. Pending.
- TD-048: Create `ServiceSubscription` per tenant. Pending.
- TD-049: Enable Personal Finance by default. Pending.
- TD-050: Create `ServiceAccessGuard`. Pending.
- TD-051: Add `ADMIN` / `MEMBER` permissions. Pending.
- TD-052: Add contracts for Vehicle, Home, Insurance, Entrepreneurship. Pending.
- TD-053: Implement service-aware navigation. Pending.
- TD-054: Audit service enable/disable actions. Pending.

## Phase 5: Accounts and Categories

- TD-055: Create `FinancialAccount`. Pending.
- TD-056: Create `Category`. Pending.
- TD-057: Seed default categories. Pending.
- TD-058: Add per-tenant custom categories. Pending.
- TD-059: Implement accounts/categories API. Pending.
- TD-060: Implement functional UI. Pending.
- TD-061: Add pagination and allowlisted sorting. Pending.
- TD-062: Enforce tenant-scoped repositories. Pending.
- TD-063: Add audit logging. Pending.

## Phase 6: Transactions and Ledger

- TD-064: Create `Transaction` aggregate. Pending.
- TD-065: Create `TransactionEntry`. Pending.
- TD-066: Implement income. Pending.
- TD-067: Implement expenses. Pending.
- TD-068: Implement atomic transfers. Pending.
- TD-069: Prevent double booking. Pending.
- TD-070: Reject negative asset balances. Pending.
- TD-071: Model credit card negative debt. Pending.
- TD-072: Add audited edit/delete. Pending.
- TD-073: Add atomicity tests. Pending.
- TD-074: Add concurrency tests. Pending.

## Phase 7: Dashboard and Reports

- TD-075: Replace mocks with real queries. Pending.
- TD-076: Finalize query keys. Pending.
- TD-077: Implement financial dashboard. Pending.
- TD-078: Implement category spending. Pending.
- TD-079: Implement cash flow. Pending.
- TD-080: Implement budgets vs actual. Pending.
- TD-081: Implement real period selector. Pending.
- TD-082: Apply USD/EUR conversion. Pending.
- TD-083: Use latest rate for current balances. Pending.
- TD-084: Use effective rate for historical reports. Pending.
- TD-085: Add aggregation tests. Pending.

## Phase 8: Security and Production Hardening

- TD-086: Implement PostgreSQL RLS. Pending.
- TD-087: Verify `SET LOCAL` inside transactions. Pending.
- TD-088: Add cross-tenant tests. Pending.
- TD-089: Apply per-endpoint rate limiting. Pending.
- TD-090: Complete payload size limits. Pending.
- TD-091: Review production CORS. Pending.
- TD-092: Add basic observability. Pending.
- TD-093: Run dependency audit. Pending.
- TD-094: Complete E2E tests. Pending.
- TD-095: Review accessibility and performance. Pending.

## Deferred Decisions

These are intentional and should not be confused with forgotten work:

- Password recovery flow.
- Email verification.
- GitHub and Google OAuth.
- Invitations and shared tenants.
- Family and business spaces in the UI.
- Full multi-currency ledger and real exchange-rate provider.
- Avatar object storage buckets.
- Irreversible data deletion.
- Full logic for Vehicle, Home, Insurance and Entrepreneurship.

## Maintenance Rules

At the end of every phase:

1. Mark completed `TD-###` items as `Done`.
2. Add newly discovered debt.
3. Move blocked items to `Blocked` with a reason.
4. Record changed decisions.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm --filter @fondo/db db:deploy`.
6. Update the changelog below.

## Changelog

- 2026-09-04: Fixed dev-mode DI failure — `tsx` does not emit `design:paramtypes`, so NestJS constructor injection passed `undefined`. Switched auth/me providers to explicit `@Inject()` tokens; works under both `tsx` and `tsc`. Added CORS headers and OPTIONS preflight handling for Better Auth routes.
- 2026-09-04: Fixed Better Auth client base path — `VITE_AUTH_URL` now points to `/api/v1/auth`; signup/login hit the correct route instead of `404` on `/api/v1/sign-up/email`.
- 2026-09-04: Phase 2 stabilization — atomic provisioning, case-insensitive email, tenant owner uniqueness, startup env validation, trusted-origins for logout. TD-018, TD-021, TD-022, TD-023, TD-026, TD-027, TD-028 done.
- 2026-09-03: Initial inventory created from prior planning rounds.
