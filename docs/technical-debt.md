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
| Phase 2: Authentication and Personal Tenant | Done        |
| Phase 3: Functional Settings                | Mostly done |
| Phase 4: Services and Feature Flags         | Mostly done |
| Phase 5: Accounts and Categories            | Done        |
| Phase 6: Transactions and Ledger            | In Progress |
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

- Status: Done
- Priority: P2
- Area: Web / Quality
- Problem: RTL dependencies exist but there is no shared test setup or jsdom configuration.
- Planned resolution: Add a Vitest config with `jsdom`, a setup file, and a first render test.
- Acceptance criteria: A component test runs under jsdom.
- Verification: `pnpm --filter @fondo/web test`.

### TD-003: Add real PostgreSQL health check

- Status: Done
- Priority: P1
- Area: API / DevOps
- Problem: `/api/v1/health` reports `ok` without checking the database.
- Planned resolution: Use `@nestjs/terminus` Prisma health indicator.
- Acceptance criteria: Health reflects database connectivity.
- Verification: `HealthModule` uses `PrismaHealthIndicator`; e2e test asserts `details.database.status` is `up`.

### TD-004: Review Dockerfiles for non-root runtime

- Status: Done
- Priority: P1
- Area: DevOps / Security
- Problem: Runtime images are not fully verified as non-root and minimal.
- Planned resolution: Verify `USER` directives, minimal images and no secrets in layers.
- Acceptance criteria: Containers run as non-root; no secrets in image.
- Verification: API image already runs as `USER node`; web image switched to `nginxinc/nginx-unprivileged` (non-root, port `8080`).

### TD-005: Clarify local vs CI PostgreSQL ports

- Status: Done
- Priority: P2
- Area: DevOps / Docs
- Problem: Local Postgres is on host port `5433`; CI uses `5432` inside the job.
- Planned resolution: Document the mapping and keep `.env.example` consistent.
- Acceptance criteria: Local and CI setup are unambiguous.
- Verification: README documents local `5433` vs CI `5432`; `.env.example` uses `5433`.

### TD-006: Validate environment variables on API startup

- Status: Done
- Priority: P1
- Area: API / Security
- Problem: `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are partially validated only when auth is created.
- Planned resolution: Fail fast at bootstrap with clear errors.
- Acceptance criteria: Missing required variables prevent startup.
- Verification: Implemented by `loadAppConfig()`; superseded by TD-023.

### TD-007: Document unused declared dependencies

- Status: Done
- Priority: P2
- Area: Monorepo / Quality
- Problem: Several catalog dependencies are declared but not yet used, or used later in the roadmap.
- Planned resolution: Either remove them or document the phase where they are consumed.
- Acceptance criteria: Every dependency is used or documented.
- Verification: `pnpm lint` and manual review. Qlty's `knip` plugin confirms the list below. See the "Declared but not yet consumed" note below.

Declared but not yet consumed:

- API (`apps/api`): `@fastify/cookie`, `@fastify/helmet`, `@fastify/static`, `@fastify/middie`, `nestjs-zod` — candidates for Phase 8 security/hardening or removal.
- Web (`apps/web`): `@fondo/i18n`, `@tanstack/react-query-devtools`, `@mantine/dates` (TD-009), `react-hook-form` and `@hookform/resolvers` (TD-017).
- `@nestjs/terminus` is now consumed by TD-003.

## Phase 1: UI Foundation

### TD-008: Replace mocks with API adapters

- Status: Blocked
- Priority: P0
- Area: Web
- Problem: Dashboard and Reports render typed mocks from `mock-data.ts`. (Services was migrated to real API data in Phase 4A.)
- Planned resolution: Introduce repository/query adapters with the same contracts, then connect them to TanStack Query.
- Acceptance criteria: Screens render server data; mocks live only in test fixtures.
- Verification: Component tests and API integration tests.
- Blocked on: Financial Accounts and Transactions (Phase 5/6) — there is no server data to render yet.

### TD-009: Implement real date range picker

- Status: Done
- Priority: P2
- Area: Web / UX
- Problem: The `Custom` period option in `DateRangeSelector` has no date picker.
- Planned resolution: Use `@mantine/dates` `DatePickerInput` for custom ranges.
- Acceptance criteria: Selecting a custom range changes the query period.
- Verification: `DateRangeSelector` renders a controlled range `DatePicker`; the range is surfaced via `onRangeChange`.

### TD-010: Add real loading, empty, error and disabled states

- Status: Done
- Priority: P0
- Area: Web / UX
- Problem: Screens mostly assume success; error and empty states are incomplete.
- Planned resolution: Standardize state components and apply to every screen.
- Acceptance criteria: Every data screen handles loading, empty, error and disabled.
- Verification: `LoadingState` and `ErrorState` added to `@fondo/ui` and applied to Services, Settings and the finance pages. Dashboard/Reports remain mock-backed until TD-008.

### TD-011: Add React Testing Library render tests

- Status: Done
- Priority: P1
- Area: Web / Quality
- Problem: UI has render tests for Settings, Services and auth-client, but the App Shell, auth pages and key components are not covered.
- Planned resolution: Test the App Shell, auth pages, Settings sections and key components.
- Acceptance criteria: Navigation, theme, language and currency changes are covered.
- Verification: Tests now cover Login, Register, App Shell navigation, Settings sections, Services and Accounts pages.

### TD-012: Improve internal Settings navigation

- Status: Done
- Priority: P2
- Area: Web / UX
- Problem: Settings sections are visual; navigation does not change the view.
- Planned resolution: Use nested routes or active section state with real content per section.
- Acceptance criteria: Each section renders distinct content and active state.
- Verification: Section state drives which card renders; nav buttons update the active section.

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

- Status: Done
- Priority: P0
- Area: Web / Quality
- Problem: Login, Register and Settings use uncontrolled inputs or local state.
- Planned resolution: Adopt `react-hook-form` with `zodResolver` everywhere.
- Acceptance criteria: Forms validate with Zod and show field-level errors.
- Verification: Login, Register, profile and the finance create forms use RHF + shared Zod schemas; the password form keeps explicit validation with field errors.

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

- Status: Done
- Priority: P0
- Area: API / Quality
- Problem: Registration is only manually verified.
- Planned resolution: Add an integration test that registers, provisions tenant and returns a session cookie.
- Acceptance criteria: Test asserts user, tenant, membership and settings rows.
- Verification: `pnpm --filter @fondo/api test:e2e`.

### TD-020: Add end-to-end session, login and logout tests

- Status: Done
- Priority: P0
- Area: API / Quality
- Problem: Login, `/me`, settings and logout are not covered by automated tests.
- Planned resolution: Add integration tests for the full flow.
- Acceptance criteria: Login, `/me`, settings update and logout are asserted.
- Verification: `pnpm --filter @fondo/api test:e2e`.

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
- Verification: E2E duplicate-signup test asserts a single user is created and no account details leak.

### TD-023: Validate auth configuration at startup

- Status: Done
- Priority: P0
- Area: API / Auth
- Problem: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are validated lazily.
- Planned resolution: Validate `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` during bootstrap.
- Acceptance criteria: Startup fails fast with a clear error when variables are missing.
- Verification: Unit tests in `app-config.test.ts`.

### TD-024: Review Better Auth + Fastify mounting

- Status: Done
- Priority: P0
- Area: API / Auth
- Problem: The auth handler is mounted through a Fastify `onRequest` hook with manual URL rewriting.
- Planned resolution: Review the integration, add tests for path handling, and document the mount contract. Origin/CSRF handling verified via `trustedOrigins`.
- Acceptance criteria: All auth routes resolve under `/api/v1/auth`; logout passes the origin check.
- Verification: Integration tests cover sign-up, sign-in, sign-out and session routes.

### TD-025: Remove unsafe HTTP type casts

- Status: Done
- Priority: P1
- Area: API / Quality
- Problem: The Fastify/Node bridge uses casts between raw and typed objects.
- Planned resolution: Introduce narrow typed helpers instead of broad casts.
- Acceptance criteria: No broad casts remain in the auth bridge.
- Verification: `fastify-auth.ts` now types against `FastifyInstance`; only one narrow cast to the Better Auth raw-request contract remains.

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

- Status: Done
- Priority: P1
- Area: API / Quality
- Problem: Idempotency under concurrent signups is unverified.
- Planned resolution: Add a concurrency test that fires simultaneous provisioning for the same user.
- Acceptance criteria: Only one tenant is created.
- Verification: Integration test in `auth.e2e.test.ts`.

### TD-030: Test user without membership

- Status: Done
- Priority: P1
- Area: API / Quality
- Problem: `/me` behavior for a user without membership is untested.
- Planned resolution: Add a test asserting a safe 404.
- Acceptance criteria: No data leaks; response is safe.
- Verification: Integration test in `auth.e2e.test.ts`.

### TD-031: Test expired sessions

- Status: Done
- Priority: P1
- Area: API / Quality
- Problem: Expired sessions are not covered.
- Planned resolution: Add a test with an expired session token.
- Acceptance criteria: Expired sessions get `401`.
- Verification: Integration test in `auth.e2e.test.ts`.

### TD-032: Test HttpOnly cookies and CORS

- Status: Done
- Priority: P1
- Area: API / Security
- Problem: Cookie flags and CORS behavior are unverified.
- Planned resolution: Assert `HttpOnly`, `SameSite`, `Secure` in production, and CORS origin allowlist.
- Acceptance criteria: Cookies are HttpOnly; CORS only allows configured origins.
- Verification: Integration test in `auth.e2e.test.ts`.

### TD-033: Add effective rate limiting for auth endpoints

- Status: Done
- Priority: P0
- Area: API / Security
- Problem: Throttler is configured globally but not applied to auth routes specifically.
- Planned resolution: Add stricter limits for sign-up, sign-in and password change.
- Acceptance criteria: Brute-force attempts get `429`.
- Verification: Better Auth `rateLimit` enabled with strict custom rules; e2e test asserts `429` once the sign-in limit is exceeded.

### TD-034: Keep email verification deferred

- Status: Deferred
- Priority: P2
- Area: Auth
- Problem: Email verification is not required for the MVP.
- Planned resolution: Revisit after OAuth and reset-password flows.
- Acceptance criteria: Documented and tracked, not silently missing.

### TD-035: Isolate test fixtures from the local database

- Status: Done
- Priority: P0
- Area: DevOps / Quality
- Problem: Smoke tests have created rows in the local database.
- Planned resolution: Use a dedicated test database and clean fixtures.
- Acceptance criteria: Local data is never touched by automated tests.
- Verification: `TEST_DATABASE_URL` runs against `fondo_test`; a guard refuses the local dev database (`fondo@localhost:5433`).

### TD-096: Resolve tenant context at the request boundary

- Status: Done
- Priority: P0
- Area: API / Tenant
- Problem: `SessionAuthGuard` only attached `CurrentUser`; `TenantContext` was never populated, forcing every module to re-resolve membership.
- Planned resolution: Resolve membership and tenant after the session check and attach them to the request.
- Acceptance criteria: Every private request carries `tenantId`, role, name, currency and timezone; users without membership get a safe 404.
- Verification: Guard unit tests plus e2e coverage for `/me`, member/owner role and the services endpoints.

## Phase 3: Functional Settings

### TD-036: Persist profile through the API

- Status: Done
- Priority: P0
- Area: Web / Settings
- Planned resolution: Wire name and avatar updates to `PATCH /me/profile`.
- Acceptance criteria: The display name persists and is returned by `/me`.
- Verification: E2E test updates the profile name. Avatar upload remains deferred (object storage), separate from the name flow.

### TD-037: Persist theme through the API

- Status: Done
- Priority: P0
- Area: Web / Settings
- Planned resolution: Replace local-only theme writes with a settings mutation.
- Acceptance criteria: Theme changes survive a new session.
- Verification: E2E test updates and reads back `theme`.

### TD-038: Persist locale for authenticated users

- Status: Done
- Priority: P0
- Area: Web / Settings
- Planned resolution: Send locale changes to `PATCH /me/settings`.
- Acceptance criteria: Locale is stored server-side and applied to i18n.
- Verification: E2E test updates and reads back `locale`.

### TD-039: Persist timezone

- Status: Done
- Priority: P1
- Area: Web / Settings
- Planned resolution: Add timezone to the settings mutation and validate IANA identifiers.
- Acceptance criteria: Timezone is persisted and validated as an IANA identifier.
- Verification: E2E test updates and reads back `timeZone`.

### TD-040: Persist display currency

- Status: Done
- Priority: P0
- Area: Web / Settings
- Planned resolution: Wire currency changes through the settings mutation.
- Acceptance criteria: Currency is stored server-side.
- Verification: E2E test updates and reads back `displayCurrency`.

### TD-041: Validate IANA timezones

- Status: Done
- Priority: P1
- Area: API / Validation
- Planned resolution: Validate timezone strings against `Intl.supportedValuesOf("timeZone")`.
- Acceptance criteria: Invalid timezones are rejected with `400`.
- Verification: Shared schema test plus E2E test asserting a validation error.

### TD-042: Connect password change with Better Auth

- Status: Done
- Priority: P0
- Area: Web / Security
- Planned resolution: Use Better Auth `changePassword` with current password verification.
- Acceptance criteria: Password changes and the new password signs in.
- Verification: E2E test changes the password and logs in with the new one.

### TD-043: Implement active sessions management

- Status: Done
- Priority: P1
- Area: Web / Security
- Planned resolution: List and revoke sessions using Better Auth session APIs.
- Acceptance criteria: Sessions are listed, the current device is marked, and sessions can be revoked.
- Verification: E2E test lists and revokes sessions; web test renders the security card.

### TD-044: Add mutation error and notification handling

- Status: Done
- Priority: P0
- Area: Web / UX
- Planned resolution: Replace fire-and-forget requests with `useMutation` plus notifications.
- Acceptance criteria: Mutations report success and failure states.
- Verification: Web tests cover settings mutation wiring and password validation.

### TD-045: Remove fire-and-forget preference requests

- Status: Done
- Priority: P0
- Area: Web / Quality
- Planned resolution: Every preference change goes through a tracked mutation.
- Acceptance criteria: No preference write bypasses the settings mutation.
- Verification: Web test asserts the mutation is called when authenticated and skipped when not.

### TD-046: Add safe email change flow

- Status: Pending
- Priority: P2
- Area: Auth / Settings
- Planned resolution: Implement Better Auth email change with verification.

## Phase 4: Services and Feature Flags

- TD-047: Create `ServiceDefinition` catalog. Done.
- TD-048: Create `ServiceSubscription` per tenant. Done.
- TD-049: Enable Personal Finance by default. Done.
- TD-050: Create `ServiceAccessGuard`. Done.
- TD-051: Add `ADMIN` / `MEMBER` permissions. Done.
- TD-052: Add contracts for Vehicle, Home, Insurance, Entrepreneurship. Pending. The capability catalog (TD-099) defines the configurable scope; operational domain entities remain pending (TD-102).
- TD-053: Implement service-aware navigation. Done.
- TD-054: Audit service enable/disable actions. Done.
- TD-099: Create `ServiceCapabilityDefinition` and per-subscription capability selections. Done.
- TD-100: Add ledger mode (`SHARED`/`SEPARATE`) to service subscriptions, selectable for Entrepreneurship. Done.

## Phase 5: Accounts and Categories

- TD-055: Create `FinancialAccount`. Done.
- TD-056: Create `Category`. Done.
- TD-057: Seed default categories. Done.
- TD-058: Add per-tenant custom categories. Done.
- TD-059: Implement accounts/categories API. Done.
- TD-060: Implement functional UI. Done.
- TD-061: Add pagination and allowlisted sorting. Done.
- TD-062: Enforce tenant-scoped repositories. Done.
- TD-063: Add audit logging. Done.

## Phase 6: Transactions and Ledger

- TD-064: Create `Transaction` aggregate. Pending. A basic single-row `Transaction` (income/expense/transfer with service context and source entity) is implemented; full double-entry entries (TD-065) remain pending.
- TD-065: Create `TransactionEntry`. Pending.
- TD-066: Implement income. Done.
- TD-067: Implement expenses. Done.
- TD-068: Implement atomic transfers. Done (same-ledger transfers; cross-ledger transfers pending).
- TD-069: Prevent double booking. Pending.
- TD-070: Reject negative asset balances. Pending.
- TD-071: Model credit card negative debt. Pending.
- TD-072: Add audited edit/delete. Pending.
- TD-073: Add atomicity tests. Pending.
- TD-074: Add concurrency tests. Pending.
- TD-101: Create `Ledger` and attach accounts/transactions to it. Done.
- TD-102: Implement operational domain entities for Vehicle, Home, Insurance and Entrepreneurship (vehicles, properties, policies, businesses and their expense flows). Pending.

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
- TD-093: Run dependency audit. Pending. osv-scanner (via Qlty) reports CVE-2026-84373 (`vitest@3.2.7` / `@vitest/mocker@3.2.7`), CVE-2026-40345 (`deepmerge-ts@7.1.5`, transitive via `prisma`) and CVE-2026-16732 / CVE-2026-18504 (`fastify@5.11.3`). Vitest and deepmerge-ts need major upgrades; fastify can be bumped in range.
- TD-094: Complete E2E tests. Pending.
- TD-095: Review accessibility and performance. Pending.

### TD-097: Enforce explicit session policy and revalidate client sessions

- Status: Done
- Priority: P1
- Area: Auth / Web
- Problem: Better Auth used its default 7-day sliding expiration with no absolute lifetime, and the web client only validated the session on mount, so a stale tab could keep showing an expired or revoked session.
- Planned resolution: Configure explicit `expiresIn`/`updateAge`, enforce an absolute 30-day lifetime in `SessionAuthGuard`, revalidate the session on focus/visibility, and clear the session on a global `401`.
- Acceptance criteria: Restarting the API preserves valid sessions; sessions older than 30 days are rejected; expired or revoked sessions redirect to login on the next interaction.
- Verification: `session-policy.test.ts`, `session-auth.guard.test.ts`, `auth.e2e.test.ts` and `auth-context.test.tsx`.

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

- 2026-09-23: Services capabilities + ledger foundation. Added `ServiceCapabilityDefinition`/`ServiceCapabilitySelection` with a per-service capability checklist on the Services page, a `ledgerMode` (shared/separate) on subscriptions for Entrepreneurship, a `Ledger` + `Transaction` model (income/expense/transfer with optional service context and source entity), transactions/ledger-balance API and a functional Transactions page. TD-099, TD-100, TD-101, TD-066, TD-067, TD-068 done.
- 2026-09-22: Qlty CLI integrated as a non-overlapping quality layer. Added `.qlty/qlty.toml` (gitleaks, osv-scanner, knip, markdownlint, yamllint, prisma, hadolint, editorconfig-checker, smells — no eslint/prettier, which stay with `pnpm lint`/`format:check`), root `check:quality`/`check:quality:all`/`security`/`smells`/`metrics` scripts, a CI gate, and recorded osv-scanner CVE findings under TD-093.
- 2026-09-22: Session policy + client revalidation. Configured Better Auth with an explicit idle expiration (7 days, refreshed every 24 hours), added a 30-day absolute session lifetime enforced in `SessionAuthGuard`, made the web client revalidate the session on focus/visibility, and added global `401` handling that clears the session and redirects to login. TD-097 done.
- 2026-09-21: UI Exit Gate + Phase 5A (Accounts and Categories). Added `LoadingState`/`ErrorState` to the design system, migrated Login/Register/profile and the finance forms to React Hook Form + Zod, implemented a real custom range picker, and made Settings navigation section-driven. Shipped `FinancialAccount` and `Category` with per-tenant default-category seeding (atomic at provisioning + backfill), tenant-scoped repositories, paginated accounts/categories APIs with allowlisted sorting and audit logging, cross-tenant isolation tests, and functional Accounts/Categories pages. TD-009, TD-010, TD-011, TD-012, TD-017, TD-055–TD-063 done.
- 2026-09-21: Platform hardening + Services foundation. Enabled Better Auth rate limiting (sign-in/sign-up/change-password), added a real Terminus/Prisma health check, refactored the Fastify auth bridge to typed `FastifyInstance`, resolved `TenantContext` in `SessionAuthGuard` (TD-096), and shipped the Services catalog: `ServiceDefinition`/`ServiceSubscription` models, Personal Finance enabled atomically at provisioning with backfill for existing tenants, `ServiceAccessGuard`, `AdminOnlyGuard`, enable/disable endpoints with audit logging, and a data-driven Services page. Web runtime image is now non-root. TD-003, TD-004, TD-005, TD-007, TD-025, TD-033, TD-047–TD-051, TD-053, TD-054, TD-096 done.
- 2026-09-17: Phase 3A — Functional Settings closed. Centralized preference mutations in `AppPreferencesProvider`, removed fire-and-forget writes, made timezone a controlled searchable field validated against IANA, and wired password change + session management through Better Auth. Added Vitest/jsdom + Testing Library setup with web tests, and an e2e suite (`pnpm --filter @fondo/api test:e2e`) that runs against a dedicated `TEST_DATABASE_URL` (guard refuses the local dev database). Zod errors now map to `400 VALIDATION_ERROR`. TD-002, TD-006, TD-019, TD-020, TD-024, TD-029, TD-030, TD-031, TD-032, TD-035, TD-036–TD-045 done.
- 2026-09-04: Fixed dev-mode DI failure — `tsx` does not emit `design:paramtypes`, so NestJS constructor injection passed `undefined`. Switched auth/me providers to explicit `@Inject()` tokens; works under both `tsx` and `tsc`. Added CORS headers and OPTIONS preflight handling for Better Auth routes.
- 2026-09-04: Fixed Better Auth client base path — `VITE_AUTH_URL` now points to `/api/v1/auth`; signup/login hit the correct route instead of `404` on `/api/v1/sign-up/email`.
- 2026-09-04: Phase 2 stabilization — atomic provisioning, case-insensitive email, tenant owner uniqueness, startup env validation, trusted-origins for logout. TD-018, TD-021, TD-022, TD-023, TD-026, TD-027, TD-028 done.
- 2026-09-03: Initial inventory created from prior planning rounds.
